import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotebookBlock, NotebookLastRun, NotebookSnapshot } from "../../../core";
import { useReportConfig } from "../../../react";
import { notebookResultsStore, notebookRuntimes, type NotebookLog } from "./notebookResultsStore";
import {
  isSandboxMessage,
  PANE_HEIGHT,
  PROTOCOL_VERSION,
  WATCHDOG_MS,
  type HostMessage,
  type NotebookError,
  type NotebookOutputType,
  type NotebookTheme,
  type SandboxMessage,
} from "./protocol";
import { inputsHash, type ResolvedInput } from "./resolveInputs";

export const SNAPSHOT_MAX_IMAGE_BYTES = 300 * 1024;
export const SNAPSHOT_MAX_VALUE_BYTES = 200 * 1024;
const SERIALIZE_TIMEOUT_MS = 5000;
const RESIZE_DEBOUNCE_MS = 200;
// Padding the runtime puts around the output root (index.html)
const OUTPUT_PADDING = 16;

interface ActiveRun {
  id: number;
  startedAt: number;
  hash: string;
  logs: NotebookLog[];
  value: unknown;
  hasValue: boolean;
  watchdog: ReturnType<typeof setTimeout>;
}

export interface RunFinished {
  lastRun: NotebookLastRun;
  // undefined = keep the stored snapshot, null = clear it
  snapshot?: NotebookSnapshot | null;
}

interface RunnerOptions {
  block: NotebookBlock;
  theme: NotebookTheme;
  // Latest inputs, read when a run starts
  getInputs: () => ResolvedInput[];
  onFinished: (result: RunFinished) => void;
  // The watchdog killed a hung run; the block should switch to manual
  onWatchdog: () => void;
  // Create the sandbox as soon as the host mounts (other notebooks read this one's value)
  eager?: boolean;
}

export interface NotebookRunner {
  // Host element the sandbox iframe lives in (the output pane)
  attach: (el: HTMLDivElement | null) => void;
  run: () => void;
  stop: () => void;
  serialize: (format: "svg" | "png", scale: number) => Promise<{ data: string; width: number; height: number } | null>;
  ready: boolean;
  running: boolean;
  contentHeight: number;
  hostWidth: number;
}

// Distributive omit: `Omit` over the union itself would collapse it
type OutgoingHostMessage = HostMessage extends infer M
  ? M extends HostMessage
    ? Omit<M, "v" | "blockId">
    : never
  : never;

const serializedKey = (runId: number, format: string) => `${runId}:${format}`;

// The `width` a run hands to user code
const runWidthOf = (hostEl: HTMLElement) =>
  Math.max(100, Math.round(hostEl.getBoundingClientRect().width) - OUTPUT_PADDING);

/**
 * Owns one notebook's sandboxed iframe: creation (lazily, when the host is in
 * view), the message protocol, run ids, the watchdog, run coalescing and
 * snapshot capture after a successful run.
 */
export function useNotebookRunner(options: RunnerOptions): NotebookRunner {
  const { notebookRuntimeUrl: runtimeUrl } = useReportConfig();
  const opts = useRef(options);
  opts.current = options;
  const blockId = options.block.reportSectionId;

  const iframe = useRef<HTMLIFrameElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const readyRef = useRef(false);
  const runId = useRef(0);
  const active = useRef<ActiveRun | null>(null);
  const queued = useRef(false);
  const pending = useRef(false);
  const readsWidth = useRef(false);
  const lastRunWidth = useRef(0);
  const contentHeightRef = useRef(0);
  const serializeWaiters = useRef(
    new Map<string, { resolve: (v: { data: string; width: number; height: number } | null) => void; timer: ReturnType<typeof setTimeout> }>()
  );
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>();

  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [hostWidth, setHostWidth] = useState(0);

  const post = useCallback(
    (message: OutgoingHostMessage) => {
      const target = iframe.current?.contentWindow;
      if (!target) return;
      target.postMessage({ v: PROTOCOL_VERSION, blockId, ...message }, "*");
    },
    [blockId]
  );

  const settleSerialize = useCallback((key: string, value: { data: string; width: number; height: number } | null) => {
    const waiter = serializeWaiters.current.get(key);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    serializeWaiters.current.delete(key);
    waiter.resolve(value);
  }, []);

  const serialize = useCallback<NotebookRunner["serialize"]>(
    (format, scale) => {
      if (!readyRef.current || !iframe.current) return Promise.resolve(null);
      const id = runId.current;
      const key = serializedKey(id, format);
      return new Promise((resolve) => {
        const timer = setTimeout(() => settleSerialize(key, null), SERIALIZE_TIMEOUT_MS);
        serializeWaiters.current.set(key, { resolve, timer });
        post({ type: "serialize", runId: id, format, scale });
      });
    },
    [post, settleSerialize]
  );

  const destroyIframe = useCallback(() => {
    if (active.current) clearTimeout(active.current.watchdog);
    active.current = null;
    serializeWaiters.current.forEach((_, key) => settleSerialize(key, null));
    iframe.current?.remove();
    iframe.current = null;
    readyRef.current = false;
    setReady(false);
    setRunning(false);
  }, [settleSerialize]);

  const createIframe = useCallback(() => {
    if (!host.current || iframe.current) return;
    const el = document.createElement("iframe");
    el.setAttribute("sandbox", "allow-scripts");
    el.src = runtimeUrl;
    el.title = `Notebook output: ${opts.current.block.title}`;
    Object.assign(el.style, {
      display: "block",
      width: "100%",
      border: "0",
      height: `${opts.current.block.height ?? Math.max(contentHeightRef.current, 40)}px`,
      background: "#fff",
    });
    host.current.appendChild(el);
    iframe.current = el;
  }, [runtimeUrl]);

  // ---------- finishing a run ----------

  const finish = useCallback(
    async (run: ActiveRun, outcome: { ok: true; outputType: NotebookOutputType; contentHeight: number; readsWidth: boolean } | { ok: false; error: NotebookError }) => {
      clearTimeout(run.watchdog);
      if (active.current?.id === run.id) active.current = null;
      setRunning(false);
      const durationMs = Math.round(performance.now() - run.startedAt);
      const at = Date.now();

      if (!outcome.ok) {
        notebookResultsStore.set(blockId, {
          status: "error",
          at,
          inputsHash: run.hash,
          durationMs,
          error: outcome.error,
          logs: run.logs,
        });
        opts.current.onFinished({ lastRun: { at, ok: false, durationMs, error: outcome.error, inputsHash: run.hash } });
      } else {
        readsWidth.current = outcome.readsWidth;
        contentHeightRef.current = outcome.contentHeight;
        setContentHeight(outcome.contentHeight);
        notebookResultsStore.set(blockId, {
          status: "success",
          at,
          inputsHash: run.hash,
          durationMs,
          outputType: outcome.outputType,
          value: run.hasValue ? run.value : undefined,
          contentHeight: outcome.contentHeight,
          readsWidth: outcome.readsWidth,
          logs: run.logs,
        });
        const rows = Array.isArray(run.value) ? run.value.length : undefined;
        const lastRun: NotebookLastRun = {
          at,
          ok: true,
          durationMs,
          inputsHash: run.hash,
          outputType: outcome.outputType,
          rows,
        };
        // Snapshot: SVG (≤ 300 KB), else PNG at 1× (≤ 300 KB), else nothing; data ≤ 200 KB
        let snapshot: NotebookSnapshot | null = null;
        if (outcome.outputType === "dom" || outcome.outputType === "both") {
          const svg = await serialize("svg", 1);
          if (svg?.data && svg.data.length <= SNAPSHOT_MAX_IMAGE_BYTES) {
            snapshot = { svg: svg.data, width: svg.width, height: svg.height, at };
          } else {
            const png = await serialize("png", 1);
            if (png?.data && png.data.length <= SNAPSHOT_MAX_IMAGE_BYTES) {
              snapshot = { png: png.data, width: png.width, height: png.height, at };
            }
          }
        }
        if (run.hasValue) {
          let json = "";
          try {
            json = JSON.stringify(run.value) ?? "";
          } catch {
            json = "";
          }
          if (json && json.length <= SNAPSHOT_MAX_VALUE_BYTES) {
            snapshot = { ...(snapshot ?? { at }), value: run.value };
          }
        }
        opts.current.onFinished({ lastRun, snapshot });
      }

      if (queued.current) {
        queued.current = false;
        startRun();
      }
    },
    // startRun is defined below; both are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blockId, serialize]
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  // ---------- starting a run ----------

  const startRun = useCallback(() => {
    const frame = iframe.current;
    const hostEl = host.current;
    if (!frame || !hostEl || !readyRef.current) {
      pending.current = true;
      return;
    }
    if (active.current) {
      queued.current = true;
      return;
    }
    const inputs = opts.current.getInputs();
    const hash = inputsHash(inputs);
    runId.current += 1;
    const id = runId.current;
    const { block, theme } = opts.current;
    const width = runWidthOf(hostEl);
    lastRunWidth.current = width;
    const run: ActiveRun = {
      id,
      startedAt: performance.now(),
      hash,
      logs: [],
      value: undefined,
      hasValue: false,
      watchdog: setTimeout(() => {
        // Nothing came back: the sandbox is stuck. Kill it and start a fresh one.
        if (active.current?.id !== id) return;
        const stuck = active.current;
        destroyIframe();
        createIframe();
        opts.current.onWatchdog();
        void finishRef.current(stuck, {
          ok: false,
          error: {
            kind: "timeout",
            message: `No result after ${WATCHDOG_MS / 1000} s. The sandbox was restarted and this notebook switched to manual runs.`,
          },
        });
      }, WATCHDOG_MS),
    };
    active.current = run;
    setRunning(true);
    notebookResultsStore.set(blockId, { status: "running", at: Date.now(), inputsHash: hash, logs: [] });
    post({
      type: "run",
      runId: id,
      code: block.code,
      inputs: Object.fromEntries(inputs.map((i) => [i.ref, i.value])),
      width,
      height: block.height ?? PANE_HEIGHT,
      theme,
    });
  }, [blockId, createIframe, destroyIframe, post]);

  const stop = useCallback(() => {
    const run = active.current;
    queued.current = false;
    pending.current = false;
    if (!run) return;
    // A hung loop can't process `dispose`; replacing the frame is the only reliable stop
    destroyIframe();
    createIframe();
    void finishRef.current(run, { ok: false, error: { kind: "runtime", message: "Stopped." } });
  }, [createIframe, destroyIframe]);

  // ---------- messages from the sandbox ----------

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = iframe.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data: unknown = event.data;
      if (!isSandboxMessage(data)) return;
      const message = data as SandboxMessage;
      const run = active.current;

      switch (message.type) {
        case "ready":
          readyRef.current = true;
          setReady(true);
          if (pending.current) {
            pending.current = false;
            startRun();
          }
          return;
        case "height":
          if (opts.current.block.height === null) {
            contentHeightRef.current = message.contentHeight;
            setContentHeight(message.contentHeight);
          }
          return;
        case "serialized":
          settleSerialize(
            serializedKey(message.runId, message.format),
            message.data ? { data: message.data, width: message.width, height: message.height } : null
          );
          return;
        default:
          break;
      }
      // Run-scoped messages: drop anything from a stale run
      if (!run || message.runId !== run.id) return;
      switch (message.type) {
        case "started":
          return;
        case "log":
          run.logs.push({ level: message.level, args: message.args });
          notebookResultsStore.patch(blockId, { logs: [...run.logs] });
          return;
        case "value":
          run.value = message.value;
          run.hasValue = true;
          return;
        case "rendered":
          void finishRef.current(run, {
            ok: true,
            outputType: message.outputType,
            contentHeight: message.contentHeight,
            readsWidth: message.readsWidth,
          });
          return;
        case "error":
          void finishRef.current(run, { ok: false, error: message.error });
          return;
        default:
          return;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [blockId, settleSerialize, startRun]);

  // ---------- host element ----------

  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      if (el === host.current) return;
      observer.current?.disconnect();
      observer.current = null;
      if (host.current) destroyIframe();
      host.current = el;
      if (!el) return;
      if (opts.current.eager || typeof IntersectionObserver === "undefined") {
        createIframe();
        return;
      }
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            createIframe();
            observer.current?.disconnect();
            observer.current = null;
          }
        },
        { rootMargin: "200px" }
      );
      observer.current.observe(el);
    },
    [createIframe, destroyIframe]
  );

  // Width tracking: re-run (debounced) when the code reads `width`
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      setHostWidth(Math.round(entries[0]?.contentRect.width ?? 0));
      // Only when the width the code would get has changed: layout jitter that
      // doesn't move it (a border, a scrollbar settling) must not re-run
      if (!readsWidth.current || !readyRef.current || lastRunWidth.current === 0) return;
      if (runWidthOf(el) === lastRunWidth.current) return;
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        if (host.current && runWidthOf(host.current) !== lastRunWidth.current) startRun();
      }, RESIZE_DEBOUNCE_MS);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // Re-observe whenever the host is (re)attached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, startRun]);

  // Keep the iframe's height in step with the output (auto) or the block's fixed height
  const fixedHeight = options.block.height;
  useEffect(() => {
    const frame = iframe.current;
    if (!frame) return;
    frame.style.height = `${fixedHeight ?? Math.max(contentHeight, 40)}px`;
  }, [fixedHeight, contentHeight, ready]);

  // Live handle for export / downloads
  useEffect(() => {
    if (!ready) return undefined;
    return notebookRuntimes.register(blockId, { serialize });
  }, [blockId, ready, serialize]);

  // Teardown
  useEffect(
    () => () => {
      clearTimeout(resizeTimer.current);
      observer.current?.disconnect();
      destroyIframe();
    },
    [destroyIframe]
  );

  return useMemo(
    () => ({ attach, run: startRun, stop, serialize, ready, running, contentHeight, hostWidth }),
    [attach, startRun, stop, serialize, ready, running, contentHeight, hostWidth]
  );
}

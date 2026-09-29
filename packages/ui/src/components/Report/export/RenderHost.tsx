import React, {
  Component,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { getApolloContext, type ApolloClient } from "@apollo/client";
import type { ReportSection } from "../../../types/report";
import { getRenderFunctions } from "../../../hooks/useReportSectionRenderer";
import { getSectionExportAdapter } from "../../../providers/SectionRegistry";
import { ReportComponentStateProvider } from "../../../providers/ReportComponentStateContext";
import { ReportSectionContext } from "../../../providers/ReportSectionContext";
import {
  ExportTableSinkContext,
  type ExportTableSink,
  type ExportTableSnapshot,
} from "../../../providers/ExportTableSinkContext";
import { captureSvg, findChartSvg, svgToPng } from "./extract/svg";
import { rasterize } from "./extract/raster";
import { WIDGET_TIMEOUT_MS } from "./layout";
import type { CollectOptions, TableData, WidgetCapture } from "./types";

type RenderWidget = NonNullable<CollectOptions["renderWidget"]>;

interface Job {
  id: number;
  section: ReportSection;
  width: number;
  pixelRatio: number;
  resolve: (capture: WidgetCapture) => void;
}

const POLL_MS = 100;
// DOM must be unchanged this long (and nothing loading) before we capture
const QUIET_MS = 300;
const BUSY_SELECTOR = ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root";
const BUSY_TEXT = ["Loading section...", "Loading data. This may take some time..."];
const NO_RENDERER_TEXT = "Section not available - no renderer found";

const missing = (reason: string, extra: Partial<WidgetCapture> = {}): WidgetCapture => ({
  asset: { kind: "missing", reason },
  error: reason,
  ...extra,
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// rAF stalls in background tabs; never wait more than a tick for it
const frame = () =>
  Promise.race([new Promise<void>((resolve) => requestAnimationFrame(() => resolve())), sleep(50)]);

const cacheKey = (section: ReportSection, width: number, pixelRatio: number) =>
  [
    section.reportSectionId,
    width,
    section.stateCapturedAt ?? section.addedAt,
    pixelRatio,
    section.selectedView,
  ].join("|");

/** Any Apollo query created since this render started (i.e. by the widget) still loading. */
const apolloBusy = (client: ApolloClient<unknown> | undefined, baseline: Set<string>) => {
  if (!client) return false;
  try {
    for (const [queryId, query] of client.getObservableQueries("active")) {
      if (!baseline.has(queryId) && query.getCurrentResult(false).loading) return true;
    }
  } catch {
    // Older/foreign clients: fall back to the DOM signals
  }
  return false;
};

const domBusy = (root: HTMLElement) => {
  if (root.querySelector(BUSY_SELECTOR)) return true;
  const text = root.textContent ?? "";
  return BUSY_TEXT.some((t) => text.includes(t));
};

/**
 * The widget's content area: an element the widget marks with `data-export-capture`,
 * else SectionItem's card content, else the whole render.
 */
const captureTarget = (root: HTMLElement): HTMLElement =>
  root.querySelector<HTMLElement>("[data-export-capture]") ??
  root.querySelector<HTMLElement>("section .MuiCardContent-root") ??
  root;

const hasContent = (el: HTMLElement) =>
  (el.textContent ?? "").trim().length > 0 || !!el.querySelector("svg, canvas, img");

/**
 * Reconstructed widgets render SectionItem, whose chart/table toggle defaults to
 * the section's default view; switch it to chart when the report block wants one.
 */
const selectChartView = (root: HTMLElement): boolean => {
  const button = root.querySelector<HTMLButtonElement>('[data-testid="view-toggle-chart"]');
  if (!button) return false;
  if (button.getAttribute("aria-pressed") !== "true") button.click();
  return true;
};

const firstTable = (tables: Map<string, ExportTableSnapshot>): TableData | undefined => {
  for (const snapshot of tables.values()) {
    if (!snapshot.loading && snapshot.table && snapshot.table.columns.length) return snapshot.table;
  }
  return undefined;
};

class CaptureErrorBoundary extends Component<
  { onError: (error: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const RenderFrame: React.FC<{ job: Job; onDone: (job: Job, capture: WidgetCapture) => void }> = ({
  job,
  onDone,
}) => {
  const { section, width, pixelRatio } = job;
  const client = useContext(getApolloContext()).client as ApolloClient<unknown> | undefined;
  // Queries that existed before the widget mounted (live page, dialog) don't gate readiness
  const [baseline] = useState(() => {
    try {
      return new Set(client ? Array.from(client.getObservableQueries("all").keys()) : []);
    } catch {
      return new Set<string>();
    }
  });
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.dataset.reportExportHost = section.reportSectionId;
    Object.assign(el.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: `${width}px`,
      background: "#ffffff",
      pointerEvents: "none",
      zIndex: "-1",
    });
    return el;
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const tables = useRef(new Map<string, ExportTableSnapshot>());
  const failure = useRef<string | null>(null);

  const sink = useCallback<ExportTableSink>((key, snapshot) => {
    if (snapshot) tables.current.set(key, snapshot);
    else tables.current.delete(key);
  }, []);

  // Same tree ReportSectionBody mounts
  const rendered = useMemo(() => {
    const renderers = getRenderFunctions(section);
    const chart = section.selectedView === "chart" ? renderers.renderChart?.() : undefined;
    return chart ?? renderers.renderBody();
  }, [section]);

  useLayoutEffect(() => {
    document.body.appendChild(container);
    return () => container.remove();
  }, [container]);

  useEffect(() => {
    let cancelled = false;

    const waitUntilReady = async (root: HTMLElement): Promise<string | null> => {
      const start = performance.now();
      let lastMutation = start;
      let chartSelected = section.selectedView !== "chart";
      const observer = new MutationObserver(() => {
        lastMutation = performance.now();
      });
      observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
      try {
        for (;;) {
          await sleep(POLL_MS);
          if (cancelled) return "cancelled";
          if (failure.current) return failure.current;
          if (!chartSelected) chartSelected = selectChartView(root);
          const now = performance.now();
          const tableLoading = Array.from(tables.current.values()).some((t) => t.loading);
          const busy = apolloBusy(client, baseline) || tableLoading || domBusy(root);
          if (!busy && now - lastMutation >= QUIET_MS) return null;
          if (now - start > WIDGET_TIMEOUT_MS) {
            return `Timed out after ${Math.round(WIDGET_TIMEOUT_MS / 1000)} s waiting for data`;
          }
        }
      } finally {
        observer.disconnect();
      }
    };

    const capture = async (): Promise<WidgetCapture> => {
      const root = rootRef.current;
      if (!root) return missing("Render host not mounted");
      const notReady = await waitUntilReady(root);
      if (notReady) return missing(notReady);
      await frame();
      await frame();
      await document.fonts?.ready;

      const target = captureTarget(root);
      if ((root.textContent ?? "").includes(NO_RENDERER_TEXT)) {
        return missing("No renderer registered for this section");
      }
      if (!hasContent(target)) return missing("Widget rendered no content");

      const adapter = getSectionExportAdapter(section.definition);
      const data = section.request?.data;
      let tableData: TableData | undefined;
      let references: WidgetCapture["references"];
      try {
        tableData = adapter?.toTable?.(data, section.componentState);
      } catch {
        tableData = undefined;
      }
      tableData = tableData ?? firstTable(tables.current);
      try {
        references = adapter?.references?.(data);
      } catch {
        references = undefined;
      }
      const extra = { tableData, references };

      // Every widget exports as a picture; its rows (tableData) go to the appendix
      const { width: targetWidth, height: targetHeight } = target.getBoundingClientRect();
      try {
        const adapterSvg = adapter?.toSvg?.(target);
        if (adapterSvg) {
          const w = Math.round(targetWidth);
          const h = Math.round(targetHeight);
          const pngDataUrl = await svgToPng(adapterSvg, w, h, pixelRatio);
          return { asset: { kind: "svg", svg: adapterSvg, width: w, height: h, pngDataUrl }, ...extra };
        }
      } catch {
        // fall through to generic capture
      }

      const chartSvg = findChartSvg(target);
      if (chartSvg) {
        try {
          const svg = captureSvg(chartSvg);
          const pngDataUrl = await svgToPng(svg.svg, svg.width, svg.height, pixelRatio);
          return { asset: { kind: "svg", ...svg, pngDataUrl }, ...extra };
        } catch {
          // fall through to raster
        }
      }

      try {
        const asset = await rasterize(target, pixelRatio);
        // A bitmap is only a loss when the rows aren't exported alongside it
        return { asset, rasterFallback: !tableData || undefined, ...extra };
      } catch (error) {
        return missing(`Could not capture figure: ${error instanceof Error ? error.message : String(error)}`, extra);
      }
    };

    capture().then((result) => {
      if (!cancelled) onDone(job, result);
    });
    return () => {
      cancelled = true;
    };
    // One capture per mounted job (the host keys frames by job id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <ExportTableSinkContext.Provider value={sink}>
      <CaptureErrorBoundary
        onError={(error) => {
          failure.current = `Widget failed to render: ${error.message}`;
        }}
      >
        <ReportComponentStateProvider initialState={section.componentState}>
          <ReportSectionContext.Provider
            value={{
              entityId: section.entityId,
              entityLabel: section.entityLabel,
              entityType: section.definition.entity,
            }}
          >
            <div ref={rootRef} style={{ width: "100%", padding: 14, boxSizing: "border-box" }}>
              {rendered}
            </div>
          </ReportSectionContext.Provider>
        </ReportComponentStateProvider>
      </CaptureErrorBoundary>
    </ExportTableSinkContext.Provider>,
    container
  );
};

/**
 * Off-screen widget renderer. Mount `host` somewhere inside the app providers (the export
 * dialog does); `renderWidget` renders one widget at a time and resolves with its capture.
 * Successful captures are cached per (reportSectionId, width, stateCapturedAt, pixelRatio, view)
 * for the hook's lifetime; failures aren't, so a retry re-renders.
 */
export function useRenderHost(): { host: ReactNode; renderWidget: RenderWidget } {
  const [job, setJob] = useState<Job | null>(null);
  const cache = useRef(new Map<string, WidgetCapture>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef<Job | null>(null);
  const nextId = useRef(0);
  const mounted = useRef(true);

  const finish = useCallback((done: Job, capture: WidgetCapture) => {
    if (pending.current?.id === done.id) pending.current = null;
    setJob((current) => (current?.id === done.id ? null : current));
    done.resolve(capture);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pending.current) pending.current.resolve(missing("Export closed"));
      pending.current = null;
    };
  }, []);

  const renderWidget = useCallback<RenderWidget>((section, width, pixelRatio) => {
    const key = cacheKey(section, width, pixelRatio);
    const cached = cache.current.get(key);
    if (cached) return Promise.resolve(cached);

    const run = queue.current.then(
      () =>
        new Promise<WidgetCapture>((resolve) => {
          if (!mounted.current) return resolve(missing("Export closed"));
          let settled = false;
          nextId.current += 1;
          const current: Job = {
            id: nextId.current,
            section,
            width,
            pixelRatio,
            resolve: (capture) => {
              if (settled) return;
              settled = true;
              clearTimeout(watchdog);
              resolve(capture);
            },
          };
          // Covers a host that was never mounted; the frame has its own 15 s readiness timeout
          const watchdog = setTimeout(
            () => finish(current, missing("Render host did not respond")),
            WIDGET_TIMEOUT_MS + 10000
          );
          pending.current = current;
          setJob(current);
        })
    );
    queue.current = run.catch(() => undefined);
    return run.then((capture) => {
      if (capture.asset.kind !== "missing" || capture.tableData) cache.current.set(key, capture);
      return capture;
    });
  }, [finish]);

  const host = job ? <RenderFrame key={job.id} job={job} onDone={finish} /> : null;
  return { host, renderWidget };
}

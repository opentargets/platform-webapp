/**
 * Notebook sandbox runtime. Runs inside an opaque-origin iframe
 * (sandbox="allow-scripts") with a strict CSP: no network, no storage, no
 * access to the host page. Talks to the host only via postMessage.
 */
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";
import { html, svg } from "./htl";
import { GUARD_NAME, TIMEOUT_CLASS, instrument } from "./instrument";
import {
  isHostMessage,
  LOOP_BUDGET_MS,
  MAX_AUTO_HEIGHT,
  MAX_OUTPUT_BYTES,
  MAX_OUTPUT_ROWS,
  NOTEBOOK_GLOBALS,
  PROTOCOL_VERSION,
  type HostMessage,
  type NotebookError,
  type NotebookOutputType,
  type NotebookTheme,
  type SandboxMessage,
} from "./protocol";

const RUNTIME_VERSION = "1.0.0";
const MAX_LOG_LINES = 200;

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>;

class LoopTimeout extends Error {
  line: number;
  constructor(line: number) {
    super(`This code ran for more than ${LOOP_BUDGET_MS / 1000} seconds without yielding (line ${line}).`);
    this.name = "LoopTimeout";
    this.line = line;
  }
}

// ---------- host link ----------

let blockId = "";
let currentRunId = 0;

type Outgoing = SandboxMessage extends infer M
  ? M extends SandboxMessage
    ? Omit<M, "v" | "blockId" | "runId"> & { runId?: number }
    : never
  : never;

const post = (message: Outgoing) => {
  const payload = { v: PROTOCOL_VERSION, blockId, runId: message.runId ?? currentRunId, ...message };
  window.parent.postMessage(payload, "*");
};

// ---------- output root ----------

const root = document.getElementById("output") as HTMLDivElement;
let lastContentHeight = 0;

const contentHeight = () => Math.min(MAX_AUTO_HEIGHT, Math.ceil(root.getBoundingClientRect().height));

const reportHeight = () => {
  const h = contentHeight();
  if (h !== lastContentHeight) {
    lastContentHeight = h;
    post({ type: "height", contentHeight: h });
  }
};

new ResizeObserver(() => reportHeight()).observe(root);

const applyTheme = (theme: NotebookTheme) => {
  root.style.fontFamily = theme.fontFamily;
  root.style.color = theme.text;
  document.body.style.fontFamily = theme.fontFamily;
  document.body.style.color = theme.text;
};

// ---------- line mapping ----------

const stackLocation = (error: unknown): { line: number; column: number } | undefined => {
  const stack = (error as { stack?: string })?.stack;
  if (!stack) return undefined;
  // V8: "at eval (eval at <anonymous> (...), <anonymous>:12:5)"; Firefox/Safari: "> Function:12:5"
  const match = stack.match(/<anonymous>:(\d+):(\d+)/) ?? stack.match(/Function:(\d+):(\d+)/);
  if (!match) return undefined;
  return { line: Number(match[1]), column: Number(match[2]) };
};

/**
 * Lines the Function wrapper adds before the body ("async function anonymous(a,b\n) {\n");
 * constant per engine and identical for sync and async functions, so a sync probe suffices.
 */
const HEADER_LINES = (() => {
  try {
    // eslint-disable-next-line no-new-func
    new Function("a", "b", "throw new Error('probe')")();
  } catch (e) {
    const loc = stackLocation(e);
    if (loc) return loc.line - 1;
  }
  return 2;
})();

const mapError = (error: unknown, kind: NotebookError["kind"] = "runtime"): NotebookError => {
  const loc = stackLocation(error);
  const line = loc ? loc.line - HEADER_LINES : undefined;
  const message =
    error instanceof Error
      ? `${error.name && error.name !== "Error" ? `${error.name}: ` : ""}${error.message}`
      : String(error);
  return {
    kind,
    message,
    line: line !== undefined && line > 0 ? line : undefined,
    column: line !== undefined && line > 0 ? loc?.column : undefined,
  };
};

// ---------- output classification ----------

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const isElement = (value: unknown): value is Element | DocumentFragment =>
  value instanceof Element || value instanceof DocumentFragment;

const isDataArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every((row) => isPlainObject(row));

const isValue = (value: unknown) =>
  isPlainObject(value) ||
  typeof value === "number" ||
  typeof value === "string" ||
  typeof value === "boolean" ||
  value === null ||
  Array.isArray(value);

/** Make a data return structured-cloneable and within the size cap. */
const checkData = (value: unknown): NotebookError | null => {
  if (Array.isArray(value) && value.length > MAX_OUTPUT_ROWS) {
    return {
      kind: "output",
      message: `Returned ${value.length.toLocaleString()} rows; the limit is ${MAX_OUTPUT_ROWS.toLocaleString()}.`,
    };
  }
  let json: string;
  try {
    json = JSON.stringify(value) ?? "null";
  } catch {
    return { kind: "output", message: "Return a chart, an array of objects, or a plain value." };
  }
  if (json.length > MAX_OUTPUT_BYTES) {
    return { kind: "output", message: "The returned data is larger than 10 MB." };
  }
  return null;
};

// Dates, Maps, Sets, typed arrays... become plain JSON so the host can clone them
const toPlain = (value: unknown): unknown => JSON.parse(JSON.stringify(value) ?? "null");

// ---------- run ----------

let invalidate: (() => void) | null = null;
let readsWidthNow = false;
let lastInputs: Record<string, unknown> = {};
let lastCode = "";
let lastHeight = 400;
let lastTheme: NotebookTheme | null = null;
let logCount = 0;

const makeLogger = (level: "log" | "info" | "warn" | "error") =>
  (...args: unknown[]) => {
    if (logCount >= MAX_LOG_LINES) return;
    logCount += 1;
    post({
      type: "log",
      level,
      args: args.map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a, null, 0) ?? String(a);
        } catch {
          return String(a);
        }
      }),
    });
  };

const log = makeLogger("log");
// User code sees `console.log` too
console.log = log;
console.info = makeLogger("info");
console.warn = makeLogger("warn");
console.error = makeLogger("error");

const nextPaint = () =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 50);
  });

const clearOutput = () => {
  root.replaceChildren();
};

let sliceStart = 0;
const guard = () => performance.now() - sliceStart > LOOP_BUDGET_MS;

const globalsFor = (width: number, height: number, theme: NotebookTheme, invalidation: Promise<void>) => ({
  d3,
  Plot,
  width,
  height,
  html,
  svg,
  invalidation,
  log,
  theme,
});

async function run(msg: Extract<HostMessage, { type: "run" }>) {
  const runId = msg.runId;
  currentRunId = runId;
  logCount = 0;
  lastInputs = msg.inputs;
  lastCode = msg.code;
  lastHeight = msg.height;
  lastTheme = msg.theme;
  applyTheme(msg.theme);

  // Tear down the previous run
  invalidate?.();
  const invalidation = new Promise<void>((resolve) => {
    invalidate = resolve;
  });
  clearOutput();
  post({ type: "started" });

  const compiled = instrument(msg.code);
  if (!compiled.ok) {
    post({ type: "error", error: compiled.error });
    return;
  }
  readsWidthNow = compiled.readsWidth;

  const inputNames = Object.keys(msg.inputs);
  const globals = globalsFor(msg.width, msg.height, msg.theme, invalidation);
  const globalNames = [...NOTEBOOK_GLOBALS];
  let fn: (...values: unknown[]) => Promise<unknown>;
  try {
    fn = new AsyncFunction(...inputNames, ...globalNames, GUARD_NAME, TIMEOUT_CLASS, compiled.code);
  } catch (e) {
    post({ type: "error", error: mapError(e, "syntax") });
    return;
  }

  // The guard budget restarts after every await: wrap each input access? No —
  // reset it on every macrotask instead, which is what "yielding" means here.
  sliceStart = performance.now();
  const tick = setInterval(() => {
    sliceStart = performance.now();
  }, 0);

  let result: unknown;
  try {
    result = await fn(
      ...inputNames.map((name) => msg.inputs[name]),
      ...globalNames.map((name) => globals[name]),
      guard,
      LoopTimeout
    );
  } catch (e) {
    clearInterval(tick);
    if (runId !== currentRunId) return;
    if (e instanceof LoopTimeout) {
      post({ type: "error", error: { kind: "timeout", message: e.message, line: e.line } });
    } else {
      post({ type: "error", error: mapError(e) });
    }
    return;
  }
  clearInterval(tick);
  if (runId !== currentRunId) return;

  // ---- classify the return value ----
  let outputType: NotebookOutputType = "none";
  let data: unknown;
  let element: Element | DocumentFragment | null = null;

  if (result === undefined) {
    outputType = "none";
  } else if (isElement(result)) {
    outputType = "dom";
    element = result;
  } else if (
    isPlainObject(result) &&
    "chart" in result &&
    isElement(result.chart) &&
    ("data" in result ? Object.keys(result).length === 2 : Object.keys(result).length === 1)
  ) {
    outputType = "both";
    element = result.chart;
    data = "data" in result ? result.data : null;
  } else if (isDataArray(result)) {
    outputType = "data";
    data = result;
  } else if (isValue(result)) {
    outputType = "value";
    data = result;
  } else {
    post({
      type: "error",
      error: { kind: "output", message: "Return a chart, an array of objects, or a plain value." },
    });
    return;
  }

  if (outputType !== "dom" && outputType !== "none") {
    const problem = checkData(data);
    if (problem) {
      post({ type: "error", error: problem });
      return;
    }
  }

  if (element) {
    try {
      root.appendChild(element);
    } catch (e) {
      post({ type: "error", error: mapError(e, "output") });
      return;
    }
  } else if (outputType === "none") {
    const p = document.createElement("p");
    p.className = "nb-empty";
    p.textContent = "Nothing returned";
    root.appendChild(p);
  }

  if (outputType !== "dom" && outputType !== "none") {
    post({ type: "value", value: toPlain(data) });
  }

  // Let layout settle so the first height is right. rAF is paused while the
  // frame is hidden or off-screen, so never wait on it alone.
  await nextPaint();
  if (runId !== currentRunId) return;
  lastContentHeight = contentHeight();
  post({ type: "rendered", outputType, contentHeight: lastContentHeight, readsWidth: readsWidthNow });
}

// ---------- serialize ----------

const INLINED_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "visibility",
];

const inlineStyles = (source: Element, target: Element) => {
  const computed = getComputedStyle(source);
  const style = INLINED_PROPERTIES.map((prop) => {
    const value = computed.getPropertyValue(prop);
    return value ? `${prop}:${value}` : "";
  })
    .filter(Boolean)
    .join(";");
  if (style) target.setAttribute("style", style);
  const sourceChildren = Array.from(source.children);
  Array.from(target.children).forEach((child, i) => {
    if (sourceChildren[i]) inlineStyles(sourceChildren[i], child);
  });
};

/** The largest <svg> in the output, or the whole output wrapped in a foreignObject. */
const outputSvg = (): { svg: string; width: number; height: number } | null => {
  const box = root.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const svgs = Array.from(root.querySelectorAll("svg")).filter((s) => !s.parentElement?.closest("svg"));
  const largest = svgs.reduce<SVGSVGElement | null>((best, s) => {
    if (!best) return s;
    const a = best.getBoundingClientRect();
    const b = s.getBoundingClientRect();
    return b.width * b.height > a.width * a.height ? s : best;
  }, null);
  if (largest && svgs.length === 1 && !root.querySelector("canvas")) {
    const rect = largest.getBoundingClientRect();
    const clone = largest.cloneNode(true) as SVGSVGElement;
    inlineStyles(largest, clone);
    const w = Math.round(rect.width) || width;
    const h = Math.round(rect.height) || height;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${w} ${h}`);
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    return { svg: new XMLSerializer().serializeToString(clone), width: w, height: h };
  }
  if (root.childElementCount === 0) return null;
  // Mixed HTML output: wrap in a foreignObject
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("canvas").forEach((canvas) => {
    const img = document.createElement("img");
    try {
      img.src = (canvas as HTMLCanvasElement).toDataURL("image/png");
      img.width = canvas.width;
      img.height = canvas.height;
      canvas.replaceWith(img);
    } catch {
      canvas.remove();
    }
  });
  const xhtml = new XMLSerializer().serializeToString(clone);
  const fo = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${(lastTheme?.fontFamily ?? "sans-serif").replace(/"/g, "'")};color:${lastTheme?.text ?? "#000"}">${xhtml}</div></foreignObject></svg>`;
  return { svg: fo, width, height };
};

const svgToPng = (svgMarkup: string, width: number, height: number, scale: number): Promise<string | null> =>
  new Promise((resolve) => {
    const image = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });

async function serialize(msg: Extract<HostMessage, { type: "serialize" }>) {
  const out = outputSvg();
  if (!out) {
    post({ type: "serialized", runId: msg.runId, format: msg.format, data: null, width: 0, height: 0 });
    return;
  }
  if (msg.format === "svg") {
    post({ type: "serialized", runId: msg.runId, format: "svg", data: out.svg, width: out.width, height: out.height });
    return;
  }
  const png = await svgToPng(out.svg, out.width, out.height, msg.scale || 1);
  post({ type: "serialized", runId: msg.runId, format: "png", data: png, width: out.width, height: out.height });
}

// ---------- resize ----------

let resizeTimer: ReturnType<typeof setTimeout> | undefined;

const resize = (msg: Extract<HostMessage, { type: "resize" }>) => {
  // The host only sends resize when the code reads `width`; re-run with the new width
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!readsWidthNow || !lastTheme) return;
    void run({
      v: PROTOCOL_VERSION,
      type: "run",
      blockId,
      runId: msg.runId,
      code: lastCode,
      inputs: lastInputs,
      width: msg.width,
      height: lastHeight,
      theme: lastTheme,
    });
  }, 200);
};

// ---------- message loop ----------

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  const data = event.data;
  if (!isHostMessage(data)) return;
  if (blockId && data.blockId !== blockId) return;
  blockId = data.blockId;
  switch (data.type) {
    case "run":
      void run(data);
      break;
    case "resize":
      resize(data);
      break;
    case "serialize":
      void serialize(data);
      break;
    case "dispose":
      invalidate?.();
      clearOutput();
      break;
  }
});

// Announce readiness. The host learns our blockId from its own frame, so the
// first message uses an empty id; the host matches on event.source.
post({ type: "ready", runtimeVersion: RUNTIME_VERSION });

// Uncaught errors inside user timers/listeners after the run finishes
window.addEventListener("error", (event) => {
  post({ type: "log", level: "error", args: [event.message] });
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  post({ type: "log", level: "error", args: [reason instanceof Error ? reason.message : String(reason)] });
});

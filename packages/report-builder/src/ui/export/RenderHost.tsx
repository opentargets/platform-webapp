import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { type Theme, ThemeProvider, useTheme } from "@mui/material/styles";
import React, {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ReportSection } from "../../core";
import {
  ExportRenderHintsContext,
  ExportTableSinkContext,
  type ExportTableSink,
  type ExportTableSnapshot,
  useReportConfig,
  WIDGET_LOADING_TEXT,
  WIDGET_MISSING_TEXT,
  WidgetRenderer,
} from "../../react";
import { useCollectHooks } from "../hooks";
import { captureSvg, findChartSvg, svgToPng } from "./extract/svg";
import { rasterize } from "./extract/raster";
import { EXPORT_VIEWPORT, WIDGET_TIMEOUT_MS } from "./layout";
import { installCrossDocumentResizeObserver } from "./screenObservers";
import type { CollectOptions, ExportRenderHints, TableData, WidgetCapture } from "./types";

type RenderWidget = NonNullable<CollectOptions["renderWidget"]>;

interface Job {
  id: number;
  section: ReportSection;
  width: number;
  pixelRatio: number;
  hints?: ExportRenderHints;
  resolve: (capture: WidgetCapture) => void;
}

const POLL_MS = 100;
// DOM must be unchanged this long (and nothing loading) before we capture
const QUIET_MS = 300;
const BUSY_SELECTOR = ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root";
const BUSY_TEXT = [WIDGET_LOADING_TEXT, "Loading data. This may take some time..."];
const NO_RENDERER_TEXT = WIDGET_MISSING_TEXT;

const missing = (reason: string, extra: Partial<WidgetCapture> = {}): WidgetCapture => ({
  asset: { kind: "missing", reason },
  error: reason,
  ...extra,
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// rAF stalls in background tabs; never wait more than a tick for it
const frame = () =>
  Promise.race([new Promise<void>((resolve) => requestAnimationFrame(() => resolve())), sleep(50)]);

const cacheKey = (section: ReportSection, width: number, pixelRatio: number, hints?: ExportRenderHints) =>
  [
    section.reportSectionId,
    width,
    section.stateCapturedAt ?? section.addedAt,
    pixelRatio,
    section.selectedView,
    hints?.maxRows ?? "",
  ].join("|");

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

// ---------- the screen: an off-screen iframe the size of a desktop display ----------

interface Screen {
  frame: HTMLIFrameElement;
  win: Window;
  doc: Document;
  mount: HTMLDivElement;
  cache: EmotionCache;
}

/**
 * Copies the page's stylesheets into `to`: global CSS, @font-face rules and the emotion styles
 * already inserted for the app. Sheets whose rules can't be read (cross-origin, e.g. Google
 * Fonts) are linked again instead.
 */
function copyStyles(from: Document, to: Document) {
  for (const sheet of Array.from(from.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      rules = undefined;
    }
    if (rules) {
      const style = to.createElement("style");
      style.textContent = Array.from(rules)
        .map((rule) => rule.cssText)
        .join("\n");
      to.head.appendChild(style);
    } else if (sheet.href) {
      const link = to.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      to.head.appendChild(link);
    }
  }
}

type GlClass = { prototype: object };
type WindowWithGl = Window & {
  HTMLCanvasElement: typeof HTMLCanvasElement;
  WebGLRenderingContext?: GlClass;
  WebGL2RenderingContext?: GlClass;
};

/**
 * WebGL in the screen, for canvas libraries (Pixi genome tracks) that run in the app's realm:
 * - `gl instanceof WebGL2RenderingContext` is tested against the app window's class, which a
 *   context created in the screen fails; Pixi then drives a WebGL2 context as WebGL1 and draws
 *   nothing. Chaining the screen's prototypes to the app's makes those checks pass (own methods
 *   still resolve first).
 * - Contexts keep their drawing buffer, otherwise the canvas reads back blank after the frame
 *   is composited (html-to-image copies canvases with toDataURL).
 * Patching the screen's own globals scopes both to widgets rendered for export.
 */
function prepareWebGl(win: Window) {
  const screen = win as WindowWithGl;
  const app = window as WindowWithGl;
  for (const name of ["WebGLRenderingContext", "WebGL2RenderingContext"] as const) {
    const own = screen[name];
    const main = app[name];
    if (own && main && own !== main) Object.setPrototypeOf(own.prototype, main.prototype);
  }
  const proto = screen.HTMLCanvasElement.prototype;
  const original = proto.getContext;
  proto.getContext = function patchedGetContext(this: HTMLCanvasElement, type: string, options?: unknown) {
    const webgl = type === "webgl" || type === "webgl2" || type === "experimental-webgl";
    const attrs = webgl ? { ...((options as object | undefined) ?? {}), preserveDrawingBuffer: true } : options;
    return (original as (this: HTMLCanvasElement, t: string, o?: unknown) => RenderingContext | null).call(
      this,
      type,
      attrs,
    );
  } as typeof proto.getContext;
}

/**
 * Widgets are laid out inside an iframe the size of a 16-inch MacBook Pro display, so MUI
 * media queries, `vh`/`vw` units, `window.innerWidth` and ResizeObservers see a real desktop
 * viewport instead of whatever window the user happens to be exporting from. The widget's
 * column (`width`) sits at the top-left of that screen.
 */
function openScreen(section: ReportSection, width: number): Screen | null {
  // Widgets measure themselves with the app window's ResizeObserver; make it see the screen
  installCrossDocumentResizeObserver();
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.title = "Export render host";
  frame.dataset.reportExportHost = section.reportSectionId;
  // In the viewport (behind the page, fully transparent) rather than off-screen: browsers skip
  // or delay rendering steps for off-screen frames, so size observers, rAF-driven canvases and
  // lazy content would wait indefinitely or fire too late for the capture
  Object.assign(frame.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${EXPORT_VIEWPORT.width}px`,
    height: `${EXPORT_VIEWPORT.height}px`,
    border: "0",
    background: "#ffffff",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
  });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return null;
  }
  // about:blank inherits the parent's origin and base URL, so relative asset URLs still resolve
  doc.open();
  doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();
  copyStyles(document, doc);
  prepareWebGl(win);
  Object.assign(doc.body.style, { margin: "0", background: "#ffffff", overflow: "hidden" });
  const mount = doc.createElement("div");
  mount.style.width = `${Math.min(width, EXPORT_VIEWPORT.width)}px`;
  doc.body.appendChild(mount);
  // Styles for components rendered inside the screen go to its own <head>
  const cache = createCache({ key: "ot-export", container: doc.head });
  return { frame, win, doc, mount, cache };
}

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
  const { section, width, pixelRatio, hints = null } = job;
  const config = useReportConfig();
  const hooks = useCollectHooks();
  const outerTheme = useTheme();
  // The host's probe reports fetches started since the widget mounted (earlier ones don't gate readiness)
  const [busyProbe] = useState(() => config.createBusyProbe?.());
  const [screen, setScreen] = useState<Screen | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tables = useRef(new Map<string, ExportTableSnapshot>());
  const failure = useRef<string | null>(null);

  const sink = useCallback<ExportTableSink>((key, snapshot) => {
    if (snapshot) tables.current.set(key, snapshot);
    else tables.current.delete(key);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one screen per mounted job (the host keys frames by job id)
  useLayoutEffect(() => {
    const opened = openScreen(section, width);
    if (!opened) {
      onDone(job, missing("Could not create the export viewport"));
      return undefined;
    }
    setScreen(opened);
    return () => opened.frame.remove();
  }, []);

  // MUI's useMediaQuery evaluates against the screen's window, not the user's
  const screenTheme = useMemo<Theme | null>(() => {
    if (!screen) return null;
    const matchMedia = screen.win.matchMedia.bind(screen.win);
    return {
      ...outerTheme,
      components: {
        ...outerTheme.components,
        MuiUseMediaQuery: { defaultProps: { matchMedia, noSsr: true } },
      },
    };
  }, [screen, outerTheme]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one capture per screen (the host keys frames by job id)
  useEffect(() => {
    if (!screen) return undefined;
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
          const busy = (busyProbe?.() ?? false) || tableLoading || domBusy(root);
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
      await screen.doc.fonts?.ready;

      const target = captureTarget(root);
      if ((root.textContent ?? "").includes(NO_RENDERER_TEXT)) {
        return missing("No renderer registered for this section");
      }
      if (!hasContent(target)) return missing("Widget rendered no content");

      const adapter = hooks.widget?.(section);
      let tableData: TableData | undefined;
      let references: WidgetCapture["references"];
      try {
        tableData = adapter?.toTable?.(section, section.componentState);
      } catch {
        tableData = undefined;
      }
      tableData = tableData ?? firstTable(tables.current);
      try {
        references = adapter?.references?.(section);
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
  }, [screen]);

  if (!screen || !screenTheme) return null;
  return createPortal(
    <CacheProvider value={screen.cache}>
      <ThemeProvider theme={screenTheme}>
        <ExportTableSinkContext.Provider value={sink}>
          <ExportRenderHintsContext.Provider value={hints}>
          <CaptureErrorBoundary
            onError={(error) => {
              failure.current = `Widget failed to render: ${error.message}`;
            }}
          >
            {/* Same tree ReportSectionBody mounts */}
            <div ref={rootRef} style={{ width: "100%", padding: 14, boxSizing: "border-box" }}>
              <WidgetRenderer section={section} view={section.selectedView} />
            </div>
          </CaptureErrorBoundary>
          </ExportRenderHintsContext.Provider>
        </ExportTableSinkContext.Provider>
      </ThemeProvider>
    </CacheProvider>,
    screen.mount
  );
};

/**
 * Off-screen widget renderer. Mount `host` somewhere inside the app providers (the export
 * dialog does); `renderWidget` renders one widget at a time, inside a desktop-sized iframe,
 * and resolves with its capture. Successful captures are cached per (reportSectionId, width,
 * stateCapturedAt, pixelRatio, view, hints) for the hook's lifetime; failures aren't, so a retry
 * re-renders.
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

  const renderWidget = useCallback<RenderWidget>((section, width, pixelRatio, hints) => {
    const key = cacheKey(section, width, pixelRatio, hints);
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
            hints,
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

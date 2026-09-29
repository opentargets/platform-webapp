import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { useReportBuilder } from "../../../../providers/ReportBuilderProvider";
import type { Report } from "../../../../types/report";
import { isWidget } from "../../../../types/report";
import { collect } from "../collect";
import { withExportDefaults, withVideoDefaults } from "../defaults";
import { fetchDataRelease } from "../extract/provenance";
import {
  PAPER_PIXEL_RATIO,
  PAPER_WIDGET_PX,
  SLIDE_GEOMETRY,
  SLIDE_PIXEL_RATIO,
} from "../layout";
import { plan as runPlan } from "../plan";
import { planVideo, sameOverrides } from "../plan/video";
import type {
  BlockExportOverride,
  CollectOptions,
  DeepPartial,
  ExportDocument,
  ExportFile,
  ExportFormat,
  ExportPlan,
  ExportSettings,
  ExportTarget,
  VideoPlan,
  VideoSceneOverride,
  VideoSettings,
} from "../types";
import { runExport, type ExportResult } from "../writers";
import { nodeTitle } from "./nodeMeta";

/**
 * Export dialog state machine (spec §6.2):
 *   idle → target ─Next─► collecting ─► mapping ─Export─► rendering ─► done
 * error in collecting → target; Back from mapping → target; error in rendering → mapping.
 * Working PDF / Data skip mapping: target → collecting → rendering → done.
 * Video: target → collecting → mapping (storyboard) ─Next─► record; recording runs inside the step.
 */
export type FlowStep = "idle" | "target" | "collecting" | "mapping" | "rendering" | "done" | "record";

export type MappedTarget = "slides" | "paper";

export const isMappedTarget = (t?: ExportTarget): t is MappedTarget => t === "slides" || t === "paper";

/** Targets with a step 2 (mapping, or the video storyboard). */
export const hasStep2 = (t?: ExportTarget): t is MappedTarget | "video" => isMappedTarget(t) || t === "video";

// Video figures are laid out once at the 9:16 figure width and used in both aspect ratios, so
// switching aspect doesn't re-render widgets and hotspots stay on the same image
export const VIDEO_WIDGET_PX = 1200;

export interface Progress {
  done: number;
  total: number;
  label?: string;
}

interface Geometry {
  key: string;
  pixelRatio: number;
  widthFor: (reportSectionId: string) => number;
}

/** Widget render geometry for a target; the key changes only when some widget's width would. */
export const geometryFor = (target: ExportTarget, settings: ExportSettings, report: Report): Geometry => {
  if (target === "video") {
    return { key: "video", pixelRatio: SLIDE_PIXEL_RATIO, widthFor: () => VIDEO_WIDGET_PX };
  }
  if (target === "slides") {
    const { aspect } = settings.slides;
    const width = SLIDE_GEOMETRY[aspect].widgetPx;
    return { key: `slides:${aspect}`, pixelRatio: SLIDE_PIXEL_RATIO, widthFor: () => width };
  }
  if (target === "paper" && settings.paper.columns === 2) {
    // Only an explicit per-block spanColumns override changes a widget's width at collect time
    const spanning = report.sections
      .filter((s) => isWidget(s) && settings.overrides[s.reportSectionId]?.paper?.spanColumns === true)
      .map((s) => s.reportSectionId)
      .sort();
    const spanSet = new Set(spanning);
    return {
      key: `paper:2:${spanning.join(",")}`,
      pixelRatio: PAPER_PIXEL_RATIO,
      widthFor: (id) => (spanSet.has(id) ? PAPER_WIDGET_PX.fullWidth : PAPER_WIDGET_PX.halfColumn),
    };
  }
  // One-column paper, working PDF and data export all lay widgets out at full width
  return { key: "full", pixelRatio: PAPER_PIXEL_RATIO, widthFor: () => PAPER_WIDGET_PX.fullWidth };
};

export interface FlowError {
  message: string;
  nodeTitle?: string;
}

export interface FlowDone {
  format: ExportFormat;
  result: ExportResult;
  url?: string; // object URL for "Download again"
}

const isAbort = (e: unknown, signal?: AbortSignal) =>
  signal?.aborted || (e instanceof DOMException && e.name === "AbortError");

const describeError = (e: unknown, doc: ExportDocument | null): FlowError => {
  const message = e instanceof Error ? e.message : String(e);
  const nodeId = (e as { nodeId?: unknown } | null)?.nodeId;
  const node = typeof nodeId === "string" ? doc?.nodes.find((n) => n.id === nodeId) : undefined;
  return { message, nodeTitle: node ? nodeTitle(node) : undefined };
};

const triggerDownload = (file: ExportFile): string => {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return url;
};

export function useExportFlow(args: {
  report: Report;
  open: boolean;
  renderWidget: NonNullable<CollectOptions["renderWidget"]>;
}) {
  const { report, open, renderWidget } = args;
  const { dispatch } = useReportBuilder();
  const client = useApolloClient();

  const [step, setStep] = useState<FlowStep>("idle");
  const [target, setTarget] = useState<ExportTarget>("slides");
  const [collected, setCollected] = useState<{ key: string; doc: ExportDocument } | null>(null);
  const [collectProgress, setCollectProgress] = useState<Progress | null>(null);
  // A re-collect while mapping (geometry change, retry) keeps the old preview visible
  const [recollecting, setRecollecting] = useState(false);
  const [renderProgress, setRenderProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<FlowError | null>(null);
  const [done, setDone] = useState<FlowDone | null>(null);
  const [dataRelease, setDataRelease] = useState<string | undefined>();

  const settings = useMemo(() => withExportDefaults(report.exportSettings), [report.exportSettings]);

  // Latest values for async callbacks
  const reportRef = useRef(report);
  reportRef.current = report;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const renderWidgetRef = useRef(renderWidget);
  renderWidgetRef.current = renderWidget;

  const docCacheRef = useRef(new Map<string, ExportDocument>());
  const collectAbortRef = useRef<AbortController | null>(null);
  const sessionAbortRef = useRef<AbortController | null>(null);
  const releasePromiseRef = useRef<Promise<string | undefined> | null>(null);
  const downloadUrlRef = useRef<string | undefined>();

  const updateSettings = useCallback(
    (patch: DeepPartial<ExportSettings>) => {
      dispatch({ type: "updateReportExportSettings", reportId: reportRef.current.id, patch });
    },
    [dispatch]
  );

  const setOverride = useCallback(
    (mapped: MappedTarget, nodeId: string, override: DeepPartial<BlockExportOverride> | undefined) => {
      updateSettings({ overrides: { [nodeId]: { [mapped]: override } } } as DeepPartial<ExportSettings>);
    },
    [updateSettings]
  );

  const revokeDownload = () => {
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = undefined;
  };

  /** Collects the report for a geometry (cached per key unless `fresh`). */
  const collectFor = useCallback(
    async (geometry: Geometry, fresh = false): Promise<ExportDocument | null> => {
      const cached = docCacheRef.current.get(geometry.key);
      if (cached && !fresh) return cached;

      collectAbortRef.current?.abort();
      const controller = new AbortController();
      collectAbortRef.current = controller;
      const sessionSignal = sessionAbortRef.current?.signal;
      const onSessionAbort = () => controller.abort();
      sessionSignal?.addEventListener("abort", onSessionAbort);

      setCollectProgress(null);
      try {
        const release = await (releasePromiseRef.current ?? Promise.resolve(undefined)).catch(() => undefined);
        if (controller.signal.aborted) return null;
        const doc = await collect(reportRef.current, {
          widgetWidth: geometry.widthFor,
          renderWidget: (...a) => renderWidgetRef.current(...a),
          pixelRatio: geometry.pixelRatio,
          dataRelease: release,
          signal: controller.signal,
          onProgress: (d, total, label) => {
            if (!controller.signal.aborted) setCollectProgress({ done: d, total, label });
          },
        });
        if (controller.signal.aborted) return null;
        docCacheRef.current.set(geometry.key, doc);
        return doc;
      } finally {
        sessionSignal?.removeEventListener("abort", onSessionAbort);
        if (collectAbortRef.current === controller) collectAbortRef.current = null;
      }
    },
    []
  );

  const geometry = useMemo(() => geometryFor(target, settings, report), [target, settings, report]);

  // ---------- plan (pure; never re-collects) ----------

  // lastTarget/lastFormat don't affect the plan, so key on the parts that do
  const planKey = JSON.stringify([settings.slides, settings.paper, settings.overrides]);
  const planSettingsRef = useRef<{ key: string; settings: ExportSettings } | null>(null);
  if (planSettingsRef.current?.key !== planKey) planSettingsRef.current = { key: planKey, settings };
  const planSettings = planSettingsRef.current.settings;

  const doc = collected?.doc ?? null;
  const { plan, planError } = useMemo((): { plan: ExportPlan | null; planError?: string } => {
    if (!doc || !isMappedTarget(target)) return { plan: null };
    try {
      return { plan: runPlan(doc, target, planSettings) };
    } catch (e) {
      return { plan: null, planError: e instanceof Error ? e.message : String(e) };
    }
  }, [doc, target, planSettings]);

  // ---------- video ----------

  const videoSettings = useMemo(() => withVideoDefaults(settings.video), [settings.video]);
  const videoPlan = useMemo((): VideoPlan | null => {
    if (!doc || target !== "video") return null;
    return planVideo(doc, videoSettings);
  }, [doc, target, videoSettings]);
  const videoPlanRef = useRef(videoPlan);
  videoPlanRef.current = videoPlan;

  // Scenes are copied from the report once: persist new scenes (and drop deleted ones) as they appear
  useEffect(() => {
    if (!videoPlan || sameOverrides(videoPlan.overrides, videoSettings.scenes)) return;
    updateSettings({ video: { scenes: videoPlan.overrides } });
  }, [videoPlan, videoSettings.scenes, updateSettings]);

  const updateVideo = useCallback(
    (patch: DeepPartial<VideoSettings>) => updateSettings({ video: patch }),
    [updateSettings]
  );

  const updateScene = useCallback(
    (sceneId: string, patch: Partial<VideoSceneOverride>) => {
      const current = videoPlanRef.current?.overrides;
      if (!current) return;
      updateVideo({ scenes: current.map((o) => (o.sceneId === sceneId ? { ...o, ...patch } : o)) });
    },
    [updateVideo]
  );

  /** New order of scene ids; the title scene stays first and the end scene last. */
  const reorderScenes = useCallback(
    (order: string[]) => {
      const current = videoPlanRef.current?.overrides;
      if (!current) return;
      const byId = new Map(current.map((o) => [o.sceneId, o]));
      const middle = order.map((id) => byId.get(id)).filter((o): o is VideoSceneOverride => !!o && o.kind !== "title" && o.kind !== "end");
      const rest = current.filter((o) => o.kind !== "title" && o.kind !== "end" && !order.includes(o.sceneId));
      updateVideo({
        scenes: [...current.filter((o) => o.kind === "title"), ...middle, ...rest, ...current.filter((o) => o.kind === "end")],
      });
    },
    [updateVideo]
  );

  const goRecord = useCallback(() => {
    setError(null);
    setStep("record");
  }, []);

  // ---------- export ----------

  const exportWith = useCallback(
    async (exportTarget: ExportTarget, format: ExportFormat, exportDoc: ExportDocument, exportPlan: ExportPlan | null) => {
      const signal = sessionAbortRef.current?.signal;
      setStep("rendering");
      setRenderProgress(null);
      setError(null);
      updateSettings({ lastTarget: exportTarget, lastFormat: format });
      try {
        const result = await runExport({
          target: exportTarget,
          format,
          plan: exportPlan,
          report: reportRef.current,
          ctx: {
            doc: exportDoc,
            settings: settingsRef.current,
            onProgress: (d, total, label) => {
              if (!signal?.aborted) setRenderProgress({ done: d, total, label });
            },
          },
        });
        if (signal?.aborted) return;
        revokeDownload();
        const url = result.kind === "file" ? triggerDownload(result.file) : undefined;
        downloadUrlRef.current = url;
        setDone({ format, result, url });
        setStep("done");
      } catch (e) {
        if (isAbort(e, signal)) return;
        setError(describeError(e, exportDoc));
        setStep(isMappedTarget(exportTarget) ? "mapping" : "target");
      }
    },
    [updateSettings]
  );

  /** Step 1 → collecting → mapping (slides/paper) or straight to rendering (working/data). */
  const startTarget = useCallback(
    async (next: ExportTarget, format?: ExportFormat) => {
      setTarget(next);
      setError(null);
      setStep("collecting");
      const g = geometryFor(next, settingsRef.current, reportRef.current);
      let result: ExportDocument | null;
      try {
        result = await collectFor(g);
      } catch (e) {
        if (isAbort(e, sessionAbortRef.current?.signal)) return;
        setError(describeError(e, null));
        setStep("target");
        return;
      }
      if (!result) return; // superseded or dialog closed
      setCollected({ key: g.key, doc: result });
      if (hasStep2(next)) {
        updateSettings({ lastTarget: next });
        setStep("mapping");
      } else {
        await exportWith(next, format ?? (next === "data" ? "csvzip" : "pdf"), result, null);
      }
    },
    [collectFor, exportWith, updateSettings]
  );

  // Re-collect in mapping only when widget geometry changes (aspect, columns, spanColumns override)
  const geometryKey = geometry.key;
  useEffect(() => {
    if (step !== "mapping" || !isMappedTarget(target)) return;
    if (collected?.key === geometryKey) {
      // Toggled back to the geometry already shown: drop any in-flight re-collect
      if (collectAbortRef.current) {
        collectAbortRef.current.abort();
        setRecollecting(false);
      }
      return;
    }
    let cancelled = false;
    const g = geometryFor(target, settingsRef.current, reportRef.current);
    setRecollecting(true);
    collectFor(g)
      .then((result) => {
        if (!cancelled && result) setCollected({ key: g.key, doc: result });
      })
      .catch((e) => {
        if (!cancelled && !isAbort(e)) setError(describeError(e, null));
      })
      .finally(() => {
        if (!cancelled) setRecollecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, target, geometryKey, collected?.key, collectFor]);

  /** Re-render widgets that failed; RenderHost's cache keeps the successful ones. */
  const retry = useCallback(async () => {
    const g = geometryFor(target, settingsRef.current, reportRef.current);
    setRecollecting(true);
    setError(null);
    try {
      const result = await collectFor(g, true);
      if (result) setCollected({ key: g.key, doc: result });
    } catch (e) {
      if (!isAbort(e)) setError(describeError(e, null));
    } finally {
      setRecollecting(false);
    }
  }, [collectFor, target]);

  const exportFormat = useCallback(
    (format: ExportFormat) => {
      if (!doc) return;
      void exportWith(target, format, doc, plan);
    },
    [doc, exportWith, plan, target]
  );

  const back = useCallback(() => {
    collectAbortRef.current?.abort();
    setRecollecting(false);
    setError(null);
    setStep("target");
  }, []);

  const backToMapping = useCallback(() => {
    setError(null);
    setStep(hasStep2(target) ? "mapping" : "target");
  }, [target]);

  const downloadAgain = useCallback(() => {
    if (!done || done.result.kind !== "file" || !done.url) return;
    const link = document.createElement("a");
    link.href = done.url;
    link.download = done.result.file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [done]);

  // "Print again" re-runs the print writer with the same plan
  const printAgain = useCallback(() => {
    if (!done || !doc) return;
    void exportWith(target, done.format, doc, plan);
  }, [doc, done, exportWith, plan, target]);

  // ---------- open / close ----------

  const startTargetRef = useRef(startTarget);
  startTargetRef.current = startTarget;

  useEffect(() => {
    if (!open) return undefined;
    const session = new AbortController();
    sessionAbortRef.current = session;
    docCacheRef.current = new Map();

    const release = fetchDataRelease(client).catch(() => undefined);
    releasePromiseRef.current = release;
    release.then((r) => {
      if (!session.signal.aborted) setDataRelease(r);
    });

    const last = settingsRef.current.lastTarget;
    setCollected(null);
    setDone(null);
    setError(null);
    setRenderProgress(null);
    setCollectProgress(null);
    if (hasStep2(last)) {
      void startTargetRef.current(last);
    } else {
      setTarget(last ?? "slides");
      setStep("target");
    }

    return () => {
      // Discard everything collected for this session (spec §8)
      session.abort();
      collectAbortRef.current?.abort();
      collectAbortRef.current = null;
      sessionAbortRef.current = null;
      docCacheRef.current = new Map();
      revokeDownload();
      setCollected(null);
      setDone(null);
      setRecollecting(false);
      setStep("idle");
    };
  }, [open, client]);

  return {
    step,
    target,
    setTarget,
    settings,
    updateSettings,
    setOverride,
    dataRelease,
    doc,
    plan,
    planError,
    collectProgress,
    recollecting,
    renderProgress,
    error,
    clearError: () => setError(null),
    done,
    startTarget,
    retry,
    exportFormat,
    back,
    backToMapping,
    downloadAgain,
    printAgain,
    videoSettings,
    videoPlan,
    updateVideo,
    updateScene,
    reorderScenes,
    goRecord,
  };
}

export type ExportFlow = ReturnType<typeof useExportFlow>;

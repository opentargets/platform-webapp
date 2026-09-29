import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faX } from "@fortawesome/free-solid-svg-icons";
import type { Report } from "../../../../types/report";
import { useRenderHost } from "../RenderHost";
import type { ExportFormat, ExportTarget, ExportWarning } from "../types";
import { PaperMappingStep } from "./PaperMappingStep";
import { RenderStep } from "./RenderStep";
import { SlidesMappingStep } from "./SlidesMappingStep";
import { TargetStep } from "./TargetStep";
import { flaggedNodeIds, formatDate, rowDomId } from "./nodeMeta";
import { FlowStep, hasStep2, isMappedTarget, Progress, useExportFlow } from "./useExportFlow";
import { VideoRenderStep } from "./video/VideoRenderStep";
import { VideoStoryboardStep } from "./video/VideoStoryboardStep";

const stepsFor = (target: ExportTarget) =>
  target === "video" ? ["Target", "Storyboard", "Render"] : ["Target", "Mapping", "Render"];

const stepIndex = (step: FlowStep, target: ExportTarget): number => {
  if (step === "target" || step === "idle") return 0;
  if (step === "collecting") return hasStep2(target) ? 1 : 2;
  if (step === "mapping") return 1;
  return 2;
};

const Stepper: React.FC<{ current: number; steps: string[] }> = ({ current, steps }) => (
  <Box
    component="ol"
    aria-label="Export steps"
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      m: 0,
      p: 0,
      listStyle: "none",
      fontFamily: "'Roboto Mono', monospace",
      fontSize: 11,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}
  >
    {steps.map((label, i) => (
      <React.Fragment key={label}>
        {i > 0 && (
          <Box component="li" aria-hidden sx={{ color: "grey.400" }}>
            —
          </Box>
        )}
        <Box
          component="li"
          aria-current={i === current ? "step" : undefined}
          sx={{
            color: i === current ? "primary.dark" : i < current ? "text.secondary" : "text.disabled",
            fontWeight: i === current ? 700 : 400,
            whiteSpace: "nowrap",
          }}
        >
          {i + 1} {label}
        </Box>
      </React.Fragment>
    ))}
  </Box>
);

const CollectingProgress: React.FC<{ progress: Progress | null; compact?: boolean }> = ({ progress, compact }) => {
  const hasTotal = !!progress && progress.total > 0;
  const text = hasTotal ? `Preparing figures ${progress!.done} / ${progress!.total}` : "Preparing figures…";
  const value = hasTotal ? (progress!.done / progress!.total) * 100 : undefined;
  if (compact) {
    return (
      <Box sx={{ px: 2, py: 0.75, borderBottom: "1px solid", borderColor: "grey.300", bgcolor: "#f5f9fd" }} aria-live="polite">
        <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.5 }}>Re-rendering figures at the new size · {text}</Typography>
        <LinearProgress variant={value === undefined ? "indeterminate" : "determinate"} value={value} sx={{ height: 3 }} />
      </Box>
    );
  }
  return (
    <Box sx={{ p: 4, maxWidth: 520, mx: "auto", width: "100%" }} aria-live="polite">
      <Typography sx={{ fontSize: 14, mb: 1.5 }}>{text}</Typography>
      <LinearProgress variant={value === undefined ? "indeterminate" : "determinate"} value={value} />
      {progress?.label && (
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }} noWrap>
          {progress.label}
        </Typography>
      )}
    </Box>
  );
};

const FORMAT_LABEL: Partial<Record<ExportFormat, string>> = {
  pptx: "PPTX",
  pdf: "PDF",
  docx: "DOCX",
  md: "Markdown",
};

// Primary format first, then secondary formats (spec §6.4 footer)
const MAPPED_FORMATS: Record<"slides" | "paper", ExportFormat[]> = {
  slides: ["pptx", "pdf"],
  paper: ["pdf", "docx", "md"],
};

const DIRECT_FORMAT: Record<"working" | "data", ExportFormat> = { working: "pdf", data: "csvzip" };

interface ExportDialogProps {
  report: Report;
  open: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ report, open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { host, renderWidget } = useRenderHost();
  const flow = useExportFlow({ report, open, renderWidget });
  const { step, target, plan, doc, settings } = flow;
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setBlocksOpen(false);
      setVideoBusy(false);
    }
  }, [open]);

  const warningsByNode = useMemo(() => {
    const map = new Map<string, ExportWarning[]>();
    plan?.warnings.forEach((w) => {
      if (!w.nodeId) return;
      const list = map.get(w.nodeId);
      if (list) list.push(w);
      else map.set(w.nodeId, [w]);
    });
    return map;
  }, [plan]);

  const flagged = useMemo(() => (plan ? flaggedNodeIds(plan.warnings) : []), [plan]);

  const infoWarnings = useMemo(
    () => (plan?.warnings ?? doc?.warnings ?? []).filter((w) => w.severity === "info"),
    [plan, doc]
  );

  const scrollToFirstFlagged = useCallback(() => {
    const first = flagged[0];
    if (!first) return;
    const scroll = () =>
      document.getElementById(rowDomId(first))?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (target === "paper" && !blocksOpen) {
      setBlocksOpen(true);
      // Wait for the collapse to mount the rows
      window.setTimeout(scroll, 250);
    } else {
      scroll();
    }
  }, [blocksOpen, flagged, target]);

  const busy = step === "collecting" || step === "rendering";
  const current = stepIndex(step, target);
  const isMapping = step === "mapping";
  const fullHeight = isMapping || step === "record";
  const releaseText = `Open Targets ${flow.dataRelease ?? "Platform"} · ${formatDate(Date.now())}`;

  const errorAlert = flow.error && (
    <Alert severity="error" onClose={flow.clearError} sx={{ borderRadius: 0 }}>
      {flow.error.nodeTitle ? (
        <>
          Export failed at <strong>{flow.error.nodeTitle}</strong>: {flow.error.message}
        </>
      ) : (
        flow.error.message
      )}
    </Alert>
  );

  let body: React.ReactNode = null;
  if (step === "target") {
    body = (
      <TargetStep
        target={target}
        onSelect={flow.setTarget}
        includeImages={settings.includeImages}
        onIncludeImagesChange={(includeImages) => flow.updateSettings({ includeImages })}
      />
    );
  } else if (step === "collecting") {
    body = <CollectingProgress progress={flow.collectProgress} />;
  } else if (isMapping && target === "video") {
    body = flow.videoPlan ? (
      <VideoStoryboardStep
        plan={flow.videoPlan}
        settings={flow.videoSettings}
        dataRelease={doc?.dataRelease ?? flow.dataRelease}
        updateVideo={flow.updateVideo}
        updateScene={flow.updateScene}
        reorderScenes={flow.reorderScenes}
      />
    ) : (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  } else if (step === "record" && flow.videoPlan) {
    body = (
      <VideoRenderStep
        reportName={report.name}
        plan={flow.videoPlan}
        settings={flow.videoSettings}
        dataRelease={doc?.dataRelease ?? flow.dataRelease}
        updateVideo={flow.updateVideo}
        onBusyChange={setVideoBusy}
      />
    );
  } else if (isMapping) {
    if (!plan || !doc) {
      body = flow.planError ? (
        <Alert severity="error" sx={{ m: 2 }}>
          Could not build the {target} layout: {flow.planError}
        </Alert>
      ) : (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
          <CircularProgress size={28} />
        </Box>
      );
    } else if (target === "slides") {
      body = (
        <SlidesMappingStep
          report={report}
          doc={doc}
          plan={plan}
          settings={settings}
          warningsByNode={warningsByNode}
          updateSettings={flow.updateSettings}
          setOverride={flow.setOverride}
          onRetry={flow.retry}
          retrying={flow.recollecting}
        />
      );
    } else {
      body = (
        <PaperMappingStep
          report={report}
          doc={doc}
          plan={plan}
          settings={settings}
          warningsByNode={warningsByNode}
          blocksOpen={blocksOpen}
          onBlocksOpenChange={setBlocksOpen}
          updateSettings={flow.updateSettings}
          setOverride={flow.setOverride}
          onRetry={flow.retry}
          retrying={flow.recollecting}
        />
      );
    }
  } else if (step === "rendering" || step === "done") {
    body = (
      <RenderStep
        target={target}
        progress={flow.renderProgress}
        done={step === "done" ? flow.done : null}
        infoWarnings={infoWarnings}
      />
    );
  }

  let actions: React.ReactNode = null;
  if (step === "target" || (step === "collecting" && !hasStep2(target))) {
    const direct = target === "working" || target === "data";
    actions = (
      <>
        <Typography sx={{ fontStyle: "italic", fontSize: 12, color: "text.secondary", mr: "auto", pl: 1 }}>
          {releaseText}
        </Typography>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => (direct ? flow.startTarget(target, DIRECT_FORMAT[target]) : flow.startTarget(target))}
          sx={{ textTransform: "none" }}
        >
          {direct ? "Export" : target === "video" ? "Next · storyboard" : "Next · mapping"}
        </Button>
      </>
    );
  } else if (step === "collecting") {
    actions = (
      <>
        <Button onClick={flow.back} sx={{ textTransform: "none", mr: "auto" }}>
          Back
        </Button>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
      </>
    );
  } else if (isMapping && target === "video") {
    actions = (
      <>
        <Button onClick={flow.back} sx={{ textTransform: "none", mr: "auto" }}>
          Back
        </Button>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!flow.videoPlan} onClick={flow.goRecord} sx={{ textTransform: "none" }}>
          Next · render
        </Button>
      </>
    );
  } else if (step === "record") {
    actions = (
      <>
        <Button onClick={flow.backToMapping} disabled={videoBusy} sx={{ textTransform: "none", mr: "auto" }}>
          Back to storyboard
        </Button>
        <Button variant="contained" onClick={onClose} sx={{ textTransform: "none" }}>
          Done
        </Button>
      </>
    );
  } else if (isMapping && isMappedTarget(target)) {
    const [primary, ...secondary] = MAPPED_FORMATS[target];
    const disabled = !plan || flow.recollecting;
    actions = (
      <>
        <Box sx={{ mr: "auto", pl: 1, minWidth: 0 }}>
          {flagged.length > 0 && (
            <Button
              size="small"
              color="secondary"
              onClick={scrollToFirstFlagged}
              startIcon={<FontAwesomeIcon icon={faTriangleExclamation} />}
              sx={{ textTransform: "none", fontSize: 13 }}
            >
              {flagged.length} block{flagged.length === 1 ? "" : "s"} flagged for manual review
            </Button>
          )}
        </Box>
        <Button onClick={flow.back} sx={{ textTransform: "none" }}>
          Back
        </Button>
        {secondary.map((f) => (
          <Button
            key={f}
            variant="outlined"
            disabled={disabled}
            onClick={() => flow.exportFormat(f)}
            sx={{ textTransform: "none" }}
          >
            {target === "slides" ? `Export ${FORMAT_LABEL[f]}` : FORMAT_LABEL[f]}
          </Button>
        ))}
        <Button
          variant="contained"
          disabled={disabled}
          onClick={() => flow.exportFormat(primary)}
          sx={{ textTransform: "none" }}
        >
          Export {FORMAT_LABEL[primary]}
        </Button>
      </>
    );
  } else if (step === "rendering") {
    actions = (
      <Button onClick={onClose} sx={{ textTransform: "none" }}>
        Cancel
      </Button>
    );
  } else if (step === "done" && flow.done) {
    const printed = flow.done.result.kind === "printed";
    actions = (
      <>
        <Button
          onClick={isMappedTarget(target) ? flow.backToMapping : flow.back}
          sx={{ textTransform: "none", mr: "auto" }}
        >
          {isMappedTarget(target) ? "Back to mapping" : "Back"}
        </Button>
        <Button
          variant="outlined"
          onClick={printed ? flow.printAgain : flow.downloadAgain}
          sx={{ textTransform: "none" }}
        >
          {printed ? "Print again" : "Download again"}
        </Button>
        <Button variant="contained" onClick={onClose} sx={{ textTransform: "none" }}>
          Done
        </Button>
      </>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="report-export-dialog-title"
      slotProps={{
        paper: {
          sx: fullHeight && !fullScreen ? { height: "calc(100% - 64px)" } : undefined,
        },
      }}
    >
      <DialogTitle
        id="report-export-dialog-title"
        sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", py: 1.5, pr: 7 }}
      >
        <Typography component="span" sx={{ fontWeight: 700, fontSize: 18 }} noWrap>
          Export · {report.name}
        </Typography>
        <Stepper current={current} steps={stepsFor(target)} />
        <IconButton aria-label="Close export" onClick={onClose} sx={{ position: "absolute", right: 12, top: 10 }} size="small">
          <FontAwesomeIcon icon={faX} size="xs" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ p: 0, display: "flex", flexDirection: "column", minHeight: fullHeight ? 0 : 320, overflow: fullHeight && !fullScreen ? "hidden" : "auto" }}
      >
        {errorAlert}
        {isMapping && flow.recollecting && <CollectingProgress progress={flow.collectProgress} compact />}
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body}</Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, flexWrap: "wrap" }}>{actions}</DialogActions>

      {/* Off-screen widget renderer (inside the app providers) */}
      {host}
    </Dialog>
  );
};

export default ExportDialog;

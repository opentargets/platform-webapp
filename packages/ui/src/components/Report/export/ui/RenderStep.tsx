import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faPrint } from "@fortawesome/free-solid-svg-icons";
import type { ExportTarget, ExportWarning } from "../types";
import { formatBytes } from "./nodeMeta";
import type { FlowDone, Progress } from "./useExportFlow";

const UNIT_WORD: Record<ExportTarget, string> = {
  slides: "slide",
  paper: "section",
  working: "block",
  data: "file",
};

export const progressText = (target: ExportTarget, progress: Progress | null): string =>
  progress && progress.total > 0
    ? `Rendering ${UNIT_WORD[target]} ${Math.max(1, Math.min(progress.done, progress.total))} / ${progress.total}`
    : "Rendering…";

interface RenderStepProps {
  target: ExportTarget;
  progress: Progress | null;
  done: FlowDone | null;
  infoWarnings: ExportWarning[];
}

export const RenderStep: React.FC<RenderStepProps> = ({ target, progress, done, infoWarnings }) => {
  if (!done) {
    const value = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : undefined;
    return (
      <Box sx={{ p: 4, maxWidth: 520, mx: "auto", width: "100%" }} aria-live="polite">
        <Typography sx={{ fontSize: 14, mb: 1.5 }}>{progressText(target, progress)}</Typography>
        <LinearProgress variant={value === undefined ? "indeterminate" : "determinate"} value={value} />
        {progress?.label && (
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }} noWrap>
            {progress.label}
          </Typography>
        )}
      </Box>
    );
  }

  const { result } = done;
  return (
    <Box sx={{ p: 4, maxWidth: 560, mx: "auto", width: "100%" }} aria-live="polite">
      {result.kind === "printed" ? (
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box sx={{ color: "primary.main", fontSize: 22, mt: "2px" }}>
            <FontAwesomeIcon icon={faPrint} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Sent to the print dialog</Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>
              Choose &ldquo;Save as PDF&rdquo; in the print dialog. If you closed it, use Print again.
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box sx={{ color: "success.main", fontSize: 22, mt: "2px" }}>
            <FontAwesomeIcon icon={faCircleCheck} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>Export ready — download started</Typography>
            <Typography
              sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 13, mt: 0.5, overflowWrap: "anywhere" }}
            >
              {result.file.fileName}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{formatBytes(result.file.blob.size)}</Typography>
          </Box>
        </Box>
      )}

      {infoWarnings.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 0.5 }}>Notes</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {infoWarnings.map((w) => (
              <Typography component="li" key={`${w.nodeId}-${w.code}-${w.message}`} sx={{ fontSize: 13, color: "text.secondary" }}>
                {w.message}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RenderStep;

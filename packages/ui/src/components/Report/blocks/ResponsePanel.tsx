import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { fitsStorageBudget, useReportBuilder } from "../../../providers/ReportBuilderProvider";
import { DataBlock } from "../../../types/report";
import { useBlockEditor } from "./BlockEditorContext";
import { DataResultView } from "./DataResultView";
import { DataResult } from "./dataResultsStore";
import { makeSnapshotData, resolveRows } from "./dataPaths";
import { monoSx, shortDate } from "./DataBlockShell";

export const columnLabelSx = { fontSize: 12, fontWeight: 700, color: "#616161", mb: 0.75 } as const;

/**
 * What a run-able block shows: the live result if it succeeded, else the saved snapshot
 */
export const displayedResult = (block: DataBlock, result?: DataResult) => {
  if (result?.status === "success")
    return { data: result.data, rawText: result.rawText, fromSnapshot: false };
  if (block.snapshot && result?.status !== "error") {
    return { data: block.snapshot.data, rawText: undefined, fromSnapshot: true };
  }
  return { data: undefined, rawText: undefined, fromSnapshot: false };
};

interface ResponsePanelProps {
  block: DataBlock;
  result?: DataResult;
  onRetry?: () => void;
}

/**
 * Response column: errors (with Retry), `Save snapshot`, and the result view
 */
export const ResponsePanel: React.FC<ResponsePanelProps> = ({ block, result, onRetry }) => {
  const { state, dispatch } = useReportBuilder();
  const { updateBlock } = useBlockEditor();
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const shown = displayedResult(block, result);

  const saveSnapshot = () => {
    if (result?.status !== "success") return;
    setSnapshotError(null);
    const { path } = resolveRows(result.data, block.rowsPath);
    const capped = makeSnapshotData(
      result.rawText ?? result.data,
      result.rawText !== undefined ? null : path
    );
    if ("error" in capped) {
      setSnapshotError(capped.error);
      return;
    }
    const snapshot = {
      data: capped.data,
      at: Date.now(),
      status: result.httpStatus,
      durationMs: result.durationMs,
      truncated: capped.truncated || undefined,
    };
    const addedBytes = JSON.stringify(snapshot).length - JSON.stringify(block.snapshot ?? null).length;
    if (!fitsStorageBudget(state.reports, addedBytes)) {
      setSnapshotError("This snapshot won't fit in the browser's report storage.");
      return;
    }
    dispatch({ type: "setBlockSnapshot", reportSectionId: block.reportSectionId, snapshot });
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography sx={{ ...columnLabelSx, mb: 0, flex: 1 }}>Response</Typography>
        {shown.fromSnapshot && block.snapshot && (
          <Typography sx={{ ...monoSx, fontSize: 11, color: "grey.600" }}>
            snapshot · {shortDate(block.snapshot.at)}
            {block.snapshot.truncated ? " · truncated" : ""}
          </Typography>
        )}
        {result?.status === "success" && (
          <Button size="small" onClick={saveSnapshot} sx={{ textTransform: "none", py: 0 }}>
            {block.snapshot ? "Update snapshot" : "Save snapshot"}
          </Button>
        )}
      </Box>

      {snapshotError && (
        <Typography role="alert" sx={{ fontSize: 12, color: "#ff6350", mb: 1 }}>
          {snapshotError}
        </Typography>
      )}

      {result?.status === "error" && (
        <Box
          role="alert"
          sx={{ border: "1px solid #ff6350", bgcolor: "#ffefec", borderRadius: "2px", p: "8px 10px", mb: 1 }}
        >
          {result.error && <Typography sx={{ fontSize: 13, color: "#c0392b" }}>{result.error}</Typography>}
          {result.graphqlErrors?.map((e, i) => (
            <Typography key={i} sx={{ ...monoSx, color: "#c0392b", mt: 0.5 }}>
              {e.message}
              {e.path?.length ? ` — at ${e.path.join(".")}` : ""}
            </Typography>
          ))}
          {onRetry && (
            <Button
              size="small"
              onClick={onRetry}
              sx={{ textTransform: "none", mt: 0.5, px: 0, color: "#c0392b" }}
            >
              Retry
            </Button>
          )}
        </Box>
      )}

      {shown.data !== undefined || shown.rawText !== undefined ? (
        <DataResultView
          data={shown.data}
          rawText={
            shown.rawText ?? (typeof shown.data === "string" && shown.fromSnapshot ? shown.data : undefined)
          }
          display={block.display}
          rowsPath={block.rowsPath}
          onDisplayChange={(display) => updateBlock(block.reportSectionId, { display })}
          onRowsPathChange={(rowsPath) => updateBlock(block.reportSectionId, { rowsPath })}
        />
      ) : (
        result?.status !== "error" && (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "grey.300",
              borderRadius: "2px",
              p: 2,
              textAlign: "center",
              fontSize: 13,
              color: "text.secondary",
            }}
          >
            {result?.status === "running" ? "Running…" : "Run the request to see a response (Ctrl/⌘+Enter)."}
          </Box>
        )
      )}
    </Box>
  );
};

export default ResponsePanel;

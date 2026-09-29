import React, { useMemo, useState } from "react";
import { Box, Button, Link, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { NotebookBlock, NotebookDisplay } from "../../../../types/report";
import { columnLabelSx } from "../ResponsePanel";
import { JsonTree, RowsTable } from "../DataResultView";
import { monoSx } from "../DataBlockShell";
import type { NotebookResult } from "./notebookResultsStore";
import type { NotebookRunner } from "./useNotebookRunner";
import { inferColumns, type ResolvedInput } from "./resolveInputs";
import { PANE_HEADER_HEIGHT, PANE_HEIGHT } from "./protocol";

type Success = Extract<NotebookResult, { status: "success" }>;

interface NotebookOutputProps {
  block: NotebookBlock;
  runner: NotebookRunner;
  result?: NotebookResult;
  lastGood?: Success;
  inputs: ResolvedInput[];
  onDisplayChange: (display: NotebookDisplay) => void;
  onJumpToError: (line: number, column?: number) => void;
  onGoToBlock: (blockId: string) => void;
}

const isRowArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && !Array.isArray(v));

const snapshotSrc = (block: NotebookBlock): string | undefined => {
  if (block.snapshot?.svg) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(block.snapshot.svg)}`;
  return block.snapshot?.png;
};

/** Which views fit a result: chart for DOM output, table for row arrays, value for the rest. */
const availableViews = (result?: Success): Set<Exclude<NotebookDisplay, "auto">> => {
  const views = new Set<Exclude<NotebookDisplay, "auto">>();
  if (!result) return views;
  if (result.outputType === "dom" || result.outputType === "both") views.add("chart");
  if (result.outputType === "data" || result.outputType === "value" || result.outputType === "both") {
    if (isRowArray(result.value)) views.add("table");
    views.add("value");
  }
  return views;
};

const ValueView: React.FC<{ value: unknown }> = ({ value }) =>
  typeof value === "object" && value !== null ? (
    <JsonTree data={value} />
  ) : (
    <Box sx={{ ...monoSx, fontSize: 14, p: 1, wordBreak: "break-word" }}>{JSON.stringify(value)}</Box>
  );

/**
 * Right pane: the sandbox iframe (chart output), or a table / value view of a
 * data return, with the error panel and snapshot fallback.
 */
export const NotebookOutput: React.FC<NotebookOutputProps> = ({
  block,
  runner,
  result,
  lastGood,
  inputs,
  onDisplayChange,
  onJumpToError,
  onGoToBlock,
}) => {
  const [showLastGood, setShowLastGood] = useState(false);
  const [dataTab, setDataTab] = useState<"chart" | "data">("chart");

  const success = result?.status === "success" ? result : undefined;
  const failed = result?.status === "error" ? result : undefined;
  const running = result?.status === "running";
  const shown = success ?? (failed && showLastGood ? lastGood : undefined);
  const views = availableViews(shown);

  const effective: Exclude<NotebookDisplay, "auto"> | null = useMemo(() => {
    if (!shown) return null;
    if (block.display !== "auto" && views.has(block.display)) return block.display;
    if (shown.outputType === "both") return dataTab === "data" ? (views.has("table") ? "table" : "value") : "chart";
    if (views.has("chart")) return "chart";
    if (views.has("table")) return "table";
    return "value";
  }, [block.display, shown, views, dataTab]);

  const rows = shown && isRowArray(shown.value) ? shown.value : null;
  const columns = useMemo(
    () =>
      rows
        ? inferColumns(rows).map((c) => ({
            key: c.key,
            label: c.label,
            type: c.type === "number" || c.type === "boolean" ? c.type : ("string" as const),
          }))
        : [],
    [rows]
  );

  // The live iframe only shows a chart from the current run; an older chart is only
  // available as the stored snapshot
  const liveChart = effective === "chart" && !!success;
  const snapshot = snapshotSrc(block);
  // Keep the frame visible while a run is in flight (a hidden frame gets its timers throttled)
  const frameVisible = liveChart || (running && !snapshot);
  const showSnapshot =
    !!snapshot && ((!result && !!block.snapshot) || running || (failed && showLastGood && !success));

  const errorInput = failed?.error.kind === "input" ? inputs.find((i) => i.ref === failed.error.inputRef) : undefined;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, flexWrap: "wrap", minHeight: PANE_HEADER_HEIGHT }}>
        <Typography sx={{ ...columnLabelSx, mb: 0, flex: 1 }}>Output</Typography>
        {shown?.outputType === "both" && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={dataTab}
            onChange={(_, v: "chart" | "data" | null) => v && setDataTab(v)}
            aria-label="Chart or data"
            sx={{ "& .MuiToggleButton-root": { py: 0, textTransform: "none", fontSize: 12 } }}
          >
            <ToggleButton value="chart">Chart</ToggleButton>
            <ToggleButton value="data">Data</ToggleButton>
          </ToggleButtonGroup>
        )}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={block.display}
          onChange={(_, v: NotebookDisplay | null) => v && onDisplayChange(v)}
          aria-label="Output display"
          sx={{ "& .MuiToggleButton-root": { py: 0, textTransform: "none", fontSize: 12 } }}
        >
          <ToggleButton value="auto">Auto</ToggleButton>
          <ToggleButton value="chart" disabled={!!shown && !views.has("chart")}>
            Chart
          </ToggleButton>
          <ToggleButton value="table" disabled={!!shown && !views.has("table")}>
            Table
          </ToggleButton>
          <ToggleButton value="value" disabled={!!shown && !views.has("value")}>
            Value
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Fixed-height viewport, level with the code pane; taller output scrolls inside it.
          Its border (not the frame's) stays put, so switching views never changes the frame's width. */}
      <Box
        sx={{
          height: block.height ?? PANE_HEIGHT,
          overflow: "auto",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: "2px",
          bgcolor: "#fff",
        }}
      >
        {failed && (
          <Box
            role="alert"
            sx={{ border: "1px solid #ff6350", bgcolor: "#ffefec", borderRadius: "2px", p: "8px 10px", m: 1 }}
          >
            <Typography sx={{ ...monoSx, fontSize: 11, color: "#c0392b", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {failed.error.kind} error
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#c0392b", mt: 0.25, whiteSpace: "pre-wrap" }}>
              {failed.error.message}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: 0.5, flexWrap: "wrap" }}>
              {failed.error.line !== undefined && (
                <Button
                  size="small"
                  onClick={() => onJumpToError(failed.error.line as number, failed.error.column)}
                  sx={{ ...monoSx, textTransform: "none", px: 0, color: "#c0392b", minWidth: 0 }}
                >
                  line {failed.error.line}
                  {failed.error.column !== undefined ? `:${failed.error.column}` : ""}
                </Button>
              )}
              {errorInput?.summary.blockId && (
                <Button
                  size="small"
                  onClick={() => onGoToBlock(errorInput.summary.blockId as string)}
                  sx={{ textTransform: "none", px: 0, color: "#c0392b", minWidth: 0 }}
                >
                  Go to {errorInput.ref}
                </Button>
              )}
              {(lastGood || snapshot) && (
                <Link
                  component="button"
                  type="button"
                  onClick={() => setShowLastGood((s) => !s)}
                  sx={{ fontSize: 12, color: "#c0392b" }}
                >
                  {showLastGood ? "Hide last good output" : "Show last good output"}
                </Link>
              )}
            </Box>
          </Box>
        )}

        {showSnapshot && snapshot && (
          <Box>
            {/* Stored SVG is only ever shown as an image, never inlined as markup */}
            <img
              src={snapshot}
              alt={`${block.title} (snapshot)`}
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
          </Box>
        )}

        {/* The sandbox lives here; hidden (not unmounted) when a data view is shown so its width stays right */}
        <Box ref={runner.attach} sx={{ overflow: "hidden", height: frameVisible ? "auto" : 0 }} />

        {shown && effective === "table" && rows && <RowsTable rows={rows} columns={columns} />}
        {shown && effective === "value" && <ValueView value={shown.value} />}

        {!shown && !showSnapshot && !failed && !running && (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              textAlign: "center",
              fontSize: 13,
              color: "text.secondary",
            }}
          >
            {runner.ready
                ? "Run the notebook to see its output (Ctrl/⌘+Enter)."
                : "Loading the sandbox…"}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotebookOutput;

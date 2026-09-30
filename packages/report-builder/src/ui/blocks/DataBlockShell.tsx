import React, { ReactNode, useEffect, useState } from "react";
import { Avatar, Box, Button, CircularProgress, InputBase, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { DataBlock, DataSnapshot } from "../../core";
import { CollapsibleBlockRow } from "./BlockFrames";
import { BlockMenuItem } from "./BlockMenu";
import { FOCUS_TARGET_ATTR, useBlockEditor } from "./BlockEditorContext";
import { CaptionField, captionSx } from "./ImageBlockView";
import { DataResult } from "./dataResultsStore";
import { downloadCsv, downloadJson, resolveRows } from "./dataPaths";
import { useReportBuilder } from "../../react";
import { BlockViewProps } from "./types";
import { tableLabel } from "./figures";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const monoSx = { fontFamily: '"Roboto Mono", monospace', fontSize: 12 } as const;

type PillTone = "neutral" | "primary" | "error";

const PILL_TONES: Record<PillTone, { bg: string; border: string; color: string }> = {
  neutral: { bg: "grey.100", border: "grey.400", color: "grey.700" },
  primary: { bg: "#e3f0fa", border: "#7bb3de", color: "primary.dark" },
  error: { bg: "#ffefec", border: "#ff6350", color: "#ff6350" },
};

export const StatusPill: React.FC<{ tone: PillTone; children: ReactNode; spinner?: boolean }> = ({
  tone,
  children,
  spinner,
}) => {
  const t = PILL_TONES[tone];
  return (
    <Box
      component="span"
      role="status"
      sx={{
        ...monoSx,
        fontSize: 11,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        height: 22,
        borderRadius: 11,
        border: "1px solid",
        borderColor: t.border,
        bgcolor: t.bg,
        color: t.color,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {spinner && <CircularProgress size={10} color="inherit" />}
      {children}
    </Box>
  );
};

/**
 * Pill for a run-able block: running · 200 · 412 ms · error · snapshot · 14 Sep · not run
 */
export const RunStatusPill: React.FC<{
  result?: DataResult;
  snapshot?: DataSnapshot;
  showingSnapshot: boolean;
}> = ({ result, snapshot, showingSnapshot }) => {
  if (result?.status === "running")
    return (
      <StatusPill tone="primary" spinner>
        running
      </StatusPill>
    );
  if (showingSnapshot && snapshot)
    return <StatusPill tone="neutral">snapshot · {shortDate(snapshot.at)}</StatusPill>;
  if (result?.status === "error") {
    return (
      <StatusPill tone="error">{result.httpStatus ? `${result.httpStatus} · error` : "error"}</StatusPill>
    );
  }
  if (result?.status === "success") {
    return (
      <StatusPill tone="primary">
        {[result.httpStatus ?? 200, result.durationMs !== undefined ? `${result.durationMs} ms` : null]
          .filter(Boolean)
          .join(" · ")}
      </StatusPill>
    );
  }
  return <StatusPill tone="neutral">not run</StatusPill>;
};

const AVATAR: Record<DataBlock["kind"], string> = { graphql: "GQL", rest: "API", table: "CSV" };

interface DataBlockShellProps extends BlockViewProps<DataBlock> {
  status: ReactNode;
  // Run-able kinds only
  onRun?: () => void;
  onCancel?: () => void;
  running?: boolean;
  runDisabled?: boolean;
  // What "Download CSV / JSON" export
  downloadData?: unknown;
  // Overrides the default CSV export of the rows at rowsPath
  onDownloadCsv?: () => void;
  menuItems?: BlockMenuItem[];
  // Always-mounted hidden elements (e.g. file inputs used by menu items while collapsed)
  hiddenInputs?: ReactNode;
  children: ReactNode;
}

/**
 * Header + body shared by GraphQL, REST and Table blocks
 */
export const DataBlockShell: React.FC<DataBlockShellProps> = ({
  block,
  index,
  expanded,
  onToggle,
  onHeaderKeyDown,
  status,
  onRun,
  onCancel,
  running,
  runDisabled,
  downloadData,
  onDownloadCsv,
  menuItems = [],
  hiddenInputs,
  children,
}) => {
  const { report, updateBlock } = useBlockEditor();
  const { dispatch } = useReportBuilder();
  const [title, setTitle] = useState(block.title);
  useEffect(() => setTitle(block.title), [block.title]);

  const saveTitle = () => {
    const next = title.trim() || block.title;
    setTitle(next);
    if (next !== block.title) updateBlock(block.reportSectionId, { title: next });
  };

  const renameRef = () => {
    const input = window.prompt("Ref (lowercase letters, numbers and _; unique in this narrative)", block.ref);
    if (input === null) return;
    // The reducer makes it unique and rewrites any notebook that reads the old ref
    dispatch({ type: "renameBlockRef", reportSectionId: block.reportSectionId, ref: input });
  };

  // Table / CSV blocks are numbered like figures: "Table 1", "Table 2"…
  const label = block.kind === "table" ? tableLabel(report.sections, block.reportSectionId) : null;
  const rows = downloadData !== undefined ? resolveRows(downloadData, block.rowsPath).rows : null;
  const fileStem = block.ref || "data";

  return (
    <CollapsibleBlockRow
      reportSectionId={block.reportSectionId}
      index={index}
      title={block.title}
      expanded={expanded}
      onToggle={onToggle}
      onHeaderKeyDown={onHeaderKeyDown}
      menuItems={[
        ...menuItems,
        { label: "Rename ref", onClick: renameRef },
        {
          label: "Download CSV",
          onClick: () => (onDownloadCsv ? onDownloadCsv() : rows && downloadCsv(rows, fileStem)),
          disabled: !rows,
        },
        {
          label: "Download JSON",
          onClick: () => downloadJson(downloadData, fileStem),
          disabled: downloadData === undefined,
        },
      ]}
      header={
        <>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: "primary.dark",
              color: "white",
            }}
          >
            {AVATAR[block.kind]}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <InputBase
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              inputProps={{ "aria-label": "Block title", [FOCUS_TARGET_ATTR]: "" }}
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: "#616161",
                "& input": { p: 0, textOverflow: "ellipsis" },
              }}
            />
            <Typography noWrap sx={{ ...monoSx, fontSize: 11, color: "grey.600" }}>
              {label ?? block.kind} · ref {block.ref}
            </Typography>
          </Box>
          {status}
        </>
      }
      actions={
        <>
          {hiddenInputs}
          {onRun &&
            (running && onCancel ? (
              <Button
                variant="outlined"
                onClick={onCancel}
                startIcon={<FontAwesomeIcon icon={faStop} style={{ fontSize: 10 }} />}
                sx={{ height: 32, textTransform: "none" }}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={onRun}
                disabled={runDisabled || running}
                startIcon={<FontAwesomeIcon icon={faPlay} style={{ fontSize: 10 }} />}
                sx={{ height: 32, textTransform: "none", boxShadow: "none" }}
              >
                Run
              </Button>
            ))}
        </>
      }
    >
      <Box sx={{ p: "14px" }}>
        {children}
        <Box sx={{ mt: 1.25, display: "flex", alignItems: "baseline", gap: 0.5 }}>
          {label && (
            <Box component="span" sx={{ ...captionSx, fontWeight: 700, flexShrink: 0 }}>
              {label}.
            </Box>
          )}
          <CaptionField
            value={block.caption}
            onSave={(caption) => updateBlock(block.reportSectionId, { caption })}
          />
        </Box>
      </Box>
    </CollapsibleBlockRow>
  );
};

export default DataBlockShell;

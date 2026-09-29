import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  InputBase,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  type Theme,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";
import { formatBytes, useReportBuilder } from "../../providers/ReportBuilderProvider";
import {
  getLiveCapture,
  getLiveCaptureKey,
  useLiveCaptureAvailable,
} from "../../providers/LiveSectionStateRegistry";
import {
  DataBlock,
  ImageBlock,
  isWidget,
  NotebookBlock,
  NonWidgetBlock,
  Report,
  ReportBlock,
  ReportSection,
  ReportSectionViewType,
} from "../../types/report";
import { useBlockEditor } from "./blocks/BlockEditorContext";
import { COLLAPSIBLE_KINDS } from "./blocks/BlockRenderer";
import { useDataBlockResult } from "./blocks/dataResultsStore";
import { imageAlt } from "./blocks/ImageBlockView";
import { slugifyRef } from "./blocks/refs";
import { useNotebookResult } from "./blocks/notebook/notebookResultsStore";
import { resolveInputs } from "./blocks/notebook/resolveInputs";
import { figureLabel, tableLabel } from "./blocks/figures";
import { CapturedStateChips } from "./CapturedStateChips";
import { sectionHasChart } from "./ReportSectionBody";
import { Button as TextButton } from "../Button";

const NOTE_DEBOUNCE_MS = 500;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Entity → route prefix for entities whose page is addressed by a single id
const ENTITY_ROUTES: Record<string, string> = {
  target: "target",
  disease: "disease",
  drug: "drug",
  variant: "variant",
  study: "study",
  credibleSet: "credible-set",
};

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

const labelSx = { fontSize: 12, fontWeight: 700, color: "#616161", mb: 0.75 } as const;

const overlineSx = {
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 11,
  letterSpacing: ".06em",
  color: "grey.500",
  textTransform: "uppercase",
} as const;

const metaSx = { fontStyle: "italic", fontSize: "0.8rem", color: "#616161" } as const;

const segmentedSx = {
  bgcolor: "#eee",
  p: "2px",
  borderRadius: "2px",
  width: "100%",
  "& .MuiToggleButton-root": {
    flex: 1,
    border: "1px solid transparent",
    borderRadius: "2px !important",
    textTransform: "none",
    py: 0.25,
    color: "text.secondary",
  },
  "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
    bgcolor: "grey.50",
    borderColor: "rgb(196,196,196)",
    color: "primary.dark",
  },
} as const;

type InspectorVariant = "side" | "inline";

const InspectorShell: React.FC<{ variant: InspectorVariant; children: ReactNode }> = ({
  variant,
  children,
}) => (
  <Box
    component="aside"
    aria-label="Section inspector"
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 2,
      p: "18px 16px",
      bgcolor: "#fff",
      ...(variant === "side"
        ? { width: 296, borderLeft: "1px solid", borderColor: "grey.300", overflowY: "auto", minHeight: 0 }
        : { borderTop: "1px solid", borderColor: "grey.300" }),
    }}
  >
    {children}
  </Box>
);

/**
 * Commentary field: local state, saved on blur and on a debounce while typing
 */
const CommentaryField: React.FC<{ section: ReportSection }> = ({ section }) => {
  const { dispatch } = useReportBuilder();
  const [note, setNote] = useState(section.note ?? "");
  const savedNote = useRef(section.note ?? "");

  const save = (value: string) => {
    if (value === savedNote.current) return;
    savedNote.current = value;
    dispatch({ type: "updateSectionNote", reportSectionId: section.reportSectionId, note: value });
  };

  useEffect(() => {
    const timeout = setTimeout(() => save(note), NOTE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  return (
    <Box>
      <Typography component="label" htmlFor={`note-${section.reportSectionId}`} sx={labelSx}>
        Commentary
      </Typography>
      <TextField
        id={`note-${section.reportSectionId}`}
        multiline
        minRows={3}
        fullWidth
        size="small"
        placeholder="Why this section matters…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => save(note)}
        sx={{ mt: 0.75 }}
      />
    </Box>
  );
};

const SectionDetails: React.FC<{ section: ReportSection; variant: InspectorVariant }> = ({
  section,
  variant,
}) => {
  const { dispatch } = useReportBuilder();
  const navigate = useNavigate();
  const { definition } = section;

  const liveKey = getLiveCaptureKey(definition.entity, definition.id, section.entityId);
  const liveAvailable = useLiveCaptureAvailable(liveKey);
  const hasChart = sectionHasChart(section);
  const route = ENTITY_ROUTES[definition.entity];

  const handleUpdateFromLive = () => {
    const capture = getLiveCapture(liveKey);
    if (!capture) return;
    dispatch({
      type: "updateSectionState",
      reportSectionId: section.reportSectionId,
      componentState: capture(),
    });
  };

  const handleViewChange = (_: unknown, view: ReportSectionViewType | null) => {
    if (!view) return;
    dispatch({ type: "updateSectionView", reportSectionId: section.reportSectionId, selectedView: view });
  };

  const handleRemove = () => {
    if (window.confirm(`Remove "${definition.name}" from this report?`)) {
      dispatch({ type: "removeSectionFromReport", reportSectionId: section.reportSectionId });
    }
  };

  const handleOpenSourcePage = () => {
    if (!route || !section.entityId) return;
    dispatch({ type: "toggleBuilderOpen", isOpen: false });
    navigate(`/${route}/${section.entityId}`);
  };

  const updateButton = (
    <Button
      variant="outlined"
      fullWidth
      onClick={handleUpdateFromLive}
      disabled={!liveAvailable}
      sx={{ height: 32, mt: 1.25, textTransform: "none" }}
    >
      Update from live page
    </Button>
  );

  return (
    <InspectorShell variant={variant}>
      <Box>
        <Typography sx={overlineSx}>Section inspector</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#616161", mt: 0.5 }}>
          {definition.name}
        </Typography>
        <Typography sx={metaSx}>
          {[definition.entity, section.entityLabel, `added ${formatDate(section.addedAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </Box>

      <Box>
        <Typography sx={labelSx}>Captured state</Typography>
        <CapturedStateChips state={section.componentState} definition={definition} />
        {section.stateCapturedAt && (
          <Typography variant="caption" sx={{ display: "block", color: "grey.600", mt: 0.75 }}>
            captured {formatRelativeTime(section.stateCapturedAt)}
          </Typography>
        )}
        {liveAvailable ? (
          updateButton
        ) : (
          <Tooltip
            title={`Open the ${definition.entity} page for ${section.entityLabel ?? section.entityId ?? "this entity"} to update`}
          >
            {/* span wrapper so the tooltip still fires on a disabled button */}
            <span style={{ display: "block" }}>{updateButton}</span>
          </Tooltip>
        )}
      </Box>

      <Box>
        <Typography sx={labelSx}>View</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={hasChart ? section.selectedView : "table"}
          onChange={handleViewChange}
          aria-label="Section view"
          sx={segmentedSx}
        >
          <ToggleButton value="table">Table</ToggleButton>
          <ToggleButton value="chart" disabled={!hasChart}>
            Chart
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <CommentaryField key={section.reportSectionId} section={section} />

      <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Button color="error" onClick={handleRemove} sx={{ textTransform: "none", px: 0.5 }}>
          Remove from report
        </Button>
        <Button
          onClick={handleOpenSourcePage}
          disabled={!route || !section.entityId}
          sx={{ textTransform: "none", px: 0.5 }}
        >
          Open source page
        </Button>
      </Box>
    </InspectorShell>
  );
};

const DESCRIPTION_MAX_LENGTH = 280;

// The theme's root override greys every button's border and text, so coloured
// outlined buttons set them explicitly
const outlinedSx = (color: "primary" | "error") => ({
  color: `${color}.main`,
  borderColor: `${color}.main`,
  "&:hover": {
    borderColor: `${color}.dark`,
    bgcolor: (theme: Theme) => alpha(theme.palette[color].main, 0.04),
  },
});

const inlineInputSx = {
  width: "100%",
  border: "1px solid",
  borderColor: "primary.main",
  borderRadius: "2px",
  px: 0.75,
  py: 0.25,
} as const;

/**
 * Inline editor used by the report name and description: Enter (single line) or
 * blur saves, Esc cancels without letting the drawer see the keypress
 */
const InlineEdit: React.FC<{
  initialValue: string;
  onSave: (value: string) => void;
  onDone: () => void;
  multiline?: boolean;
  maxLength?: number;
  ariaLabel: string;
  sx?: object;
}> = ({ initialValue, onSave, onDone, multiline, maxLength, ariaLabel, sx }) => {
  const [value, setValue] = useState(initialValue);
  const cancelled = useRef(false);

  const handleBlur = () => {
    if (!cancelled.current) onSave(value);
    onDone();
  };

  return (
    <InputBase
      autoFocus
      multiline={multiline}
      rows={multiline ? 3 : undefined}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          cancelled.current = true;
          (e.target as HTMLElement).blur();
        } else if (e.key === "Enter" && !multiline) {
          (e.target as HTMLElement).blur();
        }
      }}
      inputProps={{ "aria-label": ariaLabel, maxLength }}
      sx={{ ...inlineInputSx, ...sx }}
    />
  );
};

const ReportSummary: React.FC<{ report: Report; variant: InspectorVariant }> = ({ report, variant }) => {
  const { dispatch } = useReportBuilder();
  const [editing, setEditing] = useState<"name" | "description" | null>(null);
  const count = report.sections.length;
  const entityId = report.entityContext?.id;

  const saveName = (value: string) => {
    const newName = value.trim();
    if (!newName || newName === report.name) return;
    dispatch({ type: "renameReport", reportId: report.id, newName });
  };

  const saveDescription = (value: string) => {
    const description = value.trim();
    if (description === (report.description ?? "")) return;
    dispatch({ type: "renameReport", reportId: report.id, newName: report.name, description });
  };

  const handleClearReport = () => {
    if (window.confirm(`Clear all sections from "${report.name}"?`)) {
      dispatch({
        type: "clearReport",
      });
    }
  };

  const handleDeleteReport = () => {
    if (window.confirm(`Delete "${report.name}" and all its sections? This cannot be undone.`)) {
      dispatch({
        type: "deleteReport",
        reportId: report.id,
      });
    }
  };

  return (
    <InspectorShell variant={variant}>
      <Box>
        <Typography sx={overlineSx}>Report</Typography>
        {editing === "name" ? (
          <InlineEdit
            initialValue={report.name}
            onSave={saveName}
            onDone={() => setEditing(null)}
            ariaLabel="Report name"
            sx={{ mt: 0.5, fontSize: 18, fontWeight: 700 }}
          />
        ) : (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mt: 0.5 }}>
            <Typography
              onClick={() => setEditing("name")}
              sx={{ fontSize: 18, fontWeight: 700, color: "#616161", wordBreak: "break-word", cursor: "text" }}
            >
              {report.name}
            </Typography>
            <IconButton
              size="small"
              aria-label="Rename report"
              onClick={() => setEditing("name")}
              sx={{ fontSize: 12, color: "grey.500", mt: "2px" }}
            >
              <FontAwesomeIcon icon={faPen} />
            </IconButton>
          </Box>
        )}

        {editing === "description" ? (
          <InlineEdit
            multiline
            initialValue={report.description ?? ""}
            onSave={saveDescription}
            onDone={() => setEditing(null)}
            maxLength={DESCRIPTION_MAX_LENGTH}
            ariaLabel="Report description"
            sx={{ mt: 0.75, fontSize: 13 }}
          />
        ) : report.description ? (
          <Typography
            onClick={() => setEditing("description")}
            sx={{ fontSize: 13, mt: 0.75, whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "text" }}
          >
            {report.description}
          </Typography>
        ) : (
          <TextButton
            onClick={() => setEditing("description")}
            sx={{ mt: 0.5, ml: "-12px", color: "primary.main" }}
          >
            + Add a description
          </TextButton>
        )}
      </Box>

      {entityId && (
        <Box>
          <Typography sx={labelSx}>About</Typography>
          <Chip
            size="small"
            avatar={<Avatar>{report.entityContext?.type.charAt(0).toUpperCase()}</Avatar>}
            label={entityId}
            sx={{
              bgcolor: "#e3f0fa",
              border: "1px solid #7bb3de",
              color: "primary.dark",
              "& .MuiChip-avatar": {
                width: 20,
                height: 20,
                ml: "2px",
                fontSize: 11,
                bgcolor: "primary.dark",
                color: "#fff",
              },
            }}
          />
        </Box>
      )}

      <Box sx={{ fontSize: 13, lineHeight: 1.7 }}>
        <Box>
          {count} section{count !== 1 ? "s" : ""}
        </Box>
        <Box>Created {formatRelativeTime(new Date(report.createdAt).getTime())}</Box>
        <Box sx={{ fontStyle: "italic", color: "grey.500" }}>Saved in this browser</Box>
      </Box>

      {count > 0 && <Typography sx={metaSx}>Click a section, image or data block to inspect it.</Typography>}

      <Box
        sx={{
          mt: "auto",
          pt: 1.5,
          borderTop: "1px solid",
          borderColor: "grey.300",
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button variant="outlined" onClick={() => setEditing("name")} sx={outlinedSx("primary")}>
          Rename
        </Button>
        {count > 0 && <TextButton onClick={handleClearReport}>Clear sections</TextButton>}
        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteReport}
          sx={{ ...outlinedSx("error"), ml: "auto" }}
        >
          Delete report
        </Button>
      </Box>
    </InspectorShell>
  );
};

const MetaRow: React.FC<{ label: string; children: ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <Box sx={{ display: "flex", gap: 1, fontSize: 13, py: 0.25 }}>
    <Box component="span" sx={{ color: "grey.600", width: 96, flexShrink: 0 }}>
      {label}
    </Box>
    <Box
      component="span"
      sx={{
        minWidth: 0,
        wordBreak: "break-word",
        color: "text.primary",
        ...(mono ? { fontFamily: '"Roboto Mono", monospace', fontSize: 12 } : {}),
      }}
    >
      {children}
    </Box>
  </Box>
);

const RefField: React.FC<{ block: DataBlock | NotebookBlock }> = ({ block }) => {
  const { dispatch } = useReportBuilder();
  const [value, setValue] = useState(block.ref);
  useEffect(() => setValue(block.ref), [block.ref]);

  const save = () => {
    const ref = slugifyRef(value);
    setValue(ref);
    // The reducer keeps it unique and rewrites notebooks that read the old ref
    if (ref !== block.ref) dispatch({ type: "renameBlockRef", reportSectionId: block.reportSectionId, ref });
  };

  return (
    <Box>
      <Typography component="label" htmlFor={`ref-${block.reportSectionId}`} sx={labelSx}>
        Ref
      </Typography>
      <TextField
        id={`ref-${block.reportSectionId}`}
        size="small"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        helperText="Unique in this report; how notebooks refer to this block"
        slotProps={{ htmlInput: { style: { fontFamily: '"Roboto Mono", monospace', fontSize: 12 } } }}
        sx={{ mt: 0.75 }}
      />
    </Box>
  );
};

const ImageDetails: React.FC<{ block: ImageBlock }> = ({ block }) => {
  const { updateBlock } = useBlockEditor();
  const [alt, setAlt] = useState(block.alt);
  useEffect(() => setAlt(block.alt), [block.alt]);

  return (
    <>
      <Box>
        <Typography component="label" htmlFor={`alt-${block.reportSectionId}`} sx={labelSx}>
          Alt text
        </Typography>
        <TextField
          id={`alt-${block.reportSectionId}`}
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={alt}
          placeholder={imageAlt(block) || "Describe the image"}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt !== block.alt && updateBlock(block.reportSectionId, { alt: alt.trim() })}
          helperText={block.alt ? undefined : "Required for export; defaults to the caption, then the file name"}
          sx={{ mt: 0.75 }}
        />
      </Box>
      <Box>
        <MetaRow label="Caption">{block.caption || "—"}</MetaRow>
        <MetaRow label="Width">{block.width === "full" ? "Full width" : "Column"}</MetaRow>
        <MetaRow label="File">{block.fileName || "—"}</MetaRow>
        <MetaRow label="Size">{block.src ? formatBytes(block.src.length) : "—"}</MetaRow>
      </Box>
    </>
  );
};

const RunnableDetails: React.FC<{ block: Extract<DataBlock, { kind: "graphql" | "rest" }> }> = ({ block }) => {
  const { dispatch } = useReportBuilder();
  const result = useDataBlockResult(block.reportSectionId);
  let host = "";
  try {
    host = new URL(block.kind === "graphql" ? block.endpoint : block.url).host;
  } catch {
    host = block.kind === "graphql" ? block.endpoint : block.url;
  }

  return (
    <>
      <RefField block={block} />
      <Box>
        <MetaRow label={block.kind === "graphql" ? "Endpoint" : "Host"} mono>
          {host || "—"}
        </MetaRow>
        <MetaRow label="On open">{block.onOpen === "rerun" ? "Re-run live" : "Keep snapshot"}</MetaRow>
        <MetaRow label="Last run">
          {result && result.status !== "running"
            ? `${formatRelativeTime(result.at)} · ${result.status === "success" ? result.httpStatus ?? "ok" : "error"}`
            : result?.status === "running"
              ? "running…"
              : "not run this session"}
        </MetaRow>
        <MetaRow label="Snapshot">
          {block.snapshot
            ? `${formatDate(block.snapshot.at)} · ${formatBytes(JSON.stringify(block.snapshot.data ?? null).length)}${
                block.snapshot.truncated ? " · truncated" : ""
              }`
            : "none"}
        </MetaRow>
      </Box>
      {block.snapshot && (
        <Button
          variant="outlined"
          fullWidth
          onClick={() =>
            dispatch({ type: "setBlockSnapshot", reportSectionId: block.reportSectionId, snapshot: undefined })
          }
          sx={{ height: 32, textTransform: "none" }}
        >
          Clear snapshot
        </Button>
      )}
    </>
  );
};

const TableDetails: React.FC<{ block: Extract<DataBlock, { kind: "table" }> }> = ({ block }) => (
  <>
    <RefField block={block} />
    <Box>
      <MetaRow label="Source">
        {block.source.fileName ?? (block.source.type === "paste" ? "Pasted data" : block.source.type.toUpperCase())}
      </MetaRow>
      <MetaRow label="Size">
        {block.rows.length.toLocaleString()} rows × {block.columns.length} columns
        {block.truncated ? " (truncated)" : ""}
      </MetaRow>
    </Box>
    {block.columns.length > 0 && (
      <Box>
        <Typography sx={labelSx}>Columns</Typography>
        {block.columns.map((c) => (
          <MetaRow key={c.key} label={c.type} mono>
            {c.label}
          </MetaRow>
        ))}
      </Box>
    )}
  </>
);

const NotebookDetails: React.FC<{ block: NotebookBlock }> = ({ block }) => {
  const { report, updateBlock } = useBlockEditor();
  const { dispatch } = useReportBuilder();
  const result = useNotebookResult(block.reportSectionId);
  const inputs = resolveInputs(report.sections, block);
  const snapshotBytes = block.snapshot ? JSON.stringify(block.snapshot).length : 0;

  return (
    <>
      <RefField block={block} />
      <Box>
        <Typography sx={labelSx}>Run mode</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={block.runMode}
          onChange={(_, v: NotebookBlock["runMode"] | null) => v && updateBlock(block.reportSectionId, { runMode: v })}
          aria-label="Run mode"
          sx={{ mt: 0.75, "& .MuiToggleButton-root": { py: 0.25, textTransform: "none", fontSize: 12 } }}
        >
          <ToggleButton value="auto">Auto re-run</ToggleButton>
          <ToggleButton value="manual">Manual</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box>
        <Typography sx={labelSx}>Inputs</Typography>
        {inputs.length === 0 && <Typography sx={metaSx}>None linked</Typography>}
        {inputs.map((input) => (
          <MetaRow key={input.ref} label={input.ref} mono>
            {input.status === "ok"
              ? `${input.summary.rows.toLocaleString()} rows · ${input.summary.columns.length} columns`
              : input.reason ?? input.status}
          </MetaRow>
        ))}
      </Box>
      <Box>
        <MetaRow label="Last run">
          {result?.status === "running"
            ? "running…"
            : block.lastRun
              ? `${formatRelativeTime(block.lastRun.at)} · ${block.lastRun.ok ? `ok · ${block.lastRun.durationMs} ms` : block.lastRun.error?.kind ?? "error"}`
              : "not run"}
        </MetaRow>
        <MetaRow label="Snapshot">
          {block.snapshot
            ? `${formatDate(block.snapshot.at)} · ${formatBytes(snapshotBytes)}${
                block.snapshot.svg ? " · svg" : block.snapshot.png ? " · png" : ""
              }${block.snapshot.value !== undefined ? " · data" : ""}`
            : "none"}
        </MetaRow>
        <MetaRow label="Height">{block.height ? `${block.height}px` : "auto"}</MetaRow>
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={block.hideCodeInExport}
            onChange={(e) => updateBlock(block.reportSectionId, { hideCodeInExport: e.target.checked })}
          />
        }
        label={<Typography sx={{ fontSize: 13 }}>Hide code in export</Typography>}
      />
      {block.snapshot && (
        <Button
          variant="outlined"
          fullWidth
          onClick={() =>
            dispatch({
              type: "setNotebookRun",
              reportSectionId: block.reportSectionId,
              lastRun: block.lastRun,
              snapshot: null,
            })
          }
          sx={{ height: 32, textTransform: "none" }}
        >
          Clear snapshot
        </Button>
      )}
    </>
  );
};

const BLOCK_KIND_LABEL: Record<string, string> = {
  image: "Image",
  notebook: "Notebook",
  graphql: "GraphQL query",
  rest: "REST endpoint",
  table: "Table / CSV",
};

const BlockDetails: React.FC<{ block: NonWidgetBlock; variant: InspectorVariant }> = ({ block, variant }) => {
  const { report } = useBlockEditor();
  const title =
    block.kind === "table"
      ? `${tableLabel(report.sections, block.reportSectionId)} · ${block.title}`
      : block.kind === "image"
        ? `${figureLabel(report.sections, block.reportSectionId)} · ${block.caption || block.fileName || "Image"}`
        : "title" in block && block.kind !== "chapter"
          ? block.title
          : "";
  return (
    <InspectorShell variant={variant}>
      <Box>
        <Typography sx={overlineSx}>Block inspector</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#616161", mt: 0.5, wordBreak: "break-word" }}>
          {title}
        </Typography>
        <Typography sx={metaSx}>
          {BLOCK_KIND_LABEL[block.kind]} · added {formatDate(block.addedAt)}
        </Typography>
      </Box>
      {block.kind === "image" && <ImageDetails block={block} />}
      {(block.kind === "graphql" || block.kind === "rest") && <RunnableDetails block={block} />}
      {block.kind === "table" && <TableDetails block={block} />}
      {block.kind === "notebook" && <NotebookDetails block={block} />}
    </InspectorShell>
  );
};

interface ReportSectionInspectorProps {
  report: Report;
  section: ReportBlock | null;
  variant?: InspectorVariant;
}

/**
 * Inspector for the expanded section/block, or the report summary when nothing
 * with inspector content is selected (narrative blocks have none)
 */
export const ReportSectionInspector: React.FC<ReportSectionInspectorProps> = ({
  report,
  section,
  variant = "side",
}) => {
  if (section && isWidget(section)) return <SectionDetails section={section} variant={variant} />;
  if (section && COLLAPSIBLE_KINDS.has(section.kind)) {
    return <BlockDetails block={section as NonWidgetBlock} variant={variant} />;
  }
  return <ReportSummary report={report} variant={variant} />;
};

export default ReportSectionInspector;

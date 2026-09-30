import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar, Box, Button, Chip, InputBase, Tooltip, Typography, useTheme } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { useSyncExternalStore } from "react";
import type { EditorView } from "@codemirror/view";
import { fitsStorageBudget, useReportBuilder } from "../../../../providers/ReportBuilderProvider";
import { isWidget, refOf, type NotebookBlock, type NotebookSnapshot, type ReportBlock } from "../../../../types/report";
import { FOCUS_TARGET_ATTR, useBlockEditor } from "../BlockEditorContext";
import { CollapsibleBlockRow } from "../BlockFrames";
import { monoSx, StatusPill } from "../DataBlockShell";
import { dataResultsStore } from "../dataResultsStore";
import { downloadCsv, downloadJson } from "../dataPaths";
import { CaptionField } from "../ImageBlockView";
import { BlockViewProps } from "../types";
import { buildGraph, downstreamOf, upstreamOf } from "report-core";
import { InputPicker } from "./InputPicker";
import { insertAtCursor, jumpTo, NotebookEditor } from "./NotebookEditor";
import { NotebookOutput } from "./NotebookOutput";
import {
  useLastGoodNotebookResult,
  useNotebookResult,
  useNotebookResultsVersion,
} from "./notebookResultsStore";
import { PANE_HEIGHT, type NotebookTheme } from "./protocol";
import { inputsHash, resolveInputs, type ResolvedInput } from "./resolveInputs";
import { useNotebookRunner, type RunFinished } from "./useNotebookRunner";

const SAVE_DEBOUNCE_MS = 400;
const WIDE_PANES_PX = 1000;

const timeOf = (at: number) => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const CHIP_TONES = {
  ok: { bgcolor: "#e3f0fa", borderColor: "#7bb3de", color: "primary.dark" },
  notebook: { bgcolor: "transparent", borderColor: "grey.400", color: "grey.700" },
  problem: { bgcolor: "#ffefec", borderColor: "#ff6350", color: "#c0392b" },
} as const;

const chipTone = (input: ResolvedInput): keyof typeof CHIP_TONES =>
  input.status !== "ok" ? "problem" : input.summary.kind === "notebook" ? "notebook" : "ok";

/** Width of an element, tracked with a ResizeObserver. */
const useElementWidth = <T extends HTMLElement>(): [React.RefObject<T>, number] => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0]?.contentRect.width ?? 0)));
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width];
};

const InputChip: React.FC<{ input: ResolvedInput; onRemove: () => void; onGoTo: () => void }> = ({
  input,
  onRemove,
  onGoTo,
}) => {
  const tone = CHIP_TONES[chipTone(input)];
  const { summary } = input;
  const title = (
    <Box sx={{ p: 0.5, maxWidth: 280 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{summary.title}</Typography>
      <Typography sx={{ ...monoSx, fontSize: 11 }}>
        {summary.kind} · {summary.rows.toLocaleString()} rows · {summary.columns.length} columns
      </Typography>
      {input.reason && (
        <Typography sx={{ fontSize: 11, mt: 0.25, color: input.status === "ok" ? "inherit" : "#ffb3a7" }}>
          {input.reason}
        </Typography>
      )}
      {summary.columns.slice(0, 5).map((c) => (
        <Typography key={c.key} sx={{ ...monoSx, fontSize: 11 }}>
          {c.key} <Box component="span" sx={{ opacity: 0.7 }}>{c.type}</Box>
        </Typography>
      ))}
      {summary.blockId && (
        <Button size="small" onClick={onGoTo} sx={{ textTransform: "none", px: 0, mt: 0.5, color: "inherit" }}>
          Go to block
        </Button>
      )}
    </Box>
  );
  return (
    <Tooltip title={title} placement="bottom-start">
      <Chip
        size="small"
        label={input.ref}
        onDelete={onRemove}
        deleteIcon={<span aria-hidden>✕</span>}
        sx={{
          ...monoSx,
          fontSize: 11,
          height: 22,
          borderRadius: 11,
          border: "1px solid",
          ...tone,
          "& .MuiChip-deleteIcon": { color: "inherit", fontSize: 10, ml: 0, mr: "6px", opacity: 0.8 },
        }}
      />
    </Tooltip>
  );
};

export const NotebookBlockView: React.FC<BlockViewProps<NotebookBlock>> = (props) => {
  const { block, index, expanded, onToggle, onHeaderKeyDown } = props;
  const { report, updateBlock, requestFocus } = useBlockEditor();
  const { state, dispatch } = useReportBuilder();
  const muiTheme = useTheme();
  const id = block.reportSectionId;

  const result = useNotebookResult(id);
  const lastGood = useLastGoodNotebookResult(id);
  const notebooksVersion = useNotebookResultsVersion();
  const inputBlockIds = useMemo(
    () => report.sections.filter((b) => refOf(b) && block.inputs.includes(refOf(b) as string)).map((b) => b.reportSectionId),
    [report.sections, block.inputs]
  );
  const dataVersion = useSyncExternalStore(
    dataResultsStore.subscribe,
    () => inputBlockIds.map((bid) => dataResultsStore.get(bid)?.at ?? "-").join(","),
    () => ""
  );

  // Inputs resolve from the live stores + stored blocks; cheap enough to redo per change
  const inputs = useMemo(
    () => resolveInputs(report.sections, block),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report.sections, block.inputs, notebooksVersion, dataVersion]
  );
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const hash = inputsHash(inputs);

  const theme = useMemo<NotebookTheme>(
    () => ({
      fontFamily: muiTheme.typography.fontFamily ?? "Inter, sans-serif",
      text: muiTheme.palette.text.primary,
      primary: muiTheme.palette.primary.main,
      secondary: muiTheme.palette.secondary.main,
      palette: [
        muiTheme.palette.primary.main,
        muiTheme.palette.secondary.main,
        muiTheme.palette.primary.dark,
        "#7bb3de",
        "#f0ad4e",
        "#8bc34a",
        "#9c27b0",
        "#00acc1",
        "#5a5f5f",
        "#c4c4c4",
      ],
    }),
    [muiTheme]
  );

  // ---------- code (autosaved) ----------
  const [code, setCode] = useState(block.code);
  const codeRef = useRef(code);
  codeRef.current = code;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setCode(block.code), [block.code]);

  const saveCode = useCallback(
    (value: string) => {
      clearTimeout(saveTimer.current);
      if (value !== block.code) updateBlock(id, { code: value });
    },
    [block.code, id, updateBlock]
  );
  const handleCodeChange = (value: string) => {
    // Now, not on the next render: a blur in the same tick (Snippets menu closing) saves codeRef
    codeRef.current = value;
    setCode(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCode(value), SAVE_DEBOUNCE_MS);
  };

  // ---------- dependency graph ----------
  const graph = useMemo(() => buildGraph(report.sections), [report.sections]);
  const upstream = useMemo(() => upstreamOf(graph, block.ref), [graph, block.ref]);
  const downstream = useMemo(() => downstreamOf(graph, block.ref), [graph, block.ref]);
  const eagerRef = useRef(downstream.length > 0);
  eagerRef.current = downstream.length > 0;

  // ---------- runner ----------
  const stateRef = useRef(state);
  stateRef.current = state;
  const blockRef = useRef(block);
  blockRef.current = block;
  const lastRunCode = useRef<string | null>(null);

  const onFinished = useCallback(
    ({ lastRun, snapshot }: RunFinished) => {
      let next: NotebookSnapshot | null | undefined = snapshot;
      if (snapshot) {
        const added = JSON.stringify(snapshot).length - JSON.stringify(blockRef.current.snapshot ?? null).length;
        if (!fitsStorageBudget(stateRef.current.reports, added)) next = undefined;
      }
      dispatch({ type: "setNotebookRun", reportSectionId: id, lastRun, snapshot: next });
    },
    [dispatch, id]
  );
  const onWatchdog = useCallback(() => updateBlock(id, { runMode: "manual" }), [id, updateBlock]);

  // The runner reads the block's saved code, so flush the editor before each run
  const runnerBlock = useMemo(() => ({ ...block, code }), [block, code]);
  const runner = useNotebookRunner({
    block: runnerBlock,
    theme,
    getInputs: () => inputsRef.current,
    onFinished,
    onWatchdog,
    // Other notebooks read this one: start its sandbox without waiting for it to scroll into view
    eager: eagerRef.current,
  });

  const run = useCallback(() => {
    saveCode(codeRef.current);
    lastRunCode.current = codeRef.current;
    runner.run();
  }, [runner, saveCode]);

  // Auto mode: run when the sandbox first becomes ready, and whenever an input changes
  const liveHash = result?.inputsHash;
  useEffect(() => {
    if (!runner.ready || block.runMode !== "auto") return;
    if (!result) {
      run();
    } else if (result.status !== "running" && liveHash !== hash) {
      run();
    }
    // `result` identity changes on every log line; the hash + status are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner.ready, block.runMode, hash, liveHash, result?.status]);

  // ---------- inputs ----------
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const linkButton = useRef<HTMLButtonElement>(null);
  const editorView = useRef<EditorView | null>(null);
  const editorFocused = useRef(false);

  const openPicker = (anchor: HTMLElement | null, search = "") => {
    setPickerSearch(search);
    setPickerAnchor(anchor ?? linkButton.current);
  };

  const pickInput = (picked: ReportBlock, ref: string) => {
    if (isWidget(picked) && !picked.ref) {
      // Widgets get their ref the first time they're linked
      dispatch({ type: "updateBlock", reportSectionId: picked.reportSectionId, patch: { ref } });
    }
    dispatch({ type: "linkNotebookInput", reportSectionId: id, ref });
    if (editorFocused.current && editorView.current) insertAtCursor(editorView.current, ref);
  };

  const unlink = (ref: string) => dispatch({ type: "unlinkNotebookInput", reportSectionId: id, ref });

  const goToBlock = (blockId: string) => requestFocus(blockId);

  // ---------- header ----------
  const [title, setTitle] = useState(block.title);
  useEffect(() => setTitle(block.title), [block.title]);
  const saveTitle = () => {
    const next = title.trim() || block.title;
    setTitle(next);
    if (next !== block.title) updateBlock(id, { title: next });
  };

  const renameRef = () => {
    const input = window.prompt("Ref (a JavaScript identifier; unique in this narrative)", block.ref);
    if (input === null) return;
    dispatch({ type: "renameBlockRef", reportSectionId: id, ref: input });
  };

  const setFixedHeight = () => {
    const input = window.prompt(`Output height in px (leave empty for the default, ${PANE_HEIGHT})`, block.height ? String(block.height) : "");
    if (input === null) return;
    const n = Number.parseInt(input, 10);
    updateBlock(id, { height: Number.isFinite(n) && n > 0 ? Math.max(80, Math.min(2000, n)) : null });
  };

  const download = async (format: "svg" | "png") => {
    const out = await runner.serialize(format, format === "png" ? 2 : 1);
    const data = out?.data ?? (format === "svg" ? block.snapshot?.svg : block.snapshot?.png);
    if (!data) {
      window.alert("Run the notebook first: there's no chart to download.");
      return;
    }
    const href = format === "svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}` : data;
    const link = document.createElement("a");
    link.href = href;
    link.download = `${block.ref}.${format}`;
    link.click();
  };

  const value = result?.status === "success" ? result.value : lastGood?.value ?? block.snapshot?.value;
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : null;

  const dirty = lastRunCode.current !== null ? code !== lastRunCode.current : !!block.lastRun && code !== block.code;
  const staleInputs =
    block.runMode === "manual" && result && result.status !== "running" && result.inputsHash !== hash;

  const pill =
    result?.status === "running" ? (
      <StatusPill tone="primary" spinner>
        running
      </StatusPill>
    ) : staleInputs ? (
      <StatusPill tone="neutral">inputs changed</StatusPill>
    ) : result?.status === "success" ? (
      <StatusPill tone="primary">ok · {result.durationMs} ms</StatusPill>
    ) : result?.status === "error" ? (
      <StatusPill tone="error">{result.error.kind === "timeout" ? "timeout" : "error"}</StatusPill>
    ) : block.snapshot ? (
      <StatusPill tone="neutral">snapshot · {timeOf(block.snapshot.at)}</StatusPill>
    ) : (
      <StatusPill tone="neutral">not run</StatusPill>
    );

  // ---------- layout / read view ----------
  const [bodyRef, bodyWidth] = useElementWidth<HTMLDivElement>();
  const wide = bodyWidth >= WIDE_PANES_PX;
  const [consoleOpen, setConsoleOpen] = useState(false);

  const goToRef = (ref: string) => {
    const bid = graph.blockIds.get(ref);
    if (bid) goToBlock(bid);
  };

  const completionInputs = useMemo(
    () => Object.fromEntries(inputs.map((i) => [i.ref, i.summary.columns])),
    [inputs]
  );
  const snippetContext = useMemo(() => {
    const first = inputs.find((i) => i.status === "ok" && i.summary.columns.length) ?? inputs[0];
    return { ref: first?.ref, columns: first?.summary.columns ?? [] };
  }, [inputs]);

  const logs = result?.logs ?? [];
  const summary = [
    `${block.inputs.length} input${block.inputs.length === 1 ? "" : "s"}`,
    block.lastRun ? `last run ${timeOf(block.lastRun.at)}` : "not run",
    rows ? `${inputs.reduce((n, i) => n + i.summary.rows, 0).toLocaleString()} → ${rows.length.toLocaleString()} rows` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const editorPane = (
    <NotebookEditor
      value={code}
      onChange={handleCodeChange}
      onRun={run}
      onBlur={() => {
        editorFocused.current = false;
        saveCode(codeRef.current);
      }}
      inputs={completionInputs}
      onLinkRequest={(name) => openPicker(null, name)}
      onView={(view) => {
        editorView.current = view;
      }}
      snippetContext={snippetContext}
      // +2: the output viewport's border sits outside its height
      height={(block.height ?? PANE_HEIGHT) + 2}
      footer={
        <>
          <Box
            onFocusCapture={() => {
              editorFocused.current = true;
            }}
            sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", ...monoSx, fontSize: 11 }}
          >
            {upstream.map((ref) => (
              <Chip key={ref} size="small" label={ref} onClick={() => goToRef(ref)} sx={{ ...monoSx, fontSize: 11, height: 20 }} />
            ))}
            {upstream.length > 0 && <Box component="span" sx={{ color: "grey.500" }}>→</Box>}
            <Chip size="small" label={block.ref} sx={{ ...monoSx, fontSize: 11, height: 20, ...CHIP_TONES.ok, border: "1px solid" }} />
            {downstream.length > 0 && <Box component="span" sx={{ color: "grey.500" }}>→</Box>}
            {downstream.map((ref) => (
              <Chip key={ref} size="small" label={ref} onClick={() => goToRef(ref)} sx={{ ...monoSx, fontSize: 11, height: 20 }} />
            ))}
          </Box>
          <Box>
            <Button
              size="small"
              onClick={() => setConsoleOpen((o) => !o)}
              aria-expanded={consoleOpen}
              sx={{ textTransform: "none", px: 0, py: 0, height: 22, fontSize: 12 }}
            >
              {consoleOpen ? "▾" : "▸"} Console{logs.length ? ` (${logs.length})` : ""}
            </Button>
            {consoleOpen && (
              <Box
                sx={{
                  ...monoSx,
                  fontSize: 11,
                  maxHeight: 160,
                  overflow: "auto",
                  border: "1px solid",
                  borderColor: "grey.300",
                  bgcolor: "grey.50",
                  p: 1,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {logs.length === 0 && <Box sx={{ color: "grey.500" }}>Nothing logged in the last run.</Box>}
                {logs.map((entry, i) => (
                  <Box key={i} sx={{ color: entry.level === "error" ? "#c0392b" : entry.level === "warn" ? "#b35900" : "inherit" }}>
                    {entry.args.join(" ")}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      }
    />
  );

  const outputPane = (
    <NotebookOutput
      block={block}
      runner={runner}
      result={result}
      lastGood={lastGood}
      inputs={inputs}
      onDisplayChange={(display) => updateBlock(id, { display })}
      onJumpToError={(line, column) => {
        requestAnimationFrame(() => editorView.current && jumpTo(editorView.current, line, column));
      }}
      onGoToBlock={goToBlock}
    />
  );

  return (
    <CollapsibleBlockRow
      reportSectionId={id}
      index={index}
      title={block.title}
      expanded={expanded}
      onToggle={onToggle}
      onHeaderKeyDown={onHeaderKeyDown}
      menuItems={[
        { label: "Rename ref", onClick: renameRef },
        {
          label: `Run mode: ${block.runMode} → switch to ${block.runMode === "auto" ? "manual" : "auto"}`,
          onClick: () => updateBlock(id, { runMode: block.runMode === "auto" ? "manual" : "auto" }),
        },
        { label: `Output height: ${block.height ?? PANE_HEIGHT}px${block.height ? "" : " (default)"}…`, onClick: setFixedHeight },
        {
          label: `${block.hideCodeInExport ? "✓ " : ""}Hide code in export`,
          onClick: () => updateBlock(id, { hideCodeInExport: !block.hideCodeInExport }),
        },
        { label: "Download SVG", onClick: () => download("svg") },
        { label: "Download PNG", onClick: () => download("png") },
        { label: "Download data (CSV)", onClick: () => rows && downloadCsv(rows, block.ref), disabled: !rows },
        { label: "Download data (JSON)", onClick: () => downloadJson(value, block.ref), disabled: value === undefined },
      ]}
      header={
        <>
          <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: "primary.dark", color: "white" }}>
            {"{ }"}
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
              inputProps={{ "aria-label": "Notebook title", [FOCUS_TARGET_ATTR]: "" }}
              sx={{ fontSize: 16, fontWeight: 700, color: "#616161", "& input": { p: 0, textOverflow: "ellipsis" } }}
            />
            <Typography noWrap sx={{ ...monoSx, fontSize: 11, color: "grey.600" }}>
              notebook · ref {block.ref} · {block.runMode === "auto" ? "auto re-run" : "manual"}
            </Typography>
          </Box>
          {pill}
        </>
      }
      actions={
        <>
          {runner.running ? (
            <Button
              variant="outlined"
              onClick={runner.stop}
              startIcon={<FontAwesomeIcon icon={faStop} style={{ fontSize: 10 }} />}
              sx={{ height: 32, textTransform: "none" }}
            >
              Stop
            </Button>
          ) : (
            <Tooltip title={dirty && block.lastRun ? "Edited — not run" : ""}>
              <span>
                <Button
                  variant="contained"
                  onClick={run}
                  disabled={!runner.ready && !expanded}
                  startIcon={<FontAwesomeIcon icon={faPlay} style={{ fontSize: 10 }} />}
                  sx={{ height: 32, textTransform: "none", boxShadow: "none", position: "relative" }}
                >
                  Run
                  {dirty && block.lastRun && (
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: "#ff6350",
                      }}
                    />
                  )}
                </Button>
              </span>
            </Tooltip>
          )}
        </>
      }
    >
      <Box ref={bodyRef}>
        {/* Inputs bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            px: "14px",
            py: 1,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "grey.300",
          }}
        >
          <Typography sx={{ ...monoSx, fontSize: 11, letterSpacing: ".06em", color: "grey.500" }}>INPUTS</Typography>
          {inputs.map((input) => (
            <InputChip
              key={input.ref}
              input={input}
              onRemove={() => unlink(input.ref)}
              onGoTo={() => input.summary.blockId && goToBlock(input.summary.blockId)}
            />
          ))}
          <Button
            ref={linkButton}
            size="small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => openPicker(e.currentTarget)}
            aria-haspopup="listbox"
            sx={{ textTransform: "none", height: 24, py: 0 }}
          >
            + Link a block
          </Button>
          <Typography sx={{ ml: "auto", fontSize: 12, fontStyle: "italic", color: "text.secondary" }}>
            {summary}
          </Typography>
        </Box>
        <InputPicker
          open={!!pickerAnchor}
          anchorEl={pickerAnchor}
          onClose={() => setPickerAnchor(null)}
          notebook={block}
          initialSearch={pickerSearch}
          onPick={pickInput}
        />

        <Box sx={{ p: "14px" }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: wide ? "minmax(0, 440px) minmax(0, 1fr)" : "minmax(0, 1fr)",
            }}
          >
            {editorPane}
            {outputPane}
          </Box>

          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <InputBase
              fullWidth
              multiline
              key={`takeaway-${block.takeaway ?? ""}`}
              defaultValue={block.takeaway ?? ""}
              placeholder="Takeaway — one sentence on what this shows (used as the figure title in exports)"
              onBlur={(e) => e.target.value !== (block.takeaway ?? "") && updateBlock(id, { takeaway: e.target.value })}
              inputProps={{ "aria-label": "Takeaway" }}
              sx={{ fontSize: 13, fontWeight: 600, color: "#616161", "& textarea": { p: 0 } }}
            />
            <CaptionField value={block.caption} onSave={(caption) => updateBlock(id, { caption })} />
          </Box>
        </Box>
      </Box>
    </CollapsibleBlockRow>
  );
};

export default NotebookBlockView;

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import { Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { linter, type Diagnostic } from "@codemirror/lint";
import { CodeEditor } from "../CodeEditor";
import { columnLabelSx } from "../ResponsePanel";
import { monoSx } from "../DataBlockShell";
import { makeCompletionSource, type CompletionInputs } from "./completions/columns";
import { parseNotebookCode, unknownIdentifiers } from "./codeRefs";
import { SNIPPETS, type SnippetContext } from "./snippets";

const COLLAPSED_LINES = 3;

interface NotebookEditorProps {
  value: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onBlur?: () => void;
  // ref → columns, for completions and the "isn't linked" lint
  inputs: CompletionInputs;
  // Lint quick-fix: open the picker filtered to this name
  onLinkRequest: (name: string) => void;
  onView: (view: EditorView | null) => void;
  snippetContext: SnippetContext;
  // Read view: only the first lines, not editable
  collapsed: boolean;
  onExpand: () => void;
}

/** Insert `text` at the cursor (replacing any selection) and focus the editor. */
export const insertAtCursor = (view: EditorView, text: string) => {
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
  view.focus();
};

/** Move the cursor to a 1-based line/column and scroll it into view. */
export const jumpTo = (view: EditorView, line: number, column = 1) => {
  const doc = view.state.doc;
  const target = doc.line(Math.max(1, Math.min(doc.lines, line)));
  const pos = Math.min(target.to, target.from + Math.max(0, column - 1));
  view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
  view.focus();
};

const offsetOf = (view: EditorView, line?: number, column?: number): number => {
  if (!line) return 0;
  const doc = view.state.doc;
  const l = doc.line(Math.max(1, Math.min(doc.lines, line)));
  return Math.min(l.to, l.from + Math.max(0, (column ?? 1) - 1));
};

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  value,
  onChange,
  onRun,
  onBlur,
  inputs,
  onLinkRequest,
  onView,
  snippetContext,
  collapsed,
  onExpand,
}) => {
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const linkRef = useRef(onLinkRequest);
  linkRef.current = onLinkRequest;
  const viewRef = useRef<EditorView | null>(null);
  const [snippetAnchor, setSnippetAnchor] = useState<HTMLElement | null>(null);

  const handleView = useCallback(
    (view: EditorView | null) => {
      viewRef.current = view;
      onView(view);
    },
    [onView]
  );

  const extensions = useMemo<Extension[]>(() => {
    const completions = makeCompletionSource(() => inputsRef.current);
    const lint = linter(
      (view) => {
        const code = view.state.doc.toString();
        const parsed = parseNotebookCode(code);
        if (parsed.error) {
          const at = offsetOf(view, parsed.error.line, parsed.error.column);
          const d: Diagnostic = { from: at, to: at, severity: "error", message: parsed.error.message };
          return [d];
        }
        const refs = Object.keys(inputsRef.current);
        return unknownIdentifiers(parsed.ast, refs).map<Diagnostic>((u) => ({
          from: u.from,
          to: u.to,
          severity: "warning",
          message: `\`${u.name}\` isn't linked — link it as an input?`,
          actions: [{ name: "Link input…", apply: () => linkRef.current(u.name) }],
        }));
      },
      { delay: 500 }
    );
    return [
      javascript(),
      javascriptLanguage.data.of({ autocomplete: completions }),
      indentUnit.of("  "),
      lint,
      // Ctrl/Cmd+S: swallow the browser's save dialog (code autosaves)
      Prec.highest(keymap.of([{ key: "Mod-s", run: () => true }])),
    ];
  }, []);

  const insertSnippet = (code: string) => {
    setSnippetAnchor(null);
    const view = viewRef.current;
    if (view) insertAtCursor(view, code);
    else onChange(`${value.trimEnd()}\n\n${code}`);
  };

  const lines = value.split("\n");
  const preview = lines.slice(0, COLLAPSED_LINES).join("\n");

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography sx={{ ...columnLabelSx, mb: 0, flex: 1 }}>Code</Typography>
        {!collapsed && (
          <>
            <Button
              size="small"
              onClick={(e) => setSnippetAnchor(e.currentTarget)}
              aria-haspopup="menu"
              sx={{ textTransform: "none", py: 0, height: 24 }}
            >
              Snippets ▾
            </Button>
            <Menu open={!!snippetAnchor} anchorEl={snippetAnchor} onClose={() => setSnippetAnchor(null)}>
              {SNIPPETS.map((snippet) => (
                <MenuItem
                  key={snippet.label}
                  onClick={() => insertSnippet(snippet.code(snippetContext))}
                  sx={{ fontSize: 13 }}
                >
                  {snippet.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>
      {collapsed ? (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Show code"
          onClick={onExpand}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onExpand()}
          sx={{
            ...monoSx,
            border: "1px solid",
            borderColor: "grey.300",
            borderRadius: "2px",
            p: "6px 8px",
            whiteSpace: "pre",
            overflow: "hidden",
            color: "grey.700",
            cursor: "pointer",
            bgcolor: "grey.50",
            "&:hover": { borderColor: "primary.main" },
          }}
        >
          {preview}
          {lines.length > COLLAPSED_LINES ? `\n… ${lines.length - COLLAPSED_LINES} more lines` : ""}
        </Box>
      ) : (
        <CodeEditor
          value={value}
          onChange={onChange}
          onRun={onRun}
          onBlur={onBlur}
          onView={handleView}
          extensions={extensions}
          ariaLabel="Notebook code"
          minHeight={220}
          maxHeight={560}
        />
      )}
    </Box>
  );
};

export default NotebookEditor;

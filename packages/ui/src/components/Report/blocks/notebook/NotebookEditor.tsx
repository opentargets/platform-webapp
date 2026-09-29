import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Button, Menu, MenuItem, Typography } from "@mui/material";
import { Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { linter, type Diagnostic } from "@codemirror/lint";
import { CodeEditor } from "../CodeEditor";
import { columnLabelSx } from "../ResponsePanel";
import { makeCompletionSource, type CompletionInputs } from "./completions/columns";
import { parseNotebookCode, unknownIdentifiers } from "./codeRefs";
import { SNIPPETS, type SnippetContext } from "./snippets";
import { PANE_HEADER_HEIGHT } from "./protocol";

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
  // Pane body height (px), matching the output pane
  height: number;
  // Pinned under the editor, inside the pane (refs, console)
  footer?: React.ReactNode;
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
  height,
  footer,
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

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, minHeight: PANE_HEADER_HEIGHT }}>
        <Typography sx={{ ...columnLabelSx, mb: 0, flex: 1 }}>Code</Typography>
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
      </Box>
      {/* Same height as the output pane; the editor takes whatever the footer leaves */}
      <Box sx={{ height, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <CodeEditor
            value={value}
            onChange={onChange}
            onRun={onRun}
            onBlur={onBlur}
            onView={handleView}
            extensions={extensions}
            ariaLabel="Notebook code"
            fill
          />
        </Box>
        {footer}
      </Box>
    </Box>
  );
};

export default NotebookEditor;

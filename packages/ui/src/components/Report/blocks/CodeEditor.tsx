import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import { basicSetup } from "codemirror";
import { Compartment, EditorState, Extension, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  // Language support etc. Swapped in place when it changes (e.g. schema loaded)
  extensions?: Extension[];
  onRun?: () => void;
  onBlur?: () => void;
  ariaLabel: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  // Receives the view once created (e.g. to push a GraphQL schema into it)
  onView?: (view: EditorView | null) => void;
}

/**
 * Minimal CodeMirror 6 editor. Ctrl/Cmd+Enter runs.
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  extensions = [],
  onRun,
  onBlur,
  ariaLabel,
  placeholder,
  minHeight = 160,
  maxHeight = 420,
  onView,
}) => {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const language = useRef(new Compartment());
  const callbacks = useRef({ onChange, onRun, onBlur });
  callbacks.current = { onChange, onRun, onBlur };

  useEffect(() => {
    if (!host.current) return undefined;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          Prec.highest(
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  callbacks.current.onRun?.();
                  return true;
                },
              },
            ])
          ),
          language.current.of(extensions),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.domEventHandlers({
            blur: () => {
              callbacks.current.onBlur?.();
              return false;
            },
          }),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          ...(placeholder ? [placeholderExt(placeholder)] : []),
          EditorView.theme({
            "&": { fontSize: "12px", minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` },
            ".cm-scroller": { fontFamily: '"Roboto Mono", monospace', overflow: "auto" },
            ".cm-content, .cm-gutter": { minHeight: `${minHeight}px` },
            "&.cm-focused": { outline: "none" },
          }),
        ],
      }),
    });
    view.current = editor;
    onView?.(editor);
    return () => {
      onView?.(null);
      editor.destroy();
      view.current = null;
    };
    // Created once; value/extensions are synced below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (e.g. duplicate, replace) — skip if already in sync
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: language.current.reconfigure(extensions) });
  }, [extensions]);

  return (
    <Box
      ref={host}
      sx={{
        border: "1px solid",
        borderColor: "grey.300",
        borderRadius: "2px",
        overflow: "hidden",
        "&:focus-within": { borderColor: "primary.main" },
      }}
    />
  );
};

export default CodeEditor;

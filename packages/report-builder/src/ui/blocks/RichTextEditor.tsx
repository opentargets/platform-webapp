import React, { useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { EditorContent, useEditor } from "@tiptap/react";
import { RichTextDoc } from "../../core";
import { richTextExtensions } from "./richText";
import { RichTextToolbar } from "./RichTextToolbar";

const SAVE_DEBOUNCE_MS = 400;

export interface SlashCommandEvent {
  // Caret position in viewport coordinates, for anchoring the block menu
  anchorPosition: { top: number; left: number };
  // The doc was empty before "/" was typed
  wasEmpty: boolean;
  // Removes the typed "/"
  removeSlash: () => void;
}

interface RichTextEditorProps {
  doc: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  ariaLabel: string;
  onSlash?: (event: SlashCommandEvent) => void;
  onBackspaceWhenEmpty?: () => void;
}

export const richTextContentSx = {
  fontFamily: "Inter, sans-serif",
  fontSize: 15,
  lineHeight: 1.6,
  color: "#5A5F5F",
  "& .ProseMirror": { outline: "none", minHeight: 24, py: 0.5 },
  "& .ProseMirror p": { my: 0 },
  "& .ProseMirror p + p": { mt: 1 },
  "& .ProseMirror h2": { fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: "#616161", mt: 2, mb: 0.75 },
  "& .ProseMirror h3": { fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: "#616161", mt: 1.5, mb: 0.5 },
  "& .ProseMirror > :first-child": { mt: 0 },
  "& .ProseMirror ul, & .ProseMirror ol": { my: 0.5, pl: 3 },
  "& .ProseMirror blockquote": { borderLeft: "3px solid", borderColor: "grey.300", my: 0.5, ml: 0, pl: 1.5 },
  "& .ProseMirror code": {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: 13,
    bgcolor: "grey.100",
    px: 0.5,
    borderRadius: "2px",
  },
  "& .ProseMirror a": { color: "primary.main" },
  "& .ProseMirror .is-editor-empty:first-child::before": {
    content: "attr(data-placeholder)",
    color: "grey.500",
    float: "left",
    height: 0,
    pointerEvents: "none",
  },
} as const;

/**
 * TipTap editor shared by Text and Callout blocks. Saves (debounced, and on
 * blur) as TipTap JSON.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  doc,
  onChange,
  placeholder,
  ariaLabel,
  onSlash,
  onBackspaceWhenEmpty,
}) => {
  // Editor callbacks are bound once at creation; route them through refs
  const callbacks = useRef({ onChange, onSlash, onBackspaceWhenEmpty });
  callbacks.current = { onChange, onSlash, onBackspaceWhenEmpty };
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastSaved = useRef(JSON.stringify(doc));
  // Only report real changes (blur fires on every focus loss)
  const save = (json: RichTextDoc) => {
    const serialized = JSON.stringify(json);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    callbacks.current.onChange(json);
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  const extensions = useMemo(() => richTextExtensions(placeholder), [placeholder]);

  const editor = useEditor({
    extensions,
    content: doc,
    immediatelyRender: true,
    editorProps: {
      attributes: { "aria-label": ariaLabel, "aria-multiline": "true", role: "textbox" },
      handleKeyDown: (view, event) => {
        const { selection } = view.state;
        const parent = selection.$from.parent;
        const emptyParagraph =
          selection.empty && parent.type.name === "paragraph" && parent.content.size === 0;

        if (event.key === "/" && emptyParagraph && callbacks.current.onSlash) {
          const pos = selection.from;
          const wasEmpty = view.state.doc.textContent.length === 0 && view.state.doc.childCount <= 1;
          const coords = view.coordsAtPos(pos);
          // Let "/" be typed; the menu removes it if a block is chosen
          setTimeout(() =>
            callbacks.current.onSlash?.({
              anchorPosition: { top: coords.bottom + 4, left: coords.left },
              wasEmpty,
              removeSlash: () => {
                if (view.state.doc.textBetween(pos, pos + 1) === "/") {
                  view.dispatch(view.state.tr.delete(pos, pos + 1));
                }
              },
            })
          );
          return false;
        }

        if (
          event.key === "Backspace" &&
          view.state.doc.textContent.length === 0 &&
          view.state.doc.childCount <= 1 &&
          parent.type.name === "paragraph" &&
          callbacks.current.onBackspaceWhenEmpty
        ) {
          event.preventDefault();
          callbacks.current.onBackspaceWhenEmpty();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => saveRef.current(e.getJSON()), SAVE_DEBOUNCE_MS);
    },
    onBlur: ({ editor: e }) => {
      clearTimeout(timer.current);
      saveRef.current(e.getJSON());
    },
  });

  // Flush a pending save on unmount
  useEffect(
    () => () => {
      if (timer.current && editor && !editor.isDestroyed) {
        clearTimeout(timer.current);
        saveRef.current(editor.getJSON());
      }
    },
    [editor]
  );

  return (
    <Box
      sx={{
        ...richTextContentSx,
        position: "relative",
        // Toolbar floats just above the block while it has focus, so text doesn't shift
        "& .rich-text-toolbar": {
          display: "none",
          position: "absolute",
          bottom: "100%",
          left: 0,
          mb: "4px",
          zIndex: 2,
        },
        "&:focus-within .rich-text-toolbar": { display: "flex" },
      }}
    >
      {editor && <RichTextToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </Box>
  );
};

export default RichTextEditor;

import React, { useState } from "react";
import { Box, ButtonBase, InputBase, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBold,
  faCode,
  faItalic,
  faLink,
  faListOl,
  faListUl,
  faQuoteLeft,
  faStrikethrough,
  faSuperscript,
  faUnderline,
} from "@fortawesome/free-solid-svg-icons";
import { Editor, useEditorState } from "@tiptap/react";
import { isAllowedLink } from "./richText";

interface StyleOption {
  name: string;
  label: string;
  text: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

// Block style of the current line: body text or a heading level
const STYLES: StyleOption[] = [
  {
    name: "paragraph",
    label: "Body text",
    text: "¶",
    isActive: (e) => e.isActive("paragraph"),
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    name: "h2",
    label: "Heading",
    text: "H2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    name: "h3",
    label: "Subheading",
    text: "H3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
];

interface ToolbarButton {
  name: string;
  label: string;
  icon: IconDefinition;
  run: (editor: Editor) => void;
}

const GROUPS: ToolbarButton[][] = [
  [
    { name: "bold", label: "Bold", icon: faBold, run: (e) => e.chain().focus().toggleBold().run() },
    { name: "italic", label: "Italic", icon: faItalic, run: (e) => e.chain().focus().toggleItalic().run() },
    {
      name: "underline",
      label: "Underline",
      icon: faUnderline,
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      name: "strike",
      label: "Strikethrough",
      icon: faStrikethrough,
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      name: "superscript",
      label: "Superscript",
      icon: faSuperscript,
      run: (e) => e.chain().focus().toggleSuperscript().run(),
    },
  ],
  [
    {
      name: "bulletList",
      label: "Bulleted list",
      icon: faListUl,
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      name: "orderedList",
      label: "Numbered list",
      icon: faListOl,
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      name: "blockquote",
      label: "Quote",
      icon: faQuoteLeft,
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    { name: "code", label: "Inline code", icon: faCode, run: (e) => e.chain().focus().toggleCode().run() },
  ],
];

const ACTIVE_NAMES = [...GROUPS.flat().map((b) => b.name), "link"];

const buttonSx = (active: boolean) => ({
  width: 26,
  height: 26,
  borderRadius: "2px",
  fontSize: 12,
  color: active ? "primary.dark" : "grey.700",
  bgcolor: active ? "#e3f0fa" : "transparent",
  "&:hover": { bgcolor: active ? "#e3f0fa" : "grey.100" },
});

/**
 * WYSIWYG toolbar for Text and Callout blocks, shown while the block has focus:
 * body/heading style · marks · lists/quote/code · link. Buttons keep focus in the
 * editor (mousedown is prevented); the link field is inline so focus stays in the block.
 */
export const RichTextToolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      Object.fromEntries([
        ...ACTIVE_NAMES.map((name) => [name, e.isActive(name)]),
        ...STYLES.map((style) => [style.name, style.isActive(e)]),
      ]) as Record<string, boolean>,
  });

  const openLink = () => {
    setLinkError(false);
    setLinkDraft(editor.getAttributes("link").href ?? "");
  };

  const applyLink = () => {
    const href = (linkDraft ?? "").trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDraft(null);
      return;
    }
    if (!isAllowedLink(href)) {
      setLinkError(true);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkDraft(null);
  };

  return (
    <Box
      role="toolbar"
      aria-label="Text formatting"
      className="rich-text-toolbar"
      sx={{
        flexWrap: "wrap",
        alignItems: "center",
        gap: "2px",
        p: "3px",
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "grey.400",
        borderRadius: "2px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      {linkDraft !== null ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <InputBase
            autoFocus
            value={linkDraft}
            placeholder="https://…"
            onChange={(e) => {
              setLinkDraft(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setLinkDraft(null);
                editor.commands.focus();
              }
            }}
            inputProps={{ "aria-label": "Link URL", "aria-invalid": linkError }}
            sx={{
              width: 240,
              fontSize: 12,
              fontFamily: '"Roboto Mono", monospace',
              px: 0.75,
              border: "1px solid",
              borderColor: linkError ? "#ff6350" : "grey.300",
              borderRadius: "2px",
            }}
          />
          <ButtonBase onClick={applyLink} sx={{ fontSize: 12, px: 1, height: 26, color: "primary.dark" }}>
            {linkDraft.trim() ? "Apply" : "Remove"}
          </ButtonBase>
          {linkError && (
            <Box component="span" sx={{ fontSize: 11, color: "#ff6350", pr: 0.5 }}>
              http(s) or mailto only
            </Box>
          )}
        </Box>
      ) : (
        <>
          {STYLES.map((style) => (
            <Tooltip key={style.name} title={style.label} disableInteractive>
              <ButtonBase
                aria-label={style.label}
                aria-pressed={!!active?.[style.name]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => style.run(editor)}
                sx={{ ...buttonSx(!!active?.[style.name]), fontWeight: 700, fontSize: 11, width: 28 }}
              >
                {style.text}
              </ButtonBase>
            </Tooltip>
          ))}
          <Box sx={{ width: "1px", height: 18, bgcolor: "grey.300", mx: "3px" }} />
          {GROUPS.map((group, i) => (
            <React.Fragment key={i}>
              {group.map((button) => (
                <Tooltip key={button.name} title={button.label} disableInteractive>
                  <ButtonBase
                    aria-label={button.label}
                    aria-pressed={!!active?.[button.name]}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => button.run(editor)}
                    sx={buttonSx(!!active?.[button.name])}
                  >
                    <FontAwesomeIcon icon={button.icon} />
                  </ButtonBase>
                </Tooltip>
              ))}
              <Box sx={{ width: "1px", height: 18, bgcolor: "grey.300", mx: "3px" }} />
            </React.Fragment>
          ))}
          <Tooltip title="Link" disableInteractive>
            <ButtonBase
              aria-label="Link"
              aria-pressed={!!active?.link}
              onMouseDown={(e) => e.preventDefault()}
              onClick={openLink}
              sx={buttonSx(!!active?.link)}
            >
              <FontAwesomeIcon icon={faLink} />
            </ButtonBase>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default RichTextToolbar;

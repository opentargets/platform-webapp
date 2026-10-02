import { Extensions, generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Superscript from "@tiptap/extension-superscript";
import { Placeholder } from "@tiptap/extensions";
import { RichTextDoc } from "../../core";

const ALLOWED_LINK = /^(https?:\/\/|mailto:)/i;

export const isAllowedLink = (url: string): boolean => ALLOWED_LINK.test(url.trim());

/**
 * The one extension list for Text and Callout blocks — used both by the editor
 * and by read-only rendering, so stored docs always round-trip.
 * Headings (H2/H3) are styles within a Text block, not separate blocks.
 */
export const richTextExtensions = (placeholder?: string): Extensions => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["mailto"],
      defaultProtocol: "https",
      isAllowedUri: (url) => isAllowedLink(url),
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    },
  }),
  Superscript,
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

/**
 * Read-only HTML for a stored doc (export, share views). Goes through the
 * schema, so nothing outside the allowed marks/nodes survives.
 */
export const renderRichTextHTML = (doc: RichTextDoc): string => generateHTML(doc, richTextExtensions());

export const EMPTY_DOC: RichTextDoc = { type: "doc", content: [{ type: "paragraph" }] };

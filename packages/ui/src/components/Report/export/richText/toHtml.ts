import type { RichTextDoc } from "../../../../types/report";
import { isAllowedLink } from "../../blocks/richText";

type Node = RichTextDoc;
type Mark = NonNullable<Node["marks"]>[number];

export interface RichTextHtmlOptions {
  // Shift prose H2/H3 down so they sit below the document's own headings (e.g. 2 → h4/h5)
  headingOffset?: number;
  // Appended to the last paragraph, e.g. " (Fig. 2)"
  suffix?: string;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value: unknown): string => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Table cell values arrive untyped from widgets / CSV / API results. */
export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatCell).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const wrapMark = (html: string, mark: Mark): string => {
  switch (mark.type) {
    case "bold":
      return `<strong>${html}</strong>`;
    case "italic":
      return `<em>${html}</em>`;
    case "underline":
      return `<u>${html}</u>`;
    case "strike":
      return `<s>${html}</s>`;
    case "code":
      return `<code>${html}</code>`;
    case "superscript":
      return `<sup>${html}</sup>`;
    case "subscript":
      return `<sub>${html}</sub>`;
    case "link": {
      const href = String(mark.attrs?.href ?? "");
      if (!isAllowedLink(href)) return html;
      return `<a href="${escapeHtml(href.trim())}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }
    default:
      return html;
  }
};

const inline = (nodes: Node[] | undefined): string =>
  (nodes ?? [])
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type === "text") return (node.marks ?? []).reduce(wrapMark, escapeHtml(node.text ?? ""));
      return inline(node.content);
    })
    .join("");

/**
 * Whitelist serializer for the Text/Callout schema (see blocks/richText.ts). Unknown nodes
 * fall back to their children, unknown marks are dropped, links must pass isAllowedLink,
 * all text is escaped — so the output is safe to write into a print document.
 * Pure (no DOM), unlike renderRichTextHTML, so it runs in workers/node too.
 */
export function richTextToHtml(doc: RichTextDoc | null | undefined, opts: RichTextHtmlOptions = {}): string {
  if (!doc) return "";
  const offset = opts.headingOffset ?? 0;
  const blocks = doc.type === "doc" ? (doc.content ?? []) : [doc];

  const block = (node: Node): string => {
    switch (node.type) {
      case "paragraph":
        return `<p>${inline(node.content)}</p>`;
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2) + offset));
        return `<h${level}>${inline(node.content)}</h${level}>`;
      }
      case "bulletList":
        return `<ul>${(node.content ?? []).map(block).join("")}</ul>`;
      case "orderedList": {
        const start = Number(node.attrs?.start ?? 1);
        return `<ol${start !== 1 && Number.isFinite(start) ? ` start="${start}"` : ""}>${(node.content ?? [])
          .map(block)
          .join("")}</ol>`;
      }
      case "listItem":
        return `<li>${(node.content ?? []).map(block).join("")}</li>`;
      case "blockquote":
        return `<blockquote>${(node.content ?? []).map(block).join("")}</blockquote>`;
      case "text":
      case "hardBreak":
        return inline([node]);
      default:
        return (node.content ?? []).map(block).join("");
    }
  };

  let html = blocks.map(block).join("");
  if (opts.suffix) {
    const suffix = escapeHtml(opts.suffix);
    const i = html.lastIndexOf("</p>");
    html = i >= 0 ? `${html.slice(0, i)}${suffix}${html.slice(i)}` : `${html}<p>${suffix}</p>`;
  }
  return html;
}

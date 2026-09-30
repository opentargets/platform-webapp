import type { RichTextDoc } from "../../../core";
import { isAllowedLink } from "../../blocks/richText";

type Node = RichTextDoc;
type Mark = { type: string; attrs?: Record<string, unknown> };

export interface MarkdownOptions {
  // Added to TipTap heading levels (2/3), e.g. 1 turns H2 into "###" under a "##" section
  headingOffset?: number;
}

const escapeText = (text: string): string => text.replace(/([\\`*_[\]<>~|])/g, "\\$1");

const escapeUrl = (url: string): string => url.replace(/[()\s]/g, (c) => encodeURIComponent(c));

const codeSpan = (text: string): string => {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
};

const MARK_ORDER = ["code", "strike", "italic", "bold", "underline", "superscript", "link"];

const applyMarks = (text: string, marks: Mark[]): string => {
  const types = new Set(marks.map((m) => m.type));
  if (!text.trim()) return types.has("code") ? codeSpan(text) : escapeText(text);
  // Delimiters can't sit against whitespace, so move it outside the marks
  const lead = types.has("code") ? "" : text.match(/^\s*/)![0];
  const trail = types.has("code") ? "" : text.match(/\s*$/)![0];
  const core = text.slice(lead.length, text.length - trail.length);
  let out = types.has("code") ? codeSpan(core) : escapeText(core);
  MARK_ORDER.forEach((type) => {
    const mark = marks.find((m) => m.type === type);
    if (!mark || type === "code") return;
    if (type === "strike") out = `~~${out}~~`;
    else if (type === "italic") out = `*${out}*`;
    else if (type === "bold") out = `**${out}**`;
    else if (type === "underline") out = `<u>${out}</u>`;
    else if (type === "superscript") out = `<sup>${out}</sup>`;
    else if (type === "link") {
      const href = String(mark.attrs?.href ?? "");
      out = href && isAllowedLink(href) ? `[${out}](${escapeUrl(href)})` : out;
    }
  });
  return `${lead}${out}${trail}`;
};

const inline = (nodes: Node[] | undefined): string =>
  (nodes ?? [])
    .map((n) => {
      if (n.type === "text") return applyMarks(n.text ?? "", (n.marks as Mark[]) ?? []);
      if (n.type === "hardBreak") return "\\\n";
      return inline(n.content);
    })
    .join("");

const prefixLines = (text: string, first: string, rest: string): string =>
  text
    .split("\n")
    .map((line, i) => (i === 0 ? first : line ? rest : rest.trimEnd()) + line)
    .join("\n");

const block = (node: Node, opts: Required<MarkdownOptions>): string => {
  switch (node.type) {
    case "paragraph":
      // Keep a paragraph that starts like a heading/list marker from turning into one
      return inline(node.content)
        .replace(/^(\s*)(#{1,6}\s|[-+]\s)/, "$1\\$2")
        .replace(/^(\s*\d+)([.)]\s)/, "$1\\$2");
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2) + opts.headingOffset));
      return `${"#".repeat(level)} ${inline(node.content).replace(/\\\n/g, " ")}`;
    }
    case "bulletList":
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      const items = node.content ?? [];
      const tight = items.every((item) => (item.content ?? []).filter((c) => c.type === "paragraph").length <= 1);
      return items
        .map((item, i) => {
          const marker = node.type === "bulletList" ? "- " : `${start + i}. `;
          const body = blocks(item.content, opts, tight ? "\n" : "\n\n") || "";
          return prefixLines(body, marker, " ".repeat(marker.length));
        })
        .join(tight ? "\n" : "\n\n");
    }
    case "listItem":
      return blocks(node.content, opts);
    case "blockquote":
      return prefixLines(blocks(node.content, opts), "> ", "> ");
    case "hardBreak":
      return "";
    default:
      return node.content ? blocks(node.content, opts) : escapeText(node.text ?? "");
  }
};

const blocks = (nodes: Node[] | undefined, opts: Required<MarkdownOptions>, sep = "\n\n"): string =>
  (nodes ?? [])
    .map((n) => block(n, opts))
    .filter((s) => s.trim() !== "")
    .join(sep);

/** TipTap JSON (the richTextExtensions schema) → CommonMark/GFM. */
export function toMarkdown(doc: RichTextDoc | null | undefined, options: MarkdownOptions = {}): string {
  if (!doc) return "";
  const opts = { headingOffset: options.headingOffset ?? 0 };
  return (doc.type === "doc" ? blocks(doc.content, opts) : block(doc, opts)).trim();
}

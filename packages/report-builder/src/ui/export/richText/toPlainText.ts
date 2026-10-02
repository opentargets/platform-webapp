import type { RichTextDoc } from "../../../core";

type Node = RichTextDoc;

const inline = (nodes: Node[] | undefined): string =>
  (nodes ?? []).map((n) => (n.type === "text" ? n.text ?? "" : n.type === "hardBreak" ? "\n" : inline(n.content))).join("");

const indent = (text: string, first: string, rest: string): string =>
  text
    .split("\n")
    .map((line, i) => (i === 0 ? first : rest) + line)
    .join("\n");

const block = (node: Node): string => {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return inline(node.content);
    case "bulletList":
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return (node.content ?? [])
        .map((item, i) => {
          const marker = node.type === "bulletList" ? "• " : `${start + i}. `;
          return indent(blocks(item.content, "\n"), marker, " ".repeat(marker.length));
        })
        .join("\n");
    }
    case "blockquote":
      return blocks(node.content, "\n");
    case "text":
      return node.text ?? "";
    default:
      return blocks(node.content, "\n");
  }
};

const blocks = (nodes: Node[] | undefined, sep: string): string =>
  (nodes ?? [])
    .map(block)
    .filter((s) => s.trim() !== "")
    .join(sep);

/** TipTap JSON → plain text: blocks separated by a blank line, list items by "• " / "1. ". */
export function toPlainText(doc: RichTextDoc | null | undefined): string {
  if (!doc) return "";
  return (doc.type === "doc" ? blocks(doc.content, "\n\n") : block(doc)).trim();
}

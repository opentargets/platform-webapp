import type { IBorderOptions, IParagraphOptions, IShadingAttributesProperties, Paragraph, ParagraphChild } from "docx";
import type { RichTextDoc } from "../../../../types/report";
import { isAllowedLink } from "../../blocks/richText";

type Docx = typeof import("docx");
type Node = RichTextDoc;

// Numbering references the docx writer registers in Document({ numbering })
export const DOCX_BULLET_REF = "ot-bullets";
export const DOCX_ORDERED_REF = "ot-ordered";

export interface DocxRunsOptions {
  // Ordered lists restart numbering per list via numbering instances; shared across the document
  nextListInstance: () => number;
  // Appended to the last paragraph, e.g. " (Fig. 2)"
  suffix?: string;
  // Runs placed before the first paragraph's text (callout label)
  prefix?: ParagraphChild[];
  // Applied to every paragraph (callout box: border + shading)
  paragraph?: {
    border?: { top?: IBorderOptions; bottom?: IBorderOptions; left?: IBorderOptions; right?: IBorderOptions };
    shading?: IShadingAttributesProperties;
    indent?: IParagraphOptions["indent"];
  };
  size?: number; // half-points
  monoFont?: string;
}

interface ParaContext {
  numbering?: { reference: string; level: number; instance?: number };
  italics?: boolean;
  indentLeft?: number;
}

/**
 * TipTap JSON → docx Paragraphs. Marks map to TextRun props, links to ExternalHyperlink,
 * lists to the shared bullet / ordered numbering definitions, prose headings to bold
 * keep-with-next paragraphs (Word heading styles are reserved for the paper's own headings).
 */
export function richTextToDocxParagraphs(
  docx: Docx,
  doc: RichTextDoc | null | undefined,
  opts: DocxRunsOptions,
): Paragraph[] {
  const { Paragraph: P, TextRun, ExternalHyperlink } = docx;
  const out: Paragraph[] = [];
  const size = opts.size;
  let prefixPending = opts.prefix && opts.prefix.length ? opts.prefix : undefined;

  const inlineChildren = (
    nodes: Node[] | undefined,
    para: ParaContext,
    extra: { bold?: boolean; size?: number } = {},
  ) => {
    const children: ParagraphChild[] = [];
    (nodes ?? []).forEach((node) => {
      if (node.type === "hardBreak") {
        children.push(new TextRun({ text: "", break: 1 }));
        return;
      }
      if (node.type !== "text" || !node.text) return;
      const marks = node.marks ?? [];
      const has = (type: string) => marks.some((m) => m.type === type);
      const link = marks.find((m) => m.type === "link");
      const href = link ? String(link.attrs?.href ?? "").trim() : "";
      const run = new TextRun({
        text: node.text,
        bold: extra.bold || has("bold") || undefined,
        italics: para.italics || has("italic") || undefined,
        underline: has("underline") ? {} : undefined,
        strike: has("strike") || undefined,
        superScript: has("superscript") || undefined,
        subScript: has("subscript") || undefined,
        font: has("code") ? (opts.monoFont ?? "Courier New") : undefined,
        size: extra.size ?? size,
        style: href && isAllowedLink(href) ? "Hyperlink" : undefined,
      });
      children.push(href && isAllowedLink(href) ? new ExternalHyperlink({ link: href, children: [run] }) : run);
    });
    return children;
  };

  const push = (children: ParagraphChild[], para: ParaContext, extra: Partial<IParagraphOptions> = {}) => {
    const all = prefixPending ? [...prefixPending, ...children] : children;
    prefixPending = undefined;
    const indent = para.indentLeft ? { left: para.indentLeft } : opts.paragraph?.indent;
    out.push(
      new P({
        children: all,
        numbering: para.numbering,
        border: opts.paragraph?.border,
        shading: opts.paragraph?.shading,
        indent: para.numbering ? undefined : indent,
        ...extra,
      }),
    );
  };

  const walk = (node: Node, para: ParaContext, depth: number) => {
    switch (node.type) {
      case "paragraph":
        push(inlineChildren(node.content, para), para);
        return;
      case "heading": {
        const level = Number(node.attrs?.level ?? 2);
        const headingSize = (size ?? 20) + (level <= 2 ? 4 : 2);
        push(inlineChildren(node.content, para, { bold: true, size: headingSize }), para, {
          keepNext: true,
          spacing: { before: 160, after: 60 },
        });
        return;
      }
      case "bulletList":
      case "orderedList": {
        const ordered = node.type === "orderedList";
        const instance = ordered ? opts.nextListInstance() : undefined;
        const level = Math.min(depth, 2);
        (node.content ?? []).forEach((item) => {
          (item.content ?? []).forEach((child, i) => {
            const isList = child.type === "bulletList" || child.type === "orderedList";
            if (isList) walk(child, para, depth + 1);
            else if (i === 0)
              walk(
                child,
                { ...para, numbering: { reference: ordered ? DOCX_ORDERED_REF : DOCX_BULLET_REF, level, instance } },
                depth,
              );
            else walk(child, { ...para, numbering: undefined, indentLeft: 720 * (level + 1) }, depth);
          });
        });
        return;
      }
      case "blockquote":
        (node.content ?? []).forEach((child) =>
          walk(child, { ...para, italics: true, indentLeft: (para.indentLeft ?? 0) + 567 }, depth),
        );
        return;
      case "text":
      case "hardBreak":
        push(inlineChildren([node], para), para);
        return;
      default:
        (node.content ?? []).forEach((child) => walk(child, para, depth));
    }
  };

  const source = opts.suffix ? withSuffix(doc, opts.suffix) : doc;
  if (source) (source.type === "doc" ? (source.content ?? []) : [source]).forEach((node) => walk(node, {}, 0));
  // Label-only callout, or a suffix with no text block to attach to
  if (prefixPending) push([], {});
  return out;
}

/** Appends text to the doc's last paragraph/heading (or adds a paragraph) without mutating the input. */
export function withSuffix(doc: RichTextDoc | null | undefined, suffix: string): RichTextDoc {
  const clone: Node = JSON.parse(JSON.stringify(doc ?? { type: "doc", content: [] }));
  const lastTextblock = (node: Node): Node | undefined => {
    const kids = node.content ?? [];
    for (let i = kids.length - 1; i >= 0; i -= 1) {
      const kid = kids[i];
      if (kid.type === "paragraph" || kid.type === "heading") return kid;
      const found = lastTextblock(kid);
      if (found) return found;
    }
    return undefined;
  };
  const target = lastTextblock(clone);
  if (target) target.content = [...(target.content ?? []), { type: "text", text: suffix }];
  else clone.content = [...(clone.content ?? []), { type: "paragraph", content: [{ type: "text", text: suffix }] }];
  return clone;
}

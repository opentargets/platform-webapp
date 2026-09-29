import type PptxGenJS from "pptxgenjs";
import type { RichTextDoc } from "../../../../types/report";
import { isAllowedLink } from "../../blocks/richText";

type Node = RichTextDoc;
type TextProps = PptxGenJS.TextProps;
type RunOptions = PptxGenJS.TextPropsOptions;

export interface PptxRunsOptions {
  fontSize?: number;
  color?: string; // hex without "#"
  fontFace?: string;
  monoFace?: string;
  linkColor?: string;
}

interface ParaContext {
  bullet?: RunOptions["bullet"];
  indentLevel?: number;
  italic?: boolean;
  bold?: boolean;
  fontSize?: number;
}

/**
 * TipTap JSON → pptxgenjs text runs for one text box. Each block becomes a paragraph
 * (the last run of a paragraph carries breakLine), hard breaks become soft line breaks,
 * lists become bulleted / numbered paragraphs with indent levels.
 */
export function richTextToPptxRuns(doc: RichTextDoc | null | undefined, opts: PptxRunsOptions = {}): TextProps[] {
  if (!doc) return [];
  const fontSize = opts.fontSize ?? 14;
  const paragraphs: TextProps[][] = [];

  const inlineRuns = (nodes: Node[] | undefined, para: ParaContext): TextProps[] => {
    const runs: TextProps[] = [];
    let softBreak = false;
    (nodes ?? []).forEach((node) => {
      if (node.type === "hardBreak") {
        softBreak = true;
        return;
      }
      if (node.type !== "text" || !node.text) return;
      const options: RunOptions = {};
      if (para.bold) options.bold = true;
      if (para.italic) options.italic = true;
      if (para.fontSize) options.fontSize = para.fontSize;
      (node.marks ?? []).forEach((mark) => {
        switch (mark.type) {
          case "bold":
            options.bold = true;
            break;
          case "italic":
            options.italic = true;
            break;
          case "underline":
            options.underline = { style: "sng" };
            break;
          case "strike":
            options.strike = "sngStrike";
            break;
          case "superscript":
            options.superscript = true;
            break;
          case "subscript":
            options.subscript = true;
            break;
          case "code":
            options.fontFace = opts.monoFace ?? "Courier New";
            break;
          case "link": {
            const href = String(mark.attrs?.href ?? "").trim();
            if (isAllowedLink(href)) {
              options.hyperlink = { url: href };
              if (opts.linkColor) options.color = opts.linkColor;
            }
            break;
          }
          default:
        }
      });
      if (softBreak && runs.length) options.softBreakBefore = true;
      softBreak = false;
      runs.push({ text: node.text, options });
    });
    return runs;
  };

  const pushParagraph = (runs: TextProps[], para: ParaContext) => {
    const line = runs.length ? runs : [{ text: "", options: {} as RunOptions }];
    const first = line[0].options ?? (line[0].options = {});
    if (para.bullet) first.bullet = para.bullet;
    if (para.indentLevel) first.indentLevel = para.indentLevel;
    paragraphs.push(line);
  };

  const walk = (node: Node, para: ParaContext) => {
    switch (node.type) {
      case "paragraph":
        pushParagraph(inlineRuns(node.content, para), para);
        return;
      case "heading": {
        const level = Number(node.attrs?.level ?? 2);
        pushParagraph(
          inlineRuns(node.content, { ...para, bold: true, fontSize: fontSize + (level <= 2 ? 4 : 2) }),
          para,
        );
        return;
      }
      case "bulletList":
      case "orderedList": {
        const ordered = node.type === "orderedList";
        const depth = para.bullet ? (para.indentLevel ?? 0) + 1 : (para.indentLevel ?? 0);
        let n = Number(node.attrs?.start ?? 1);
        (node.content ?? []).forEach((item) => {
          const bullet: RunOptions["bullet"] = ordered ? { type: "number", numberStartAt: n } : true;
          n += 1;
          // Only the item's first block carries the bullet; following blocks are continuation paragraphs
          (item.content ?? []).forEach((child, i) => {
            walk(child, { ...para, bullet: i === 0 ? bullet : undefined, indentLevel: depth });
          });
        });
        return;
      }
      case "blockquote":
        (node.content ?? []).forEach((child) =>
          walk(child, { ...para, italic: true, indentLevel: (para.indentLevel ?? 0) + 1 }),
        );
        return;
      case "text":
      case "hardBreak":
        pushParagraph(inlineRuns([node], para), para);
        return;
      default:
        (node.content ?? []).forEach((child) => walk(child, para));
    }
  };

  (doc.type === "doc" ? (doc.content ?? []) : [doc]).forEach((node) => walk(node, {}));

  // Paragraph separation: every paragraph but the last ends with breakLine
  return paragraphs.flatMap((runs, i) => {
    if (i < paragraphs.length - 1) {
      const last = runs[runs.length - 1];
      last.options = { ...(last.options ?? {}), breakLine: true };
    }
    return runs;
  });
}

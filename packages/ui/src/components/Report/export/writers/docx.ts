import type { ISectionOptions, Paragraph, ParagraphChild, Table } from "docx";
import { formatReference, orderReferences } from "../citations";
import { OT_COLORS, PAPER_MARGIN_MM, PAPER_PIXEL_RATIO } from "../layout";
import { formatCell } from "../richText/toHtml";
import { DOCX_BULLET_REF, DOCX_ORDERED_REF, richTextToDocxParagraphs } from "../richText/toDocxRuns";
import type { ExportPlan, FigureAsset, MethodsEntry, PaperUnit, PlacedTable, WriterContext } from "../types";
import {
  CALLOUT_LABEL,
  assetPng,
  dataUrlMime,
  dataUrlToBytes,
  formatDate,
  headerLines,
  releaseLabel,
  stringifyVariables,
  unitError,
  yieldFrame,
} from "./shared";

type Docx = typeof import("docx");
type Block = Paragraph | Table;

const FONT = "Arial";
const MONO = "Courier New";
const hex = (c: string) => c.replace("#", "").toUpperCase();
const TONE_COLOR: Record<string, string> = {
  finding: hex(OT_COLORS.finding),
  warning: hex(OT_COLORS.warning),
  info: hex(OT_COLORS.info),
};
const REFS_REF = "ot-references";

const PAGE_TWIPS = { A4: { width: 11906, height: 16838 }, Letter: { width: 12240, height: 15840 } } as const;
const MM_TO_TWIPS = 1440 / 25.4;
const MARGIN_TWIPS = Math.round(PAPER_MARGIN_MM * MM_TO_TWIPS);
const COLUMN_SPACE_TWIPS = Math.round(7 * MM_TO_TWIPS);
const twipsToPx = (tw: number) => (tw / 1440) * 96;

const BODY_SIZE = 20; // half-points (10pt)
const SMALL_SIZE = 17;
const MAX_TABLE_CELL = 300;

/** Paper → .docx: Word heading styles, Caption style, native tables, numbered references. */
export async function writeDocx(plan: ExportPlan, ctx: WriterContext): Promise<Blob> {
  const docx: Docx = await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    ExternalHyperlink,
    Footer,
    HeadingLevel,
    ImageRun,
    LevelFormat,
    Packer,
    PageNumber,
    Paragraph: P,
    SectionType,
    ShadingType,
    Table: T,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const paper = ctx.settings.paper;
  const page = PAGE_TWIPS[paper.pageSize] ?? PAGE_TWIPS.A4;
  const contentTwips = page.width - 2 * MARGIN_TWIPS;
  const fullWidthPx = twipsToPx(contentTwips);
  const columnWidthPx = twipsToPx((contentTwips - COLUMN_SPACE_TWIPS) / 2);
  const maxImageHeightPx = twipsToPx(page.height - 2 * MARGIN_TWIPS) * 0.6;
  const twoColumn = paper.columns === 2;

  let listInstance = 0;
  const nextListInstance = () => (listInstance += 1);

  // ---------- helpers ----------

  const text = (value: string, opts: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {}) =>
    new TextRun({ text: value, ...(opts as object) });

  const para = (children: ParagraphChild[] | string, opts: Record<string, unknown> = {}) =>
    new P({ children: typeof children === "string" ? [text(children)] : children, ...opts });

  const link = (label: string, url: string) =>
    /^https?:\/\//i.test(url)
      ? new ExternalHyperlink({ link: url, children: [text(label, { style: "Hyperlink" })] })
      : text(label);

  const heading = (value: string, level: 1 | 2 | 3) =>
    new P({
      text: value,
      heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    });

  const caption = (label: string | undefined, value: string) =>
    new P({
      style: "Caption",
      children: [...(label ? [text(`${label}. `, { bold: true })] : []), text(value)],
    });

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: hex(OT_COLORS.border) };
  const table = (placed: PlacedTable): Table => {
    const cols = placed.data.columns;
    const width = Math.floor(100 / Math.max(cols.length, 1));
    const cell = (value: string, header: boolean) =>
      new TableCell({
        children: [
          new P({
            children: [
              text(value, {
                bold: header || undefined,
                color: header ? hex(OT_COLORS.primaryDark) : undefined,
                size: SMALL_SIZE,
              }),
            ],
            spacing: { after: 0 },
          }),
        ],
        shading: header ? { type: ShadingType.CLEAR, fill: hex(OT_COLORS.primaryLight), color: "auto" } : undefined,
        width: { size: width, type: WidthType.PERCENTAGE },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      });
    return new T({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: cellBorder,
        bottom: cellBorder,
        left: cellBorder,
        right: cellBorder,
        insideHorizontal: cellBorder,
        insideVertical: cellBorder,
      },
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: cols.map((c) => cell(c.label, true)) }),
        ...placed.data.rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: cols.map((c) => {
                const v = formatCell(row[c.key]);
                return cell(v.length > MAX_TABLE_CELL ? `${v.slice(0, MAX_TABLE_CELL - 1)}…` : v, false);
              }),
            }),
        ),
      ],
    });
  };

  const placeholder = (title: string, reason?: string) =>
    para(
      [
        text("Figure unavailable: ", { bold: true }),
        text(title),
        ...(reason ? [text(` (${reason})`, { italics: true })] : []),
      ],
      {
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.DASHED, size: 6, color: hex(OT_COLORS.muted) },
          bottom: { style: BorderStyle.DASHED, size: 6, color: hex(OT_COLORS.muted) },
          left: { style: BorderStyle.DASHED, size: 6, color: hex(OT_COLORS.muted) },
          right: { style: BorderStyle.DASHED, size: 6, color: hex(OT_COLORS.muted) },
        },
        shading: { type: ShadingType.CLEAR, fill: "F5F5F5", color: "auto" },
        spacing: { before: 120, after: 60 },
        keepNext: true,
      },
    );

  const imageParagraph = async (
    asset: FigureAsset,
    maxWidthPx: number,
    alt: string,
    title: string,
  ): Promise<Paragraph> => {
    if (asset.kind === "missing") return placeholder(title, asset.reason);
    const png = await assetPng(asset, PAPER_PIXEL_RATIO);
    if (!png) return placeholder(title, "image could not be converted");
    const w0 = asset.width || 800;
    const h0 = asset.height || 450;
    let width = Math.min(maxWidthPx, w0);
    let height = (width * h0) / w0;
    if (height > maxImageHeightPx) {
      height = maxImageHeightPx;
      width = (height * w0) / h0;
    }
    const transformation = { width: Math.round(width), height: Math.round(height) };
    const altText = { name: title.slice(0, 60) || "Figure", title, description: alt };
    const mime = dataUrlMime(png);
    const pngType =
      mime === "image/jpeg" || mime === "image/jpg"
        ? "jpg"
        : mime === "image/gif"
          ? "gif"
          : mime === "image/bmp"
            ? "bmp"
            : "png";
    const run =
      asset.kind === "svg"
        ? new ImageRun({
            type: "svg",
            data: new TextEncoder().encode(asset.svg),
            fallback: { type: "png", data: dataUrlToBytes(png) },
            transformation,
            altText,
          })
        : new ImageRun({ type: pngType, data: dataUrlToBytes(png), transformation, altText });
    return new P({
      children: [run],
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 60 },
    });
  };

  const calloutParagraphs = (unit: Extract<PaperUnit, { kind: "paperBody" }>, suffix?: string) => {
    const tone = unit.tone ?? "info";
    const color = TONE_COLOR[tone] ?? TONE_COLOR.info;
    const thin = { style: BorderStyle.SINGLE, size: 4, color, space: 4 };
    return richTextToDocxParagraphs(docx, unit.doc, {
      nextListInstance,
      suffix,
      size: BODY_SIZE,
      monoFont: MONO,
      prefix: [text(`${(CALLOUT_LABEL[tone] ?? tone).toUpperCase()}  `, { bold: true, color, size: SMALL_SIZE })],
      paragraph: {
        border: { top: thin, bottom: thin, right: thin, left: { style: BorderStyle.THICK, size: 18, color, space: 6 } },
        shading: { type: ShadingType.CLEAR, fill: "F7F9FB", color: "auto" },
        indent: { left: 120, right: 120 },
      },
    });
  };

  const methodsBlocks = (entries: MethodsEntry[]): Block[] => {
    if (!entries.length) return [para("No data sources were used in this report.", { style: "Caption" })];
    return entries.flatMap((e) => {
      const out: Block[] = [
        para([text([e.figureLabel, e.title].filter(Boolean).join(" · "), { bold: true })], {
          keepNext: true,
          spacing: { before: 160, after: 40 },
        }),
      ];
      const line = (label: string, value: ParagraphChild[] | string) =>
        out.push(
          para(
            [
              text(`${label}: `, { bold: true, size: SMALL_SIZE }),
              ...(typeof value === "string" ? [text(value, { size: SMALL_SIZE })] : value),
            ],
            { spacing: { after: 20 } },
          ),
        );
      if (e.sourceLabel) line("Source", e.sourceLabel);
      const mono = (value: string) =>
        value.split("\n").forEach((l, i, all) =>
          out.push(
            para([text(l || " ", { font: MONO, size: 16 })], {
              shading: { type: ShadingType.CLEAR, fill: "F7F9FB", color: "auto" },
              spacing: { after: i === all.length - 1 ? 80 : 0, line: 240 },
              indent: { left: 200 },
            }),
          ),
        );
      if (e.inputRefs?.length) line("Inputs", e.inputRefs.join(", "));
      if (e.code) {
        line("Code", "");
        mono(e.code);
      }
      if (e.request) {
        const r = e.request;
        line("Request", [
          text(`${r.method ?? (r.query ? "POST" : "GET")} ${r.endpoint}`, { font: MONO, size: SMALL_SIZE }),
        ]);
        if (r.query) mono(r.query);
        const variables = stringifyVariables(r.variables);
        if (variables) {
          line("Variables", "");
          mono(variables);
        }
        if (r.params?.length) line("Parameters", r.params.map((p) => `${p.key}=${p.value}`).join(", "));
        const headers = headerLines(r);
        if (headers.length) line("Headers", headers.map((h) => `${h.key}: ${h.value}`).join(", "));
        if (r.body && !r.query) mono(r.body);
      }
      if (e.filters.length) line("Filters", e.filters.join("; "));
      if (e.entity) line("Entity", [e.entity.label, e.entity.id].filter(Boolean).join(" · "));
      line(
        "Data",
        [e.dataRelease ? releaseLabel(e.dataRelease) : "", `retrieved ${formatDate(e.retrievedAt)}`]
          .filter(Boolean)
          .join(", "),
      );
      if (e.deepLink) line("Link", [link(e.deepLink, e.deepLink)]);
      if (e.note) line("Note", e.note);
      return out;
    });
  };

  // ---------- flow ----------

  type Group = { columns: 1 | 2; children: Block[] };
  const front: Block[] = [];
  const groups: Group[] = [];
  const add = (blocks: Block | Block[], span = false) => {
    const columns: 1 | 2 = twoColumn && !span ? 2 : 1;
    const last = groups[groups.length - 1];
    const list = Array.isArray(blocks) ? blocks : [blocks];
    if (last && last.columns === columns) last.children.push(...list);
    else groups.push({ columns, children: list });
  };

  const units = plan.units as PaperUnit[];
  const total = units.length;
  const renderUnit = async (unit: PaperUnit) => {
    switch (unit.kind) {
      case "paperTitle":
        front.push(new P({ heading: HeadingLevel.TITLE, children: [text(unit.title)] }));
        front.push(
          para([text(unit.byline, { italics: true, color: hex(OT_COLORS.muted) })], { spacing: { after: 240 } }),
        );
        if (unit.abstract) {
          front.push(para([text("Abstract", { bold: true })], { spacing: { after: 60 } }));
          front.push(para(unit.abstract, { spacing: { after: 240 } }));
        }
        break;
      case "paperHeading": {
        const label = unit.number
          ? unit.level === 1
            ? `${unit.number} · ${unit.text}`
            : `${unit.number} ${unit.text}`
          : unit.text;
        add(heading(label, unit.level));
        break;
      }
      case "paperBody": {
        const suffix = unit.figRefs.length ? ` (${unit.figRefs.join(", ")})` : undefined;
        add(
          unit.tone
            ? calloutParagraphs(unit, suffix)
            : richTextToDocxParagraphs(docx, unit.doc, { nextListInstance, suffix, size: BODY_SIZE, monoFont: MONO }),
        );
        break;
      }
      case "paperFigure": {
        const maxW = unit.span || !twoColumn ? fullWidthPx : columnWidthPx;
        const image = await imageParagraph(unit.asset, maxW, unit.alt ?? unit.caption ?? unit.title, unit.title);
        add([image, caption(unit.label, unit.caption || unit.title)], unit.span);
        break;
      }
      case "paperTable": {
        const blocks: Block[] = [
          new P({
            style: "Caption",
            keepNext: true,
            children: [
              ...(unit.label ? [text(`${unit.label}. `, { bold: true })] : []),
              text(unit.caption || unit.title),
            ],
          }),
          table(unit.table),
        ];
        if (unit.table.note)
          blocks.push(para([text(unit.table.note, { italics: true, size: SMALL_SIZE })], { spacing: { before: 60 } }));
        else blocks.push(para("", { spacing: { after: 60 } }));
        add(blocks, unit.span || unit.supplementary);
        break;
      }
      case "paperMethods":
        add(heading("Methods", 1));
        add(methodsBlocks(unit.entries));
        break;
      case "paperDataAvailability":
        add(heading("Data availability", 1));
        add(para(unit.text));
        unit.links.forEach((l) =>
          add(para([link(l.label, l.url)], { numbering: { reference: DOCX_BULLET_REF, level: 0 } })),
        );
        break;
      case "paperReferences": {
        add(heading("References", 1));
        const numbered = unit.style !== "apa";
        orderReferences(unit.references, unit.style).forEach((ref) => {
          const children: ParagraphChild[] = [text(formatReference(ref, unit.style), { size: SMALL_SIZE })];
          const url = ref.doi
            ? `https://doi.org/${ref.doi}`
            : ref.pmid
              ? `https://europepmc.org/article/MED/${ref.pmid}`
              : ref.url;
          if (url && /^https?:\/\//i.test(url) && !formatReference(ref, unit.style).includes(url)) {
            children.push(text(" "), link(url, url));
          }
          add(
            para(
              children,
              numbered
                ? { numbering: { reference: REFS_REF, level: 0 }, spacing: { after: 40 } }
                : { indent: { left: 360, hanging: 360 }, spacing: { after: 40 } },
            ),
          );
        });
        if (!unit.references.length) add(para("No references.", { style: "Caption" }));
        break;
      }
      default:
    }
  };

  for (let i = 0; i < total; i += 1) {
    const unit = units[i];
    ctx.onProgress?.(i + 1, total, `Writing ${i + 1} / ${total}`);
    if (i % 8 === 0) await yieldFrame();
    try {
      await renderUnit(unit);
    } catch (e) {
      throw unitError(e, unit, `${unit.kind.replace(/^paper/, "").toLowerCase()} ${i + 1}`);
    }
  }

  // ---------- document ----------

  const pageProps = {
    size: { width: page.width, height: page.height },
    margin: { top: MARGIN_TWIPS, bottom: MARGIN_TWIPS, left: MARGIN_TWIPS, right: MARGIN_TWIPS },
  };
  const footer = new Footer({
    children: [
      new P({
        alignment: AlignmentType.CENTER,
        children: [
          text(`${releaseLabel(plan.dataRelease ?? ctx.doc.dataRelease)}  ·  `, {
            size: 16,
            color: hex(OT_COLORS.muted),
          }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: hex(OT_COLORS.muted) }),
        ],
      }),
    ],
  });

  const sections: ISectionOptions[] = [];
  const pushSection = (children: Block[], columns: 1 | 2) => {
    sections.push({
      properties: {
        page: pageProps,
        ...(sections.length ? { type: SectionType.CONTINUOUS } : {}),
        column: columns === 2 ? { count: 2, space: COLUMN_SPACE_TWIPS, equalWidth: true } : { count: 1 },
      },
      // Later sections inherit the footer
      ...(sections.length ? {} : { footers: { default: footer } }),
      children,
    });
  };
  if (front.length) pushSection(front, 1);
  groups.forEach((g) => pushSection(g.children, g.columns));
  if (!sections.length) pushSection([para(plan.title)], 1);

  const bulletLevels = ["•", "◦", "▪"].map((symbol, level) => ({
    level,
    format: LevelFormat.BULLET,
    text: symbol,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
  }));
  const orderedLevels = ["%1.", "%2.", "%3."].map((pattern, level) => ({
    level,
    format: level === 1 ? LevelFormat.LOWER_LETTER : level === 2 ? LevelFormat.LOWER_ROMAN : LevelFormat.DECIMAL,
    text: pattern,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
  }));

  const headingStyle = (size: number, outlineLevel: number, color = hex(OT_COLORS.primaryDark)) => ({
    run: { font: FONT, size, bold: true, color },
    paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, keepLines: true, outlineLevel },
  });

  const document = new Document({
    creator: "Open Targets Platform",
    title: plan.title,
    description: `Assembled from ${releaseLabel(plan.dataRelease)}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE, color: hex(OT_COLORS.text) },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        title: {
          run: { font: FONT, size: 40, bold: true, color: hex(OT_COLORS.text) },
          paragraph: { spacing: { after: 120 } },
        },
        heading1: headingStyle(28, 0),
        heading2: headingStyle(24, 1),
        heading3: headingStyle(21, 2, hex(OT_COLORS.text)),
        hyperlink: { run: { color: hex(OT_COLORS.primaryDark), underline: {} } },
      },
      paragraphStyles: [
        {
          id: "Caption",
          name: "caption",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: SMALL_SIZE, color: "555555" },
          paragraph: { spacing: { before: 60, after: 200 } },
        },
      ],
    },
    numbering: {
      config: [
        { reference: DOCX_BULLET_REF, levels: bulletLevels },
        { reference: DOCX_ORDERED_REF, levels: orderedLevels },
        {
          reference: REFS_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 440, hanging: 440 } } },
            },
          ],
        },
      ],
    },
    sections,
  });

  ctx.onProgress?.(total, total, "Packaging DOCX");
  await yieldFrame();
  return Packer.toBlob(document);
}

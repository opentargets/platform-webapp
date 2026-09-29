import type PptxGenJS from "pptxgenjs";
import type { RichTextDoc } from "../../../../types/report";
import { OT_COLORS, SLIDE_TYPE } from "../layout";
import { formatCell } from "../richText/toHtml";
import { toPlainText } from "../richText/toPlainText";
import { richTextToPptxRuns } from "../richText/toPptxRuns";
import type {
  ExportPlan,
  FigureAsset,
  MethodsEntry,
  PlacedTable,
  Provenance,
  SlideUnit,
  WriterContext,
} from "../types";
import {
  type Box,
  CALLOUT_LABEL,
  type SlideFrame,
  fitContain,
  formatDate,
  headerLines,
  isSafeImageDataUrl,
  paginate,
  releaseLabel,
  slideFrame,
  stringifyVariables,
  svgDataUrl,
  svgToPngDataUrl,
  unitError,
  yieldFrame,
} from "./shared";

type Pres = PptxGenJS;
type Slide = PptxGenJS.Slide;

const FONT = "Inter";
const MONO = "Courier New";
const hex = (c: string) => c.replace("#", "").toUpperCase();
const C = {
  primary: hex(OT_COLORS.primary),
  primaryDark: hex(OT_COLORS.primaryDark),
  primaryLight: hex(OT_COLORS.primaryLight),
  text: hex(OT_COLORS.text),
  muted: hex(OT_COLORS.muted),
  border: hex(OT_COLORS.border),
  finding: hex(OT_COLORS.finding),
  warning: hex(OT_COLORS.warning),
  info: hex(OT_COLORS.info),
  placeholder: "F5F5F5",
};
const TONE_COLOR: Record<string, string> = { finding: C.finding, warning: C.warning, info: C.info };

const METHODS_ROWS_PER_SLIDE = 8;
const CELL_MAX_CHARS = 140;

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Number of wrapped lines a string takes in a box `w` inches wide at `pt` points (rough Inter metrics). */
const lineCount = (text: string, w: number, pt: number) => {
  const perLine = Math.max(8, Math.floor((w * 72) / (pt * 0.52)));
  return text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0);
};

// ---------- masters ----------

const CONTENT_MASTER = (frame: SlideFrame) => frame.geom.layoutName;
const PLAIN_MASTER = (frame: SlideFrame) => `${frame.geom.layoutName}_PLAIN`;

function defineMasters(pptx: Pres, frame: SlideFrame, release?: string) {
  pptx.defineLayout({ name: frame.geom.layoutName, width: frame.W, height: frame.H });
  pptx.layout = frame.geom.layoutName;
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const footer = [
    {
      text: {
        text: releaseLabel(release),
        options: {
          ...frame.footerRight,
          w: frame.footerRight.w - 0.55,
          align: "right" as const,
          fontFace: FONT,
          fontSize: SLIDE_TYPE.footerPt,
          color: C.muted,
          valign: "middle" as const,
          margin: 0,
        },
      },
    },
  ];
  const slideNumber = {
    x: frame.W - frame.margin - 0.5,
    y: frame.footer.y,
    w: 0.5,
    h: frame.footer.h,
    fontFace: FONT,
    fontSize: SLIDE_TYPE.footerPt,
    color: C.muted,
    align: "right" as const,
    valign: "middle" as const,
    margin: 0,
  };

  pptx.defineSlideMaster({
    title: CONTENT_MASTER(frame),
    background: { color: "FFFFFF" },
    objects: [
      {
        line: {
          x: frame.margin,
          y: frame.ruleY,
          w: frame.W - 2 * frame.margin,
          h: 0,
          line: { color: C.primary, width: 1.5 }, // 2px
        },
      },
      ...footer,
    ],
    slideNumber,
  });
  pptx.defineSlideMaster({
    title: PLAIN_MASTER(frame),
    background: { color: "FFFFFF" },
    objects: footer,
    slideNumber,
  });
}

// ---------- building blocks ----------

function addTitle(slide: Slide, frame: SlideFrame, title: string, kicker?: string) {
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      ...frame.kicker,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      charSpacing: 1.5,
      color: C.primaryDark,
      valign: "bottom",
      margin: 0,
    });
  }
  slide.addText(title, {
    ...frame.title,
    fontFace: FONT,
    fontSize: SLIDE_TYPE.titlePt,
    bold: true,
    color: C.text,
    valign: "middle",
    fit: "shrink",
    margin: 0,
  });
}

function addFooterLeft(slide: Slide, frame: SlideFrame, text?: string) {
  if (!text) return;
  slide.addText(truncate(text, 180), {
    ...frame.footerLeft,
    fontFace: FONT,
    fontSize: SLIDE_TYPE.footerPt,
    color: C.muted,
    valign: "middle",
    margin: 0,
  });
}

const figureFooter = (n?: number, caption?: string) => [n ? `Fig ${n}` : "", caption ?? ""].filter(Boolean).join(" · ");

function addNotes(slide: Slide, docs: RichTextDoc[] | undefined) {
  const text = (docs ?? [])
    .map((d) => toPlainText(d))
    .filter(Boolean)
    .join("\n\n");
  if (text) slide.addNotes(text);
}

/** SVG + PNG fallback, or a raster; the PNG pptxgenjs would generate is replaced by ours. */
async function addAsset(slide: Slide, asset: FigureAsset, box: Box, altText?: string): Promise<boolean> {
  if (asset.kind === "raster") {
    if (!isSafeImageDataUrl(asset.dataUrl)) return false;
    slide.addImage({ data: asset.dataUrl, ...fitContain(asset.width, asset.height, box), altText });
    return true;
  }
  if (asset.kind !== "svg") return false;
  const fit = fitContain(asset.width, asset.height, box);
  const png = isSafeImageDataUrl(asset.pngDataUrl)
    ? asset.pngDataUrl
    : await svgToPngDataUrl(asset.svg, asset.width, asset.height, 2);
  slide.addImage({ data: svgDataUrl(asset.svg), ...fit, altText });
  if (png) {
    // pptxgenjs registers two media rels for an SVG (png preview + svg); fill the preview so it
    // isn't re-rasterized at 1× (or left broken outside the browser)
    const rels = (slide as unknown as { _relsMedia?: { isSvgPng?: boolean; data?: string }[] })._relsMedia ?? [];
    const preview = [...rels].reverse().find((r) => r.isSvgPng);
    if (preview) {
      preview.data = png;
      preview.isSvgPng = false;
    }
  }
  return true;
}

function addPlaceholder(slide: Slide, pptx: Pres, box: Box, title: string, caption?: string, reason?: string) {
  slide.addShape(pptx.ShapeType.rect, {
    ...box,
    fill: { color: C.placeholder },
    line: { color: C.muted, width: 1, dashType: "dash" },
  });
  const runs: PptxGenJS.TextProps[] = [
    { text: "Figure unavailable", options: { bold: true, fontSize: 16, color: C.muted, breakLine: true } },
    { text: title, options: { fontSize: 14, color: C.text, breakLine: !!(caption || reason) } },
  ];
  if (caption) runs.push({ text: caption, options: { fontSize: 12, color: C.muted, breakLine: !!reason } });
  if (reason) runs.push({ text: reason, options: { fontSize: 10, italic: true, color: C.muted } });
  slide.addText(runs, { ...box, fontFace: FONT, align: "center", valign: "middle", margin: 12 });
}

function chip(slide: Slide, pptx: Pres, text: string, x: number, y: number, w: number, strong = false): number {
  const pt = 11;
  const h = 0.14 + lineCount(text, w - 0.2, pt) * 0.19;
  slide.addText(text, {
    shape: pptx.ShapeType.roundRect,
    rectRadius: 0.08,
    x,
    y,
    w,
    h,
    fill: { color: strong ? C.primaryLight : "FFFFFF" },
    line: { color: strong ? C.primaryLight : C.border, width: 0.75 },
    fontFace: FONT,
    fontSize: pt,
    color: strong ? C.primaryDark : C.text,
    valign: "middle",
    margin: 5,
  });
  return h;
}

function railLabel(slide: Slide, text: string, x: number, y: number, w: number) {
  slide.addText(text.toUpperCase(), {
    x,
    y,
    w,
    h: 0.26,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    charSpacing: 1,
    color: C.muted,
    margin: 0,
    valign: "bottom",
  });
  return 0.32;
}

function addRail(slide: Slide, pptx: Pres, rail: Box, provenance: Provenance) {
  const { x, w } = rail;
  const bottom = rail.y + rail.h;
  let y = rail.y;
  const fits = (h: number) => y + h <= bottom;

  const entity = provenance.entity;
  if (entity) {
    y += railLabel(slide, entity.type || "Entity", x, y, w);
    const label =
      entity.label && entity.label !== entity.id ? `${entity.label} · ${entity.id}` : entity.label || entity.id;
    y += chip(slide, pptx, label, x, y, w, true) + 0.18;
  }

  const filters = provenance.filters ?? [];
  if (filters.length) {
    y += railLabel(slide, "Filters", x, y, w);
    for (let i = 0; i < filters.length; i += 1) {
      const need = 0.14 + lineCount(filters[i], w - 0.2, 11) * 0.19;
      if (!fits(need + 0.45)) {
        chip(slide, pptx, `+${filters.length - i} more`, x, y, w);
        y += 0.4;
        break;
      }
      y += chip(slide, pptx, filters[i], x, y, w) + 0.08;
    }
    y += 0.1;
  }

  if (provenance.sourceLabel && fits(0.7)) {
    y += railLabel(slide, "Source", x, y, w);
    slide.addText(provenance.sourceLabel, {
      x,
      y,
      w,
      h: Math.min(bottom - y, 0.2 + lineCount(provenance.sourceLabel, w, 10) * 0.18),
      fontFace: FONT,
      fontSize: 10,
      color: C.muted,
      valign: "top",
      margin: 0,
    });
  }
}

function tableRows(table: PlacedTable, headerFill = true): PptxGenJS.TableRow[] {
  const header: PptxGenJS.TableRow = table.data.columns.map((col) => ({
    text: col.label,
    options: headerFill ? { bold: true, color: C.primaryDark, fill: { color: C.primaryLight } } : { bold: true },
  }));
  const body = table.data.rows.map((row) =>
    table.data.columns.map((col) => ({ text: truncate(formatCell(row[col.key]), CELL_MAX_CHARS) })),
  );
  return [header, ...body];
}

/** Native table in `box`; returns the bottom y it (roughly) reaches. */
function addNativeTable(slide: Slide, table: PlacedTable, box: Box, fontSize: number = SLIDE_TYPE.tablePt): number {
  const cols = Math.max(1, table.data.columns.length);
  const rows = tableRows(table);
  const rowH = Math.min(0.36, Math.max(0.24, box.h / Math.max(rows.length, 1)));
  slide.addTable(rows, {
    x: box.x,
    y: box.y,
    w: box.w,
    colW: Array(cols).fill(box.w / cols),
    rowH,
    fontFace: FONT,
    fontSize,
    color: C.text,
    valign: "middle",
    border: { type: "solid", pt: 0.5, color: C.border },
    autoPage: false,
  });
  return box.y + rowH * rows.length;
}

function addTableNote(slide: Slide, text: string, x: number, y: number, w: number) {
  slide.addText(text, { x, y, w, h: 0.3, fontFace: FONT, fontSize: 11, italic: true, color: C.muted, margin: 0 });
}

// ---------- units ----------

function titleSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "titleSlide" }>) {
  const slide = pptx.addSlide({ masterName: PLAIN_MASTER(frame) });
  const x = frame.margin + 0.3;
  const w = frame.W - 2 * x;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.18,
    h: frame.H,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  });
  slide.addText(unit.title, {
    x,
    y: frame.H * 0.28,
    w,
    h: 1.3,
    fontFace: FONT,
    fontSize: 40,
    bold: true,
    color: C.text,
    valign: "bottom",
    fit: "shrink",
    margin: 0,
  });
  if (unit.description) {
    slide.addText(unit.description, {
      x,
      y: frame.H * 0.28 + 1.45,
      w,
      h: 1.2,
      fontFace: FONT,
      fontSize: 18,
      color: C.muted,
      valign: "top",
      fit: "shrink",
      margin: 0,
    });
  }
  const meta = [unit.entityLabel, releaseLabel(unit.dataRelease), formatDate(unit.date)].filter(Boolean).join("  ·  ");
  slide.addText(meta, {
    x,
    y: frame.H - 1.5,
    w,
    h: 0.4,
    fontFace: FONT,
    fontSize: 14,
    color: C.primaryDark,
    margin: 0,
  });
}

function chapterSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "chapterSlide" }>) {
  const slide = pptx.addSlide({ masterName: PLAIN_MASTER(frame) });
  const x = frame.margin + 0.3;
  slide.addText(String(unit.n).padStart(2, "0"), {
    x,
    y: frame.H * 0.3,
    w: 3,
    h: 0.8,
    fontFace: FONT,
    fontSize: 32,
    bold: true,
    color: C.primary,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x,
    y: frame.H * 0.3 + 0.95,
    w: 1.2,
    h: 0,
    line: { color: C.primary, width: 1.5 },
  });
  slide.addText(unit.title, {
    x,
    y: frame.H * 0.3 + 1.1,
    w: frame.W - 2 * x,
    h: 1.6,
    fontFace: FONT,
    fontSize: 40,
    bold: true,
    color: C.text,
    valign: "top",
    fit: "shrink",
    margin: 0,
  });
}

async function figureSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "figureSlide" }>) {
  const fullBleed = unit.layout === "fullBleed";
  const slide = pptx.addSlide({ masterName: fullBleed ? PLAIN_MASTER(frame) : CONTENT_MASTER(frame) });
  const footer = figureFooter(unit.figureN, unit.caption);

  if (fullBleed) {
    const box = { x: 0, y: 0, w: frame.W, h: frame.H };
    const placed = unit.asset ? await addAsset(slide, unit.asset, box, unit.caption ?? unit.title) : false;
    if (!placed && unit.table?.data.columns.length)
      addNativeTable(slide, unit.table, { ...frame.content, y: 1.3, h: frame.content.h });
    else if (!placed) addPlaceholder(slide, pptx, frame.content, unit.title, unit.caption, missingReason(unit.asset));
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: frame.W,
      h: 1.15,
      fill: { color: "FFFFFF", transparency: 12 },
      line: { color: "FFFFFF", width: 0 },
    });
    addTitle(slide, frame, unit.title, unit.kicker);
    addFooterLeft(slide, frame, footer);
    addNotes(slide, unit.notes);
    return;
  }

  addTitle(slide, frame, unit.title, unit.kicker);
  const area = frame.figure;
  if (unit.table && !unit.table.data.columns.length) {
    // Rows moved to the appendix: the takeaway slide keeps only the pointer
    slide.addText(unit.table.note ?? "Full table in appendix", {
      ...area,
      fontFace: FONT,
      fontSize: 18,
      italic: true,
      color: C.muted,
      align: "center",
      valign: "middle",
    });
  } else if (unit.table) {
    const tooWide = unit.table.data.columns.length > frame.geom.maxTableCols;
    const noteH = unit.table.note ? 0.4 : 0;
    const bottom = addNativeTable(slide, unit.table, { ...area, h: area.h - noteH }, tooWide ? 9 : SLIDE_TYPE.tablePt);
    if (unit.table.note)
      addTableNote(slide, unit.table.note, area.x, Math.min(bottom + 0.08, area.y + area.h - 0.3), area.w);
  } else {
    const placed = unit.asset ? await addAsset(slide, unit.asset, area, unit.caption ?? unit.title) : false;
    if (!placed) addPlaceholder(slide, pptx, area, unit.title, unit.caption, missingReason(unit.asset));
  }
  addRail(slide, pptx, frame.rail, unit.provenance);
  addFooterLeft(slide, frame, footer);
  addNotes(slide, unit.notes);
}

const missingReason = (asset?: FigureAsset) =>
  asset?.kind === "missing" ? asset.reason : asset ? "Image could not be embedded" : undefined;

function statementSlide(
  pptx: Pres,
  frame: SlideFrame,
  unit: Extract<SlideUnit, { kind: "statementSlide" }>,
  tone?: string,
) {
  const slide = pptx.addSlide({ masterName: PLAIN_MASTER(frame) });
  const x = frame.margin + 0.6;
  const w = frame.W - 2 * x;
  const accent = TONE_COLOR[tone ?? "finding"] ?? C.finding;
  slide.addShape(pptx.ShapeType.rect, {
    x: x - 0.35,
    y: frame.H * 0.2,
    w: 0.08,
    h: frame.H * 0.55,
    fill: { color: accent },
    line: { color: accent, width: 0 },
  });
  if (tone) {
    slide.addText((CALLOUT_LABEL[tone] ?? tone).toUpperCase(), {
      x,
      y: frame.H * 0.2 - 0.45,
      w,
      h: 0.35,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      charSpacing: 1.5,
      color: accent,
      margin: 0,
    });
  }
  const runs = richTextToPptxRuns(unit.doc, {
    fontSize: SLIDE_TYPE.statementPt,
    monoFace: MONO,
    linkColor: C.primaryDark,
  });
  slide.addText(runs.length ? runs : [{ text: "" }], {
    x,
    y: frame.H * 0.2,
    w,
    h: frame.H * 0.55,
    fontFace: FONT,
    fontSize: SLIDE_TYPE.statementPt,
    color: C.text,
    valign: "middle",
    fit: "shrink",
    lineSpacingMultiple: 1.1,
    margin: 0,
  });
  addNotes(slide, unit.notes);
}

function appendixTableSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "appendixTableSlide" }>) {
  const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
  addTitle(slide, frame, unit.title, unit.pages > 1 ? `Appendix · ${unit.page} / ${unit.pages}` : "Appendix");
  const area = frame.content;
  const tooWide = unit.table.data.columns.length > frame.geom.maxTableCols;
  const bottom = addNativeTable(slide, unit.table, { ...area, h: area.h - 0.4 }, tooWide ? 9 : SLIDE_TYPE.tablePt);
  const from = unit.table.shownFrom + 1;
  const to = unit.table.shownFrom + unit.table.data.rows.length;
  const note = unit.table.note ?? `Rows ${from}–${to} of ${unit.table.totalRows}`;
  addTableNote(slide, note, area.x, Math.min(bottom + 0.08, area.y + area.h - 0.3), area.w);
}

const MONO_PAD = 0.14;
const monoLineH = (pt: number) => (pt * 1.2) / 72;

function monoBox(slide: Slide, pptx: Pres, text: string, box: Box, pt = 10) {
  const lineH = monoLineH(pt);
  const maxLines = Math.max(1, Math.floor((box.h - MONO_PAD) / lineH));
  const lines = text.split("\n");
  const shown =
    lines.length > maxLines
      ? [...lines.slice(0, maxLines - 1), "… (truncated — full request in the data export)"]
      : lines;
  slide.addShape(pptx.ShapeType.rect, { ...box, fill: { color: "F7F9FB" }, line: { color: C.border, width: 0.75 } });
  slide.addText(shown.join("\n"), {
    ...box,
    fontFace: MONO,
    fontSize: pt,
    color: C.text,
    valign: "top",
    margin: 6,
  });
}

function dataSourceSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "dataSourceSlide" }>) {
  const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
  const { request } = unit;
  addTitle(slide, frame, unit.title, "Data source");
  const area = frame.content;
  slide.addText(
    [
      {
        text: `${request.method ?? (request.query ? "POST" : "GET")}  `,
        options: { bold: true, color: C.primaryDark },
      },
      { text: request.endpoint, options: { fontFace: MONO } },
    ],
    {
      x: area.x,
      y: area.y,
      w: area.w,
      h: 0.4,
      fontFace: FONT,
      fontSize: 14,
      color: C.text,
      margin: 0,
      valign: "middle",
    },
  );
  const top = area.y + 0.55;
  const h = area.h - 0.55 - 0.4;
  const leftW = request.query || request.body ? area.w * 0.58 : 0;
  if (request.query) monoBox(slide, pptx, request.query, { x: area.x, y: top, w: leftW - 0.2, h });
  else if (request.body) monoBox(slide, pptx, request.body, { x: area.x, y: top, w: leftW - 0.2, h });

  const rx = area.x + leftW;
  const rw = area.w - leftW;
  let y = top;
  const section = (label: string, text: string) => {
    if (y > top + h - 0.6) return;
    y += railLabel(slide, label, rx, y, rw);
    const boxH = Math.min(top + h - y, MONO_PAD + 0.02 + text.split("\n").length * monoLineH(10));
    monoBox(slide, pptx, text, { x: rx, y, w: rw, h: boxH }, 10);
    y += boxH + 0.15;
  };
  const variables = stringifyVariables(request.variables);
  if (variables) section("Variables", variables);
  if (request.params?.length) section("Parameters", request.params.map((p) => `${p.key}=${p.value}`).join("\n"));
  const headers = headerLines(request);
  if (headers.length) section("Headers", headers.map((hd) => `${hd.key}: ${hd.value}`).join("\n"));
  if (request.query && request.body) section("Body", request.body);

  slide.addText(`Retrieved ${formatDate(unit.retrievedAt)}`, {
    x: area.x,
    y: area.y + area.h - 0.3,
    w: area.w,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11,
    italic: true,
    color: C.muted,
    margin: 0,
  });
}

const methodsRow = (entry: MethodsEntry): string[] => [
  [entry.figureLabel, entry.title].filter(Boolean).join(" · "),
  [
    entry.sourceLabel,
    entry.request ? `${entry.request.method ?? (entry.request.query ? "POST" : "GET")} ${entry.request.endpoint}` : "",
    entry.inputRefs?.length ? `Inputs: ${entry.inputRefs.join(", ")}` : "",
    entry.code ? "Code: see the PDF or Markdown export" : "",
    entry.note,
  ]
    .filter(Boolean)
    .join("\n"),
  entry.filters.join("; "),
  entry.entity ? entry.entity.label || entry.entity.id : "",
  [entry.dataRelease ? releaseLabel(entry.dataRelease) : "", formatDate(entry.retrievedAt)].filter(Boolean).join("\n"),
];

// The plan already splits methods into units of ≤ 8 entries; `page`/`pages` count those units
function methodsSlides(
  pptx: Pres,
  frame: SlideFrame,
  unit: Extract<SlideUnit, { kind: "methodsSlide" }>,
  page: number,
  pageCount: number,
) {
  const pages = paginate(unit.entries, METHODS_ROWS_PER_SLIDE);
  pages.forEach((entries, i) => {
    const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
    const n = pageCount + pages.length - 1;
    const kicker = n > 1 ? `Appendix · ${page + i} / ${n}` : "Appendix";
    addTitle(slide, frame, "Methods", kicker);
    const area = frame.content;
    const header = ["Block", "Source / request", "Filters", "Entity", "Release · retrieved"];
    const widths = [0.22, 0.3, 0.24, 0.1, 0.14].map((f) => f * area.w);
    const rows: PptxGenJS.TableRow[] = [
      header.map((text) => ({ text, options: { bold: true, color: C.primaryDark, fill: { color: C.primaryLight } } })),
      ...entries.map((e) => methodsRow(e).map((text) => ({ text: truncate(text, 260) }))),
    ];
    if (!entries.length)
      rows.push([{ text: "No data sources in this report.", options: { colspan: 5, italic: true } }]);
    slide.addTable(rows, {
      x: area.x,
      y: area.y,
      w: area.w,
      colW: widths,
      fontFace: FONT,
      fontSize: 10,
      color: C.text,
      valign: "top",
      border: { type: "solid", pt: 0.5, color: C.border },
      autoPage: false,
    });
  });
  return pages.length;
}

// ---------- entry ----------

export async function writePptx(plan: ExportPlan, ctx: WriterContext): Promise<Blob> {
  const mod = await import("pptxgenjs");
  // ESM build exposes the class as default; CJS interop (tests) may nest it once more
  const Ctor = ((mod as unknown as { default: { default?: typeof PptxGenJS } }).default.default ??
    mod.default) as typeof PptxGenJS;
  const pptx = new Ctor();
  const frame = slideFrame(ctx.settings.slides.aspect);
  defineMasters(pptx, frame, plan.dataRelease ?? ctx.doc.dataRelease);
  pptx.title = plan.title;
  pptx.subject = "Open Targets Platform report";
  pptx.company = "Open Targets";

  const toneOf = (nodeId: string) => {
    const node = ctx.doc.nodes.find((n) => n.id === nodeId);
    return node?.type === "prose" ? node.tone : undefined;
  };

  const units = plan.units as SlideUnit[];
  const total = units.length;
  const methodsCount = units.filter((u) => u.kind === "methodsSlide").length;
  let methodsPage = 0;
  const renderUnit = async (unit: SlideUnit) => {
    switch (unit.kind) {
      case "titleSlide":
        titleSlide(pptx, frame, unit);
        break;
      case "chapterSlide":
        chapterSlide(pptx, frame, unit);
        break;
      case "figureSlide":
        await figureSlide(pptx, frame, unit);
        break;
      case "statementSlide":
        statementSlide(pptx, frame, unit, toneOf(unit.nodeId));
        break;
      case "appendixTableSlide":
        appendixTableSlide(pptx, frame, unit);
        break;
      case "dataSourceSlide":
        dataSourceSlide(pptx, frame, unit);
        break;
      case "methodsSlide":
        methodsPage += 1;
        methodsSlides(pptx, frame, unit, methodsPage, methodsCount);
        break;
      default:
    }
  };

  for (let i = 0; i < total; i += 1) {
    const unit = units[i];
    ctx.onProgress?.(i + 1, total, `Rendering slide ${i + 1} / ${total}`);
    await yieldFrame();
    try {
      await renderUnit(unit);
    } catch (e) {
      throw unitError(e, unit, `slide ${i + 1}`);
    }
  }
  ctx.onProgress?.(total, total, "Packaging PPTX");
  await yieldFrame();
  const bytes = (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
  const fixed = await fixParagraphProps(bytes);
  return new Blob([fixed as BlobPart], { type: PPTX_MIME });
}

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const PARAGRAPH = /<a:p>([\s\S]*?)<\/a:p>/g;
const PPR = /<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g;

/**
 * pptxgenjs 4.0 writes an <a:pPr> before every run of a multi-run paragraph; OOXML allows
 * one, first. Keep the first per paragraph so PowerPoint doesn't offer to repair the file.
 */
async function fixParagraphProps(bytes: Uint8Array): Promise<Uint8Array> {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const files = unzipSync(bytes);
  let changed = false;
  Object.keys(files).forEach((name) => {
    if (!/^ppt\/(slides|slideLayouts|slideMasters|notesSlides)\/[^/]+\.xml$/.test(name)) return;
    const xml = strFromU8(files[name]);
    const next = xml.replace(PARAGRAPH, (para: string, inner: string) => {
      let seen = false;
      const cleaned = inner.replace(PPR, (ppr: string) => {
        if (seen) return "";
        seen = true;
        return ppr;
      });
      return cleaned === inner ? para : `<a:p>${cleaned}</a:p>`;
    });
    if (next !== xml) {
      files[name] = strToU8(next);
      changed = true;
    }
  });
  return changed ? zipSync(files, { level: 6 }) : bytes;
}

import type PptxGenJS from "pptxgenjs";
import type { RichTextDoc } from "../../../core";
import { OT_LOGO_ASPECT, SLIDE_BRAND, SLIDE_FONTS, SLIDE_TONE, SLIDE_TYPE } from "../layout";
import { formatCell } from "../richText/toHtml";
import { toPlainText } from "../richText/toPlainText";
import { richTextToPptxRuns } from "../richText/toPptxRuns";
import {
  type LogoVariant,
  decorTextWidth,
  otLogoSvg,
  slideDecor,
  titleMetaColumns,
  titleSlideLayout,
} from "../slideTheme";
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

const HEAD = SLIDE_FONTS.heading;
const BODY = SLIDE_FONTS.body;
const MONO = "Courier New";
const hex = (c: string) => c.replace("#", "").toUpperCase();
const C = {
  navy: hex(SLIDE_BRAND.navy),
  blue: hex(SLIDE_BRAND.blue),
  blue50: hex(SLIDE_BRAND.blue50),
  blue30: hex(SLIDE_BRAND.blue30),
  red: hex(SLIDE_BRAND.red),
  grey: hex(SLIDE_BRAND.grey),
  grey50: hex(SLIDE_BRAND.grey50),
  grey30: hex(SLIDE_BRAND.grey30),
  panel: hex(SLIDE_BRAND.panel),
  white: "FFFFFF",
};
const toneColor = (tone: string | undefined, on: "light" | "dark") =>
  hex((SLIDE_TONE[(tone ?? "finding") as keyof typeof SLIDE_TONE] ?? SLIDE_TONE.finding)[on]);

const METHODS_ROWS_PER_SLIDE = 8;
const CELL_MAX_CHARS = 140;

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** Number of wrapped lines a string takes in a box `w` inches wide at `pt` points (rough sans metrics). */
const lineCount = (text: string, w: number, pt: number) => {
  const perLine = Math.max(8, Math.floor((w * 72) / (pt * 0.52)));
  return text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / perLine)), 0);
};

const noLine = (color: string) => ({ color, width: 0 });
// pptxgenjs 4 writes custom geometry for "custGeom" but its SHAPE_NAME union doesn't list it
const CUSTOM_GEOMETRY = "custGeom" as PptxGenJS.SHAPE_NAME;

// ---------- masters ----------

const CONTENT_MASTER = (frame: SlideFrame) => frame.geom.layoutName;
const PLAIN_MASTER = (frame: SlideFrame) => `${frame.geom.layoutName}_PLAIN`;
const DARK_MASTER = (frame: SlideFrame) => `${frame.geom.layoutName}_DARK`;

function defineMasters(pptx: Pres, frame: SlideFrame, release?: string) {
  pptx.defineLayout({ name: frame.geom.layoutName, width: frame.W, height: frame.H });
  pptx.layout = frame.geom.layoutName;
  pptx.theme = { headFontFace: HEAD, bodyFontFace: BODY };

  const footerText = (color: string) => ({
    text: {
      text: releaseLabel(release),
      options: {
        ...frame.footerRight,
        align: "right" as const,
        fontFace: BODY,
        fontSize: SLIDE_TYPE.footerPt,
        color,
        valign: "middle" as const,
        margin: 0,
      },
    },
  });
  const slideNumber = (color: string) => ({
    ...frame.slideNumber,
    fontFace: BODY,
    fontSize: SLIDE_TYPE.footerPt,
    color,
    align: "right" as const,
    valign: "middle" as const,
    margin: 0,
  });

  pptx.defineSlideMaster({
    title: CONTENT_MASTER(frame),
    background: { color: C.white },
    objects: [footerText(C.grey50)],
    slideNumber: slideNumber(C.grey50),
  });
  // Title and section slides: the diagonal panels are drawn per slide
  pptx.defineSlideMaster({ title: PLAIN_MASTER(frame), background: { color: C.white }, objects: [] });
  // Statement slides: navy, a thin rule above the footer (template "80-90%" slide)
  pptx.defineSlideMaster({
    title: DARK_MASTER(frame),
    background: { color: C.navy },
    objects: [
      {
        line: {
          x: frame.margin,
          y: frame.footer.y - 0.12,
          w: frame.W - 2 * frame.margin,
          h: 0,
          line: { color: C.blue50, width: 0.75 },
        },
      },
      footerText(C.blue30),
    ],
    slideNumber: slideNumber(C.blue30),
  });
}

// ---------- building blocks ----------

const logoPngCache = new Map<LogoVariant, Promise<string | undefined>>();

const logoPng = (variant: LogoVariant) => {
  let png = logoPngCache.get(variant);
  if (!png) {
    const svg = otLogoSvg(variant);
    png = svgToPngDataUrl(svg, 720, 720 / OT_LOGO_ASPECT, 1, true);
    logoPngCache.set(variant, png);
  }
  return png;
};

/**
 * SVG + PNG preview: pptxgenjs registers two media rels for an SVG (png preview + svg); we
 * fill the preview ourselves so it isn't re-rasterized at 1× (or left broken outside the browser).
 */
function placeSvg(slide: Slide, svg: string, png: string | undefined, box: Box, altText?: string) {
  slide.addImage({ data: svgDataUrl(svg), ...box, altText });
  if (png) {
    const rels = (slide as unknown as { _relsMedia?: { isSvgPng?: boolean; data?: string }[] })._relsMedia ?? [];
    const preview = [...rels].reverse().find((r) => r.isSvgPng);
    if (preview) {
      preview.data = png;
      preview.isSvgPng = false;
    }
  }
}

async function addLogo(slide: Slide, box: Box, variant: LogoVariant) {
  placeSvg(slide, otLogoSvg(variant), await logoPng(variant), box, "Open Targets");
}

function addDecor(slide: Slide, frame: SlideFrame, kind: "title" | "chapter") {
  slideDecor(frame, kind).forEach((poly) => {
    const xs = poly.points.map((p) => p[0]);
    const ys = poly.points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    slide.addShape(CUSTOM_GEOMETRY, {
      x,
      y,
      w: Math.max(...xs) - x,
      h: Math.max(...ys) - y,
      fill: { color: hex(poly.color) },
      line: noLine(hex(poly.color)),
      points: [
        ...poly.points.map(([px, py], i) => ({ x: px - x, y: py - y, moveTo: i === 0 })),
        { close: true as const },
      ],
    });
  });
}

function addTitle(slide: Slide, frame: SlideFrame, title: string, kicker?: string) {
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      ...frame.kicker,
      fontFace: BODY,
      fontSize: SLIDE_TYPE.kickerPt,
      bold: true,
      charSpacing: 1.5,
      color: C.blue,
      valign: "bottom",
      margin: 0,
    });
  }
  slide.addText(title, {
    ...frame.title,
    fontFace: HEAD,
    fontSize: SLIDE_TYPE.titlePt,
    bold: true,
    color: C.navy,
    valign: "middle",
    fit: "shrink",
    margin: 0,
  });
}

function addFooterLeft(slide: Slide, frame: SlideFrame, text?: string, color = C.grey50) {
  if (!text) return;
  slide.addText(truncate(text, 180), {
    ...frame.footerLeft,
    fontFace: BODY,
    fontSize: SLIDE_TYPE.footerPt,
    color,
    valign: "middle",
    margin: 0,
  });
}

function addPanel(slide: Slide, pptx: Pres, frame: SlideFrame) {
  slide.addShape(pptx.ShapeType.rect, { ...frame.panel, fill: { color: C.panel }, line: noLine(C.panel) });
}

const figureFooter = (n?: number, caption?: string) => [n ? `Fig ${n}` : "", caption ?? ""].filter(Boolean).join(" · ");

function addNotes(slide: Slide, docs: RichTextDoc[] | undefined) {
  const text = (docs ?? [])
    .map((d) => toPlainText(d))
    .filter(Boolean)
    .join("\n\n");
  if (text) slide.addNotes(text);
}

/** SVG + PNG fallback, or a raster. */
async function addAsset(slide: Slide, asset: FigureAsset, box: Box, altText?: string): Promise<boolean> {
  if (asset.kind === "raster") {
    if (!isSafeImageDataUrl(asset.dataUrl)) return false;
    slide.addImage({ data: asset.dataUrl, ...fitContain(asset.width, asset.height, box), altText });
    return true;
  }
  if (asset.kind !== "svg") return false;
  const png = isSafeImageDataUrl(asset.pngDataUrl)
    ? asset.pngDataUrl
    : await svgToPngDataUrl(asset.svg, asset.width, asset.height, 2);
  placeSvg(slide, asset.svg, png, fitContain(asset.width, asset.height, box), altText);
  return true;
}

function addPlaceholder(slide: Slide, pptx: Pres, box: Box, title: string, caption?: string, reason?: string) {
  slide.addShape(pptx.ShapeType.rect, {
    ...box,
    fill: { color: C.panel },
    line: { color: C.grey50, width: 1, dashType: "dash" },
  });
  const runs: PptxGenJS.TextProps[] = [
    { text: "Figure unavailable", options: { bold: true, fontSize: 16, color: C.grey, breakLine: true } },
    { text: title, options: { fontSize: 14, color: C.navy, breakLine: !!(caption || reason) } },
  ];
  if (caption) runs.push({ text: caption, options: { fontSize: 12, color: C.grey, breakLine: !!reason } });
  if (reason) runs.push({ text: reason, options: { fontSize: 10, italic: true, color: C.grey } });
  slide.addText(runs, { ...box, fontFace: BODY, align: "center", valign: "middle", margin: 12 });
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
    fill: { color: strong ? C.blue30 : C.white },
    line: { color: strong ? C.blue30 : C.grey30, width: 0.75 },
    fontFace: BODY,
    fontSize: pt,
    color: strong ? C.navy : C.grey,
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
    fontFace: BODY,
    fontSize: 9,
    bold: true,
    charSpacing: 1,
    color: C.grey50,
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
      fontFace: BODY,
      fontSize: 10,
      color: C.grey,
      valign: "top",
      margin: 0,
    });
  }
}

const HEADER_CELL = { bold: true, color: C.white, fill: { color: C.navy } };

function tableRows(table: PlacedTable): PptxGenJS.TableRow[] {
  const header: PptxGenJS.TableRow = table.data.columns.map((col) => ({ text: col.label, options: HEADER_CELL }));
  const body = table.data.rows.map((row) =>
    table.data.columns.map((col) => ({
      text: truncate(formatCell(row[col.key]), CELL_MAX_CHARS),
      options: { fill: { color: C.white } },
    })),
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
    fontFace: BODY,
    fontSize,
    color: C.grey,
    valign: "middle",
    border: { type: "solid", pt: 0.5, color: C.grey30 },
    autoPage: false,
  });
  return box.y + rowH * rows.length;
}

function addTableNote(slide: Slide, text: string, x: number, y: number, w: number) {
  slide.addText(text, { x, y, w, h: 0.3, fontFace: BODY, fontSize: 11, italic: true, color: C.grey, margin: 0 });
}

// ---------- units ----------

/** Template title slide: logo top-left, navy title and meta row on the left, diagonal panels right. */
async function titleSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "titleSlide" }>) {
  const slide = pptx.addSlide({ masterName: PLAIN_MASTER(frame) });
  addDecor(slide, frame, "title");
  const layout = titleSlideLayout(frame, unit.title, unit.description);
  await addLogo(slide, layout.logo, "colour");
  slide.addText(unit.title, {
    ...layout.title,
    fontFace: HEAD,
    fontSize: layout.titleFontPt,
    bold: true,
    color: C.navy,
    valign: "bottom",
    fit: "shrink",
    lineSpacingMultiple: 1.05,
    margin: 0,
  });
  if (layout.description && unit.description) {
    slide.addText(unit.description.trim(), {
      ...layout.description,
      fontFace: BODY,
      fontSize: 14,
      color: C.grey,
      valign: "top",
      fit: "shrink",
      margin: 0,
    });
  }
  const columns = titleMetaColumns(unit);
  const colW = layout.metaColumnWidth(columns.length);
  columns.forEach((col, i) => {
    slide.addText(
      [
        { text: col.soft, options: { fontSize: 11, color: C.grey, breakLine: true } },
        { text: col.strong, options: { fontSize: 13, bold: true, color: C.navy } },
      ],
      {
        x: layout.meta.x + i * colW,
        y: layout.meta.y,
        w: colW - 0.15,
        h: layout.meta.h,
        fontFace: BODY,
        valign: "top",
        margin: 0,
      },
    );
  });
}

/** Template section slide: "PART n", a thin rule, the navy title; blue and navy triangles right. */
function chapterSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "chapterSlide" }>) {
  const slide = pptx.addSlide({ masterName: PLAIN_MASTER(frame) });
  addDecor(slide, frame, "chapter");
  const x = frame.margin;
  const w = decorTextWidth(frame) + 0.4;
  const y = frame.H * 0.33;
  slide.addText(`PART ${unit.n}`, {
    x,
    y,
    w,
    h: 0.4,
    fontFace: BODY,
    fontSize: 14,
    bold: true,
    color: C.navy,
    valign: "bottom",
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, { x, y: y + 0.55, w, h: 0, line: { color: C.grey50, width: 0.75 } });
  slide.addText(unit.title, {
    x,
    y: y + 0.7,
    w,
    h: frame.H - (y + 0.7) - 0.8,
    fontFace: HEAD,
    fontSize: SLIDE_TYPE.chapterPt,
    bold: true,
    color: C.navy,
    valign: "top",
    fit: "shrink",
    lineSpacingMultiple: 1.05,
    margin: 0,
  });
}

async function figureSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "figureSlide" }>) {
  const fullBleed = unit.layout === "fullBleed";
  const slide = pptx.addSlide({ masterName: fullBleed ? PLAIN_MASTER(frame) : CONTENT_MASTER(frame) });
  const footer = figureFooter(unit.figureN, [unit.caption, unit.dataNote].filter(Boolean).join(" · "));

  if (fullBleed) {
    const box = { x: 0, y: 0, w: frame.W, h: frame.H };
    const placed = unit.asset ? await addAsset(slide, unit.asset, box, unit.caption ?? unit.title) : false;
    if (!placed && unit.table?.data.columns.length)
      addNativeTable(slide, unit.table, { ...frame.content, y: 1.3, h: frame.content.h });
    else if (!placed) addPlaceholder(slide, pptx, frame.content, unit.title, unit.caption, missingReason(unit.asset));
    // Translucent white bands keep the title and footer legible over the image
    const bandY = frame.footer.y - 0.15;
    for (const band of [
      { y: 0, h: 1.4 },
      { y: bandY, h: frame.H - bandY },
    ]) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: band.y,
        w: frame.W,
        h: band.h,
        fill: { color: C.white, transparency: 10 },
        line: noLine(C.white),
      });
    }
    addTitle(slide, frame, unit.title, unit.kicker);
    addFooterLeft(slide, frame, footer);
    await addLogo(slide, frame.logo, "colour");
    addNotes(slide, unit.notes);
    return;
  }

  addTitle(slide, frame, unit.title, unit.kicker);
  const area = frame.figure;
  if (unit.table && !unit.table.data.columns.length) {
    // Rows moved to the appendix: the takeaway slide keeps only the pointer
    slide.addText(unit.table.note ?? "Full table in appendix", {
      ...area,
      fontFace: BODY,
      fontSize: 18,
      italic: true,
      color: C.grey50,
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
  await addLogo(slide, frame.logo, "colour");
  addNotes(slide, unit.notes);
}

const missingReason = (asset?: FigureAsset) =>
  asset?.kind === "missing" ? asset.reason : asset ? "Image could not be embedded" : undefined;

/** Template statement slide: navy background, white text, white logo. */
async function statementSlide(
  pptx: Pres,
  frame: SlideFrame,
  unit: Extract<SlideUnit, { kind: "statementSlide" }>,
  tone?: string,
) {
  const slide = pptx.addSlide({ masterName: DARK_MASTER(frame) });
  const x = frame.margin + 0.4;
  const w = frame.W - 2 * x;
  const y = frame.H * 0.2;
  const h = frame.H * 0.55;
  if (tone) {
    slide.addText((CALLOUT_LABEL[tone] ?? tone).toUpperCase(), {
      x,
      y: y - 0.45,
      w,
      h: 0.35,
      fontFace: BODY,
      fontSize: 12,
      bold: true,
      charSpacing: 1.5,
      color: toneColor(tone, "dark"),
      margin: 0,
    });
  }
  const runs = richTextToPptxRuns(unit.doc, {
    fontSize: SLIDE_TYPE.statementPt,
    monoFace: MONO,
    linkColor: C.blue30,
  });
  slide.addText(runs.length ? runs : [{ text: "" }], {
    x,
    y,
    w,
    h,
    fontFace: BODY,
    fontSize: SLIDE_TYPE.statementPt,
    color: C.white,
    valign: "middle",
    fit: "shrink",
    lineSpacingMultiple: 1.15,
    margin: 0,
  });
  await addLogo(slide, frame.logo, "white");
  addNotes(slide, unit.notes);
}

async function appendixTableSlide(
  pptx: Pres,
  frame: SlideFrame,
  unit: Extract<SlideUnit, { kind: "appendixTableSlide" }>,
) {
  const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
  addPanel(slide, pptx, frame);
  addTitle(slide, frame, unit.title, unit.pages > 1 ? `Appendix · ${unit.page} / ${unit.pages}` : "Appendix");
  const area = frame.content;
  const tooWide = unit.table.data.columns.length > frame.geom.maxTableCols;
  const bottom = addNativeTable(slide, unit.table, { ...area, h: area.h - 0.4 }, tooWide ? 9 : SLIDE_TYPE.tablePt);
  const from = unit.table.shownFrom + 1;
  const to = unit.table.shownFrom + unit.table.data.rows.length;
  const note = unit.table.note ?? `Rows ${from}–${to} of ${unit.table.totalRows}`;
  addTableNote(slide, note, area.x, Math.min(bottom + 0.08, area.y + area.h - 0.3), area.w);
  await addLogo(slide, frame.logo, "colour");
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
  slide.addShape(pptx.ShapeType.rect, { ...box, fill: { color: C.white }, line: { color: C.grey30, width: 0.75 } });
  slide.addText(shown.join("\n"), {
    ...box,
    fontFace: MONO,
    fontSize: pt,
    color: C.grey,
    valign: "top",
    margin: 6,
  });
}

async function dataSourceSlide(pptx: Pres, frame: SlideFrame, unit: Extract<SlideUnit, { kind: "dataSourceSlide" }>) {
  const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
  addPanel(slide, pptx, frame);
  const { request } = unit;
  addTitle(slide, frame, unit.title, "Appendix · data source");
  const area = frame.content;
  slide.addText(
    [
      {
        text: `${request.method ?? (request.query ? "POST" : "GET")}  `,
        options: { bold: true, color: C.navy },
      },
      { text: request.endpoint, options: { fontFace: MONO } },
    ],
    {
      x: area.x,
      y: area.y,
      w: area.w,
      h: 0.4,
      fontFace: BODY,
      fontSize: 14,
      color: C.grey,
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
    fontFace: BODY,
    fontSize: 11,
    italic: true,
    color: C.grey,
    margin: 0,
  });
  await addLogo(slide, frame.logo, "colour");
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
async function methodsSlides(
  pptx: Pres,
  frame: SlideFrame,
  unit: Extract<SlideUnit, { kind: "methodsSlide" }>,
  page: number,
  pageCount: number,
) {
  const pages = paginate(unit.entries, METHODS_ROWS_PER_SLIDE);
  for (let i = 0; i < pages.length; i += 1) {
    const entries = pages[i];
    const slide = pptx.addSlide({ masterName: CONTENT_MASTER(frame) });
    addPanel(slide, pptx, frame);
    const n = pageCount + pages.length - 1;
    const kicker = n > 1 ? `Appendix · ${page + i} / ${n}` : "Appendix";
    addTitle(slide, frame, "Methods", kicker);
    const area = frame.content;
    const header = ["Block", "Source / request", "Filters", "Entity", "Release · retrieved"];
    const widths = [0.22, 0.3, 0.24, 0.1, 0.14].map((f) => f * area.w);
    const rows: PptxGenJS.TableRow[] = [
      header.map((text) => ({ text, options: HEADER_CELL })),
      ...entries.map((e) =>
        methodsRow(e).map((text) => ({ text: truncate(text, 260), options: { fill: { color: C.white } } })),
      ),
    ];
    if (!entries.length)
      rows.push([
        { text: "No data sources in this report.", options: { colspan: 5, italic: true, fill: { color: C.white } } },
      ]);
    slide.addTable(rows, {
      x: area.x,
      y: area.y,
      w: area.w,
      colW: widths,
      fontFace: BODY,
      fontSize: 10,
      color: C.grey,
      valign: "top",
      border: { type: "solid", pt: 0.5, color: C.grey30 },
      autoPage: false,
    });
    await addLogo(slide, frame.logo, "colour");
  }
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
        await titleSlide(pptx, frame, unit);
        break;
      case "chapterSlide":
        chapterSlide(pptx, frame, unit);
        break;
      case "figureSlide":
        await figureSlide(pptx, frame, unit);
        break;
      case "statementSlide":
        await statementSlide(pptx, frame, unit, unit.tone ?? toneOf(unit.nodeId));
        break;
      case "appendixTableSlide":
        await appendixTableSlide(pptx, frame, unit);
        break;
      case "dataSourceSlide":
        await dataSourceSlide(pptx, frame, unit);
        break;
      case "methodsSlide":
        methodsPage += 1;
        await methodsSlides(pptx, frame, unit, methodsPage, methodsCount);
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

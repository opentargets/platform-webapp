/**
 * PDF via the browser's print dialog: each builder returns a complete, self-contained HTML
 * document (print CSS, inline images, all text escaped); print*() loads it into a hidden
 * iframe, waits for fonts and images, and calls print().
 */
import {
  FONT_FAMILY,
  MONO_FAMILY,
  OT_COLORS,
  PAGE_SIZES,
  PAPER_MARGIN_MM,
  SLIDE_BRAND,
  SLIDE_FONTS,
  SLIDE_TONE,
  SLIDE_TYPE,
} from "../layout";
import {
  type LogoVariant,
  decorSvgHtml,
  decorTextWidth,
  otLogoDataUrl,
  titleMetaColumns,
  titleSlideLayout,
} from "../slideTheme";
import { formatReference, orderReferences } from "../citations";
import { escapeHtml as esc, formatCell, richTextToHtml } from "../richText/toHtml";
import type {
  DataSourceRequest,
  ExportDocument,
  ExportPlan,
  FigureAsset,
  MethodsEntry,
  PaperUnit,
  PlacedTable,
  Provenance,
  SlideUnit,
  TableData,
  WriterContext,
} from "../types";
import {
  type Box,
  CALLOUT_LABEL,
  formatDate,
  headerLines,
  isSafeImageDataUrl,
  releaseLabel,
  slideFrame,
  stringifyVariables,
  svgDataUrl,
  yieldFrame,
} from "./shared";

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Roboto+Mono:wght@400;500&display=swap">';

const WORKING_TABLE_ROWS = 200;
const WORKING_DATA_PREVIEW_ROWS = 20;

const BASE_CSS = `
:root {
  --primary: ${OT_COLORS.primary}; --primary-dark: ${OT_COLORS.primaryDark}; --primary-light: ${OT_COLORS.primaryLight};
  --text: ${OT_COLORS.text}; --muted: ${OT_COLORS.muted}; --border: ${OT_COLORS.border};
  --finding: ${OT_COLORS.finding}; --warning: ${OT_COLORS.warning}; --info: ${OT_COLORS.info};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: var(--text); }
body { font-family: ${FONT_FAMILY}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
a { color: var(--primary-dark); text-decoration: underline; }
code, pre, .mono { font-family: ${MONO_FAMILY}; }
pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
img { max-width: 100%; }
table.data { border-collapse: collapse; width: 100%; }
table.data th { background: var(--primary-light); color: var(--primary-dark); font-weight: 600; text-align: left; }
table.data th, table.data td { border: 0.5pt solid var(--border); padding: 0.25em 0.45em; vertical-align: top; overflow-wrap: anywhere; }
table.data tr { break-inside: avoid; }
table.data thead { display: table-header-group; }
.placeholder { border: 1pt dashed var(--muted); background: #f5f5f5; color: var(--muted); display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 1em; }
.placeholder strong { color: var(--muted); }
.placeholder .ph-title { color: var(--text); }
.callout { border: 0.75pt solid var(--tone, var(--info)); border-left-width: 3pt; background: #f7f9fb; padding: 0.5em 0.75em; margin: 0.6em 0; break-inside: avoid; }
.callout .label { font-size: 0.8em; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tone, var(--info)); }
.callout > :last-child { margin-bottom: 0; }
.tone-finding { --tone: var(--finding); } .tone-warning { --tone: var(--warning); } .tone-info { --tone: var(--info); }
.muted { color: var(--muted); }
`;

const doc = (title: string, css: string, body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>${FONT_LINK}` +
  `<style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`;

const safeLink = (url?: string) => (url && /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined);
const linkHtml = (label: string, url?: string) => {
  const href = safeLink(url);
  return href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);
};

/** <img> for an asset (SVG as a data URL, which also keeps its styles/scripts sandboxed), or undefined. */
const assetSrc = (asset?: FigureAsset): string | undefined => {
  if (!asset) return undefined;
  if (asset.kind === "raster") return isSafeImageDataUrl(asset.dataUrl) ? asset.dataUrl : undefined;
  if (asset.kind === "svg") return svgDataUrl(asset.svg);
  return undefined;
};

const placeholderHtml = (title: string, caption?: string, reason?: string, style = "") =>
  `<div class="placeholder" style="${style}"><strong>Figure unavailable</strong><div class="ph-title">${esc(title)}</div>` +
  (caption ? `<div>${esc(caption)}</div>` : "") +
  (reason ? `<div><em>${esc(reason)}</em></div>` : "") +
  "</div>";

const tableHtml = (data: TableData, maxRows = Infinity) => {
  const rows = data.rows.slice(0, maxRows);
  return (
    `<table class="data"><thead><tr>${data.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${data.columns.map((c) => `<td>${esc(formatCell(r[c.key]))}</td>`).join("")}</tr>`).join("") +
    "</tbody></table>"
  );
};

const requestHtml = (request: DataSourceRequest) => {
  const method = request.method ?? (request.query ? "POST" : "GET");
  const parts = [
    `<div class="req-line"><strong>${esc(method)}</strong> <span class="mono">${esc(request.endpoint)}</span></div>`,
  ];
  if (request.query) parts.push(`<div class="req-label">Query</div><pre class="code">${esc(request.query)}</pre>`);
  const variables = stringifyVariables(request.variables);
  if (variables) parts.push(`<div class="req-label">Variables</div><pre class="code">${esc(variables)}</pre>`);
  if (request.params?.length)
    parts.push(
      `<div class="req-label">Parameters</div><pre class="code">${esc(request.params.map((p) => `${p.key}=${p.value}`).join("\n"))}</pre>`,
    );
  const headers = headerLines(request);
  if (headers.length)
    parts.push(
      `<div class="req-label">Headers</div><pre class="code">${esc(headers.map((h) => `${h.key}: ${h.value}`).join("\n"))}</pre>`,
    );
  if (request.body) parts.push(`<div class="req-label">Body</div><pre class="code">${esc(request.body)}</pre>`);
  return parts.join("");
};

const headingLabel = (number: string | undefined, text: string, level: number) =>
  number ? (level === 1 ? `${number} · ${text}` : `${number} ${text}`) : text;

// ---------- slides ----------

const SLIDE_PAGE = { "16:9": { w: 16, h: 9 }, "4:3": { w: 12, h: 9 } } as const;

/** Slides in the Open Targets template style (same frame, colours and type as the PPTX writer). */
export function slidesToHtml(plan: ExportPlan, ctx: WriterContext): string {
  const aspect = ctx.settings.slides.aspect;
  const frame = slideFrame(aspect);
  const pageSize = SLIDE_PAGE[aspect];
  const k = pageSize.w / frame.W; // inches in the PPTX frame → inches on the printed page
  const release = releaseLabel(plan.dataRelease ?? ctx.doc.dataRelease);
  const inch = (v: number) => `${(v * k).toFixed(3)}in`;
  const pt = (v: number) => `${(v * k).toFixed(2)}pt`;
  const at = (b: Box, extra = "") =>
    `left:${inch(b.x)};top:${inch(b.y)};width:${inch(b.w)};height:${inch(b.h)};${extra}`;
  const B = SLIDE_BRAND;

  const css = `
@page { size: ${pageSize.w}in ${pageSize.h}in; margin: 0; }
.slide { position: relative; width: ${pageSize.w}in; height: ${pageSize.h}in; overflow: hidden; break-after: page; page-break-after: always;
  background: #fff; color: ${B.grey}; font-family: ${SLIDE_FONTS.bodyStack}; }
.slide:last-child { break-after: auto; page-break-after: auto; }
.slide.dark { background: ${B.navy}; color: #fff; }
.abs { position: absolute; }
.head { font-family: ${SLIDE_FONTS.headingStack}; font-weight: 700; color: ${B.navy}; }
.kicker { font-size: ${pt(SLIDE_TYPE.kickerPt)}; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${B.blue};
  display: flex; align-items: flex-end; }
.title { font-size: ${pt(SLIDE_TYPE.titlePt)}; line-height: 1.1; display: flex; align-items: center; overflow: hidden; }
.panel { background: ${B.panel}; }
.logo { display: block; object-fit: contain; }
.footer { font-size: ${pt(SLIDE_TYPE.footerPt)}; color: ${B.grey50}; display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer.right { justify-content: flex-end; }
.dark .footer { color: ${B.blue30}; }
.dark .rule { background: ${B.blue50}; height: 0.75pt; }
.fig img { width: 100%; height: 100%; object-fit: contain; display: block; }
.rail { display: flex; flex-direction: column; gap: ${pt(5)}; overflow: hidden; }
.rail-label { font-size: ${pt(9)}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${B.grey50}; margin-top: ${pt(8)}; }
.rail-label:first-child { margin-top: 0; }
.chip { font-size: ${pt(11)}; background: #fff; border: 0.75pt solid ${B.grey30}; border-radius: ${pt(6)}; padding: ${pt(3)} ${pt(6)}; color: ${B.grey}; }
.chip.strong { background: ${B.blue30}; border-color: ${B.blue30}; color: ${B.navy}; }
.rail .source { font-size: ${pt(10)}; color: ${B.grey}; }
.slide table.data th { background: ${B.navy}; color: #fff; font-weight: 700; border-color: ${B.grey30}; }
.slide table.data td { background: #fff; border-color: ${B.grey30}; color: ${B.grey}; }
.tbl table.data { font-size: ${pt(SLIDE_TYPE.tablePt)}; }
.tbl.narrow table.data { font-size: ${pt(9)}; }
.note { font-size: ${pt(11)}; font-style: italic; color: ${B.grey}; margin-top: ${pt(6)}; }
.moved { display: flex; align-items: center; justify-content: center; font-size: ${pt(18)}; font-style: italic; color: ${B.grey50}; }
.statement { font-size: ${pt(SLIDE_TYPE.statementPt)}; line-height: 1.2; color: #fff; display: flex; flex-direction: column; justify-content: center; }
.statement p { margin: 0 0 0.35em; }
.statement a { color: ${B.blue30}; }
.tone-label { font-size: ${pt(12)}; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.slide .placeholder { font-size: ${pt(14)}; background: ${B.panel}; border-color: ${B.grey50}; color: ${B.grey}; }
.slide .placeholder strong { font-size: ${pt(16)}; }
.slide .placeholder .ph-title { color: ${B.navy}; }
.decktitle { font-size: ${pt(SLIDE_TYPE.deckTitlePt)}; line-height: 1.05; display: flex; align-items: flex-end; overflow: hidden; }
.clamp { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.subtitle { font-size: ${pt(14)}; color: ${B.grey}; }
.meta { display: flex; }
.meta .soft { font-size: ${pt(11)}; color: ${B.grey}; }
.meta .strong { font-size: ${pt(13)}; font-weight: 700; color: ${B.navy}; }
.part { font-size: ${pt(14)}; font-weight: 700; color: ${B.navy}; display: flex; align-items: flex-end; }
.part-rule { height: 0.75pt; background: ${B.grey50}; }
.chapter { font-size: ${pt(SLIDE_TYPE.chapterPt)}; line-height: 1.05; }
.band { background: rgba(255,255,255,0.9); }
.ds { font-size: ${pt(10)}; display: grid; grid-template-columns: 58% 1fr; grid-template-rows: auto 1fr; gap: ${pt(14)}; align-content: start; }
.ds .req-line { grid-column: 1 / -1; font-size: ${pt(14)}; }
.ds .req-line strong { color: ${B.navy}; }
.ds pre.code { background: #fff; border: 0.75pt solid ${B.grey30}; padding: ${pt(6)}; font-size: ${pt(10)}; max-height: 100%; overflow: hidden; }
.ds .req-label { font-size: ${pt(9)}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${B.grey50}; margin: ${pt(6)} 0 ${pt(3)}; }
.methods table.data { font-size: ${pt(10)}; }
`;

  const logo = (box: Box, variant: LogoVariant) =>
    `<img class="abs logo" src="${otLogoDataUrl(variant)}" alt="Open Targets" style="${at(box)}">`;

  const titleBlock = (title: string, kicker?: string) =>
    (kicker ? `<div class="abs kicker" style="${at(frame.kicker)}">${esc(kicker)}</div>` : "") +
    `<div class="abs head title" style="${at(frame.title)}">${esc(title)}</div>`;

  const panel = `<div class="abs panel" style="${at(frame.panel)}"></div>`;

  // Footer text left, release and slide number, then the logo (white on dark slides)
  const footer = (n: number, left?: string, dark = false) =>
    (dark ? `<div class="abs rule" style="left:${inch(frame.margin)};top:${inch(frame.footer.y - 0.12)};width:${inch(frame.W - 2 * frame.margin)}"></div>` : "") +
    (left ? `<div class="abs footer" style="${at(frame.footerLeft)}">${esc(left)}</div>` : "") +
    `<div class="abs footer right" style="${at(frame.footerRight)}">${esc(release)}</div>` +
    `<div class="abs footer right" style="${at(frame.slideNumber)}">${n}</div>` +
    logo(frame.logo, dark ? "white" : "colour");

  const rail = (prov: Provenance) => {
    const parts: string[] = [];
    if (prov.entity) {
      const e = prov.entity;
      const label = e.label && e.label !== e.id ? `${e.label} · ${e.id}` : e.label || e.id;
      parts.push(
        `<div class="rail-label">${esc(e.type || "Entity")}</div><div class="chip strong">${esc(label)}</div>`,
      );
    }
    if (prov.filters?.length)
      parts.push(
        `<div class="rail-label">Filters</div>${prov.filters.map((f) => `<div class="chip">${esc(f)}</div>`).join("")}`,
      );
    if (prov.sourceLabel)
      parts.push(`<div class="rail-label">Source</div><div class="source">${esc(prov.sourceLabel)}</div>`);
    return `<div class="abs rail" style="${at(frame.rail)}">${parts.join("")}</div>`;
  };

  const placedTable = (t: PlacedTable, box: Box) => {
    if (!t.data.columns.length)
      return `<div class="abs moved" style="${at(box)}">${esc(t.note ?? "Full table in appendix")}</div>`;
    const narrow = t.data.columns.length > frame.geom.maxTableCols ? " narrow" : "";
    return `<div class="abs tbl${narrow}" style="${at(box, "overflow:hidden;")}">${tableHtml(t.data)}${
      t.note ? `<div class="note">${esc(t.note)}</div>` : ""
    }</div>`;
  };

  const toneOf = (nodeId: string) => {
    const node = ctx.doc.nodes.find((n) => n.id === nodeId);
    return node?.type === "prose" ? node.tone : undefined;
  };

  const units = plan.units as SlideUnit[];
  const slides = units.map((unit, i) => {
    const n = i + 1;
    let inner = "";
    let cls = "slide";
    switch (unit.kind) {
      case "titleSlide": {
        const layout = titleSlideLayout(frame, unit.title, unit.description);
        const columns = titleMetaColumns(unit);
        const colW = layout.metaColumnWidth(columns.length);
        inner =
          decorSvgHtml(frame, "title") +
          logo(layout.logo, "colour") +
          `<div class="abs decktitle" style="${at(layout.title)}"><div class="head clamp" style="-webkit-line-clamp:${layout.titleMaxLines};font-size:${pt(layout.titleFontPt)}">${esc(unit.title)}</div></div>` +
          (layout.description && unit.description
            ? `<div class="abs subtitle" style="${at(layout.description, "overflow:hidden;")}"><div class="clamp" style="-webkit-line-clamp:${layout.descriptionLines}">${esc(unit.description.trim())}</div></div>`
            : "") +
          `<div class="abs meta" style="${at(layout.meta)}">${columns
            .map(
              (c) =>
                `<div style="width:${inch(colW - 0.15)};margin-right:${inch(0.15)}"><div class="soft">${esc(c.soft)}</div><div class="strong">${esc(c.strong)}</div></div>`,
            )
            .join("")}</div>`;
        break;
      }
      case "chapterSlide": {
        const x = frame.margin;
        const w = decorTextWidth(frame) + 0.4;
        const y = frame.H * 0.33;
        inner =
          decorSvgHtml(frame, "chapter") +
          `<div class="abs part" style="${at({ x, y, w, h: 0.4 })}">PART ${unit.n}</div>` +
          `<div class="abs part-rule" style="left:${inch(x)};top:${inch(y + 0.55)};width:${inch(w)}"></div>` +
          `<div class="abs head chapter" style="${at({ x, y: y + 0.7, w, h: frame.H - (y + 0.7) - 0.8 }, "overflow:hidden;")}">${esc(unit.title)}</div>`;
        break;
      }
      case "figureSlide": {
        const left = [unit.figureN ? `Fig ${unit.figureN}` : "", unit.caption ?? "", unit.dataNote ?? ""].filter(Boolean).join(" · ");
        const src = assetSrc(unit.asset);
        const reason = unit.asset?.kind === "missing" ? unit.asset.reason : undefined;
        if (unit.layout === "fullBleed") {
          const body = src
            ? `<div class="abs fig" style="left:0;top:0;width:100%;height:100%"><img src="${esc(src)}" alt="${esc(unit.caption ?? unit.title)}"></div>`
            : unit.table
              ? placedTable(unit.table, { ...frame.content, y: 1.3 })
              : placeholderHtml(unit.title, unit.caption, reason, `position:absolute;${at(frame.content)}`);
          inner =
            body +
            `<div class="abs band" style="left:0;top:0;width:100%;height:${inch(1.4)}"></div>` +
            `<div class="abs band" style="left:0;top:${inch(frame.footer.y - 0.15)};width:100%;height:${inch(frame.H - frame.footer.y + 0.15)}"></div>` +
            titleBlock(unit.title, unit.kicker) +
            (left ? `<div class="abs footer" style="${at(frame.footerLeft)}">${esc(left)}</div>` : "") +
            logo(frame.logo, "colour");
        } else {
          const body = unit.table
            ? placedTable(unit.table, frame.figure)
            : src
              ? `<div class="abs fig" style="${at(frame.figure)}"><img src="${esc(src)}" alt="${esc(unit.caption ?? unit.title)}"></div>`
              : placeholderHtml(unit.title, unit.caption, reason, `position:absolute;${at(frame.figure)}`);
          inner = titleBlock(unit.title, unit.kicker) + body + rail(unit.provenance) + footer(n, left);
        }
        break;
      }
      case "statementSlide": {
        // Label and tone colour only for callouts; plain prose keeps the default accent
        const tone = unit.tone ?? toneOf(unit.nodeId);
        const toneColor = (SLIDE_TONE[(tone ?? "finding") as keyof typeof SLIDE_TONE] ?? SLIDE_TONE.finding).dark;
        const x = frame.margin + 0.4;
        const box = { x, y: frame.H * 0.2, w: frame.W - 2 * x, h: frame.H * 0.55 };
        cls = "slide dark";
        inner =
          (tone
            ? `<div class="abs tone-label" style="${at({ x, y: box.y - 0.45, w: box.w, h: 0.35 }, `color:${toneColor};`)}">${esc(
                CALLOUT_LABEL[tone] ?? tone,
              )}</div>`
            : "") +
          `<div class="abs statement" style="${at(box, "overflow:hidden;")}">${richTextToHtml(unit.doc)}</div>` +
          footer(n, undefined, true);
        break;
      }
      case "appendixTableSlide": {
        const from = unit.table.shownFrom + 1;
        const to = unit.table.shownFrom + unit.table.data.rows.length;
        const note = unit.table.note ?? `Rows ${from}–${to} of ${unit.table.totalRows}`;
        inner =
          panel +
          titleBlock(unit.title, unit.pages > 1 ? `Appendix · ${unit.page} / ${unit.pages}` : "Appendix") +
          placedTable({ ...unit.table, note }, frame.content) +
          footer(n);
        break;
      }
      case "dataSourceSlide":
        inner =
          panel +
          titleBlock(unit.title, "Appendix · data source") +
          `<div class="abs ds" style="${at({ ...frame.content, h: frame.content.h - 0.35 }, "overflow:hidden;")}">${dataSourceGrid(unit.request)}</div>` +
          `<div class="abs note" style="${at({ ...frame.content, y: frame.content.y + frame.content.h - 0.3, h: 0.3 })}">Retrieved ${esc(
            formatDate(unit.retrievedAt),
          )}</div>` +
          footer(n);
        break;
      case "methodsSlide":
        inner =
          panel +
          titleBlock("Methods", "Appendix") +
          `<div class="abs methods" style="${at(frame.content, "overflow:hidden;")}">${methodsTableHtml(unit.entries)}</div>` +
          footer(n);
        break;
      default:
    }
    return `<section class="${cls}">${inner}</section>`;
  });

  return doc(plan.title, css, slides.join(""));
}

function dataSourceGrid(request: DataSourceRequest) {
  const method = request.method ?? (request.query ? "POST" : "GET");
  const left = request.query ?? request.body;
  const right: string[] = [];
  const variables = stringifyVariables(request.variables);
  if (variables) right.push(`<div class="req-label">Variables</div><pre class="code">${esc(variables)}</pre>`);
  if (request.params?.length)
    right.push(
      `<div class="req-label">Parameters</div><pre class="code">${esc(request.params.map((p) => `${p.key}=${p.value}`).join("\n"))}</pre>`,
    );
  const headers = headerLines(request);
  if (headers.length)
    right.push(
      `<div class="req-label">Headers</div><pre class="code">${esc(headers.map((h) => `${h.key}: ${h.value}`).join("\n"))}</pre>`,
    );
  if (request.query && request.body)
    right.push(`<div class="req-label">Body</div><pre class="code">${esc(request.body)}</pre>`);
  return (
    `<div class="req-line"><strong>${esc(method)}</strong> <span class="mono">${esc(request.endpoint)}</span></div>` +
    `<div>${left ? `<pre class="code" style="height:100%">${esc(left)}</pre>` : ""}</div>` +
    `<div>${right.join("")}</div>`
  );
}

const methodsTableHtml = (entries: MethodsEntry[]) => {
  if (!entries.length) return '<p class="muted"><em>No data sources in this report.</em></p>';
  const rows = entries.map((e) => {
    const req = e.request ? `${e.request.method ?? (e.request.query ? "POST" : "GET")} ${e.request.endpoint}` : "";
    return (
      `<tr><td>${esc([e.figureLabel, e.title].filter(Boolean).join(" · "))}</td>` +
      `<td>${[e.sourceLabel, req, e.note].filter(Boolean).map(esc).join("<br>")}</td>` +
      `<td>${esc(e.filters.join("; "))}</td>` +
      `<td>${esc(e.entity ? e.entity.label || e.entity.id : "")}</td>` +
      `<td>${[e.dataRelease ? releaseLabel(e.dataRelease) : "", formatDate(e.retrievedAt)].filter(Boolean).map(esc).join("<br>")}</td></tr>`
    );
  });
  return (
    '<table class="data"><thead><tr><th>Block</th><th>Source / request</th><th>Filters</th><th>Entity</th><th>Release · retrieved</th></tr></thead>' +
    `<tbody>${rows.join("")}</tbody></table>`
  );
};

// ---------- paper ----------

const PAPER_CSS = (pageSize: string, twoColumn: boolean) => `
@page { size: ${pageSize}; margin: ${PAPER_MARGIN_MM}mm; }
body { font-size: 10pt; line-height: 1.45; }
h1, h2, h3, h4, h5 { break-after: avoid; page-break-after: avoid; line-height: 1.2; }
h1 { font-size: 14pt; color: var(--primary-dark); margin: 1.2em 0 0.5em; }
h2 { font-size: 12pt; color: var(--primary-dark); margin: 1em 0 0.4em; }
h3 { font-size: 10.5pt; margin: 0.9em 0 0.3em; }
h4, h5 { font-size: 10pt; margin: 0.8em 0 0.3em; }
p { margin: 0 0 0.6em; orphans: 2; widows: 2; }
.paper-title { font-size: 20pt; font-weight: 700; margin: 0 0 0.3em; color: var(--text); }
.byline { color: var(--muted); font-style: italic; margin-bottom: 1.2em; }
.abstract { margin-bottom: 1.4em; }
.abstract .label { font-weight: 700; }
.flow { ${twoColumn ? "column-count: 2; column-gap: 7mm; column-fill: auto;" : ""} }
.span { column-span: all; }
figure { margin: 0.8em 0; break-inside: avoid; page-break-inside: avoid; }
figure img { display: block; margin: 0 auto; max-height: 150mm; object-fit: contain; }
figure .placeholder { min-height: 40mm; }
figcaption, .caption { font-size: 8.5pt; color: #555; margin-top: 0.4em; }
.caption .lbl, figcaption .lbl { font-weight: 700; color: var(--text); }
.table-wrap { margin: 0.8em 0; break-inside: avoid; page-break-inside: avoid; }
.table-wrap .caption { margin: 0 0 0.3em; }
.table-wrap table.data { font-size: 8pt; }
.table-wrap .note { font-size: 8pt; font-style: italic; color: var(--muted); margin-top: 0.3em; }
.method { break-inside: avoid; margin-bottom: 0.8em; font-size: 9pt; }
.method .m-title { font-weight: 700; }
.method pre.code, .working pre.code { background: #f7f9fb; border: 0.5pt solid var(--border); padding: 0.4em; font-size: 7.5pt; margin: 0.2em 0 0.4em; }
.method .req-label, .working .req-label { font-weight: 700; font-size: 8pt; }
ol.refs { padding-left: 1.6em; font-size: 8.5pt; }
ol.refs li, ul.refs li { margin-bottom: 0.3em; overflow-wrap: anywhere; }
ul.refs { list-style: none; padding-left: 0; font-size: 8.5pt; }
ul.refs li { padding-left: 1.5em; text-indent: -1.5em; }
ul.links { font-size: 9pt; overflow-wrap: anywhere; }
`;

export function paperToHtml(plan: ExportPlan, ctx: WriterContext): string {
  const paper = ctx.settings.paper;
  const size = PAGE_SIZES[paper.pageSize] ? paper.pageSize : "A4";
  const twoColumn = paper.columns === 2;
  const front: string[] = [];
  const flow: string[] = [];

  const units = plan.units as PaperUnit[];
  units.forEach((unit, i) => {
    switch (unit.kind) {
      case "paperTitle":
        front.push(`<h1 class="paper-title">${esc(unit.title)}</h1><div class="byline">${esc(unit.byline)}</div>`);
        if (unit.abstract)
          front.push(`<div class="abstract"><span class="label">Abstract.</span> ${esc(unit.abstract)}</div>`);
        break;
      case "paperHeading": {
        // The heading introducing full-width items (supplementary tables) spans too
        const next = units[i + 1];
        const spanning = next?.kind === "paperTable" && next.supplementary;
        flow.push(
          `<h${unit.level}${spanning ? ' class="span"' : ""}>${esc(headingLabel(unit.number, unit.text, unit.level))}</h${unit.level}>`,
        );
        break;
      }
      case "paperBody": {
        const suffix = unit.figRefs.length ? ` (${unit.figRefs.join(", ")})` : undefined;
        const html = richTextToHtml(unit.doc, { headingOffset: 2, suffix });
        if (unit.tone)
          flow.push(
            `<div class="callout tone-${esc(unit.tone)}"><div class="label">${esc(CALLOUT_LABEL[unit.tone] ?? unit.tone)}</div>${html}</div>`,
          );
        else flow.push(html);
        break;
      }
      case "paperFigure": {
        const src = assetSrc(unit.asset);
        const img = src
          ? `<img src="${esc(src)}" alt="${esc(unit.alt ?? unit.caption ?? unit.title)}">`
          : placeholderHtml(unit.title, undefined, unit.asset.kind === "missing" ? unit.asset.reason : undefined);
        flow.push(
          `<figure${unit.span ? ' class="span"' : ""}>${img}<figcaption>${
            unit.label ? `<span class="lbl">${esc(unit.label)}.</span> ` : ""
          }${esc(unit.caption || unit.title)}</figcaption></figure>`,
        );
        break;
      }
      case "paperTable":
        flow.push(
          `<div class="table-wrap${unit.span || unit.supplementary ? " span" : ""}"><div class="caption">${
            unit.label ? `<span class="lbl">${esc(unit.label)}.</span> ` : ""
          }${esc(unit.caption || unit.title)}</div>${tableHtml(unit.table.data)}${
            unit.table.note ? `<div class="note">${esc(unit.table.note)}</div>` : ""
          }</div>`,
        );
        break;
      case "paperMethods":
        flow.push("<h1>Methods</h1>");
        flow.push(
          unit.entries.length
            ? unit.entries.map(methodHtml).join("")
            : '<p class="muted"><em>No data sources were used in this report.</em></p>',
        );
        break;
      case "paperDataAvailability":
        flow.push(`<h1>Data availability</h1><p>${esc(unit.text)}</p>`);
        if (unit.links.length)
          flow.push(`<ul class="links">${unit.links.map((l) => `<li>${linkHtml(l.label, l.url)}</li>`).join("")}</ul>`);
        break;
      case "paperReferences": {
        flow.push("<h1>References</h1>");
        const refs = orderReferences(unit.references, unit.style);
        const items = refs.map((r) => `<li>${esc(formatReference(r, unit.style))}</li>`).join("");
        flow.push(
          refs.length
            ? unit.style === "apa"
              ? `<ul class="refs">${items}</ul>`
              : `<ol class="refs">${items}</ol>`
            : '<p class="muted"><em>No references.</em></p>',
        );
        break;
      }
      default:
    }
  });

  return doc(
    plan.title,
    PAPER_CSS(size, twoColumn),
    `<header>${front.join("")}</header><main class="flow">${flow.join("")}</main>`,
  );
}

const methodHtml = (e: MethodsEntry) => {
  const line = (label: string, value: string) => (value ? `<div><strong>${esc(label)}:</strong> ${value}</div>` : "");
  return (
    `<div class="method"><div class="m-title">${esc([e.figureLabel, e.title].filter(Boolean).join(" · "))}</div>` +
    line("Source", esc(e.sourceLabel ?? "")) +
    (e.request ? requestHtml(e.request) : "") +
    line("Filters", esc(e.filters.join("; "))) +
    line("Entity", esc(e.entity ? [e.entity.label, e.entity.id].filter(Boolean).join(" · ") : "")) +
    line(
      "Data",
      esc(
        [e.dataRelease ? releaseLabel(e.dataRelease) : "", `retrieved ${formatDate(e.retrievedAt)}`]
          .filter(Boolean)
          .join(", "),
      ),
    ) +
    line("Link", e.deepLink ? linkHtml(e.deepLink, e.deepLink) : "") +
    line("Inputs", esc(e.inputRefs?.join(", ") ?? "")) +
    (e.code ? `<pre class="code">${esc(e.code)}</pre>` : "") +
    line("Note", esc(e.note ?? "")) +
    "</div>"
  );
};

// ---------- working ----------

const WORKING_CSS = `
@page { size: A4; margin: ${PAPER_MARGIN_MM}mm; }
.working .block { margin: 0 0 1.1em; }
.working .block-title { font-weight: 700; font-size: 11pt; margin-bottom: 0.3em; }
.working .takeaway { font-style: italic; margin-bottom: 0.3em; }
.working .prov { font-size: 8.5pt; color: var(--muted); margin-top: 0.3em; }
.working .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.3em; }
.working .chip { font-size: 8pt; border: 0.5pt solid var(--border); border-radius: 4px; padding: 1px 6px; color: var(--text); }
.working hr { border: 0; border-top: 0.75pt solid var(--border); margin: 1.2em 0; }
.working .req { font-size: 9pt; }
.working .req .req-line { margin-bottom: 0.3em; }
.doc-meta { color: var(--muted); font-style: italic; margin-bottom: 1.4em; }
`;

const provenanceHtml = (p: Provenance) => {
  const bits = [
    p.entity ? `Entity: ${[p.entity.label, p.entity.id].filter(Boolean).join(" · ")}` : "",
    p.sourceLabel ? `Source: ${p.sourceLabel}` : "",
    p.dataRelease ? releaseLabel(p.dataRelease) : "",
    p.retrievedAt ? `Retrieved ${formatDate(p.retrievedAt)}` : "",
  ].filter(Boolean);
  const chips = p.filters?.length
    ? `<div class="chips">${p.filters.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>`
    : "";
  const link = safeLink(p.deepLink) ? ` · ${linkHtml("Open in platform", p.deepLink)}` : "";
  return chips + (bits.length || link ? `<div class="prov">${bits.map(esc).join(" · ")}${link}</div>` : "");
};

export function workingToHtml(irDoc: ExportDocument, ctx: WriterContext): string {
  void ctx;
  const meta = [
    irDoc.entity ? [irDoc.entity.label, irDoc.entity.id].filter(Boolean).join(" · ") : "",
    releaseLabel(irDoc.dataRelease),
    formatDate(irDoc.generatedAt),
  ].filter(Boolean);

  // Widget figures' rows, printed after the body
  const appendix: string[] = [];
  const tableBlock = (title: string, data: TableData, before = "", after = "") => {
    const shown = Math.min(data.rows.length, WORKING_TABLE_ROWS);
    const total = data.totalRows || data.rows.length;
    return (
      `<div class="block table-wrap"><div class="block-title">${esc(title)}</div>` +
      before +
      tableHtml(data, WORKING_TABLE_ROWS) +
      (shown < total ? `<div class="note">Showing ${shown} of ${total} rows — full data in the data export.</div>` : "") +
      after +
      "</div>"
    );
  };

  const blocks = irDoc.nodes.map((node) => {
    switch (node.type) {
      case "chapter":
        return `<h1>${esc(node.title)}</h1>`;
      case "heading":
        return `<h${node.level}>${esc(node.text)}</h${node.level}>`;
      case "divider":
        return "<hr>";
      case "prose": {
        const html = richTextToHtml(node.doc, { headingOffset: 1 });
        return node.tone
          ? `<div class="callout tone-${esc(node.tone)}"><div class="label">${esc(CALLOUT_LABEL[node.tone] ?? node.tone)}</div>${html}</div>`
          : `<div class="block">${html}</div>`;
      }
      case "figure": {
        const src = assetSrc(node.asset);
        const img = src
          ? `<img src="${esc(src)}" alt="${esc(node.alt ?? node.caption ?? node.title)}">`
          : placeholderHtml(node.title, node.caption, node.asset.kind === "missing" ? node.asset.reason : undefined);
        let dataRef = "";
        if (node.tableData?.rows.length) {
          const label = `A${appendix.length + 1}`;
          appendix.push(tableBlock(`${label} · ${node.title}`, node.tableData));
          dataRef = `<div class="note">Data: Appendix ${label}</div>`;
        }
        return (
          `<figure class="block"><div class="block-title">${esc(node.title)}</div>` +
          (node.takeaway ? `<div class="takeaway">${esc(node.takeaway)}</div>` : "") +
          img +
          (node.caption ? `<figcaption>${esc(node.caption)}</figcaption>` : "") +
          dataRef +
          provenanceHtml(node.provenance) +
          "</figure>"
        );
      }
      case "table": {
        return tableBlock(
          node.title,
          node.data,
          node.takeaway ? `<div class="takeaway">${esc(node.takeaway)}</div>` : "",
          (node.caption ? `<div class="caption">${esc(node.caption)}</div>` : "") + provenanceHtml(node.provenance)
        );
      }
      case "dataSource": {
        const data = node.data;
        const preview = data
          ? tableHtml(data, WORKING_DATA_PREVIEW_ROWS) +
            (data.rows.length > WORKING_DATA_PREVIEW_ROWS || data.totalRows > WORKING_DATA_PREVIEW_ROWS
              ? `<div class="note">Showing ${Math.min(WORKING_DATA_PREVIEW_ROWS, data.rows.length)} of ${
                  data.totalRows || data.rows.length
                } rows.</div>`
              : "")
          : '<p class="muted"><em>No result or snapshot captured; request only.</em></p>';
        return (
          `<div class="block working-ds"><div class="block-title">${esc(node.title)} <span class="muted mono">${esc(node.ref)}</span></div>` +
          (node.caption ? `<div class="caption">${esc(node.caption)}</div>` : "") +
          `<div class="req">${requestHtml(node.request)}</div>` +
          (node.stale ? '<p class="muted"><em>Snapshot predates the current data release.</em></p>' : "") +
          preview +
          provenanceHtml(node.provenance) +
          "</div>"
        );
      }
      default:
        return "";
    }
  });

  return doc(
    irDoc.title,
    PAPER_CSS("A4", false) + WORKING_CSS,
    `<div class="working"><h1 class="paper-title">${esc(irDoc.title)}</h1>` +
      (irDoc.description ? `<p>${esc(irDoc.description)}</p>` : "") +
      `<div class="doc-meta">${esc(meta.join(" · "))}</div>${blocks.join("")}` +
      (appendix.length ? `<h1>Appendix: data tables</h1>${appendix.join("")}` : "") +
      "</div>",
  );
}

// ---------- printing ----------

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);

const AFTERPRINT_TIMEOUT_MS = 120000;

/** Loads `html` into a hidden iframe, waits for fonts + images, prints, then cleans up. */
export async function printHtml(html: string): Promise<void> {
  if (typeof document === "undefined") throw new Error("Printing needs a browser");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  const loaded = new Promise<void>((resolve) => iframe.addEventListener("load", () => resolve(), { once: true }));
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  try {
    await withTimeout(loaded, 15000);
    const win = iframe.contentWindow;
    const frameDoc = iframe.contentDocument;
    if (!win || !frameDoc) throw new Error("Print frame could not be created");
    await withTimeout(frameDoc.fonts?.ready ?? Promise.resolve(), 5000);
    await withTimeout(
      Promise.all(
        Array.from(frameDoc.images).map((img) => (img.decode ? img.decode().catch(() => undefined) : undefined)),
      ),
      10000,
    );
    await yieldFrame();
    await new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const done = () => {
        if (timer) clearTimeout(timer);
        resolve();
      };
      win.addEventListener("afterprint", done, { once: true });
      timer = setTimeout(done, AFTERPRINT_TIMEOUT_MS);
      win.focus();
      // Blocking in Chromium (afterprint fires before it returns); a cancelled dialog is not an error
      win.print();
    });
  } finally {
    // Give Safari a beat to hand the document to the print system before tearing it down
    setTimeout(() => iframe.remove(), 1000);
  }
}

export async function printSlides(plan: ExportPlan, ctx: WriterContext): Promise<void> {
  ctx.onProgress?.(0, 1, "Preparing slides for print");
  await printHtml(slidesToHtml(plan, ctx));
  ctx.onProgress?.(1, 1, "Sent to print dialog");
}

export async function printPaper(plan: ExportPlan, ctx: WriterContext): Promise<void> {
  ctx.onProgress?.(0, 1, "Preparing paper for print");
  await printHtml(paperToHtml(plan, ctx));
  ctx.onProgress?.(1, 1, "Sent to print dialog");
}

export async function printWorking(irDoc: ExportDocument, ctx: WriterContext): Promise<void> {
  ctx.onProgress?.(0, 1, "Preparing working PDF for print");
  await printHtml(workingToHtml(irDoc, ctx));
  ctx.onProgress?.(1, 1, "Sent to print dialog");
}

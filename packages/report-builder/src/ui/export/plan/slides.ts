import type { RichTextDoc } from "../../../core";
import { APPENDIX_ROWS_PER_SLIDE, DEFAULT_TOP_N } from "../layout";
import type {
  ExportDocument,
  ExportPlan,
  ExportSettings,
  MethodsEntry,
  PlacedTable,
  SlideUnit,
  TableData,
} from "../types";
import { slideFrame } from "../writers/shared";
import { chunk, methodsEntry, safeRequest, sliceTable, totalRowsOf } from "./common";
import { effectiveRole } from "./roles";
import { chunkColumns, columnRangeNote, measureColumns, pickColumns, rowsThatFit, tableFontPt } from "./tableLayout";
import { WarningSink, nodeWarnings, slideTableWarnings } from "./warnings";

export const METHODS_ENTRIES_PER_SLIDE = 8;

type FigureSlide = Extract<SlideUnit, { kind: "figureSlide" }>;

export function planSlides(doc: ExportDocument, settings: ExportSettings): ExportPlan {
  const roles: ExportPlan["roles"] = {};
  doc.nodes.forEach((node) => {
    roles[node.id] = effectiveRole(node, "slides", settings);
  });

  const sink = new WarningSink();
  nodeWarnings(sink, doc);

  const hasFigureSlides = doc.nodes.some((n) => {
    const role = roles[n.id].role;
    return (n.type === "figure" || n.type === "table") && (role === "figure" || role === "fullBleed");
  });

  const main: SlideUnit[] = [];
  const appendix: SlideUnit[] = [];
  const figuresNumbered: ExportPlan["figuresNumbered"] = [];
  const methods: MethodsEntry[] = [];
  let kicker: string | undefined;
  let chapterN = 0;
  let pendingNotes: RichTextDoc[] = [];
  let lastFigure: FigureSlide | undefined;

  const frame = slideFrame(settings.slides.aspect);
  const maxTableCols = frame.geom.maxTableCols;

  // Tables, and widget figures' rows: paginated by rows, and by column chunks when wider than the slide
  const pushAppendixTable = (node: { id: string; title: string; data: TableData }, from: number) => {
    const rest = node.data.rows.length - from;
    if (rest <= 0) return;
    const total = totalRowsOf(node.data);
    const totalColumns = node.data.columns.length;
    const fontPt = tableFontPt(totalColumns, maxTableCols);
    const chunks = chunkColumns(node.data, measureColumns(node.data, fontPt), frame.content.w, fontPt);
    const headerH = Math.max(...chunks.map((c) => c.layout.headerHeightIn));
    const perSlide = Math.min(
      APPENDIX_ROWS_PER_SLIDE,
      rowsThatFit(frame.content.h, headerH, chunks[0].layout.rowHeightIn)
    );
    const rowPages = Math.ceil(rest / perSlide);
    const pages = rowPages * chunks.length;
    let page = 0;
    for (let rp = 0; rp < rowPages; rp += 1) {
      const start = from + rp * perSlide;
      const end = Math.min(start + perSlide, node.data.rows.length);
      const last = rp === rowPages - 1 && total > node.data.rows.length;
      chunks.forEach((columnChunk, ci) => {
        page += 1;
        const parts = [`Rows ${start + 1}–${end} of ${total}`];
        if (chunks.length > 1) parts.push(columnRangeNote(columnChunk, totalColumns));
        if (last) parts.push(`rows beyond ${node.data.rows.length} were not collected`);
        appendix.push({
          kind: "appendixTableSlide",
          id: `slide-appendix-${node.id}-${page}`,
          nodeId: node.id,
          title: node.title,
          table: {
            data: pickColumns(sliceTable(node.data, start, end), columnChunk.indices),
            shownFrom: start,
            totalRows: total,
            note: parts.join(" · "),
            layout: columnChunk.layout,
            columnPage: ci + 1,
            columnPages: chunks.length,
            totalColumns,
          },
          page,
          pages,
        });
      });
    }
  };

  doc.nodes.forEach((node) => {
    const { role, tableLayout, topN = DEFAULT_TOP_N } = roles[node.id];
    switch (node.type) {
      case "chapter":
        chapterN += 1;
        kicker = undefined;
        if (role === "statement") {
          main.push({ kind: "chapterSlide", id: `slide-chapter-${node.id}`, nodeId: node.id, n: chapterN, title: node.title });
        } else {
          // No divider: the chapter title heads its group as the kicker
          kicker = node.title;
        }
        return;
      case "heading":
        if (role !== "omit") kicker = node.text;
        return;
      case "divider":
        return;
      case "prose":
        if (role === "omit") return;
        // With no figure slides at all, notes would have nowhere to go: give prose its own slide instead
        if (role === "statement" || !hasFigureSlides) {
          if (role !== "statement") roles[node.id] = { role: "statement" };
          main.push({
            kind: "statementSlide",
            id: `slide-statement-${node.id}`,
            nodeId: node.id,
            doc: node.doc,
            notes: [],
            tone: node.tone,
          });
        } else {
          pendingNotes.push(node.doc);
        }
        return;
      case "dataSource":
        methods.push(methodsEntry(node, doc.dataRelease));
        if (role === "appendix") {
          appendix.push({
            kind: "dataSourceSlide",
            id: `slide-datasource-${node.id}`,
            nodeId: node.id,
            title: node.title,
            request: safeRequest(node.request),
            retrievedAt: node.provenance.retrievedAt,
          });
        }
        return;
      case "figure":
      case "table": {
        if (role === "omit") return;
        if (node.type === "table") slideTableWarnings(sink, node, settings, tableLayout, topN);
        if (node.type === "table" && role === "appendix") {
          methods.push(methodsEntry(node, doc.dataRelease));
          pushAppendixTable(node, 0);
          return;
        }
        const figureN = figuresNumbered.length + 1;
        figuresNumbered.push({ nodeId: node.id, n: figureN });
        if (!node.takeaway?.trim()) {
          sink.add({
            nodeId: node.id,
            severity: "info",
            code: "NO_TAKEAWAY",
            message: `No takeaway set; the slide is titled “${node.title}”. Add a note to the block to state its finding.`,
          });
        }
        let table: PlacedTable | undefined;
        if (node.type === "table") {
          const total = totalRowsOf(node.data);
          if (tableLayout === "appendix") {
            // The takeaway slide stays in the flow; the rows move to the appendix
            table = {
              data: { columns: [], rows: [], totalRows: total },
              shownFrom: 0,
              totalRows: total,
              note: `Full table (${total} rows × ${node.data.columns.length} columns) in appendix`,
            };
            pushAppendixTable(node, 0);
          } else {
            const shown = Math.min(topN, node.data.rows.length);
            const more = total > shown;
            // Columns beyond the figure width stay in the appendix (the whole table, so nothing is lost)
            const data = sliceTable(node.data, 0, shown);
            const fontPt = tableFontPt(node.data.columns.length, maxTableCols);
            const [first, ...others] = chunkColumns(data, measureColumns(data, fontPt), frame.figure.w, fontPt);
            const cut = others.length > 0;
            const toAppendix = tableLayout === "split" || cut;
            const parts: string[] = [];
            if (more) parts.push(`Showing ${shown} of ${total}`);
            if (cut) parts.push(`${node.data.columns.length - first.indices.length} more columns`);
            table = {
              data: pickColumns(data, first.indices),
              shownFrom: 0,
              totalRows: total,
              note: parts.length ? `${parts.join(" · ")}${toAppendix ? " — full table in appendix" : ""}` : undefined,
              layout: first.layout,
              columnPage: 1,
              columnPages: others.length + 1,
              totalColumns: node.data.columns.length,
            };
            if (tableLayout === "split") pushAppendixTable(node, cut ? 0 : shown);
            else if (cut) pushAppendixTable(node, 0);
          }
        }
        // Widget figures: the picture stays on the slide, its rows go to the appendix
        const figureData = node.type === "figure" && node.tableData?.rows.length ? node.tableData : undefined;
        if (figureData) pushAppendixTable({ id: node.id, title: node.title, data: figureData }, 0);
        const slide: FigureSlide = {
          kind: "figureSlide",
          id: `slide-figure-${node.id}`,
          nodeId: node.id,
          layout: role === "fullBleed" ? "fullBleed" : "figure",
          kicker,
          title: node.takeaway?.trim() || node.title,
          figureN,
          caption: node.caption,
          dataNote: figureData ? "Data in appendix" : undefined,
          asset: node.type === "figure" ? node.asset : undefined,
          table,
          provenance: node.provenance,
          notes: pendingNotes,
        };
        pendingNotes = [];
        kicker = undefined;
        lastFigure = slide;
        main.push(slide);
        methods.push(methodsEntry(node, doc.dataRelease, `Fig. ${figureN}`));
        return;
      }
    }
  });
  // Prose after the last figure goes to the previous one
  if (pendingNotes.length && lastFigure) lastFigure.notes.push(...pendingNotes);

  const units: SlideUnit[] = [];
  if (settings.slides.titleSlide) {
    units.push({
      kind: "titleSlide",
      id: "slide-title",
      title: doc.title,
      description: doc.description,
      entityLabel: doc.entity?.label ?? doc.entity?.id,
      dataRelease: doc.dataRelease,
      date: doc.generatedAt,
    });
  }
  units.push(...main, ...appendix);
  if (settings.slides.methodsAppendix && methods.length) {
    chunk(methods, METHODS_ENTRIES_PER_SLIDE).forEach((entries, i) =>
      units.push({ kind: "methodsSlide", id: `slide-methods-${i + 1}`, entries })
    );
  }

  return {
    target: "slides",
    units,
    figuresNumbered,
    methods,
    references: doc.references,
    warnings: sink.result(roles),
    roles,
    title: doc.title,
    dataRelease: doc.dataRelease,
    generatedAt: doc.generatedAt,
  };
}

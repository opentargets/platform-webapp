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
import { chunk, methodsEntry, safeRequest, sliceTable, totalRowsOf } from "./common";
import { effectiveRole } from "./roles";
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

  // Tables, and widget figures' rows
  const pushAppendixTable = (node: { id: string; title: string; data: TableData }, from: number) => {
    const rest = node.data.rows.length - from;
    if (rest <= 0) return;
    const total = totalRowsOf(node.data);
    const pages = Math.ceil(rest / APPENDIX_ROWS_PER_SLIDE);
    for (let page = 1; page <= pages; page += 1) {
      const start = from + (page - 1) * APPENDIX_ROWS_PER_SLIDE;
      const end = Math.min(start + APPENDIX_ROWS_PER_SLIDE, node.data.rows.length);
      const last = page === pages && total > node.data.rows.length;
      appendix.push({
        kind: "appendixTableSlide",
        id: `slide-appendix-${node.id}-${page}`,
        nodeId: node.id,
        title: node.title,
        table: {
          data: sliceTable(node.data, start, end),
          shownFrom: start,
          totalRows: total,
          note: last
            ? `Rows ${start + 1}–${end} of ${total}; rows beyond ${node.data.rows.length} were not collected`
            : `Rows ${start + 1}–${end} of ${total}`,
        },
        page,
        pages,
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
            table = {
              data: sliceTable(node.data, 0, shown),
              shownFrom: 0,
              totalRows: total,
              note: more
                ? `Showing ${shown} of ${total}${tableLayout === "split" ? " — full table in appendix" : ""}`
                : undefined,
            };
            if (tableLayout === "split") pushAppendixTable(node, shown);
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

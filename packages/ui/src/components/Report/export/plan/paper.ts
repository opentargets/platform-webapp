import { PAPER_SPAN_FIGURE_ASPECT, PAPER_SPAN_TABLE_COLS } from "../layout";
import type { ExportDocument, ExportPlan, ExportSettings, FigureAsset, MethodsEntry, PaperUnit } from "../types";
import { orderReferences } from "../citations";
import { buildCaption, methodsEntry, sliceTable, totalRowsOf } from "./common";
import type { DataSourceNode, FigureNode, TableNode } from "./common";
import { Counter, SectionNumbering, figLabel, formatDate, tableLabel } from "./numbering";
import { defaultPaperRole, effectiveRole, nodeOverride } from "./roles";
import { WarningSink, nodeWarnings, paperTableWarnings } from "./warnings";

type BodyUnit = Extract<PaperUnit, { kind: "paperBody" }>;
type TableUnit = Extract<PaperUnit, { kind: "paperTable" }>;

const assetAspect = (asset: FigureAsset): number =>
  asset.kind !== "missing" && asset.height > 0 ? asset.width / asset.height : 0;

export function planPaper(doc: ExportDocument, settings: ExportSettings): ExportPlan {
  const p = settings.paper;
  const roles: ExportPlan["roles"] = {};
  doc.nodes.forEach((node) => {
    roles[node.id] = effectiveRole(node, "paper", settings);
  });

  const sink = new WarningSink();
  nodeWarnings(sink, doc);

  const spans = (nodeId: string, wide: boolean): boolean => {
    if (p.columns !== 2) return false;
    const override = nodeOverride(settings, nodeId, "paper").spanColumns;
    return override ?? (p.wideFiguresSpan && wide);
  };

  const units: PaperUnit[] = [];
  const supplementary: TableUnit[] = [];
  const figuresNumbered: ExportPlan["figuresNumbered"] = [];
  const methods: MethodsEntry[] = [];
  const sections = new SectionNumbering();
  const figN = new Counter();
  const tableN = new Counter();
  const suppN = new Counter();
  // Positional cross-reference: the paragraph right before a figure mentions it
  let lastBody: BodyUnit | undefined;
  const release = doc.dataRelease;

  const cite = (label: string | undefined) => {
    if (label && lastBody && !lastBody.figRefs.includes(label)) lastBody.figRefs.push(label);
    lastBody = undefined;
  };

  // `dataFor`: a widget figure's rows, captioned as that figure's data
  const placeTable = (node: TableNode | DataSourceNode | FigureNode, supp: boolean, dataFor?: string) => {
    const data = node.type === "figure" ? node.tableData : node.data;
    if (!data) return undefined;
    const n = supp ? suppN.next() : tableN.next();
    const label = p.numberFigures ? tableLabel(n, supp) : undefined;
    const total = totalRowsOf(data);
    const unit: TableUnit = {
      kind: "paperTable",
      id: `paper-table-${node.id}`,
      nodeId: node.id,
      label,
      title: node.title,
      caption: buildCaption(
        {
          takeaway: node.type === "table" ? node.takeaway : undefined,
          caption: dataFor ? `Data for ${dataFor}` : node.caption,
          source: node.source,
          provenance: node.provenance,
        },
        release
      ),
      table: {
        data: sliceTable(data, 0, data.rows.length),
        shownFrom: 0,
        totalRows: total,
        note: total > data.rows.length ? `Showing ${data.rows.length} of ${total} rows` : undefined,
      },
      // Supplementary tables sit after the body at full page width
      span: supp ? true : spans(node.id, data.columns.length > PAPER_SPAN_TABLE_COLS),
      supplementary: supp,
    };
    if (supp) supplementary.push(unit);
    else units.push(unit);
    return label;
  };

  {
    const date = formatDate(doc.generatedAt);
    units.push({
      kind: "paperTitle",
      id: "paper-title",
      title: doc.title,
      byline: `Assembled from Open Targets Platform${release ? ` ${release}` : ""}${date ? ` · ${date}` : ""}`,
      abstract: p.abstract && doc.description?.trim() ? doc.description.trim() : undefined,
    });
  }

  doc.nodes.forEach((node) => {
    const { role } = roles[node.id];
    if (node.type === "dataSource") {
      // Every data block's request is listed in Methods, whatever its role
      const label = role === "supplementary" ? placeTable(node, true) : undefined;
      methods.push(methodsEntry(node, release, label));
      return;
    }
    if (role === "omit") return;
    switch (node.type) {
      case "chapter":
        units.push({
          kind: "paperHeading",
          id: `paper-heading-${node.id}`,
          nodeId: node.id,
          number: sections.nextChapter(),
          text: node.title,
          level: 1,
        });
        lastBody = undefined;
        return;
      case "heading":
        units.push({
          kind: "paperHeading",
          id: `paper-heading-${node.id}`,
          nodeId: node.id,
          number: sections.nextHeading(node.level),
          text: node.text,
          level: node.level,
        });
        lastBody = undefined;
        return;
      case "prose": {
        const unit: BodyUnit = {
          kind: "paperBody",
          id: `paper-body-${node.id}`,
          nodeId: node.id,
          doc: node.doc,
          tone: node.tone,
          figRefs: [],
        };
        units.push(unit);
        lastBody = unit;
        return;
      }
      case "figure": {
        const n = figN.next();
        const label = p.numberFigures ? figLabel(n) : undefined;
        figuresNumbered.push({ nodeId: node.id, n });
        // Widget figures: the picture stays in the body, its rows go to the supplementary tables
        const hasData = !!node.tableData?.rows.length;
        const dataLabel = hasData ? placeTable(node, true, label ?? node.title) : undefined;
        const caption = buildCaption(node, release);
        units.push({
          kind: "paperFigure",
          id: `paper-figure-${node.id}`,
          nodeId: node.id,
          label,
          title: node.title,
          caption: hasData ? `${caption} Data: ${dataLabel ?? "see supplementary tables"}.`.trim() : caption,
          asset: node.asset,
          alt: node.alt,
          span: spans(node.id, assetAspect(node.asset) > PAPER_SPAN_FIGURE_ASPECT),
        });
        cite(label);
        methods.push(methodsEntry(node, release, label));
        return;
      }
      case "table": {
        const supp = role === "supplementary";
        paperTableWarnings(sink, node, role, role === defaultPaperRole(node) && !nodeOverride(settings, node.id, "paper").role);
        const label = placeTable(node, supp);
        cite(label);
        methods.push(methodsEntry(node, release, label));
        return;
      }
    }
  });

  if (p.methodsAppendix && methods.length) {
    units.push({ kind: "paperMethods", id: "paper-methods", entries: methods });
  }
  if (p.dataAvailability) {
    const links: { label: string; url: string }[] = [];
    const seen = new Set<string>();
    doc.nodes.forEach((node) => {
      if (node.type !== "figure" && node.type !== "table" && node.type !== "dataSource") return;
      const url = node.provenance.deepLink;
      if (!url || seen.has(url) || roles[node.id].role === "omit") return;
      seen.add(url);
      const entity = node.provenance.entity;
      links.push({ label: entity ? `${entity.label ?? entity.id} · ${node.title}` : node.title, url });
    });
    const date = formatDate(doc.generatedAt);
    units.push({
      kind: "paperDataAvailability",
      id: "paper-data-availability",
      text:
        `All data were retrieved from the Open Targets Platform${release ? ` (release ${release})` : ""}` +
        `${date ? ` on ${date}` : ""}. Each figure and table can be reproduced from the platform pages below.`,
      links,
    });
  }
  const references = orderReferences(doc.references, p.citationStyle);
  if (references.length) {
    units.push({ kind: "paperReferences", id: "paper-references", references, style: p.citationStyle });
  }
  if (supplementary.length) {
    units.push({ kind: "paperHeading", id: "paper-heading-supplementary", text: "Supplementary tables", level: 1 });
    units.push(...supplementary);
  }

  return {
    target: "paper",
    units,
    figuresNumbered,
    methods,
    references,
    warnings: sink.result(roles),
    roles,
    title: doc.title,
    dataRelease: release,
    generatedAt: doc.generatedAt,
  };
}

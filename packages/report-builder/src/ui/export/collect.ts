import {
  isWidget,
  type GraphqlBlock,
  type ImageBlock,
  type NotebookBlock,
  type Report,
  type ReportBlock,
  type ReportSection,
  type RestBlock,
  type TableBlock,
} from "../../core";
import { dataResultsStore } from "../blocks/dataResultsStore";
import { notebookResultsStore, notebookRuntimes } from "../blocks/notebook/notebookResultsStore";
import { cellText, inferColumnKeys, resolveRows } from "../blocks/dataPaths";
import { svgToPng } from "./extract/svg";
import { defaultEndpointLabel, releaseStartTime, widgetProvenance } from "./extract/provenance";
import { dedupeReferences, extractLinkReferences, referenceKey, resolveReferences } from "./extract/references";
import { imageSize } from "./extract/raster";
import type {
  CollectHooks,
  CollectOptions,
  DataSourceRequest,
  ExportDocument,
  ExportWarning,
  FigureAsset,
  IRNode,
  Reference,
  TableData,
  WidgetCapture,
} from "./types";

const abortError = () => new DOMException("Export cancelled", "AbortError");

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw abortError();
};

const nextFrame = () =>
  new Promise<void>((resolve) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)
  );

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- data blocks ----------

const toTableData = (data: unknown, rowsPath?: string): TableData | undefined => {
  const { rows } = resolveRows(data, rowsPath);
  if (!rows) return undefined;
  const keys = inferColumnKeys(rows);
  return {
    columns: keys.map((key) => ({ key, label: key })),
    // Nested values flattened to text so every writer can print them
    rows: rows.map((row) =>
      Object.fromEntries(
        keys.map((key) => [key, row[key] !== null && typeof row[key] === "object" ? cellText(row[key]) : row[key]])
      )
    ),
    totalRows: rows.length,
  };
};

const graphqlRequest = (block: GraphqlBlock, report: Report): DataSourceRequest => {
  const entityId = report.entityContext?.id;
  const entityVariable = block.bindEntity?.variable;
  return {
    endpoint: block.endpoint,
    query: block.query,
    variables: {
      ...block.variables,
      ...(entityVariable && entityId ? { [entityVariable]: entityId } : {}),
    },
  };
};

const restRequest = (block: RestBlock): DataSourceRequest => ({
  endpoint: block.url,
  method: block.method,
  params: block.params.filter((p) => p.key),
  // Secret values never leave the tab: the name is kept, the value blanked
  headers: block.headers
    .filter((h) => h.key)
    .map((h) => (h.secret ? { key: h.key, value: "", secret: true } : { key: h.key, value: h.value })),
  body: block.method === "POST" ? block.body : undefined,
});

/** Text other blocks could reference a data block's ref from. */
const referenceHaystacks = (block: ReportBlock): { code: string; prose: string } => {
  switch (block.kind) {
    case "graphql":
      return { code: `${block.query}\n${JSON.stringify(block.variables ?? {})}`, prose: "" };
    case "rest":
      return {
        code: `${block.url}\n${block.body ?? ""}\n${block.params.map((p) => p.value).join("\n")}`,
        prose: "",
      };
    case "text":
    case "callout":
      return { code: "", prose: JSON.stringify(block.doc ?? {}) };
    case "notebook":
      return { code: `${block.inputs.join("\n")}\n${block.code}`, prose: "" };
    default:
      return { code: "", prose: "" };
  }
};

/**
 * Whether any other block reads `ref`. Queries/URLs match the ref as a whole
 * word; prose only counts explicit references ({{ref}}, $ref, @ref, ref.field)
 * so ordinary words that happen to equal a ref don't count.
 */
const isRefUsedElsewhere = (ref: string, self: ReportBlock, blocks: ReportBlock[]): boolean => {
  if (!ref) return false;
  const r = escapeRegExp(ref);
  const word = new RegExp(`(^|[^A-Za-z0-9_])${r}($|[^A-Za-z0-9_])`);
  const explicit = new RegExp(`(\\{\\{\\s*${r}\\b|[$@]${r}\\b|\\b${r}\\.[A-Za-z_\\[])`);
  return blocks.some((block) => {
    if (block.reportSectionId === self.reportSectionId || isWidget(block)) return false;
    const { code, prose } = referenceHaystacks(block);
    return word.test(code) || explicit.test(prose);
  });
};

// ---------- images ----------

const decodeSvgDataUrl = (src: string): string | undefined => {
  const match = src.match(/^data:image\/svg\+xml(;[^,]*)?,([\s\S]*)$/);
  if (!match) return undefined;
  try {
    return match[1]?.includes("base64") ? atob(match[2]) : decodeURIComponent(match[2]);
  } catch {
    return undefined;
  }
};

const imageAsset = async (block: ImageBlock): Promise<FigureAsset> => {
  if (!block.src) return { kind: "missing", reason: "Image has no data" };
  const { width, height } = await imageSize(block.src);
  const svg = decodeSvgDataUrl(block.src);
  if (svg) return { kind: "svg", svg, width, height };
  return { kind: "raster", dataUrl: block.src, width, height, dpi: 96 };
};

// ---------- widgets ----------

const widgetReferences = (section: ReportSection, hooks?: CollectHooks): Reference[] => {
  try {
    return hooks?.widget?.(section)?.references?.(section) ?? [];
  } catch {
    return [];
  }
};

const renderWidgetSafely = async (
  section: ReportSection,
  opts: CollectOptions
): Promise<WidgetCapture> => {
  if (!opts.renderWidget) {
    return { asset: { kind: "missing", reason: "Widget rendering unavailable" } };
  }
  try {
    return await opts.renderWidget(section, opts.widgetWidth(section.reportSectionId), opts.pixelRatio);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { asset: { kind: "missing", reason }, error: reason };
  }
};

// ---------- collect ----------

/** Walks report.sections in order and resolves each block to an IR node (node.id === reportSectionId). */
export async function collect(report: Report, opts: CollectOptions): Promise<ExportDocument> {
  const { signal, dataRelease } = opts;
  const blocks = report.sections;
  const nodes: IRNode[] = [];
  const warnings: ExportWarning[] = [];
  const proseRefs: Reference[] = [];
  const releaseStart = releaseStartTime(dataRelease);

  const widgetTotal = blocks.filter(isWidget).length;
  let widgetIndex = 0;

  for (const block of blocks) {
    throwIfAborted(signal);
    const id = block.reportSectionId;

    if (isWidget(block)) {
      widgetIndex += 1;
      opts.onProgress?.(widgetIndex - 1, widgetTotal, `Preparing figures ${widgetIndex} / ${widgetTotal}`);
      const capture = await renderWidgetSafely(block, opts);
      throwIfAborted(signal);
      opts.onProgress?.(widgetIndex, widgetTotal, `Preparing figures ${widgetIndex} / ${widgetTotal}`);

      const title = block.definition.name;
      const provenance = widgetProvenance(block, { dataRelease, hooks: opts.hooks });
      const references = dedupeReferences([...widgetReferences(block, opts.hooks), ...(capture.references ?? [])]);
      if (references.length) provenance.references = references;
      const takeaway = block.note?.trim() || undefined;

      // Widgets are always figures; their rows (tableData) are placed in the appendix by the plan
      nodes.push({
        type: "figure",
        id,
        source: "widget",
        title,
        takeaway,
        alt: `${title}${block.entityLabel ? ` for ${block.entityLabel}` : ""}`,
        asset: capture.asset,
        provenance,
        tableData: capture.tableData,
        rasterFallback: capture.rasterFallback || undefined,
      });
      if (capture.asset.kind === "missing") {
        warnings.push({
          nodeId: id,
          severity: "warn",
          code: "FIGURE_MISSING",
          message: `${title}: ${capture.error || capture.asset.reason}`,
        });
      } else if (capture.rasterFallback) {
        warnings.push({
          nodeId: id,
          severity: "info",
          code: "RASTER_FALLBACK",
          message: `${title}: image only, not re-rendered`,
        });
      }
      // Let the dialog paint between widgets
      await nextFrame();
      continue;
    }

    switch (block.kind) {
      case "chapter":
        nodes.push({ type: "chapter", id, title: block.title });
        break;
      case "heading":
        nodes.push({ type: "heading", id, text: block.text, level: block.level });
        break;
      case "divider":
        nodes.push({ type: "divider", id });
        break;
      case "text":
        nodes.push({ type: "prose", id, doc: block.doc });
        proseRefs.push(...extractLinkReferences(block.doc));
        break;
      case "callout":
        nodes.push({ type: "prose", id, doc: block.doc, tone: block.tone });
        proseRefs.push(...extractLinkReferences(block.doc));
        break;
      case "image": {
        const title = block.caption || block.fileName || "Image";
        nodes.push({
          type: "figure",
          id,
          source: "image",
          title,
          caption: block.caption,
          alt: block.alt?.trim() || undefined,
          asset: await imageAsset(block),
          provenance: {
            filters: [],
            sourceLabel: block.fileName ? `User upload: ${block.fileName}` : "User upload",
            retrievedAt: block.addedAt,
          },
        });
        if (!block.alt?.trim()) {
          warnings.push({
            nodeId: id,
            severity: "warn",
            code: "IMAGE_NO_ALT",
            message: `${title}: no alt text — the caption or file name is used instead`,
          });
        }
        break;
      }
      case "table":
        nodes.push(collectTable(block));
        break;
      case "graphql":
      case "rest":
        nodes.push(collectDataSource(block, report, { dataRelease, releaseStart, warnings, hooks: opts.hooks }));
        break;
      case "notebook":
        nodes.push(await collectNotebook(block, report, { warnings, pixelRatio: opts.pixelRatio }));
        throwIfAborted(signal);
        break;
      default:
        break;
    }
  }

  throwIfAborted(signal);
  const allRefs = [
    ...nodes.flatMap((node) => (node.type === "figure" || node.type === "table" ? node.provenance.references ?? [] : [])),
    ...proseRefs,
  ];
  const references = allRefs.length ? await resolveReferences(allRefs, signal) : [];
  throwIfAborted(signal);

  // Point each node's references at the resolved, de-duplicated entries
  if (references.length) {
    const byKey = new Map<string, Reference>();
    references.forEach((ref) => {
      byKey.set(referenceKey(ref), ref);
      if (ref.doi) byKey.set(referenceKey({ doi: ref.doi, title: "" }), ref);
    });
    nodes.forEach((node) => {
      if ((node.type === "figure" || node.type === "table") && node.provenance.references) {
        node.provenance.references = dedupeReferences(
          node.provenance.references.map((ref) => byKey.get(referenceKey(ref)) ?? ref)
        );
      }
    });
  }

  const entityContext = report.entityContext;
  const entityLabel = entityContext?.id
    ? blocks.find((b): b is ReportSection => isWidget(b) && b.entityId === entityContext.id)?.entityLabel
    : undefined;

  return {
    reportId: report.id,
    title: report.name,
    description: report.description,
    entity: entityContext ? { type: entityContext.type, id: entityContext.id, label: entityLabel } : undefined,
    dataRelease,
    generatedAt: Date.now(),
    nodes,
    references,
    warnings,
  };
}

const collectTable = (block: TableBlock): IRNode => ({
  type: "table",
  id: block.reportSectionId,
  source: "table",
  title: block.title,
  caption: block.caption,
  data: {
    columns: block.columns.map((c) => ({ key: c.key, label: c.label })),
    rows: block.rows,
    totalRows: block.rows.length,
  },
  provenance: {
    filters: [],
    sourceLabel:
      block.source.type === "paste"
        ? "Pasted table"
        : `User upload${block.source.fileName ? `: ${block.source.fileName}` : ""}`,
    retrievedAt: block.addedAt,
  },
});

// ---------- notebooks ----------

const isRowArray = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && !Array.isArray(v));

/** A notebook's data return as a table: rows as-is, anything else as a one-column table. */
const valueTable = (value: unknown): TableData => {
  if (isRowArray(value)) return toTableData(value) ?? { columns: [], rows: [], totalRows: 0 };
  const rows = Array.isArray(value) ? value.map((v) => ({ value: cellText(v) })) : [{ value: cellText(value) }];
  return { columns: [{ key: "value", label: "value" }], rows, totalRows: rows.length };
};

const notebookAsset = async (block: NotebookBlock, pixelRatio: number): Promise<FigureAsset> => {
  const runtime = notebookRuntimes.get(block.reportSectionId);
  if (runtime) {
    try {
      const svg = await runtime.serialize("svg", 1);
      if (svg) {
        const pngDataUrl = await svgToPng(svg.data, svg.width, svg.height, pixelRatio).catch(() => undefined);
        return { kind: "svg", svg: svg.data, width: svg.width, height: svg.height, pngDataUrl };
      }
      const png = await runtime.serialize("png", pixelRatio);
      if (png) return { kind: "raster", dataUrl: png.data, width: png.width, height: png.height, dpi: 96 * pixelRatio };
    } catch {
      // fall through to the snapshot
    }
  }
  const snapshot = block.snapshot;
  if (snapshot?.svg) {
    const width = snapshot.width ?? 800;
    const height = snapshot.height ?? 400;
    const pngDataUrl = await svgToPng(snapshot.svg, width, height, pixelRatio).catch(() => undefined);
    return { kind: "svg", svg: snapshot.svg, width, height, pngDataUrl };
  }
  if (snapshot?.png) {
    return { kind: "raster", dataUrl: snapshot.png, width: snapshot.width ?? 800, height: snapshot.height ?? 400, dpi: 96 };
  }
  return { kind: "missing", reason: "The notebook hasn't produced a chart (run it, or check its snapshot)" };
};

const collectNotebook = async (
  block: NotebookBlock,
  report: Report,
  ctx: { warnings: ExportWarning[]; pixelRatio: number }
): Promise<IRNode> => {
  const id = block.reportSectionId;
  const live = notebookResultsStore.get(id);
  const success = live?.status === "success" ? live : notebookResultsStore.lastGood(id);
  const inputTitles = block.inputs.map((ref) => {
    const source = report.sections.find((b) => (isWidget(b) ? b.ref : "ref" in b ? b.ref : undefined) === ref);
    return source ? (isWidget(source) ? source.definition.name : "title" in source ? source.title : ref) : ref;
  });
  const provenance = {
    filters: [],
    sourceLabel: inputTitles.length
      ? `Computed from ${inputTitles.join(", ")} in a notebook cell`
      : "Computed in a notebook cell",
    retrievedAt: success?.at ?? block.snapshot?.at ?? block.lastRun?.at ?? block.addedAt,
  };
  const notebook = { code: block.hideCodeInExport ? undefined : block.code, inputs: block.inputs };
  const outputType = success?.outputType ?? block.lastRun?.outputType;
  const value = success ? success.value : block.snapshot?.value;
  const takeaway = block.takeaway?.trim() || undefined;

  if ((outputType === "data" || outputType === "value") && value !== undefined) {
    return {
      type: "table",
      id,
      source: "notebook",
      title: block.title,
      takeaway,
      caption: block.caption,
      data: valueTable(value),
      provenance,
      notebook,
    };
  }

  const asset = await notebookAsset(block, ctx.pixelRatio);
  if (asset.kind === "missing") {
    ctx.warnings.push({ nodeId: id, severity: "warn", code: "FIGURE_MISSING", message: `${block.title}: ${asset.reason}` });
  }
  return {
    type: "figure",
    id,
    source: "notebook",
    title: block.title,
    takeaway,
    caption: block.caption,
    alt: takeaway ?? block.title,
    asset,
    provenance,
    tableData: outputType === "both" && value !== undefined ? valueTable(value) : undefined,
    notebook,
  };
};

const collectDataSource = (
  block: GraphqlBlock | RestBlock,
  report: Report,
  ctx: { dataRelease?: string; releaseStart?: number; warnings: ExportWarning[]; hooks?: CollectHooks }
): IRNode => {
  const id = block.reportSectionId;
  const request = block.kind === "graphql" ? graphqlRequest(block, report) : restRequest(block);
  const live = dataResultsStore.get(id);
  const liveData = live?.status === "success" ? live.data : undefined;
  const snapshotData = liveData === undefined ? block.snapshot : undefined;
  const data = liveData ?? snapshotData?.data;
  const retrievedAt = (liveData !== undefined ? live?.at : block.snapshot?.at) ?? block.addedAt;
  // First-party endpoints follow the host's data releases; other APIs don't
  const isOT = ctx.hooks?.isFirstPartyEndpoint?.(request.endpoint) ?? false;

  // Stale = the snapshot was taken before the current release started (only
  // meaningful for Open Targets endpoints; other APIs don't follow its releases)
  const stale =
    !!snapshotData && isOT && ctx.releaseStart !== undefined && snapshotData.at < ctx.releaseStart;
  if (stale) {
    ctx.warnings.push({
      nodeId: id,
      severity: "warn",
      code: "SNAPSHOT_STALE",
      message: `${block.title}: snapshot from ${new Date(snapshotData.at).toISOString().slice(0, 10)} predates Open Targets ${ctx.dataRelease}`,
    });
  }
  if (block.kind === "rest" && block.headers.some((h) => h.secret && h.key)) {
    ctx.warnings.push({
      nodeId: id,
      severity: "info",
      code: "SECRET_HEADERS_OMITTED",
      message: `${block.title}: secret header values omitted`,
    });
  }

  return {
    type: "dataSource",
    id,
    source: block.kind,
    title: block.title,
    ref: block.ref,
    caption: block.caption,
    request,
    provenance: {
      filters: [],
      dataRelease: isOT ? ctx.dataRelease : undefined,
      sourceLabel: (ctx.hooks?.endpointLabel ?? defaultEndpointLabel)(request.endpoint),
      retrievedAt,
    },
    data: data !== undefined ? toTableData(data, block.rowsPath) : undefined,
    stale: stale || undefined,
    feedsOtherBlocks: isRefUsedElsewhere(block.ref, block, report.sections) || undefined,
  };
};

/**
 * Export pipeline types: Report ──collect──► ExportDocument (IR) ──plan──► ExportPlan ──render──► Blob
 * No React here, so collect/plan/writers stay unit-testable and portable.
 */
import type { BlockKind, RichTextDoc } from "../../../types/report";

export type ExportTarget = "slides" | "paper" | "working" | "data";
export type ExportFormat = "pptx" | "pdf" | "docx" | "md" | "latex" | "json" | "csvzip";

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// ---------- IR ----------

export interface TableData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export type FigureAsset =
  | { kind: "svg"; svg: string; width: number; height: number; pngDataUrl?: string }
  | { kind: "raster"; dataUrl: string; width: number; height: number; dpi: number }
  | { kind: "missing"; reason: string };

export interface Reference {
  id: string;
  pmid?: string;
  doi?: string;
  url?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
}

export interface Provenance {
  entity?: { type: string; id: string; label?: string };
  filters: string[]; // formatComponentState() output — same formatter as the inspector
  dataRelease?: string; // e.g. "26.06"
  sourceLabel?: string; // "Open Targets Platform · Known drugs", "User upload: trials.csv", host for REST
  retrievedAt: number;
  deepLink?: string; // platform URL for the entity page + section anchor
  references?: Reference[];
}

export interface DataSourceRequest {
  endpoint: string;
  query?: string;
  variables?: unknown;
  method?: string;
  params?: { key: string; value: string }[];
  // Header names only; secret header values never leave the browser tab
  headers?: { key: string; value: string; secret?: boolean }[];
  body?: string;
}

export interface NotebookProvenance {
  // Omitted when the block has "Hide code in export" on
  code?: string;
  inputs: string[];
}

export type IRNode =
  | { type: "chapter"; id: string; title: string }
  | { type: "heading"; id: string; text: string; level: 2 | 3 }
  | { type: "prose"; id: string; doc: RichTextDoc; tone?: "info" | "warning" | "finding" } // text + callout
  | { type: "divider"; id: string }
  | {
      type: "figure";
      id: string;
      source: BlockKind;
      title: string;
      takeaway?: string;
      caption?: string;
      alt?: string;
      asset: FigureAsset;
      provenance: Provenance;
      tableData?: TableData;
      // "image only, not re-rendered" — set when the asset came from the raster fallback
      rasterFallback?: boolean;
      // Notebook cells: the code (unless hidden for export) and the refs it read
      notebook?: NotebookProvenance;
    }
  | {
      type: "table";
      id: string;
      source: BlockKind;
      title: string;
      takeaway?: string;
      caption?: string;
      data: TableData;
      provenance: Provenance;
      notebook?: NotebookProvenance;
    }
  | {
      type: "dataSource";
      id: string;
      source: "graphql" | "rest";
      title: string;
      ref: string;
      caption?: string;
      request: DataSourceRequest;
      provenance: Provenance;
      data?: TableData;
      // snapshot taken before the current data release
      stale?: boolean;
      // true when another block in the report reads this block's ref
      feedsOtherBlocks?: boolean;
    };

export type IRNodeOf<T extends IRNode["type"]> = Extract<IRNode, { type: T }>;

export interface ExportDocument {
  reportId: string;
  title: string;
  description?: string;
  entity?: { type: string; id?: string; label?: string };
  dataRelease?: string; // "26.06"
  generatedAt: number;
  nodes: IRNode[]; // report order; node.id === block.reportSectionId
  references: Reference[]; // de-duplicated across the report (PMID → DOI → URL)
  // Collection-time problems (e.g. FIGURE_MISSING, IMAGE_NO_ALT, SNAPSHOT_STALE); plan merges them in
  warnings: ExportWarning[];
}

// ---------- settings (persisted on Report.exportSettings) ----------

export type SlideRole = "figure" | "fullBleed" | "statement" | "notes" | "appendix" | "omit";
export type PaperRole = "body" | "figure" | "table" | "supplementary" | "methods" | "omit";
export type TableLayout = "topN" | "split" | "appendix" | "omit";

export interface BlockExportOverride {
  role?: SlideRole | PaperRole;
  tableLayout?: TableLayout;
  topN?: number; // default 10
  spanColumns?: boolean; // paper, two-column
}

export interface SlidesSettings {
  aspect: "16:9" | "4:3";
  titleSlide: boolean;
  chapterDividers: boolean;
  methodsAppendix: boolean;
}

export interface PaperSettings {
  columns: 1 | 2;
  pageSize: "A4" | "Letter";
  abstract: boolean;
  numberFigures: boolean;
  methodsAppendix: boolean;
  dataAvailability: boolean;
  wideFiguresSpan: boolean;
  citationStyle: "vancouver" | "apa";
}

export interface ExportSettings {
  slides: SlidesSettings;
  paper: PaperSettings;
  overrides: Record<string /* reportSectionId */, { slides?: BlockExportOverride; paper?: BlockExportOverride }>;
  includeImages: boolean; // data export: embed image data URLs in report.json
  lastTarget?: ExportTarget;
  lastFormat?: ExportFormat;
}

// ---------- plan ----------

export interface ExportWarning {
  nodeId?: string;
  severity: "info" | "warn";
  code:
    | "TABLE_TOO_WIDE"
    | "TABLE_TOO_LONG"
    | "RASTER_FALLBACK"
    | "FIGURE_MISSING"
    | "NO_TAKEAWAY"
    | "SNAPSHOT_STALE"
    | "IMAGE_NO_ALT"
    | "SECRET_HEADERS_OMITTED";
  message: string;
  fix?: { label: string; override: BlockExportOverride }; // one-click fix offered in step 2
}

export interface MethodsEntry {
  nodeId: string;
  title: string;
  kind: "graphql" | "rest" | "widget" | "table" | "image" | "notebook";
  sourceLabel?: string;
  request?: DataSourceRequest;
  // Notebook cells: code (unless hidden) and input refs
  code?: string;
  inputRefs?: string[];
  filters: string[];
  entity?: Provenance["entity"];
  dataRelease?: string;
  retrievedAt: number;
  deepLink?: string;
  figureLabel?: string; // "Fig. 2" / "Table S1" when the block is numbered
  note?: string; // e.g. "Secret header values omitted"
}

/** A table as placed by the plan: already cut to the rows that unit shows. */
export interface PlacedTable {
  data: TableData; // rows actually shown in this unit
  shownFrom: number; // 0-based index of the first row shown
  totalRows: number;
  note?: string; // "Showing 10 of 240 — full table in appendix"
}

export type SlideUnit =
  | {
      kind: "titleSlide";
      id: string;
      title: string;
      description?: string;
      entityLabel?: string;
      dataRelease?: string;
      date: number;
    }
  | { kind: "chapterSlide"; id: string; nodeId: string; n: number; title: string }
  | {
      kind: "figureSlide";
      id: string;
      nodeId: string;
      layout: "figure" | "fullBleed";
      kicker?: string; // preceding heading
      title: string; // takeaway ‖ block title
      figureN?: number;
      caption?: string;
      asset?: FigureAsset; // figure nodes
      table?: PlacedTable; // table nodes, rendered as a native table
      provenance: Provenance;
      notes: RichTextDoc[]; // speaker notes from attached prose
    }
  | {
      kind: "statementSlide";
      id: string;
      nodeId: string;
      doc: RichTextDoc;
      notes: RichTextDoc[];
      tone?: "info" | "warning" | "finding"; // callout tone; plain prose has none (no label, default accent)
    }
  | {
      kind: "appendixTableSlide";
      id: string;
      nodeId: string;
      title: string;
      table: PlacedTable;
      page: number; // 1-based
      pages: number;
    }
  | {
      kind: "dataSourceSlide";
      id: string;
      nodeId: string;
      title: string;
      request: DataSourceRequest;
      retrievedAt: number;
    }
  | { kind: "methodsSlide"; id: string; entries: MethodsEntry[] };

export type PaperUnit =
  | { kind: "paperTitle"; id: string; title: string; byline: string; abstract?: string }
  | { kind: "paperHeading"; id: string; nodeId?: string; number?: string; text: string; level: 1 | 2 | 3 }
  | {
      kind: "paperBody";
      id: string;
      nodeId: string;
      doc: RichTextDoc;
      tone?: "info" | "warning" | "finding";
      figRefs: string[]; // e.g. ["Fig. 2"] appended as "(Fig. 2)"
    }
  | {
      kind: "paperFigure";
      id: string;
      nodeId: string;
      label?: string; // "Fig. 1" (absent when numberFigures is off)
      title: string;
      caption: string; // "takeaway. caption. Filters: … . Source: …"
      asset: FigureAsset;
      alt?: string;
      span: boolean; // spans both columns in two-column layout
    }
  | {
      kind: "paperTable";
      id: string;
      nodeId: string;
      label?: string; // "Table 1" / "Table S1"
      title: string;
      caption: string;
      table: PlacedTable;
      span: boolean;
      supplementary: boolean;
    }
  | { kind: "paperMethods"; id: string; entries: MethodsEntry[] }
  | { kind: "paperDataAvailability"; id: string; text: string; links: { label: string; url: string }[] }
  | { kind: "paperReferences"; id: string; references: Reference[]; style: PaperSettings["citationStyle"] };

export type PlanUnit = SlideUnit | PaperUnit;

export interface ExportPlan {
  target: "slides" | "paper";
  units: PlanUnit[]; // slides, or paper flow items, in order
  figuresNumbered: { nodeId: string; n: number }[];
  methods: MethodsEntry[];
  references: Reference[];
  warnings: ExportWarning[];
  // effective role per IR node after defaults + overrides (drives the step-2 role list)
  roles: Record<string, { role: SlideRole | PaperRole; tableLayout?: TableLayout; topN?: number }>;
  title: string;
  dataRelease?: string;
  generatedAt: number;
}

// ---------- collect ----------

/** What the RenderHost hands back for one widget. */
export interface WidgetCapture {
  asset: FigureAsset;
  tableData?: TableData;
  references?: Reference[];
  rasterFallback?: boolean;
  error?: string; // set with asset.kind === "missing"
}

export interface CollectOptions {
  // Pixel width the widget is laid out at (slides 1600/1200, paper 1050/510)
  widgetWidth: (reportSectionId: string) => number;
  // Off-screen render of one widget; supplied by RenderHost. Omit to skip widgets (asset: missing).
  renderWidget?: (
    section: import("../../../types/report").ReportSection,
    width: number,
    pixelRatio: number
  ) => Promise<WidgetCapture>;
  pixelRatio: number; // 2 for slides, 300/96 for paper
  dataRelease?: string;
  platformOrigin?: string; // defaults to window.location.origin
  onProgress?: (done: number, total: number, label: string) => void;
  signal?: AbortSignal;
}

// ---------- render ----------

export interface WriterContext {
  doc: ExportDocument;
  settings: ExportSettings;
  onProgress?: (done: number, total: number, label: string) => void;
}

export interface ExportFile {
  blob: Blob;
  fileName: string;
}

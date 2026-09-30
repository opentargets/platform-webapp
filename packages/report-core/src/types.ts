/**
 * Report Builder types: every block kind, the report, and the builder state/actions.
 * Framework-free: nothing here is a React node.
 */

import type { NotebookError } from "notebook-runtime/src/protocol";
import type { DeepPartial, ExportSettings } from "./exportTypes";

export type { NotebookError };

export type ReportSectionViewType = "table" | "chart";

export interface ReportSectionDefinition {
  id: string;
  name: string;
  shortName?: string;
  entity: string;
  isPrivate?: boolean;
  // Component reference for reconstruction
  componentPath?: string; // e.g., "credibleSet/EnhancerToGenePredictions"
}

export interface ReportRequest {
  loading: boolean;
  error: any;
  data: Record<string, unknown>;
  // GraphQL variables used to fetch this data
  // Essential for reconstructing/re-running the query when loading from storage
  variables?: Record<string, unknown>;
}

/**
 * Every kind of block a report can hold. Widgets come from the page
 * (AddToReportButton); every other kind is created inside the drawer.
 */
export type BlockKind =
  | "widget"
  | "text"
  | "heading"
  | "callout"
  | "image"
  | "divider"
  | "chapter"
  | "graphql"
  | "rest"
  | "table"
  | "notebook";

/**
 * ProseMirror/tiptap JSON. Structurally identical to tiptap's `JSONContent`, spelled
 * out here so core has no editor dependency.
 */
export interface RichTextDoc {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichTextDoc[];
  marks?: { type: string; attrs?: Record<string, unknown>; [key: string]: unknown }[];
  text?: string;
  [key: string]: unknown;
}

interface BlockBase {
  // Shared with ReportSection so DnD, remove and keys work for every kind
  reportSectionId: string;
  kind: BlockKind;
  addedAt: number;
}

/**
 * A single section/widget added to the report.
 * A missing `kind` (reports saved before blocks existed) means "widget".
 */
export interface ReportSection {
  // Unique ID for this report section (can be UUID)
  reportSectionId: string;
  kind?: "widget";

  // Widget definition and metadata
  definition: ReportSectionDefinition;

  // Original GraphQL request with data AND variables
  // Variables are essential for reconstructing queries when loading from storage
  request: ReportRequest;

  // Entity ID for this section (e.g., disease ID, target ID, variant ID)
  // Needed to reconstruct queries for Body components
  entityId?: string;

  // Entity label/name (e.g., disease name, target symbol, variant ID display)
  // Needed for descriptions and visualizations in Body components
  entityLabel?: string;

  // Component state - filters, selected rows, sorting, etc.
  // Captured when section is added to report
  // Restored when section is displayed in report
  componentState?: Record<string, any>;

  // Current view preference for this section in the report
  selectedView: ReportSectionViewType;

  // Metadata
  addedAt: number; // timestamp
  tags?: string[];
  chipText?: string;

  // Free-text commentary entered in the report builder's inspector
  note?: string;

  // Timestamp of the last componentState capture (add or "Update from live page")
  stateCapturedAt?: number;

  // Report-unique slug, assigned when the widget is first linked as a notebook input
  ref?: string;

  // Props the Body was mounted with on its page (see SectionBodyPropsContext), replayed on rebuild
  bodyProps?: Record<string, unknown>;
}

export interface TextBlock extends BlockBase {
  kind: "text";
  doc: RichTextDoc;
}

export interface HeadingBlock extends BlockBase {
  kind: "heading";
  text: string;
  level: 2 | 3;
}

export type CalloutTone = "info" | "warning" | "finding";

export interface CalloutBlock extends BlockBase {
  kind: "callout";
  doc: RichTextDoc;
  tone: CalloutTone;
}

export interface ImageBlock extends BlockBase {
  kind: "image";
  src: string; // data URL
  alt: string;
  caption?: string;
  width: "column" | "full";
  fileName?: string;
}

export interface DividerBlock extends BlockBase {
  kind: "divider";
}

// Chapter number is derived at render time, never stored
export interface ChapterBlock extends BlockBase {
  kind: "chapter";
  title: string;
}

export interface DataSnapshot {
  data: unknown;
  at: number;
  status?: number;
  durationMs?: number;
  truncated?: boolean;
}

export interface DataBlockBase extends BlockBase {
  title: string;
  // Report-unique slug for future notebook/prose refs, e.g. "trials_query"
  ref: string;
  caption?: string;
  display: "table" | "json";
  // Dot path to the array shown as a table, e.g. "data.disease.knownDrugs.rows"
  rowsPath?: string;
  snapshot?: DataSnapshot;
}

export type OnOpenMode = "rerun" | "snapshot";

export interface GraphqlBlock extends DataBlockBase {
  kind: "graphql";
  endpoint: string;
  query: string;
  variables: Record<string, unknown>;
  // Inject the report entity id into this variable at run time
  bindEntity?: { variable: string };
  onOpen: OnOpenMode;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface RestBlock extends DataBlockBase {
  kind: "rest";
  method: "GET" | "POST";
  url: string;
  params: KeyValue[];
  // Secret values are held in memory only and never persisted
  headers: (KeyValue & { secret?: boolean })[];
  body?: string;
  onOpen: OnOpenMode;
  confirmedHost?: string[];
}

export type TableColumnType = "string" | "number" | "boolean";

export interface TableColumn {
  key: string;
  label: string;
  type: TableColumnType;
}

export interface TableBlock extends DataBlockBase {
  kind: "table";
  source: { type: "csv" | "tsv" | "paste"; fileName?: string };
  columns: TableColumn[];
  // Stored: this is user data, not a query result
  rows: Record<string, unknown>[];
  truncated?: boolean;
  // Bumped when the rows are replaced, so notebooks reading this table re-run
  dataUpdatedAt?: number;
}

export type DataBlock = GraphqlBlock | RestBlock | TableBlock;

export type NotebookDisplay = "auto" | "chart" | "table" | "value";
export type NotebookRunMode = "auto" | "manual";

export interface NotebookLastRun {
  at: number;
  ok: boolean;
  durationMs: number;
  error?: NotebookError;
  // Hash of the inputs' versions at run time (see notebook/resolveInputs.ts)
  inputsHash: string;
  outputType?: "dom" | "data" | "value" | "both" | "none";
  // Row count when the output was an array
  rows?: number;
}

export interface NotebookSnapshot {
  svg?: string;
  png?: string;
  value?: unknown;
  width?: number;
  height?: number;
  at: number;
}

/**
 * A JavaScript cell: d3 v7 + Observable Plot against the other blocks' data,
 * run in a sandboxed iframe (see blocks/notebook/).
 */
export interface NotebookBlock extends BlockBase {
  kind: "notebook";
  title: string;
  // Same rules as data blocks: a valid JS identifier, unique in the report
  ref: string;
  // Refs of the linked blocks, in chip order
  inputs: string[];
  // Body of an async function
  code: string;
  display: NotebookDisplay;
  // Output pane height in px; null = the default pane height (taller output scrolls)
  height: number | null;
  runMode: NotebookRunMode;
  hideCodeInExport: boolean;
  caption?: string;
  takeaway?: string;
  lastRun?: NotebookLastRun;
  snapshot?: NotebookSnapshot;
}

export type ReportBlock =
  | ReportSection
  | TextBlock
  | HeadingBlock
  | CalloutBlock
  | ImageBlock
  | DividerBlock
  | ChapterBlock
  | GraphqlBlock
  | RestBlock
  | TableBlock
  | NotebookBlock;

export type NonWidgetBlock = Exclude<ReportBlock, ReportSection>;

export const isWidget = (b: ReportBlock): b is ReportSection => !b.kind || b.kind === "widget";

export const isDataBlock = (b: ReportBlock): b is DataBlock =>
  b.kind === "graphql" || b.kind === "rest" || b.kind === "table";

export const isNotebook = (b: ReportBlock): b is NotebookBlock => b.kind === "notebook";

/** Blocks other blocks can refer to by name: data blocks, notebooks, and widgets once linked. */
export const refOf = (b: ReportBlock): string | undefined =>
  isDataBlock(b) || isNotebook(b) ? b.ref : isWidget(b) ? b.ref : undefined;

/**
 * The entire report
 */
export interface Report {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;

  // The entity context (e.g., "disease", "target", "variant")
  entityContext?: {
    type: string;
    id?: string;
  };

  // Ordered list of blocks (widgets and narrative/data blocks).
  // Field name kept as `sections` so persisted reports load unchanged.
  sections: ReportBlock[];

  // Metadata
  description?: string;

  // Export dialog choices (target, format, per-block roles); filled with defaults on read
  exportSettings?: ExportSettings;
}

/**
 * Report Builder state
 */
export interface ReportBuilderState {
  reports: Map<string, Report>;
  // Currently active/editing report ID
  activeReportId: string | null;
  // UI state
  isBuilderOpen: boolean;
  totalSectionsCount: number;
}

/**
 * Report Builder actions
 */
export type ReportBuilderAction =
  | {
      type: "createReport";
      reportName?: string;
      description?: string;
      entityContext?: { type: string; id?: string };
    }
  | {
      type: "addSectionToReport";
      definition: ReportSectionDefinition;
      request: ReportRequest;
      entityId?: string;
      entityLabel?: string;
      selectedView?: ReportSectionViewType;
      tags?: string[];
      chipText?: string;
      componentState?: Record<string, any>;
      bodyProps?: Record<string, unknown>;
    }
  | {
      type: "removeSectionFromReport";
      reportSectionId: string;
    }
  | {
      type: "reorderSections";
      newOrder: ReportBlock[];
    }
  | {
      type: "updateSectionView";
      reportSectionId: string;
      selectedView: ReportSectionViewType;
    }
  | {
      type: "updateSectionNote";
      reportSectionId: string;
      note: string;
    }
  | {
      type: "updateSectionState";
      reportSectionId: string;
      componentState: Record<string, any>;
    }
  | {
      type: "insertBlock";
      block: ReportBlock;
      atIndex: number;
    }
  | {
      type: "updateBlock";
      reportSectionId: string;
      patch: Partial<ReportBlock>;
    }
  | {
      type: "duplicateBlock";
      reportSectionId: string;
    }
  | {
      type: "setBlockSnapshot";
      reportSectionId: string;
      snapshot: DataSnapshot | undefined;
    }
  | {
      // Link `ref` as an input of a notebook; rejected if it would create a loop
      type: "linkNotebookInput";
      reportSectionId: string;
      ref: string;
    }
  | {
      type: "unlinkNotebookInput";
      reportSectionId: string;
      ref: string;
    }
  | {
      type: "setNotebookRun";
      reportSectionId: string;
      lastRun: NotebookBlock["lastRun"];
      // undefined = keep the current snapshot; null = clear it
      snapshot?: NotebookBlock["snapshot"] | null;
    }
  | {
      // Rename a block's ref and rewrite every notebook that reads it (inputs + code)
      type: "renameBlockRef";
      reportSectionId: string;
      ref: string;
    }
  | {
      type: "setActiveReport";
      reportId: string;
    }
  | {
      type: "toggleBuilderOpen";
      isOpen?: boolean;
    }
  | {
      type: "deleteReport";
      reportId: string;
    }
  | {
      type: "renameReport";
      reportId: string;
      newName: string;
      description?: string;
    }
  | {
      type: "updateReportExportSettings";
      reportId: string;
      patch: DeepPartial<ExportSettings>;
    }
  | {
      type: "clearReport";
    }
  | {
      type: "initializeFromStorage";
      reports: Map<string, Report>;
      activeReportId: string | null;
    };

export type ReportBuilderActionOf<T extends ReportBuilderAction["type"]> = Extract<
  ReportBuilderAction,
  { type: T }
>;

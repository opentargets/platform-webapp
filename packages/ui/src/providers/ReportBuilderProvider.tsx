import { createScopedContext } from "@ot/utils";
import {
  Report,
  ReportBlock,
  ReportSection,
  ReportSectionViewType,
  ReportSectionDefinition,
  ReportRequest,
  DataSnapshot,
  NotebookBlock,
  isWidget,
  isDataBlock,
  isNotebook,
  refOf,
} from "../types/report";
import { v4 as uuidv4 } from "uuid";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Snackbar } from "@mui/material";
import { slugifyRef, uniqueRef } from "../components/Report/blocks/refs";
import { wouldCreateCycle } from "../components/Report/blocks/notebook/graph";
import { renameIdentifier } from "../components/Report/blocks/notebook/codeRefs";
import type { DeepPartial, ExportSettings } from "../components/Report/export/types";
import { mergeExportSettings, withExportDefaults } from "../components/Report/export/defaults";

/**
 * Local Storage Utilities
 */
const REPORTS_STORAGE_KEY = "ot-reports";

// localStorage is usually capped at ~5 MB per origin; leave headroom
export const STORAGE_BUDGET_BYTES = 4.5 * 1024 * 1024;

type SerializedBlock = ReportBlock extends infer B
  ? B extends ReportSection
    ? Omit<ReportSection, "renderedContent">
    : B
  : never;

interface SerializedReport extends Omit<Report, "sections"> {
  sections: SerializedBlock[];
}

export const serializeBlock = (block: ReportBlock): SerializedBlock => {
  if (isWidget(block)) {
    const { renderedContent, ...section } = block;
    return section;
  }
  if (block.kind === "rest") {
    // Secret header values live in memory only
    return {
      ...block,
      headers: block.headers.map((h) => (h.secret ? { ...h, value: "" } : h)),
    };
  }
  return block;
};

const serializeReports = (reports: Map<string, Report>): Record<string, SerializedReport> => {
  const serialized: Record<string, SerializedReport> = {};
  reports.forEach((report, id) => {
    serialized[id] = {
      ...report,
      sections: report.sections.map(serializeBlock),
    };
  });
  return serialized;
};

const deserializeReports = (data: Record<string, SerializedReport>): Map<string, SerializedReport> => {
  const reports = new Map<string, SerializedReport>();
  Object.entries(data).forEach(([id, report]) => {
    reports.set(id, report);
  });
  return reports;
};

export type SaveResult =
  | { ok: true; bytes: number }
  | { ok: false; bytes: number; largest?: { title: string; bytes: number } };

/**
 * Storage seam: the default implementation is localStorage, but anything that
 * can load/save the serialized reports (e.g. IndexedDB for images) can slot in.
 */
export interface ReportStorage {
  load(): Map<string, SerializedReport> | null;
  save(reports: Map<string, Report>): SaveResult;
}

const blockTitle = (block: SerializedBlock): string => {
  if (isWidget(block as ReportBlock)) return (block as ReportSection).definition.name;
  const b = block as Exclude<ReportBlock, ReportSection>;
  if ("title" in b && b.title) return b.title;
  if (b.kind === "image") return b.caption || b.fileName || "Image";
  if (b.kind === "heading") return b.text || "Heading";
  return b.kind.charAt(0).toUpperCase() + b.kind.slice(1);
};

const findLargestBlock = (serialized: Record<string, SerializedReport>) => {
  let largest: { title: string; bytes: number } | undefined;
  Object.values(serialized).forEach((report) =>
    report.sections.forEach((block) => {
      const bytes = JSON.stringify(block).length;
      if (!largest || bytes > largest.bytes) largest = { title: blockTitle(block), bytes };
    })
  );
  return largest;
};

export const localReportStorage: ReportStorage = {
  load: () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (!stored) return null;
      return deserializeReports(JSON.parse(stored));
    } catch (error) {
      console.error("Failed to load reports from localStorage:", error);
      return null;
    }
  },
  save: (reports) => {
    let serialized: Record<string, SerializedReport>;
    let json: string;
    try {
      serialized = serializeReports(reports);
      json = JSON.stringify(serialized);
    } catch (error) {
      // e.g. a non-serializable value in a widget's captured request/state
      console.error("Failed to serialize reports:", error);
      return { ok: false, bytes: 0 };
    }
    // Over budget: keep the last good save on disk rather than risk a partial write
    if (json.length > STORAGE_BUDGET_BYTES) {
      return { ok: false, bytes: json.length, largest: findLargestBlock(serialized) };
    }
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, json);
      return { ok: true, bytes: json.length };
    } catch (error) {
      // Quota exceeded: browsers count localStorage differently, some well under our budget
      console.error("Failed to save reports to localStorage:", error);
      return { ok: false, bytes: json.length, largest: findLargestBlock(serialized) };
    }
  },
};

/**
 * Pre-flight check for blocks that are about to add a lot of data (images,
 * snapshots): would the saved reports still fit if `extraBytes` were added?
 */
export const fitsStorageBudget = (reports: Map<string, Report>, extraBytes: number): boolean =>
  JSON.stringify(serializeReports(reports)).length + extraBytes <= STORAGE_BUDGET_BYTES;

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const countWidgets = (reports: Map<string, Report>): number => {
  let count = 0;
  reports.forEach((report) => {
    count += report.sections.filter(isWidget).length;
  });
  return count;
};

/**
 * Apply `update` to the active report's blocks, bumping updatedAt
 */
const updateActiveBlocks = <S extends ReportBuilderState>(
  state: S,
  update: (blocks: ReportBlock[]) => ReportBlock[]
): S => {
  if (!state.activeReportId) return state;
  const report = state.reports.get(state.activeReportId);
  if (!report) return state;

  const newReports = new Map(state.reports);
  newReports.set(state.activeReportId, {
    ...report,
    sections: update(report.sections),
    updatedAt: Date.now(),
  });
  return { ...state, reports: newReports, totalSectionsCount: countWidgets(newReports) };
};

/**
 * Report Builder State
 */
interface ReportBuilderState {
  reports: Map<string, Report>;
  activeReportId: string | null;
  isBuilderOpen: boolean;
  totalSectionsCount: number;
}

/**
 * Report Builder Actions
 */
type ReportBuilderAction =
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
      renderedContent: {
        body: ReactNode;
        chart?: ReactNode;
        description: ReactNode;
      };
      selectedView?: ReportSectionViewType;
      tags?: string[];
      chipText?: string;
      componentState?: Record<string, any>;
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
      reports: Map<string, SerializedReport>;
      activeReportId: string | null;
    };

/**
 * Report Builder Context
 * Manages report creation, editing, and state
 */
export const { ScopedProvider, useScopedState, useScopedDispatch } =
  createScopedContext({
    name: "reportBuilder",
    extraStateProperties: {
      reports: new Map<string, Report>(),
      activeReportId: null as string | null,
      isBuilderOpen: false,
      totalSectionsCount: 0,
    },
    extraActions: {
      /**
       * Create a new report
       */
      createReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "createReport" }>) => {
        const reportId = uuidv4();
        const newReport: Report = {
          id: reportId,
          name: action.reportName || "Untitled Report",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          entityContext: action.entityContext,
          sections: [],
          description: action.description,
        };

        const newReports = new Map(state.reports);
        newReports.set(reportId, newReport);

        return {
          ...state,
          reports: newReports,
          activeReportId: reportId,
          isBuilderOpen: true,
        };
      },

      /**
       * Add a section to the active report
       */
      addSectionToReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "addSectionToReport" }>) => {
        if (!state.activeReportId) {
          console.warn("No active report to add section to");
          return state;
        }

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newSection: ReportSection = {
          reportSectionId: uuidv4(),
          kind: "widget",
          definition: action.definition,
          request: action.request,
          entityId: action.entityId,
          entityLabel: action.entityLabel,
          renderedContent: action.renderedContent,
          selectedView: action.selectedView || "table",
          addedAt: Date.now(),
          tags: action.tags,
          chipText: action.chipText,
          componentState: action.componentState,
          stateCapturedAt:
            action.componentState && Object.keys(action.componentState).length > 0
              ? Date.now()
              : undefined,
        };

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: [...report.sections, newSection],
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
          totalSectionsCount: state.totalSectionsCount + 1,
        };
      },

      /**
       * Remove a section from the active report
       */
      removeSectionFromReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "removeSectionFromReport" }>) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: report.sections.filter(
            (s) => s.reportSectionId !== action.reportSectionId
          ),
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
          totalSectionsCount: countWidgets(newReports),
        };
      },

      /**
       * Reorder sections in the report (drag and drop)
       */
      reorderSections: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "reorderSections" }>) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: action.newOrder,
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Update view type for a specific section in report
       */
      updateSectionView: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "updateSectionView" }>) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: report.sections.map((section) =>
            section.reportSectionId === action.reportSectionId && isWidget(section)
              ? { ...section, selectedView: action.selectedView }
              : section
          ),
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Update the inspector commentary for a specific section in report
       */
      updateSectionNote: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "updateSectionNote" }>) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: report.sections.map((section) =>
            section.reportSectionId === action.reportSectionId && isWidget(section)
              ? { ...section, note: action.note }
              : section
          ),
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Replace a section's captured component state (e.g. "Update from live page")
       */
      updateSectionState: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "updateSectionState" }>) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const updatedReport = {
          ...report,
          sections: report.sections.map((section) =>
            section.reportSectionId === action.reportSectionId && isWidget(section)
              ? {
                  ...section,
                  componentState: action.componentState,
                  stateCapturedAt: Date.now(),
                }
              : section
          ),
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Insert a narrative/data block at a position in the active report
       */
      insertBlock: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "insertBlock" }>) =>
        updateActiveBlocks(state, (blocks) => {
          const next = [...blocks];
          const index = Math.max(0, Math.min(action.atIndex, next.length));
          next.splice(index, 0, action.block);
          return next;
        }),

      /**
       * Shallow-merge a patch into a block. `kind` and the id are immutable.
       */
      updateBlock: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "updateBlock" }>) => {
        const { kind, reportSectionId, ...patch } = action.patch as Partial<ReportBlock> & {
          kind?: unknown;
        };
        return updateActiveBlocks(state, (blocks) =>
          blocks.map((block) =>
            block.reportSectionId === action.reportSectionId
              ? ({ ...block, ...patch } as ReportBlock)
              : block
          )
        );
      },

      /**
       * Copy a block (new id, data-block ref re-suffixed) directly after the original
       */
      duplicateBlock: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "duplicateBlock" }>) =>
        updateActiveBlocks(state, (blocks) => {
          const index = blocks.findIndex((b) => b.reportSectionId === action.reportSectionId);
          if (index === -1) return blocks;
          const original = blocks[index];
          let copy = {
            ...original,
            reportSectionId: uuidv4(),
            addedAt: Date.now(),
          } as ReportBlock;
          if (isDataBlock(copy)) {
            copy.ref = uniqueRef(copy.ref, blocks);
          } else if (isNotebook(copy)) {
            // The copy starts with no run history; it re-runs against the same inputs
            const { lastRun: _lastRun, snapshot: _snapshot, ...rest } = copy;
            copy = { ...rest, ref: uniqueRef(copy.ref, blocks) };
          } else if (isWidget(copy) && copy.ref) {
            // A widget's ref is assigned when it's linked; the copy starts unlinked
            const { ref: _ref, ...rest } = copy;
            copy = rest;
          }
          const next = [...blocks];
          next.splice(index + 1, 0, copy);
          return next;
        }),

      /**
       * Store (or clear) a data block's persisted result snapshot
       */
      setBlockSnapshot: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "setBlockSnapshot" }>) =>
        updateActiveBlocks(state, (blocks) =>
          blocks.map((block) =>
            block.reportSectionId === action.reportSectionId && isDataBlock(block)
              ? { ...block, snapshot: action.snapshot }
              : block
          )
        ),

      linkNotebookInput: (
        state: ReportBuilderState,
        action: Extract<ReportBuilderAction, { type: "linkNotebookInput" }>
      ) =>
        updateActiveBlocks(state, (blocks) => {
          const notebook = blocks.find((b) => b.reportSectionId === action.reportSectionId);
          if (!notebook || !isNotebook(notebook)) return blocks;
          const { ref } = action;
          if (
            ref === notebook.ref ||
            notebook.inputs.includes(ref) ||
            !blocks.some((b) => refOf(b) === ref) ||
            wouldCreateCycle(blocks, notebook.ref, ref)
          ) {
            return blocks;
          }
          return blocks.map((b) =>
            b.reportSectionId === action.reportSectionId ? { ...notebook, inputs: [...notebook.inputs, ref] } : b
          );
        }),

      unlinkNotebookInput: (
        state: ReportBuilderState,
        action: Extract<ReportBuilderAction, { type: "unlinkNotebookInput" }>
      ) =>
        updateActiveBlocks(state, (blocks) =>
          blocks.map((b) =>
            b.reportSectionId === action.reportSectionId && isNotebook(b)
              ? { ...b, inputs: b.inputs.filter((r) => r !== action.ref) }
              : b
          )
        ),

      setNotebookRun: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "setNotebookRun" }>) =>
        updateActiveBlocks(state, (blocks) =>
          blocks.map((b) => {
            if (b.reportSectionId !== action.reportSectionId || !isNotebook(b)) return b;
            const next: NotebookBlock = { ...b, lastRun: action.lastRun };
            if (action.snapshot === null) delete next.snapshot;
            else if (action.snapshot !== undefined) next.snapshot = action.snapshot;
            return next;
          })
        ),

      renameBlockRef: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "renameBlockRef" }>) =>
        updateActiveBlocks(state, (blocks) => {
          const target = blocks.find((b) => b.reportSectionId === action.reportSectionId);
          if (!target) return blocks;
          const from = refOf(target);
          const to = uniqueRef(slugifyRef(action.ref), blocks, action.reportSectionId);
          if (!from || from === to) {
            return from ? blocks : blocks.map((b) => (b === target ? ({ ...b, ref: to } as ReportBlock) : b));
          }
          return blocks.map((b) => {
            if (b.reportSectionId === action.reportSectionId) return { ...b, ref: to } as ReportBlock;
            if (!isNotebook(b) || !b.inputs.includes(from)) return b;
            return {
              ...b,
              inputs: b.inputs.map((r) => (r === from ? to : r)),
              code: renameIdentifier(b.code, from, to),
            };
          });
        }),

      /**
       * Set the active report
       */
      setActiveReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "setActiveReport" }>) => {
        return {
          ...state,
          activeReportId: action.reportId,
        };
      },

      /**
       * Toggle builder visibility
       */
      toggleBuilderOpen: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "toggleBuilderOpen" }>) => {
        return {
          ...state,
          isBuilderOpen:
            action.isOpen !== undefined ? action.isOpen : !state.isBuilderOpen,
        };
      },

      /**
       * Delete a report
       */
      deleteReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "deleteReport" }>) => {
        const newReports = new Map(state.reports);
        newReports.delete(action.reportId);

        const newActiveReportId =
          state.activeReportId === action.reportId
            ? newReports.size > 0
              ? Array.from(newReports.keys())[0]
              : null
            : state.activeReportId;

        return {
          ...state,
          reports: newReports,
          activeReportId: newActiveReportId,
        };
      },

      /**
       * Rename a report
       */
      renameReport: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "renameReport" }>) => {
        if (!action.reportId) return state;

        const newReports = new Map(state.reports);
        const report = newReports.get(action.reportId);
        if (report) {
          newReports.set(action.reportId, {
            ...report,
            name: action.newName,
            ...(action.description !== undefined && { description: action.description }),
            updatedAt: Date.now(),
          });
        }

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Merge a patch into a report's persisted export settings (targets, roles, overrides)
       */
      updateReportExportSettings: (
        state: ReportBuilderState,
        action: Extract<ReportBuilderAction, { type: "updateReportExportSettings" }>
      ) => {
        const report = state.reports.get(action.reportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        newReports.set(action.reportId, {
          ...report,
          exportSettings: mergeExportSettings(withExportDefaults(report.exportSettings), action.patch),
          updatedAt: Date.now(),
        });

        return {
          ...state,
          reports: newReports,
        };
      },

      /**
       * Clear all sections from active report
       */
      clearReport: (state: ReportBuilderState) => {
        if (!state.activeReportId) return state;

        const report = state.reports.get(state.activeReportId);
        if (!report) return state;

        const newReports = new Map(state.reports);
        const clearedSectionCount = report.sections.filter(isWidget).length;
        const updatedReport = {
          ...report,
          sections: [],
          updatedAt: Date.now(),
        };
        newReports.set(state.activeReportId, updatedReport);

        return {
          ...state,
          reports: newReports,
          totalSectionsCount: state.totalSectionsCount - clearedSectionCount,
        };
      },

      /**
       * Initialize reports from localStorage
       */
      initializeFromStorage: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "initializeFromStorage" }>) => {
        const reportsWithSections = new Map<string, Report>();
        let totalSections = 0;

        action.reports.forEach((serializedReport, id) => {
          const sections: ReportBlock[] = serializedReport.sections.map((section) =>
            isWidget(section as ReportBlock)
              ? {
                  ...(section as Omit<ReportSection, "renderedContent">),
                  renderedContent: {
                    body: null,
                    chart: undefined,
                    description: null,
                  },
                }
              : (section as ReportBlock)
          );

          totalSections += sections.filter(isWidget).length;

          reportsWithSections.set(id, {
            id: serializedReport.id,
            name: serializedReport.name,
            createdAt: serializedReport.createdAt,
            updatedAt: serializedReport.updatedAt,
            entityContext: serializedReport.entityContext,
            description: serializedReport.description,
            exportSettings: serializedReport.exportSettings,
            sections,
          });
        });

        return {
          ...state,
          reports: reportsWithSections,
          activeReportId: action.activeReportId,
          totalSectionsCount: totalSections,
        };
      },
    },
  });

export const ReportBuilderProvider = ({ children }: { children: ReactNode }) => {
  return (
    <OriginalReportBuilderProvider>
      <ReportBuilderPersistenceWrapper>{children}</ReportBuilderPersistenceWrapper>
    </OriginalReportBuilderProvider>
  );
};

const ReportBuilderPersistenceWrapper = ({
  children,
  storage = localReportStorage,
}: {
  children: ReactNode;
  storage?: ReportStorage;
}) => {
  const state = useScopedState() as unknown as ReportBuilderState;
  const dispatch = useScopedDispatch() as unknown as (action: ReportBuilderAction) => void;
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = useRef(false);

  // Load reports from storage on mount
  useEffect(() => {
    const storedReports = storage.load();
    if (storedReports && storedReports.size > 0) {
      const activeReportId = Array.from(storedReports.keys())[0];
      dispatch({
        type: "initializeFromStorage",
        reports: storedReports,
        activeReportId,
      });
    }
  }, [dispatch, storage]);

  // Persist reports whenever they change
  useEffect(() => {
    // Skip the initial empty state so it can't overwrite what's on disk before load
    if (!loaded.current) {
      loaded.current = true;
      if (state.reports.size === 0) return;
    }
    const result = storage.save(state.reports);
    if (result.ok) {
      setSaveError(null);
    } else {
      setSaveError(
        `This report is too large to save in the browser.${
          result.largest
            ? ` Largest block: ${result.largest.title} (${formatBytes(result.largest.bytes)}).`
            : ""
        }`
      );
    }
  }, [state.reports, storage]);

  return (
    <>
      {children}
      <Snackbar
        open={!!saveError}
        message={saveError}
        onClose={(_, reason) => reason !== "clickaway" && setSaveError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      />
    </>
  );
};

const OriginalReportBuilderProvider = ScopedProvider as React.FC<{ children: ReactNode }>;
export const useReportBuilderState = useScopedState;
export const useReportBuilderDispatch = useScopedDispatch;

/**
 * Combined hook for convenience
 */
export const useReportBuilder = (): {
  state: ReportBuilderState;
  dispatch: (action: ReportBuilderAction) => void;
  activeReport: Report | undefined;
} => {
  const state = useReportBuilderState() as unknown as ReportBuilderState;
  const dispatch = useReportBuilderDispatch() as unknown as (action: ReportBuilderAction) => void;

  return {
    state,
    dispatch,
    activeReport: state.activeReportId
      ? state.reports.get(state.activeReportId)
      : undefined,
  };
};

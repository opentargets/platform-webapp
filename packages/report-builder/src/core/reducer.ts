/**
 * The report builder reducer. Pure functions over `ReportBuilderState`; the logic is
 * the action map that used to live in ui's ReportBuilderProvider, unchanged apart
 * from the removal of the in-memory rendered-node cache.
 */

import { renameIdentifier } from "./codeRefs";
import { mergeExportSettings, withExportDefaults } from "./exportDefaults";
import { wouldCreateCycle } from "./graph";
import { newId } from "./ids";
import { slugifyRef, uniqueRef } from "./refs";
import {
  isDataBlock,
  isNotebook,
  isWidget,
  type NotebookBlock,
  type Report,
  type ReportBlock,
  type ReportBuilderAction,
  type ReportBuilderActionOf,
  type ReportBuilderState,
  type ReportSection,
  refOf,
} from "./types";

export const initialReportBuilderState = (): ReportBuilderState => ({
  reports: new Map<string, Report>(),
  activeReportId: null,
  isBuilderOpen: false,
  totalSectionsCount: 0,
});

export const countWidgets = (reports: Map<string, Report>): number => {
  let count = 0;
  reports.forEach((report) => {
    count += report.sections.filter(isWidget).length;
  });
  return count;
};

/** Apply `update` to the active report's blocks, bumping updatedAt */
const updateActiveBlocks = (
  state: ReportBuilderState,
  update: (blocks: ReportBlock[]) => ReportBlock[]
): ReportBuilderState => {
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

type Handlers = {
  [T in ReportBuilderAction["type"]]: (
    state: ReportBuilderState,
    action: ReportBuilderActionOf<T>
  ) => ReportBuilderState;
};

const handlers: Handlers = {
  createReport: (state, action) => {
    const reportId = newId();
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

  addSectionToReport: (state, action) => {
    if (!state.activeReportId) {
      console.warn("No active report to add section to");
      return state;
    }

    const report = state.reports.get(state.activeReportId);
    if (!report) return state;

    const newSection: ReportSection = {
      reportSectionId: newId(),
      kind: "widget",
      definition: action.definition,
      request: action.request,
      entityId: action.entityId,
      entityLabel: action.entityLabel,
      selectedView: action.selectedView || "table",
      addedAt: Date.now(),
      tags: action.tags,
      chipText: action.chipText,
      componentState: action.componentState,
      bodyProps: action.bodyProps,
      stateCapturedAt:
        action.componentState && Object.keys(action.componentState).length > 0
          ? Date.now()
          : undefined,
    };

    const newReports = new Map(state.reports);
    newReports.set(state.activeReportId, {
      ...report,
      sections: [...report.sections, newSection],
      updatedAt: Date.now(),
    });

    return {
      ...state,
      reports: newReports,
      totalSectionsCount: state.totalSectionsCount + 1,
    };
  },

  removeSectionFromReport: (state, action) => {
    if (!state.activeReportId) return state;

    const report = state.reports.get(state.activeReportId);
    if (!report) return state;

    const newReports = new Map(state.reports);
    newReports.set(state.activeReportId, {
      ...report,
      sections: report.sections.filter((s) => s.reportSectionId !== action.reportSectionId),
      updatedAt: Date.now(),
    });

    return {
      ...state,
      reports: newReports,
      totalSectionsCount: countWidgets(newReports),
    };
  },

  reorderSections: (state, action) => {
    if (!state.activeReportId) return state;

    const report = state.reports.get(state.activeReportId);
    if (!report) return state;

    const newReports = new Map(state.reports);
    newReports.set(state.activeReportId, {
      ...report,
      sections: action.newOrder,
      updatedAt: Date.now(),
    });

    return { ...state, reports: newReports };
  },

  updateSectionView: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((section) =>
        section.reportSectionId === action.reportSectionId && isWidget(section)
          ? { ...section, selectedView: action.selectedView }
          : section
      )
    ),

  updateSectionNote: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((section) =>
        section.reportSectionId === action.reportSectionId && isWidget(section)
          ? { ...section, note: action.note }
          : section
      )
    ),

  updateSectionState: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((section) =>
        section.reportSectionId === action.reportSectionId && isWidget(section)
          ? { ...section, componentState: action.componentState, stateCapturedAt: Date.now() }
          : section
      )
    ),

  insertBlock: (state, action) =>
    updateActiveBlocks(state, (blocks) => {
      const next = [...blocks];
      const index = Math.max(0, Math.min(action.atIndex, next.length));
      next.splice(index, 0, action.block);
      return next;
    }),

  /** Shallow-merge a patch into a block. `kind` and the id are immutable. */
  updateBlock: (state, action) => {
    const {
      kind: _kind,
      reportSectionId: _id,
      ...patch
    } = action.patch as Partial<ReportBlock> & {
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

  /** Copy a block (new id, data-block ref re-suffixed) directly after the original */
  duplicateBlock: (state, action) =>
    updateActiveBlocks(state, (blocks) => {
      const index = blocks.findIndex((b) => b.reportSectionId === action.reportSectionId);
      if (index === -1) return blocks;
      const original = blocks[index];
      let copy = { ...original, reportSectionId: newId(), addedAt: Date.now() } as ReportBlock;
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

  setBlockSnapshot: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((block) =>
        block.reportSectionId === action.reportSectionId && isDataBlock(block)
          ? { ...block, snapshot: action.snapshot }
          : block
      )
    ),

  linkNotebookInput: (state, action) =>
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
        b.reportSectionId === action.reportSectionId
          ? { ...notebook, inputs: [...notebook.inputs, ref] }
          : b
      );
    }),

  unlinkNotebookInput: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((b) =>
        b.reportSectionId === action.reportSectionId && isNotebook(b)
          ? { ...b, inputs: b.inputs.filter((r) => r !== action.ref) }
          : b
      )
    ),

  setNotebookRun: (state, action) =>
    updateActiveBlocks(state, (blocks) =>
      blocks.map((b) => {
        if (b.reportSectionId !== action.reportSectionId || !isNotebook(b)) return b;
        const next: NotebookBlock = { ...b, lastRun: action.lastRun };
        if (action.snapshot === null) delete next.snapshot;
        else if (action.snapshot !== undefined) next.snapshot = action.snapshot;
        return next;
      })
    ),

  renameBlockRef: (state, action) =>
    updateActiveBlocks(state, (blocks) => {
      const target = blocks.find((b) => b.reportSectionId === action.reportSectionId);
      if (!target) return blocks;
      const from = refOf(target);
      const to = uniqueRef(slugifyRef(action.ref), blocks, action.reportSectionId);
      if (!from || from === to) {
        return from
          ? blocks
          : blocks.map((b) => (b === target ? ({ ...b, ref: to } as ReportBlock) : b));
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

  setActiveReport: (state, action) => ({ ...state, activeReportId: action.reportId }),

  toggleBuilderOpen: (state, action) => ({
    ...state,
    isBuilderOpen: action.isOpen !== undefined ? action.isOpen : !state.isBuilderOpen,
  }),

  deleteReport: (state, action) => {
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
      totalSectionsCount: countWidgets(newReports),
    };
  },

  renameReport: (state, action) => {
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

    return { ...state, reports: newReports };
  },

  /** Merge a patch into a report's persisted export settings (targets, roles, overrides) */
  updateReportExportSettings: (state, action) => {
    const report = state.reports.get(action.reportId);
    if (!report) return state;

    const newReports = new Map(state.reports);
    newReports.set(action.reportId, {
      ...report,
      exportSettings: mergeExportSettings(withExportDefaults(report.exportSettings), action.patch),
      updatedAt: Date.now(),
    });

    return { ...state, reports: newReports };
  },

  clearReport: (state) => {
    if (!state.activeReportId) return state;

    const report = state.reports.get(state.activeReportId);
    if (!report) return state;

    const newReports = new Map(state.reports);
    newReports.set(state.activeReportId, { ...report, sections: [], updatedAt: Date.now() });

    return {
      ...state,
      reports: newReports,
      totalSectionsCount: countWidgets(newReports),
    };
  },

  initializeFromStorage: (state, action) => ({
    ...state,
    reports: new Map(action.reports),
    activeReportId: action.activeReportId,
    totalSectionsCount: countWidgets(action.reports),
  }),
};

export const reportReducer = (
  state: ReportBuilderState,
  action: ReportBuilderAction
): ReportBuilderState => {
  const handle = handlers[action.type] as (
    s: ReportBuilderState,
    a: ReportBuilderAction
  ) => ReportBuilderState;
  return handle ? handle(state, action) : state;
};

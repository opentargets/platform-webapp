import { createScopedContext } from "@ot/utils";
import { Report, ReportSection, ReportSectionViewType, ReportSectionDefinition, ReportRequest } from "../types/report";
import { v4 as uuidv4 } from "uuid";
import React, { ReactNode } from "react";

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
      renderedContent: {
        body: ReactNode;
        chart?: ReactNode;
        description: ReactNode;
      };
      selectedView?: ReportSectionViewType;
      tags?: string[];
      chipText?: string;
    }
  | {
      type: "removeSectionFromReport";
      reportSectionId: string;
    }
  | {
      type: "reorderSections";
      newOrder: ReportSection[];
    }
  | {
      type: "updateSectionView";
      reportSectionId: string;
      selectedView: ReportSectionViewType;
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
    }
  | {
      type: "clearReport";
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
          definition: action.definition,
          request: action.request,
          renderedContent: action.renderedContent,
          selectedView: action.selectedView || "table",
          addedAt: Date.now(),
          tags: action.tags,
          chipText: action.chipText,
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
          totalSectionsCount: Math.max(0, state.totalSectionsCount - 1),
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
            section.reportSectionId === action.reportSectionId
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
            updatedAt: Date.now(),
          });
        }

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
        const clearedSectionCount = report.sections.length;
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
    },
  });

export const ReportBuilderProvider = ScopedProvider as React.FC<{ children: ReactNode }>;
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

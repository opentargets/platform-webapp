import { createScopedContext } from "@ot/utils";
import { Report, ReportSection, ReportSectionViewType, ReportSectionDefinition, ReportRequest } from "../types/report";
import { v4 as uuidv4 } from "uuid";
import React, { ReactNode, useEffect } from "react";

/**
 * Local Storage Utilities
 */
const REPORTS_STORAGE_KEY = "ot-reports";

interface SerializedReport extends Omit<Report, 'sections'> {
  sections: Omit<ReportSection, 'renderedContent'>[];
}

const serializeReports = (reports: Map<string, Report>): Record<string, SerializedReport> => {
  const serialized: Record<string, SerializedReport> = {};
  reports.forEach((report, id) => {
    serialized[id] = {
      ...report,
      sections: report.sections.map(({ renderedContent, ...section }) => section),
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

const saveReportsToStorage = (reports: Map<string, Report>): void => {
  try {
    const serialized = serializeReports(reports);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error("Failed to save reports to localStorage:", error);
  }
};

const loadReportsFromStorage = (): Map<string, SerializedReport> | null => {
  try {
    const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!stored) return null;
    return deserializeReports(JSON.parse(stored));
  } catch (error) {
    console.error("Failed to load reports from localStorage:", error);
    return null;
  }
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
          definition: action.definition,
          request: action.request,
          entityId: action.entityId,
          entityLabel: action.entityLabel,
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

      /**
       * Initialize reports from localStorage
       */
      initializeFromStorage: (state: ReportBuilderState, action: Extract<ReportBuilderAction, { type: "initializeFromStorage" }>) => {
        const reportsWithSections = new Map<string, Report>();
        let totalSections = 0;

        action.reports.forEach((serializedReport, id) => {
          const sections: ReportSection[] = serializedReport.sections.map((section) => ({
            ...section,
            renderedContent: {
              body: null,
              chart: undefined,
              description: null,
            },
          }));

          totalSections += sections.length;

          reportsWithSections.set(id, {
            id: serializedReport.id,
            name: serializedReport.name,
            createdAt: serializedReport.createdAt,
            updatedAt: serializedReport.updatedAt,
            entityContext: serializedReport.entityContext,
            description: serializedReport.description,
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

const ReportBuilderPersistenceWrapper = ({ children }: { children: ReactNode }) => {
  const state = useScopedState() as unknown as ReportBuilderState;
  const dispatch = useScopedDispatch() as unknown as (action: ReportBuilderAction) => void;

  // Load reports from localStorage on mount
  useEffect(() => {
    const storedReports = loadReportsFromStorage();
    if (storedReports && storedReports.size > 0) {
      const activeReportId = Array.from(storedReports.keys())[0];
      dispatch({
        type: "initializeFromStorage",
        reports: storedReports,
        activeReportId,
      });
    }
  }, [dispatch]);

  // Persist reports to localStorage whenever they change
  useEffect(() => {
    saveReportsToStorage(state.reports);
  }, [state.reports]);

  return <>{children}</>;
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

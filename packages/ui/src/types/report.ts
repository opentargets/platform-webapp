/**
 * Report Builder Types
 * Defines the structure of report sections and metadata
 */

import { ReactNode } from "react";

export type ReportSectionViewType = "table" | "chart";

export interface ReportSectionDefinition {
  id: string;
  name: string;
  shortName?: string;
  entity: string;
  isPrivate?: boolean;
}

export interface ReportRequest {
  loading: boolean;
  error: any;
  data: Record<string, unknown>;
}

/**
 * A single section/widget added to the report
 */
export interface ReportSection {
  // Unique ID for this report section (can be UUID)
  reportSectionId: string;
  
  // Widget definition and metadata
  definition: ReportSectionDefinition;
  
  // Original GraphQL request (for re-running queries later)
  request: ReportRequest;
  
  // Rendered content - captured at time of addition
  renderedContent: {
    body: ReactNode;
    chart?: ReactNode;
    description: ReactNode;
  };
  
  // Current view preference for this section in the report
  selectedView: ReportSectionViewType;
  
  // Metadata
  addedAt: number; // timestamp
  tags?: string[];
  chipText?: string;
}

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
  
  // Ordered list of sections
  sections: ReportSection[];
  
  // Metadata
  description?: string;
}

/**
 * Report Builder Context State
 */
export interface ReportBuilderState {
  // Active reports
  reports: Map<string, Report>;
  
  // Currently active/editing report ID
  activeReportId: string | null;
  
  // UI state
  isBuilderOpen: boolean;
  totalSectionsCount: number;
}

/**
 * Report Builder Actions
 */
export interface ReportBuilderAction {
  type: string;
  payload?: any;
}

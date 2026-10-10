import React, { createContext, useContext } from "react";

/**
 * Context to provide entity information for report sections
 * Allows sections to access the entity they belong to, even when rendered outside
 * their original page context (e.g., in the report builder)
 * 
 * USAGE IN BODY COMPONENTS:
 * 
 * Instead of relying solely on useParams() (which gives the current page's URL state),
 * Body components should check this context first:
 * 
 * ```tsx
 * import { useReportSectionContext } from "ui";
 * import { useParams } from "react-router-dom";
 * 
 * function Body({ id: urlId, label: urlLabel, entity }) {
 *   // First check if we're in a report context
 *   const reportContext = useReportSectionContext();
 *   
 *   // Use report context if available, otherwise use URL params
 *   const entityId = reportContext?.entityId || urlId;
 *   const entityLabel = reportContext?.entityLabel || urlLabel;
 *   
 *   // Now make queries with the correct entity ID
 *   const request = useQuery(QUERY, {
 *     variables: { efoId: entityId }
 *   });
 *   
 *   // Use entityLabel for display
 *   return <Description name={entityLabel} />;
 * }
 * ```
 * 
 * This ensures sections display their own data when in a report, but also work
 * normally when rendered on their original page context.
 */
export interface ReportSectionContextValue {
  entityId?: string;
  entityLabel?: string;
  entityType?: string;
}

export const ReportSectionContext = createContext<ReportSectionContextValue | null>(null);

/**
 * Hook to access report section context
 * Returns the entity info for the current report section, or null if not in a report
 */
export const useReportSectionContext = () => {
  return useContext(ReportSectionContext);
};

/**
 * Hook that provides entity ID with fallback to useParams
 * First checks report context, then falls back to URL params
 */
export const useEntityIdFromReport = (urlParamName: string) => {
  const context = useReportSectionContext();
  
  // If we're in a report context, use the stored entity ID
  if (context?.entityId) {
    return context.entityId;
  }
  
  // Otherwise, caller should use useParams to get from URL
  return null;
};

/**
 * Hook that provides entity label with fallback to useParams
 * First checks report context, then falls back to URL params
 */
export const useEntityLabelFromReport = (urlParamName: string) => {
  const context = useReportSectionContext();
  
  // If we're in a report context, use the stored entity label
  if (context?.entityLabel) {
    return context.entityLabel;
  }
  
  // Otherwise, caller should use useParams or query to get from elsewhere
  return null;
};

import React, { createContext, ReactNode } from "react";

/**
 * Context to provide saved query variables from a report section
 * When a section is reconstructed from a saved report, the original
 * query variables are available in the request object.
 * 
 * Body components can use the useReportQueryVariables hook to access
 * these variables, which allows them to re-fetch data or understand
 * what parameters were used in the original request.
 */
const ReportQueryVariablesContext = createContext<Record<string, unknown> | undefined>(
  undefined
);

interface ReportQueryVariablesProviderProps {
  variables?: Record<string, unknown>;
  children: ReactNode;
}

export const ReportQueryVariablesProvider: React.FC<ReportQueryVariablesProviderProps> = ({
  variables,
  children,
}) => {
  return (
    <ReportQueryVariablesContext.Provider value={variables}>
      {children}
    </ReportQueryVariablesContext.Provider>
  );
};

/**
 * Hook to access saved query variables from a report section
 * 
 * Usage in Body components:
 * ```tsx
 * const variables = useReportQueryVariables();
 * const studyLocusId = variables?.studyLocusId || id; // Fallback to prop if not in report
 * ```
 * 
 * Returns:
 * - Record<string, unknown> if variables are available from a report
 * - undefined if the component is not rendered in a report context
 */
export const useReportQueryVariables = (): Record<string, unknown> | undefined => {
  return React.useContext(ReportQueryVariablesContext);
};

export default ReportQueryVariablesProvider;

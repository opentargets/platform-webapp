import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * Context to manage component state persistence in reports
 * 
 * USAGE:
 * 
 * // In your Body component:
 * import { useReportComponentState } from "ui";
 * 
 * function Body({ id, label }) {
 *   const { saveState, getState } = useReportComponentState();
 *   const [selectedRow, setSelectedRow] = useState(null);
 *   const [filters, setFilters] = useState({});
 *   
 *   // Restore state if in a report
 *   useEffect(() => {
 *     const saved = getState('selectedRow');
 *     if (saved) setSelectedRow(saved);
 *   }, []);
 *   
 *   // Save state whenever it changes
 *   const handleSelectRow = (row) => {
 *     setSelectedRow(row);
 *     saveState('selectedRow', row);
 *   };
 *   
 *   // When user updates filters
 *   const handleFilterChange = (newFilters) => {
 *     setFilters(newFilters);
 *     saveState('filters', newFilters);
 *   };
 *   
 *   return (
 *     <MyTable
 *       selectedRow={selectedRow}
 *       onSelectRow={handleSelectRow}
 *       filters={filters}
 *       onFilterChange={handleFilterChange}
 *     />
 *   );
 * }
 */

export interface ReportComponentStateContextValue {
  // Save a state value (can be called multiple times to build state object)
  saveState: (key: string, value: any) => void;
  
  // Retrieve all accumulated state
  getAllState: () => Record<string, any>;
  
  // Retrieve a specific state value
  getState: (key: string) => any;
  
  // Clear state (called when component unmounts or section is removed)
  clearState: () => void;
}

export const ReportComponentStateContext = createContext<ReportComponentStateContextValue | null>(null);

/**
 * Provider component - wrap this around report sections
 * Initialize with existing state if restoring from report
 */
export const ReportComponentStateProvider: React.FC<{
  children: React.ReactNode;
  initialState?: Record<string, any>;
}> = ({ children, initialState = {} }) => {
  const [state, setState] = useState<Record<string, any>>(initialState);

  const saveState = useCallback((key: string, value: any) => {
    setState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const getAllState = useCallback(() => state, [state]);

  const getState = useCallback((key: string) => state[key], [state]);

  const clearState = useCallback(() => {
    setState({});
  }, []);

  return (
    <ReportComponentStateContext.Provider
      value={{
        saveState,
        getAllState,
        getState,
        clearState,
      }}
    >
      {children}
    </ReportComponentStateContext.Provider>
  );
};

/**
 * Hook to access component state management in a report context
 * Returns null if not in a report section context
 */
export const useReportComponentState = () => {
  return useContext(ReportComponentStateContext);
};

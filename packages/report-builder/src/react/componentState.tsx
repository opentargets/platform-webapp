import React, {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createStateBag, deepEqual, type StateBag } from "../core";

/**
 * React binding for a widget's state bag (core `StateBag`): the Memento a report
 * captures from a widget on a live page (filters, selected rows, sort, tab) and
 * seeds it with when the widget is rebuilt inside a report.
 *
 * Widget code uses `useReportState(key, initial)` (a `useState` the report captures)
 * or, for state it already owns, `useReportComponentState()?.saveState(key, value)`.
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
  // The underlying bag, for code that wants to subscribe directly
  bag: StateBag;
}

export const ReportComponentStateContext = createContext<ReportComponentStateContextValue | null>(null);

/**
 * Provider component - wrap this around report sections
 * Initialize with existing state if restoring from report
 */
export const ReportComponentStateProvider: React.FC<{
  children: React.ReactNode;
  initialState?: Record<string, any>;
}> = ({ children, initialState }) => {
  const [bag] = useState(() => createStateBag(initialState ?? {}));
  // Subscribing here re-renders consumers when the bag changes, as the old useState did
  const snapshot = useSyncExternalStore(bag.subscribe, bag.getAll, bag.getAll);

  const value = useMemo<ReportComponentStateContextValue>(
    () => ({
      saveState: bag.set,
      getAllState: () => snapshot,
      getState: (key) => snapshot[key],
      clearState: bag.clear,
      bag,
    }),
    [bag, snapshot]
  );

  return <ReportComponentStateContext.Provider value={value}>{children}</ReportComponentStateContext.Provider>;
};

/**
 * Hook to access component state management in a report context
 * Returns null if not in a report section context
 */
export const useReportComponentState = () => {
  return useContext(ReportComponentStateContext);
};

/**
 * useState that a report captures and restores, for UI state kept in a section
 * Body or its widgets (selected tab, filters, page). On a live page it starts at
 * `initial` and saves each change into the section's state bag, so "Add to Report"
 * captures it; in a report it starts from the saved value. The default isn't saved,
 * so it adds no captured-state chip. `key` is also the chip's label.
 */
export function useReportState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(ReportComponentStateContext);
  const [value, setValue] = useState<T>(() => {
    const saved = context?.getState(key);
    return saved === undefined ? initial : (saved as T);
  });
  const initialRef = useRef(initial);
  const saveState = context?.saveState;

  useEffect(() => {
    saveState?.(key, deepEqual(value, initialRef.current) ? undefined : value);
  }, [saveState, key, value]);

  return [value, setValue];
}

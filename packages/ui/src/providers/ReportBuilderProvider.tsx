/**
 * React binding for the report store (report-core). The reducer, storage and
 * serialization live in core; this file only wires them into React context,
 * loads persisted reports on mount and shows save failures.
 */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Snackbar } from "@mui/material";
import {
  createReportStore,
  formatBytes,
  localStorageAdapter,
  type Report,
  type ReportBuilderAction,
  type ReportBuilderState,
  type ReportStorage,
  type ReportStore,
  type SaveStatus,
} from "report-core";

// Kept for existing importers; the implementations moved to report-core
export { STORAGE_BUDGET_BYTES, fitsStorageBudget, formatBytes, serializeBlock } from "report-core";
export type { ReportStorage, SaveResult, SaveStatus } from "report-core";

/** Default persistence: `localStorage["ot-reports"]` with the core's size budget. */
export const localReportStorage: ReportStorage = localStorageAdapter();

const ReportStoreContext = createContext<ReportStore | null>(null);

interface ReportBuilderProviderProps {
  children: ReactNode;
  /** Persistence adapter; defaults to localStorage. Ignored when `store` is given. */
  storage?: ReportStorage;
  /** A pre-built store (tests, or a host that owns the store's lifecycle). */
  store?: ReportStore;
}

export const ReportBuilderProvider = ({
  children,
  storage = localReportStorage,
  store: storeProp,
}: ReportBuilderProviderProps) => {
  const store = useMemo(
    () => storeProp ?? createReportStore({ storage, formatBytes }),
    [storeProp, storage]
  );

  // Load persisted reports once per store
  useEffect(() => {
    void store.load();
  }, [store]);

  return (
    <ReportStoreContext.Provider value={store}>
      {children}
      <SaveStatusSnackbar />
    </ReportStoreContext.Provider>
  );
};

export const useReportStore = (): ReportStore => {
  const store = useContext(ReportStoreContext);
  if (!store) throw new Error("useReportStore must be used within ReportBuilderProvider");
  return store;
};

export const useReportBuilderState = (): ReportBuilderState => {
  const store = useReportStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
};

export const useReportBuilderDispatch = (): ((action: ReportBuilderAction) => void) =>
  useReportStore().dispatch;

export const useReportSaveStatus = (): SaveStatus => {
  const store = useReportStore();
  return useSyncExternalStore(store.subscribe, store.getSaveStatus, store.getSaveStatus);
};

/**
 * Combined hook for convenience
 */
export const useReportBuilder = (): {
  state: ReportBuilderState;
  dispatch: (action: ReportBuilderAction) => void;
  activeReport: Report | undefined;
} => {
  const state = useReportBuilderState();
  const dispatch = useReportBuilderDispatch();
  return {
    state,
    dispatch,
    activeReport: state.activeReportId ? state.reports.get(state.activeReportId) : undefined,
  };
};

/** Toast for a failed save (report over the storage budget). MUI: belongs to the UI layer. */
const SaveStatusSnackbar = () => {
  const status = useReportSaveStatus();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const message = status.ok ? null : status.error ?? "Failed to save this report.";
  const open = !!message && dismissed !== message;
  return (
    <Snackbar
      open={open}
      message={message}
      onClose={(_, reason) => reason !== "clickaway" && setDismissed(message)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    />
  );
};

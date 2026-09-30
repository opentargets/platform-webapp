/**
 * React binding for the report store (core) plus the things a host injects: its
 * widget registry, its config and optional components. The reducer, storage and
 * serialization live in core; this only wires them into React context.
 */
import { createContext, type ReactNode, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
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
} from "../core";
import { type ReportConfig, withConfigDefaults } from "./config";
import { defaultWidgetRegistry, type ReactWidgetRegistry } from "./registry";

/** Presentational pieces a host may swap; the UI layer supplies defaults. */
export interface ReportComponents {
  /** Table used for data-block and notebook results. */
  RowsTable?: React.ComponentType<{
    rows: Record<string, unknown>[];
    columns: { key: string; label: string; type?: "string" | "number" | "boolean" }[];
  }>;
}

interface ReportContextValue {
  store: ReportStore;
  registry: ReactWidgetRegistry;
  config: ReportConfig;
  components: ReportComponents;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export interface ReportProviderProps {
  children: ReactNode;
  /** Persistence adapter; defaults to localStorage. Ignored when `store` is given. */
  storage?: ReportStorage;
  /** A pre-built store (tests, or a host that owns the store's lifecycle). */
  store?: ReportStore;
  /** Widget registry; defaults to the module-level one hosts populate at boot. */
  registry?: ReactWidgetRegistry;
  config?: Partial<ReportConfig>;
  components?: ReportComponents;
}

export const ReportProvider = ({
  children,
  storage,
  store: storeProp,
  registry = defaultWidgetRegistry,
  config,
  components,
}: ReportProviderProps) => {
  const store = useMemo(
    () => storeProp ?? createReportStore({ storage: storage ?? localStorageAdapter(), formatBytes }),
    [storeProp, storage]
  );
  const value = useMemo<ReportContextValue>(
    () => ({ store, registry, config: withConfigDefaults(config), components: components ?? {} }),
    [store, registry, config, components]
  );

  // Load persisted reports once per store
  useEffect(() => {
    void store.load();
  }, [store]);

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

const useReportContext = (): ReportContextValue => {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("Report hooks must be used within ReportProvider");
  return ctx;
};

export const useReportStore = (): ReportStore => useReportContext().store;
export const useReportRegistry = (): ReactWidgetRegistry => useReportContext().registry;
export const useReportConfig = (): ReportConfig => useReportContext().config;
export const useReportComponents = (): ReportComponents => useReportContext().components;

export const useReportBuilderState = (): ReportBuilderState => {
  const store = useReportStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
};

export const useReportBuilderDispatch = (): ((action: ReportBuilderAction) => void) => useReportStore().dispatch;

export const useReportSaveStatus = (): SaveStatus => {
  const store = useReportStore();
  return useSyncExternalStore(store.subscribe, store.getSaveStatus, store.getSaveStatus);
};

/** Combined hook for convenience */
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

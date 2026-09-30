/**
 * A tiny external store around the reducer. Framework layers subscribe to it
 * (React: useSyncExternalStore); export and tests use it directly.
 */
import { initialReportBuilderState, reportReducer } from "./reducer";
import type { ReportStorage, SaveResult } from "./storage";
import type { ReportBuilderAction, ReportBuilderState } from "./types";

export interface SaveStatus {
  ok: boolean;
  /** Set on failure; the UI decides how to show it. */
  error?: string;
  result?: SaveResult;
}

export interface ReportStore {
  getState(): ReportBuilderState;
  dispatch(action: ReportBuilderAction): void;
  subscribe(listener: () => void): () => void;
  getSaveStatus(): SaveStatus;
  /** Read persisted reports into the store. Resolves once done (or when storage is empty). */
  load(): Promise<void>;
}

export interface ReportStoreOptions {
  storage?: ReportStorage;
  initialState?: ReportBuilderState;
  formatBytes?: (bytes: number) => string;
}

const defaultFormatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const saveErrorMessage = (
  result: SaveResult,
  fmt = defaultFormatBytes
): string | undefined =>
  result.ok
    ? undefined
    : `This report is too large to save in the browser.${
        result.largest
          ? ` Largest block: ${result.largest.title} (${fmt(result.largest.bytes)}).`
          : ""
      }`;

export const createReportStore = (options: ReportStoreOptions = {}): ReportStore => {
  const { storage } = options;
  let state = options.initialState ?? initialReportBuilderState();
  let saveStatus: SaveStatus = { ok: true };
  // Never persist before the first load has finished, so an empty boot state can't overwrite disk
  let loaded = !storage;
  let saveQueued = false;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of listeners) l();
  };

  const persist = () => {
    if (!storage || !loaded || saveQueued) return;
    saveQueued = true;
    // Coalesce a burst of dispatches into one write
    queueMicrotask(async () => {
      saveQueued = false;
      const result = await storage.save(state.reports);
      const next: SaveStatus = result.ok
        ? { ok: true, result }
        : { ok: false, result, error: saveErrorMessage(result, options.formatBytes) };
      if (next.ok !== saveStatus.ok || next.error !== saveStatus.error) {
        saveStatus = next;
        notify();
      }
    });
  };

  return {
    getState: () => state,
    getSaveStatus: () => saveStatus,
    dispatch: (action) => {
      const next = reportReducer(state, action);
      if (next === state) return;
      const reportsChanged = next.reports !== state.reports;
      state = next;
      notify();
      if (reportsChanged) persist();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load: async () => {
      if (!storage) return;
      const stored = await storage.load();
      loaded = true;
      if (stored && stored.size > 0) {
        const activeReportId =
          state.activeReportId && stored.has(state.activeReportId)
            ? state.activeReportId
            : Array.from(stored.keys())[0];
        state = reportReducer(state, {
          type: "initializeFromStorage",
          reports: stored,
          activeReportId,
        });
        notify();
      }
    },
  };
};

import { useSyncExternalStore } from "react";
import type { NotebookError, NotebookOutputType } from "./protocol";

export interface NotebookLog {
  level: "log" | "info" | "warn" | "error";
  args: string[];
}

export type NotebookResult =
  | { status: "running"; at: number; inputsHash: string; logs: NotebookLog[] }
  | {
      status: "success";
      at: number;
      inputsHash: string;
      durationMs: number;
      outputType: NotebookOutputType;
      // Data/value/both outputs; undefined for dom
      value?: unknown;
      contentHeight: number;
      readsWidth: boolean;
      logs: NotebookLog[];
    }
  | {
      status: "error";
      at: number;
      inputsHash: string;
      durationMs?: number;
      error: NotebookError;
      logs: NotebookLog[];
    };

/**
 * Live notebook results for the session, keyed by block id (like
 * dataResultsStore). Persisted state lives on the block (lastRun, snapshot).
 */
const results = new Map<string, NotebookResult>();
// The last successful result per block, kept while a newer run fails
const lastGood = new Map<string, Extract<NotebookResult, { status: "success" }>>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notebookResultsStore = {
  get: (id: string) => results.get(id),
  lastGood: (id: string) => lastGood.get(id),
  set: (id: string, result: NotebookResult) => {
    results.set(id, result);
    if (result.status === "success") lastGood.set(id, result);
    notify();
  },
  patch: (id: string, patch: Partial<NotebookResult>) => {
    const current = results.get(id);
    if (!current) return;
    results.set(id, { ...current, ...patch } as NotebookResult);
    notify();
  },
  clear: (id: string) => {
    results.delete(id);
    lastGood.delete(id);
    notify();
  },
  subscribe,
};

export const useNotebookResult = (id: string) =>
  useSyncExternalStore(
    subscribe,
    () => results.get(id),
    () => undefined
  );

export const useLastGoodNotebookResult = (id: string) =>
  useSyncExternalStore(
    subscribe,
    () => lastGood.get(id),
    () => undefined
  );

/** Subscribe to every change (inputs hashing needs any upstream result's `at`). */
export const useNotebookResultsVersion = () => {
  return useSyncExternalStore(
    subscribe,
    () => {
      let v = 0;
      results.forEach((r) => {
        v = (v * 31 + r.at) % 2147483647;
      });
      return `${results.size}:${v}`;
    },
    () => ""
  );
};

// ---------- live runtimes (for export and "Download SVG/PNG") ----------

export interface NotebookRuntimeHandle {
  serialize(format: "svg" | "png", scale: number): Promise<{ data: string; width: number; height: number } | null>;
}

const runtimes = new Map<string, NotebookRuntimeHandle>();

export const notebookRuntimes = {
  register: (id: string, handle: NotebookRuntimeHandle) => {
    runtimes.set(id, handle);
    return () => {
      if (runtimes.get(id) === handle) runtimes.delete(id);
    };
  },
  get: (id: string) => runtimes.get(id),
};

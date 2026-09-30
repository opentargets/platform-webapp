import { useSyncExternalStore } from "react";

export type DataResultStatus = "running" | "success" | "error";

export interface DataResult {
  status: DataResultStatus;
  data?: unknown;
  // Human-readable error, plus structured GraphQL errors when available
  error?: string;
  graphqlErrors?: { message: string; path?: (string | number)[] }[];
  // Non-JSON response body (REST)
  rawText?: string;
  httpStatus?: number;
  at: number;
  durationMs?: number;
}

/**
 * In-memory results for data blocks, keyed by reportSectionId. Never persisted:
 * only an explicit snapshot (setBlockSnapshot) is written to the report.
 */
const results = new Map<string, DataResult>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const dataResultsStore = {
  get: (id: string): DataResult | undefined => results.get(id),
  set: (id: string, result: DataResult) => {
    results.set(id, result);
    emit();
  },
  clear: (id: string) => {
    if (results.delete(id)) emit();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const useDataBlockResult = (id: string): DataResult | undefined =>
  useSyncExternalStore(dataResultsStore.subscribe, () => dataResultsStore.get(id));

import { useSyncExternalStore } from "react";

/**
 * In-memory registry of "live" state capture functions.
 *
 * A section mounted on its native entity page registers a function that returns
 * its current ReportComponentState bag. The report builder's inspector uses it to
 * offer "Update from live page" for a report section with the same key.
 */

type Key = string; // `${entity}:${definitionId}:${entityId}`
type CaptureFn = () => Record<string, any>;

const captures = new Map<Key, CaptureFn>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const getLiveCaptureKey = (entity: string, definitionId: string, entityId?: string): Key =>
  `${entity}:${definitionId}:${entityId ?? ""}`;

export const registerLiveCapture = (key: Key, fn: CaptureFn) => {
  captures.set(key, fn);
  notify();
  return () => {
    // Only remove our own registration — a newer mount may have replaced it
    if (captures.get(key) === fn) {
      captures.delete(key);
      notify();
    }
  };
};

export const getLiveCapture = (key: Key) => captures.get(key);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Re-renders whenever a capture for `key` is registered or unregistered
 */
export const useLiveCaptureAvailable = (key: Key) =>
  useSyncExternalStore(
    subscribe,
    () => captures.has(key),
    () => false
  );

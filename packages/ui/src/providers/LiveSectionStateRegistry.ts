import { useSyncExternalStore } from "react";
import { createLiveCaptureRegistry, liveCaptureKey } from "report-core";

/**
 * Default live-capture registry for this app (the framework-free registry is in
 * report-core). A section mounted on its native entity page registers a function
 * that returns its current ReportComponentState bag; the report inspector uses it
 * to offer "Update from live page" for a report section with the same key.
 */
export const liveCaptures = createLiveCaptureRegistry();

type Key = string; // `${entity}:${definitionId}:${entityId}`
type CaptureFn = () => Record<string, any>;

export const getLiveCaptureKey = (entity: string, definitionId: string, entityId?: string): Key =>
  liveCaptureKey(`${entity}:${definitionId}`, entityId);

export const registerLiveCapture = (key: Key, fn: CaptureFn) => liveCaptures.register(key, fn);

export const getLiveCapture = (key: Key) => liveCaptures.get(key);

/** Re-renders whenever a capture for `key` is registered or unregistered */
export const useLiveCaptureAvailable = (key: Key) =>
  useSyncExternalStore(
    liveCaptures.subscribe,
    () => liveCaptures.has(key),
    () => false
  );

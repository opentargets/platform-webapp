import { useSyncExternalStore } from "react";
import { createLiveCaptureRegistry, type LiveCaptureFn, liveCaptureKey, type ReportSection } from "../core";
import { widgetType } from "./registry";

/**
 * Default live-capture registry. A widget mounted on its host page registers a
 * function returning its current state bag; the report inspector uses it to offer
 * "Update from live page" for a stored widget with the same key.
 */
export const liveCaptures = createLiveCaptureRegistry();

export const registerLiveCapture = (key: string, fn: LiveCaptureFn) => liveCaptures.register(key, fn);

export const getLiveCapture = (key: string) => liveCaptures.get(key);

/** Key for a stored widget: its type plus the entity it shows. */
export const widgetLiveCaptureKey = (section: Pick<ReportSection, "definition" | "entityId">): string =>
  liveCaptureKey(widgetType(section), section.entityId);

/** Re-renders whenever a capture for `key` is registered or unregistered */
export const useLiveCaptureAvailable = (key: string) =>
  useSyncExternalStore(
    liveCaptures.subscribe,
    () => liveCaptures.has(key),
    () => false
  );

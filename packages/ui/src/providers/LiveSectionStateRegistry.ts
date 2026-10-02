import { liveCaptureKey } from "report-builder";

/** Live capture ("Update from live page") lives in report-builder; OT's key scheme is kept here. */
export { getLiveCapture, liveCaptures, registerLiveCapture, useLiveCaptureAvailable } from "report-builder";

/** `${entity}:${definitionId}:${entityId}`, the same key report-builder derives from a stored section. */
export const getLiveCaptureKey = (entity: string, definitionId: string, entityId?: string): string =>
  liveCaptureKey(`${entity}:${definitionId}`, entityId);

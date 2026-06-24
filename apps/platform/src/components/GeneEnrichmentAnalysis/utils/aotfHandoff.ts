import type { AssociationsState } from "../types";

const HANDOFF_KEY = "gsea_aotf_handoff";

export interface AotfHandoffPayload {
  associationsState: AssociationsState;
}

export function writeAotfHandoff(payload: AotfHandoffPayload): void {
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
}

export function readAndClearAotfHandoff(): AotfHandoffPayload | null {
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(HANDOFF_KEY);
  try {
    return JSON.parse(raw) as AotfHandoffPayload;
  } catch {
    return null;
  }
}

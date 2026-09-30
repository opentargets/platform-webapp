import type { AnalysisRun } from "../types";

const DB_NAME = "ot-gsea";
const DB_VERSION = 1;
const STORE_NAME = "runHistory";
const RECORD_KEY = "current";
const SESSION_ID_KEY = "gsea_session_id";

const IN_FLIGHT_STATUSES = new Set<AnalysisRun["status"]>([
  "pending",
  "fetching_associations",
  "running_gsea",
]);

export interface PersistedRunHistory {
  runs: AnalysisRun[];
  activeRunId: string | null;
}

interface StoredRecord extends PersistedRunHistory {
  sessionId: string;
}

/**
 * A GSEA run's results can carry hundreds of pathway rows, each with
 * "Leading edge genes"/"Pathway genes" arrays — easily multiple MB per run,
 * well past sessionStorage's ~5-10MB quota. IndexedDB has no such practical
 * ceiling, so results are stored there. The session-scoping (clear on tab
 * close, survive a hard reload within the tab) that sessionStorage gave us
 * for free is reproduced here via a sessionStorage-held session id tagged
 * onto the IndexedDB record — a record from a different/previous session is
 * treated as absent rather than left to accumulate forever.
 */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable — a fresh id every call means nothing will
    // ever match a stored record, which safely disables persistence
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Reads run history persisted earlier in this tab's session. Runs left in an
 * in-flight status (the tab was closed/reloaded mid-analysis, so nothing will
 * ever resolve them) are converted to errors instead of spinning forever.
 */
export async function loadRunHistory(): Promise<PersistedRunHistory | null> {
  const db = await openDb();
  if (!db) return null;
  const sessionId = getSessionId();

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => {
        const record = request.result as StoredRecord | undefined;
        if (!record || record.sessionId !== sessionId) {
          resolve(null);
          return;
        }
        const runs = record.runs.map(run =>
          IN_FLIGHT_STATUSES.has(run.status)
            ? { ...run, status: "error" as const, error: "Interrupted by page reload" }
            : run
        );
        resolve({ runs, activeRunId: record.activeRunId });
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveRunHistory(history: PersistedRunHistory): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const record: StoredRecord = { ...history, sessionId: getSessionId() };

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

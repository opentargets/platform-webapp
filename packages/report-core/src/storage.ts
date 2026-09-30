/**
 * Storage contract and the serialization that goes through it. The default adapter
 * is localStorage; anything that can load/save the serialized reports (IndexedDB,
 * an API) slots in behind `ReportStorage`.
 */
import { isWidget, type Report, type ReportBlock, type ReportSection } from "./types";

// localStorage is usually capped at ~5 MB per origin; leave headroom
export const STORAGE_BUDGET_BYTES = 4.5 * 1024 * 1024;

export const DEFAULT_STORAGE_KEY = "ot-reports";

export type StoredReports = Record<string, Report>;

export type SaveResult =
  | { ok: true; bytes: number }
  | { ok: false; bytes: number; largest?: { title: string; bytes: number } };

export interface ReportStorage {
  load(): Promise<Map<string, Report> | null>;
  save(reports: Map<string, Report>): Promise<SaveResult>;
}

/** What goes to disk for one block: secret header values live in memory only. */
export const serializeBlock = (block: ReportBlock): ReportBlock => {
  if (block.kind === "rest") {
    return {
      ...block,
      headers: block.headers.map((h) => (h.secret ? { ...h, value: "" } : h)),
    };
  }
  return block;
};

export const serializeReports = (reports: Map<string, Report>): StoredReports => {
  const serialized: StoredReports = {};
  for (const [id, report] of reports) {
    serialized[id] = { ...report, sections: report.sections.map(serializeBlock) };
  }
  return serialized;
};

export const deserializeReports = (data: StoredReports): Map<string, Report> => {
  const reports = new Map<string, Report>();
  Object.entries(data).forEach(([id, report]) => {
    reports.set(id, {
      ...report,
      // Reports saved before blocks existed have no `kind`; a missing kind means widget
      sections: (report.sections ?? []).map((block) =>
        isWidget(block) ? ({ ...block, kind: "widget" } as ReportSection) : block
      ),
    });
  });
  return reports;
};

const blockTitle = (block: ReportBlock): string => {
  if (isWidget(block)) return block.definition.name;
  if ("title" in block && block.title) return block.title;
  if (block.kind === "image") return block.caption || block.fileName || "Image";
  if (block.kind === "heading") return block.text || "Heading";
  return block.kind.charAt(0).toUpperCase() + block.kind.slice(1);
};

const findLargestBlock = (serialized: StoredReports) => {
  let largest: { title: string; bytes: number } | undefined;
  for (const report of Object.values(serialized)) {
    for (const block of report.sections) {
      const bytes = JSON.stringify(block).length;
      if (!largest || bytes > largest.bytes) largest = { title: blockTitle(block), bytes };
    }
  }
  return largest;
};

export interface LocalStorageAdapterOptions {
  key?: string;
  budgetBytes?: number;
  /** Defaults to `globalThis.localStorage`; injectable for tests and non-browser hosts. */
  storage?: Pick<Storage, "getItem" | "setItem">;
}

export const localStorageAdapter = (options: LocalStorageAdapterOptions = {}): ReportStorage => {
  const key = options.key ?? DEFAULT_STORAGE_KEY;
  const budget = options.budgetBytes ?? STORAGE_BUDGET_BYTES;
  const backing = () =>
    options.storage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  return {
    load: async () => {
      try {
        const stored = backing()?.getItem(key);
        if (!stored) return null;
        return deserializeReports(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load reports from storage:", error);
        return null;
      }
    },
    save: async (reports) => {
      let serialized: StoredReports;
      let json: string;
      try {
        serialized = serializeReports(reports);
        json = JSON.stringify(serialized);
      } catch (error) {
        // e.g. a non-serializable value in a widget's captured request/state
        console.error("Failed to serialize reports:", error);
        return { ok: false, bytes: 0 };
      }
      // Over budget: keep the last good save on disk rather than risk a partial write
      if (json.length > budget) {
        return { ok: false, bytes: json.length, largest: findLargestBlock(serialized) };
      }
      try {
        backing()?.setItem(key, json);
        return { ok: true, bytes: json.length };
      } catch (error) {
        // Quota exceeded: browsers count localStorage differently, some well under our budget
        console.error("Failed to save reports to storage:", error);
        return { ok: false, bytes: json.length, largest: findLargestBlock(serialized) };
      }
    },
  };
};

export const memoryStorageAdapter = (): ReportStorage => {
  let saved: StoredReports | null = null;
  return {
    load: async () => (saved ? deserializeReports(saved) : null),
    save: async (reports) => {
      saved = serializeReports(reports);
      return { ok: true, bytes: JSON.stringify(saved).length };
    },
  };
};

/**
 * Pre-flight check for blocks that are about to add a lot of data (images,
 * snapshots): would the saved reports still fit if `extraBytes` were added?
 */
export const fitsStorageBudget = (
  reports: Map<string, Report>,
  extraBytes: number,
  budgetBytes: number = STORAGE_BUDGET_BYTES
): boolean => JSON.stringify(serializeReports(reports)).length + extraBytes <= budgetBytes;

export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

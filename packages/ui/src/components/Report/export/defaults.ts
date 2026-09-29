import type { DeepPartial, ExportSettings } from "./types";

export const defaultExportSettings = (): ExportSettings => ({
  slides: { aspect: "16:9", titleSlide: true, chapterDividers: true, methodsAppendix: true },
  paper: {
    columns: 2,
    pageSize: "A4",
    abstract: true,
    numberFigures: true,
    methodsAppendix: true,
    dataAvailability: true,
    wideFiguresSpan: true,
    citationStyle: "vancouver",
  },
  overrides: {},
  includeImages: false,
});

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const deepMerge = <T>(base: T, patch: unknown): T => {
  if (!isPlainObject(base) || !isPlainObject(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    // Explicit undefined clears a key (e.g. removing a per-block override)
    if (value === undefined) delete out[key];
    else out[key] = deepMerge(out[key], value);
  });
  return out as T;
};

/** Fills gaps in persisted settings (older reports, new fields) with defaults. */
export const withExportDefaults = (settings?: Partial<ExportSettings>): ExportSettings =>
  deepMerge(defaultExportSettings(), settings ?? {});

export const mergeExportSettings = (settings: ExportSettings, patch: DeepPartial<ExportSettings>): ExportSettings =>
  deepMerge(settings, patch);

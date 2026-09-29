import { useCallback, useRef } from "react";
import { isEqual } from "lodash";
import { DISPLAY_MODE, defaulDatasourcesWeigths, deserializeSorting } from "../associationsUtils";
import dataSourcesCols from "../static_datasets/dataSourcesAssoc";
import { ROW_METRICS } from "../static_datasets/rowMetrics";
import { useAotfParams } from "../context/AotfParamsContext";
import { useAotfQueryState } from "../context/AssociationsQueryContext";
import { ENTITY, type QueryState } from "../types";

/**
 * The associations table as report widgets: one per display mode, both rendered
 * by AotfReportBody from a captured AotfSnapshot.
 */

type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

const DEFINITIONS: Record<DisplayMode, { id: string; name: string; shortName: string }> = {
  [DISPLAY_MODE.ASSOCIATIONS]: {
    id: "aotfAssociations",
    name: "Associations on the fly",
    shortName: "AO",
  },
  [DISPLAY_MODE.PRIORITISATION]: {
    id: "aotfPrioritisation",
    name: "Target prioritisation factors",
    shortName: "TP",
  },
};

export const getAotfDefinition = (displayedTable: string, entity: string) => ({
  ...(DEFINITIONS[displayedTable as DisplayMode] ?? DEFINITIONS[DISPLAY_MODE.ASSOCIATIONS]),
  entity,
});

// Registry keys (`${entity}:${id}`) to register; prioritisation only exists on disease pages
export const AOTF_REPORT_SECTIONS = [
  { entity: "disease", ...DEFINITIONS[DISPLAY_MODE.ASSOCIATIONS] },
  { entity: "disease", ...DEFINITIONS[DISPLAY_MODE.PRIORITISATION] },
  { entity: "target", ...DEFINITIONS[DISPLAY_MODE.ASSOCIATIONS] },
];

// componentState key the snapshot is stored under
export const AOTF_STATE_KEY = "aotf";

// Only the toolkit's own params travel with the snapshot, not the host page's
const PARAM_KEYS = [
  "table",
  "pinned",
  "uploaded",
  "weights",
  "focus",
  "page",
  "pageSize",
  "sort",
  "q",
  "facets",
];

export interface AotfSnapshot {
  search: string;
  query: Pick<
    QueryState,
    "enableIndirect" | "dataSourceControls" | "modifiedSourcesDataControls" | "includeMeasurements"
  >;
}

/**
 * Returns a function reading the toolkit's current state (params + reducer)
 * as an AotfSnapshot. Must render inside AssociationsQueryProvider.
 */
export function useCaptureAotfSnapshot(): () => AotfSnapshot {
  const { getLatest } = useAotfParams();
  const { enableIndirect, dataSourceControls, modifiedSourcesDataControls, includeMeasurements } =
    useAotfQueryState();
  const queryRef = useRef<AotfSnapshot["query"]>(null!);
  queryRef.current = {
    enableIndirect,
    dataSourceControls,
    modifiedSourcesDataControls,
    includeMeasurements,
  };

  return useCallback(() => {
    const latest = getLatest();
    const params = new URLSearchParams();
    PARAM_KEYS.forEach(key => {
      const value = latest.get(key);
      if (value) params.set(key, value);
    });
    return { search: params.toString(), query: queryRef.current };
  }, [getLatest]);
}

const COLUMN_LABELS: Record<string, string> = Object.fromEntries([
  ...dataSourcesCols.map(c => [c.id, c.label]),
  ...ROW_METRICS.map(m => [m.id, m.label]),
]);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Captured state as chips for the report (row chip, inspector, export provenance).
 * The view itself isn't listed: it's already the section's name.
 */
export const describeAotfState =
  (entity: string) =>
  (state: Record<string, any>): string[] => {
    const snapshot = state[AOTF_STATE_KEY] as AotfSnapshot | undefined;
    if (!snapshot) return [];
    const params = new URLSearchParams(snapshot.search);
    const rowNoun = entity === ENTITY.DISEASE ? "target" : "disease";
    const out: string[] = [];

    const q = params.get("q");
    if (q) out.push(`search = ${q}`);

    const facets = params.get("facets");
    if (facets) {
      // "id~label~category" per facet, "|" between facets (see AssociationsQueryContext)
      const labels = facets.split("|").map(f => {
        const segs = f.split("~");
        return segs.length > 1 ? segs.slice(1, segs.length > 2 ? -1 : undefined).join("~") : segs[0];
      });
      out.push(`filter = ${labels.join(", ")}`);
    }

    const sort = params.get("sort");
    if (sort) {
      const [{ id, desc }] = deserializeSorting(sort);
      out.push(`sort = ${COLUMN_LABELS[id] ?? id} ${desc ? "desc" : "asc"}`);
    }

    const pinned = params.get("pinned")?.split(",").filter(Boolean) ?? [];
    if (pinned.length) out.push(`pinned = ${plural(pinned.length, rowNoun)}`);
    const uploaded = params.get("uploaded")?.split(",").filter(Boolean) ?? [];
    if (uploaded.length) out.push(`uploaded = ${plural(uploaded.length, rowNoun)}`);

    const page = Number(params.get("page"));
    if (page > 0) out.push(`page = ${page + 1}`);

    const { enableIndirect, dataSourceControls, includeMeasurements } = snapshot.query;
    if (enableIndirect !== (entity !== ENTITY.TARGET)) {
      out.push(`indirect evidence = ${enableIndirect ? "on" : "off"}`);
    }
    const changed = dataSourceControls.filter(
      control => !isEqual(control, defaulDatasourcesWeigths.find(d => d.id === control.id))
    );
    if (changed.length) out.push(`custom weights = ${plural(changed.length, "data source")}`);
    if (includeMeasurements) out.push("measurements included");

    return out;
  };

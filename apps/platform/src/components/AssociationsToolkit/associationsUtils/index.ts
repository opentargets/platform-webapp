import { scaleQuantize, rgb, RGBColor } from "d3";
import Legend from "./Legend";
import dataSources, { DataSourceDef } from "../static_datasets/dataSourcesAssoc";
import { ROW_METRICS } from "../static_datasets/rowMetrics";
import { getConfig } from "@ot/config";
import { columnAdvanceControl } from "../types";

const config = getConfig();

export const { isPartnerPreview } = config.profile;

export * from "./associations";
export * from "./interactors";

const ASSOCIATION_LEGEND_LABEL = "Association score";
const PRIORITISATION_LEGEND_LABEL = "Prioritisation indicator";
const TARGE_PRIORITISATION_LEGEND_TICKS = ["Unfavourable", "Favourable"];

export const DEFAULT_TABLE_PAGE_INDEX = 0;
export const DEFAULT_TABLE_PAGE_SIZE = 25;

export const DEFAULT_TABLE_PAGINATION_STATE = {
  pageIndex: DEFAULT_TABLE_PAGE_INDEX,
  pageSize: DEFAULT_TABLE_PAGE_SIZE,
};

export const DEFAULT_TABLE_SORTING_STATE: { id: string; desc: boolean }[] = [
  { id: "score", desc: true },
];

export const DISPLAY_MODE = {
  PRIORITISATION: "prioritisations",
  ASSOCIATIONS: "associations",
} as const;

export const TABLE_PREFIX = {
  CORE: "core",
  PINNING: "pinning",
  INTERACTORS: "interactors",
  UPLOADED: "uploaded",
} as const;

export const ENTITIES = {
  TARGET: "target",
  EVIDENCE: "evidence",
  DISEASE: "disease",
  DRUG: "drug",
} as const;

export const rowNameProperty: Record<string, string> = {
  [ENTITIES.TARGET]: "approvedSymbol",
  [ENTITIES.DISEASE]: "name",
};

export const groupViewColumnsBy = (
  input: DataSourceDef[],
  key: keyof DataSourceDef
): Record<string, DataSourceDef[]> =>
  input.reduce<Record<string, DataSourceDef[]>>((acc, currentValue) => {
    const groupKey = String(currentValue[key]);
    const { isPrivate } = currentValue;
    if (isPrivate === false || typeof isPrivate === "undefined") {
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(currentValue);
    } else if (isPartnerPreview) {
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(currentValue);
    }
    return acc;
  }, {});

/* --- TABLE SHARED HELPERS --- */
export const getPriorisationSectionId = (columnDef: { sectionId: string }): string =>
  columnDef.sectionId;

export const getCellId = (
  cell: any,
  entityToGet: string,
  displayedTable: string,
  tablePrefix: string | null = null
): [string, string, string, string | null] => {
  const colId: string = cell.column.id;
  const rowId: string = cell.row.original[entityToGet].id;
  const sectionId: string =
    displayedTable === DISPLAY_MODE.ASSOCIATIONS ? cell.column.id : cell.column.columnDef.sectionId;
  return [rowId, colId, sectionId, tablePrefix];
};

export const getColumAndSection = (
  cell: any,
  displayedTable: string
): [string, string] | [] => {
  if (!cell.column) return [];
  const colId: string = cell.column.id;
  const sectionId: string =
    displayedTable === DISPLAY_MODE.ASSOCIATIONS ? cell.column.id : cell.column.columnDef.sectionId;
  return [colId, sectionId];
};

export const cellHasValue = (score: unknown): boolean => typeof score === "number";

export const defaulDatasourcesWeigths: columnAdvanceControl[] = dataSources.map(
  ({ id, weight, required, aggregation }) => {
    const sharedWeightConfig = { id, weight, required, aggregation };
    if (id === "expression_atlas") {
      return { ...sharedWeightConfig, propagate: false };
    }
    return { ...sharedWeightConfig, propagate: true };
  }
);

export const getWightSourceDefault = (source: string): number => {
  const sourcesDetails = defaulDatasourcesWeigths.find(src => src.id === source);
  return sourcesDetails!.weight;
};

export const checkBoxPayload = (
  id: string,
  aggregationId: string
): { id: string; path: string[]; name: string } => ({
  id,
  path: [aggregationId, id],
  name: "dataTypes",
});

export const getControlChecked = (values: { id: string }[], id: string): boolean =>
  values.filter(val => val.id === id).length > 0;

/* --- CONSTANTS --- */
const { primaryColor } = config.profile;

/* Associations colors */
export const ASSOCIATION_COLORS: RGBColor[] = [
  rgb("#dbeaf6"),
  rgb("#BFDAEE"),
  rgb("#A5CAE6"),
  rgb("#8ABADE"),
  rgb("#6EA9D7"),
  rgb("#4F97CF"),
  rgb("#3583C0"),
  rgb("#2C6EA0"),
  rgb("#245780"),
];

/* PRIORITIZATION */
export const PRIORITISATION_COLORS: RGBColor[] = [
  rgb("#a01813"),
  rgb("#bc3a19"),
  rgb("#d65a1f"),
  rgb("#e08145"),
  rgb("#e3a772"),
  rgb("#e6ca9c"),
  rgb("#eceada"),
  rgb("#c5d2c1"),
  rgb("#9ebaa8"),
  rgb("#78a290"),
  rgb("#528b78"),
  rgb("#2f735f"),
  rgb("#2e5943"),
];

/* ASSOCIATION SCALE */
export const asscScaleDomain = scaleQuantize<RGBColor>().domain([0, 1]);
export const assocScale = asscScaleDomain.range(ASSOCIATION_COLORS);

/* PRIORITISATION SCALE */
export const prioritizationScaleDomain = scaleQuantize<RGBColor>().domain([-1, 1]);
export const prioritizationScale = prioritizationScaleDomain.range(PRIORITISATION_COLORS);

/* LEGENDS */
const PrioritisationLegend = Legend(prioritizationScale, {
  title: PRIORITISATION_LEGEND_LABEL,
  tickFormat: (d: any, i: number) =>
    [
      TARGE_PRIORITISATION_LEGEND_TICKS[0],
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      TARGE_PRIORITISATION_LEGEND_TICKS[1],
    ][i],
});

const AssociationsLegend = Legend(assocScale, {
  title: ASSOCIATION_LEGEND_LABEL,
  tickFormat: ".1f",
});

export const getLegend = (isAssoc: boolean): SVGSVGElement | null => {
  if (isAssoc) return AssociationsLegend;
  return PrioritisationLegend;
};

/* --- GLOBAL HELPERS --- */
export const getScale = (isAssoc: boolean) => (isAssoc ? assocScale : prioritizationScale);

/* --- SORTING URL HELPERS --- */
export function serializeSorting(sorting: { id: string; desc: boolean }[]): string {
  const { id, desc } = sorting[0] ?? DEFAULT_TABLE_SORTING_STATE[0];
  return `${id}:${desc ? "desc" : "asc"}`;
}

export function deserializeSorting(param: string): { id: string; desc: boolean }[] {
  const colonIdx = param.lastIndexOf(":");
  if (colonIdx === -1) return DEFAULT_TABLE_SORTING_STATE;
  const id = param.slice(0, colonIdx);
  const dir = param.slice(colonIdx + 1);
  if (!id) return DEFAULT_TABLE_SORTING_STATE;
  return [{ id, desc: dir !== "asc" }];
}

/* --- CSS VARIABLES --- */
export const tableCSSVariables: Record<string, string> = {
  "--primary-color": primaryColor,
  "--grey-lighter": "#f6f6f6",
  "--grey-light": "#ececec",
  "--grey-mid": "#e0dede",
  "--grey-dark": "#b8b8b8",
  "--background-color": "#fafafa",
  "--text-color": "#5A5F5F",
  "--table-header-min-width": "120px",
  "--table-header-max-width": "160px",
  "--table-left-column-width": "260px",
  "--row-hover-color": "var(--grey-light)",
  "--aggregations-background-color": "var(--grey-light)",
  "--aggregations-border-color": "var(--grey-dark)",
  "--header-border-color": "var(--grey-light)",
  "--entities-border-color": "var(--grey-light)",
  "--table-footer-border-color": "var(--grey-light)",
  "--colums-controls-color": "var(--grey-lighter)",
  "--metrics-col-count": String(ROW_METRICS.filter(m => !(m.isPrivate && m.isPrivate !== isPartnerPreview)).length),
  "--metrics-zone-width": `${ROW_METRICS.filter(m => !(m.isPrivate && m.isPrivate !== isPartnerPreview)).length * 80}px`,
};

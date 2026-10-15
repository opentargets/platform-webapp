import { getConfig } from "@ot/config";
import dataSources from "../static_datasets/dataSourcesAssoc";

const { isPartnerPreview } = getConfig().profile;

// Private (partner preview) datasources are not in the public API's `Datasource` enum,
// and an unknown enum value fails the whole request, so they are only sent in PPP.
const PRIVATE_DATASOURCE_IDS = new Set(dataSources.filter(d => d.isPrivate).map(d => d.id));

type DatasourceControl = {
  id: string;
  weight: number;
  required: boolean;
};

// Mirrors the API's `DatasourcePolicyOverride` input.
export type DatasourcePolicyOverride = {
  id: string;
  policy: { weight: number; required: boolean };
};

// Mirrors the API's `AssociationSort` input.
export type AssociationSort = {
  key: string;
  direction: "ASCENDING" | "DESCENDING";
};

export type AssociationsQueryOptions = {
  id: string;
  index?: number;
  size?: number;
  // "score" or a datasource id.
  sortBy?: string;
  desc?: boolean;
  datasources?: DatasourceControl[];
  rowsFilter?: string[];
  facetFilters?: string[];
  entitySearch?: string;
  includeMeasurements?: boolean;
};

export const getDatasourcePolicyOverrides = (
  datasources: DatasourceControl[]
): DatasourcePolicyOverride[] =>
  datasources
    .filter(({ id }) => isPartnerPreview || !PRIVATE_DATASOURCE_IDS.has(id))
    .map(({ id, weight, required }) => ({ id, policy: { weight, required } }));

export const getAssociationSort = (sortBy = "score", desc = true): AssociationSort => ({
  key: sortBy,
  direction: desc ? "DESCENDING" : "ASCENDING",
});

/**
 * Variables shared by every associations query (TargetAssociationsQuery,
 * DiseaseAssociationsQuery and the GSEA one), so that the table, pinned and uploaded
 * rows, interactors, export and API playground always ask for the same thing.
 *
 * `index` / `size` are left out when not given: useBatchDownloader supplies its own.
 */
export function getAssociationsQueryVariables({
  id,
  index,
  size,
  sortBy,
  desc,
  datasources = [],
  rowsFilter = [],
  facetFilters = [],
  entitySearch = "",
  includeMeasurements = false,
}: AssociationsQueryOptions) {
  return {
    id,
    ...(index !== undefined && { index }),
    ...(size !== undefined && { size }),
    sort: getAssociationSort(sortBy, desc),
    datasourcePolicyOverrides: getDatasourcePolicyOverrides(datasources),
    rowsFilter,
    facetFilters,
    // BFilter is nullable: no filter is null, not an empty string.
    entitySearch: entitySearch || null,
    includeMeasurements,
  };
}

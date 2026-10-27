import { ApiPlaygroundDrawer } from "ui";
import { getAssociationsQueryVariables } from "../../associationsUtils";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";

function AotfApiPlayground() {
  const {
    id,
    pagination,
    sorting,
    dataSourceControls,
    query,
    entitySearch,
    facetFiltersIds,
    includeMeasurements,
  } = useAotfQueryState();

  const variables = getAssociationsQueryVariables({
    id,
    index: pagination.pageIndex,
    size: pagination.pageSize,
    sortBy: sorting[0].id,
    datasources: dataSourceControls,
    facetFilters: facetFiltersIds,
    entitySearch,
    includeMeasurements,
  });

  return (
    <ApiPlaygroundDrawer
      fullHeight={true}
      query={query.loc.source.body}
      variables={variables}
      inMenu
    />
  );
}
export default AotfApiPlayground;

import { ApiPlaygroundDrawer } from "ui";
import { getAssociationsQueryVariables } from "../../associationsUtils";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";

type AotfApiPlaygroundProps = {
  open: boolean;
  onClose: () => void;
};

function AotfApiPlayground({ open, onClose }: AotfApiPlaygroundProps) {
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
      open={open}
      onClose={onClose}
    />
  );
}
export default AotfApiPlayground;

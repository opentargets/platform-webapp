import { ApiPlaygroundDrawer } from "ui";
import { toDatasourcePolicyOverrides } from "../../associationsUtils";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";

function AotfApiPlayground() {
  const {
    id,
    pagination,
    sorting,
    dataSourceControls,
    entity,
    query,
    entitySearch,
  } = useAotfQueryState();

  const variables = {
    id,
    index: pagination.pageIndex,
    size: pagination.pageSize,
    sortBy: sorting[0].id,
    datasources: toDatasourcePolicyOverrides(dataSourceControls),
    entity,
    entitySearch,
  };

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

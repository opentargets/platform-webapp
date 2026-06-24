import { ApiPlaygroundDrawer } from "ui";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";

function AotfApiPlayground() {
  const {
    id,
    pagination,
    sorting,
    enableIndirect,
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
    enableIndirect,
    isDirect: !enableIndirect,
    datasources: dataSourceControls.map(el => ({
      id: el.id,
      weight: el.weight,
      propagate: el.propagate,
      required: el.required,
    })),
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

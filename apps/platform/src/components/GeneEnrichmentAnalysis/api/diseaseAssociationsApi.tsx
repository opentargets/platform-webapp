// import client from "../../../apollo/client";
// import DISEASE_ASSOCIATIONS_QUERY from "../../../pages/DiseasePage/DiseaseAssociations/DiseaseAssociationsQuery.gql";
import type { AssociationsState } from "../types";

export const getDiseaseAssociations = async (associationsState: AssociationsState) => {
  const variables = {
    id: associationsState.efoId,
    index: 0,
    size: 3000,
    filter: associationsState.filter,
    sortBy: associationsState.sortBy,
    datasources: associationsState.datasources,
    rowsFilter: associationsState.rowsFilter,
    facetFilters: associationsState.facetFilters,
    entitySearch: associationsState.entitySearch,
  };

  // const { data } = await client.query({
  //   query: DISEASE_ASSOCIATIONS_QUERY,
  //   variables: variables,
  // });

  // return data;
};

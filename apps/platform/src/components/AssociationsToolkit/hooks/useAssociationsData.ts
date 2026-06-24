import { useEffect, useState } from "react";
import { ApolloClient, DocumentNode } from "@apollo/client";
import { getInitialLoadingData, getAssociationsData, getAllDataCount } from "../associationsUtils";
import { columnAdvanceControl } from "../types";
import { Facet } from "../Facets/facetsTypes";

const INITIAL_ROW_COUNT = 25;

interface UseAssociationsDataOptions {
  id?: string;
  index?: number;
  size?: number;
  filter?: string;
  sortBy?: string;
  enableIndirect?: boolean;
  datasources?: columnAdvanceControl[];
  rowsFilter?: string[];
  entity?: string;
  facetFilters?: Facet[];
  entitySearch?: string;
  laodingCount?: number;
  includeMeasurements?: boolean;
}

interface AssociationsDataState {
  loading: boolean;
  error: boolean;
  data: any[];
  initialLoading: boolean;
  count: number;
}

const getInitialState = (rowCount: number): AssociationsDataState => ({
  loading: true,
  error: false,
  data: getInitialLoadingData(rowCount),
  initialLoading: true,
  count: 0,
});

function useAssociationsData({
  client,
  query,
  options: {
    id = "",
    index = 0,
    size = 50,
    filter = "",
    sortBy = "score",
    enableIndirect = false,
    datasources = [],
    rowsFilter = [],
    entity,
    facetFilters = [],
    entitySearch = "",
    laodingCount = INITIAL_ROW_COUNT,
    includeMeasurements = false,
  },
}: {
  client: ApolloClient<any>;
  query: DocumentNode;
  options: UseAssociationsDataOptions;
}): AssociationsDataState {
  const [state, setState] = useState<AssociationsDataState>(getInitialState(laodingCount));

  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      const resData = await client.query({
        query,
        variables: {
          id,
          index,
          size,
          filter,
          sortBy,
          enableIndirect,
          isDirect: !enableIndirect,
          datasources: datasources.map(el => ({
            id: el.id,
            weight: el.weight,
            propagate: el.propagate,
            required: el.required,
          })),
          rowsFilter,
          facetFilters,
          entitySearch,
          includeMeasurements,
        },
      });
      const parsedData = getAssociationsData(entity!, resData.data);
      const dataCount = getAllDataCount(entity!, resData.data);

      if (isCurrent) {
        setState({
          count: dataCount,
          data: parsedData,
          loading: false,
          initialLoading: false,
          error: false,
        });
      }
    };
    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [
    id,
    index,
    size,
    sortBy,
    enableIndirect,
    datasources,
    query,
    entity,
    facetFilters,
    entitySearch,
    includeMeasurements,
  ]);

  return state;
}

export default useAssociationsData;

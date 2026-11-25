import { useEffect, useState } from "react";
import { ApolloClient, DocumentNode } from "@apollo/client";
import {
  getInitialLoadingData,
  getAssociationsData,
  getAllDataCount,
  getAssociationsQueryVariables,
} from "../associationsUtils";
import { columnAdvanceControl } from "../types";

const INITIAL_ROW_COUNT = 25;

interface UseAssociationsDataOptions {
  id?: string;
  index?: number;
  size?: number;
  sortBy?: string;
  datasources?: columnAdvanceControl[];
  rowsFilter?: string[];
  entity?: string;
  facetFilters?: string[];
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
    sortBy = "score",
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
    if (size === 0) {
      setState({ loading: false, error: false, data: [], initialLoading: false, count: 0 });
      return;
    }
    let isCurrent = true;
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      const resData = await client.query({
        query,
        variables: getAssociationsQueryVariables({
          id,
          index,
          size,
          sortBy,
          datasources,
          rowsFilter,
          facetFilters,
          entitySearch,
          includeMeasurements,
        }),
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

import { useEffect, useState } from "react";
import { ApolloClient, DocumentNode } from "@apollo/client";
import {
  getAssociationsData,
  getInteractorIds,
  getInitialLoadingData,
  INTERACTORS_SOURCES,
} from "../../../associationsUtils";
import { columnAdvanceControl } from "../../../types";

import InteractionsQuery from "./InteractorsQuery.gql";
import DiseaseAssociationsQuery from "../../../../../pages/DiseasePage/DiseaseAssociations/DiseaseAssociationsQuery.gql";

const INITIAL_ROW_COUNT = 8;

interface RowInteractorsState {
  loading: boolean;
  error: boolean;
  data: any[];
  initialLoading: boolean;
  count: number;
  interactorsMetadata: any;
}

const INITIAL_USE_ASSOCIATION_STATE: RowInteractorsState = {
  loading: true,
  error: false,
  data: getInitialLoadingData(INITIAL_ROW_COUNT),
  initialLoading: true,
  count: 0,
  interactorsMetadata: [],
};

interface UseRowInteractorsOptions {
  id?: string;
  index?: number;
  size?: number;
  filter?: string;
  source?: string;
  enableIndirect?: boolean;
  datasources?: columnAdvanceControl[];
  rowsFilter?: string[];
  entityInteractors?: string | null;
  scoreThreshold?: number | null;
  entity?: string;
  diseaseId?: string;
  sortBy?: string;
  entitySearch?: string;
}

function useRowInteractors({
  client,
  query = InteractionsQuery,
  associationsQuery = DiseaseAssociationsQuery,
  options: {
    id = "",
    index = 0,
    size = 50,
    filter = "",
    source = INTERACTORS_SOURCES.INTACT,
    enableIndirect = false,
    datasources = [],
    rowsFilter = [],
    entityInteractors = null,
    scoreThreshold = null,
    entity,
    diseaseId,
    sortBy,
    entitySearch = "",
  },
}: {
  client: ApolloClient<any>;
  query?: DocumentNode;
  associationsQuery?: DocumentNode;
  options: UseRowInteractorsOptions;
}): RowInteractorsState {
  const [state, setState] = useState<RowInteractorsState>(INITIAL_USE_ASSOCIATION_STATE);

  useEffect(() => {
    let isCurrent = true;
    async function getInteractors() {
      setState(prev => ({ ...prev, loading: true }));
      const rowInteractorsId = id;
      const rowInteractorsSource = source;

      const targetRowInteractorsRequest = await client.query({
        query,
        variables: {
          scoreThreshold,
          sourceDatabase: rowInteractorsSource,
          ensgId: rowInteractorsId,
          index: 0,
          size: 3000,
        },
      });

      if (!targetRowInteractorsRequest?.data?.target?.interactions?.rows) {
        if (isCurrent) {
          setState({
            interactorsMetadata: { count: 0 },
            loading: false,
            initialLoading: false,
            count: 0,
            data: [],
            error: false,
          });
        }
        return;
      }

      const interactorsIds = getInteractorIds(targetRowInteractorsRequest);

      const interactorsAssociationsRequest = await client.query({
        query: associationsQuery,
        variables: {
          id: diseaseId,
          index,
          size: interactorsIds.length,
          filter,
          sortBy,
          enableIndirect,
          isDirect: !enableIndirect,
          rowsFilter: interactorsIds,
          entitySearch,
          datasources: datasources.map(el => ({
            id: el.id,
            weight: el.weight,
            propagate: el.propagate,
            required: el.required,
          })),
        },
      });

      const interactorsAssociations = getAssociationsData(
        entity!,
        interactorsAssociationsRequest.data
      );

      const interactorsAssociationsWithScore = addInteractorScore(
        interactorsAssociations,
        targetRowInteractorsRequest.data.target.interactions.rows
      );

      if (isCurrent) {
        setState({
          interactorsMetadata: targetRowInteractorsRequest.data.target.interactions,
          loading: false,
          initialLoading: false,
          count: interactorsAssociationsWithScore.length,
          data: interactorsAssociationsWithScore,
          error: false,
        });
      }
    }
    if (isCurrent) getInteractors();
    return () => {
      isCurrent = false;
    };
  }, [source, sortBy, scoreThreshold]);

  return state;
}

function addInteractorScore(associationsData: any[], interactorsMetaData: any[]): any[] {
  return associationsData.map(element => {
    const foundInteractor = interactorsMetaData.find((x: any) => x.targetB?.id === element.id);
    if (!foundInteractor) return { ...element, interactorScore: 0 };
    return { ...element, interactorScore: foundInteractor.score };
  });
}

export default useRowInteractors;

import { type Action, ActionType, type State } from "./types";

/*****************
 * INITIAL STATE *
 *****************/
export const initialState: State = {
  modalOpen: false,
  loading: false,
  libraries: [],
  librariesLoading: false,
  librariesError: null,
  associationsState: {
    efoId: "",
    efoName: "",
    filter: "",
    sortBy: "",
    entitySearch: "",
    enableIndirect: false,
    datasources: [],
    rowsFilter: [],
    facetFilters: [],
    pinnedEntities: [],
    uploadedEntities: [],
  },
  analysisInputs: {
    selectedLibrary: "",
    geneSetSource: "all",
    analysisDirection: "one_sided_positive",
  },
  runs: [],
  activeRunId: null,
  standaloneGenes: null,
};

/*****************
 * REDUCER *
 *****************/
export function geneEnrichmentReducer(state: State = initialState, action: Action): State {
  if (state === undefined || state === null) {
    throw Error("State provided to geneEnrichmentReducer is undefined");
  }

  switch (action.type) {
    case ActionType.SET_MODAL_OPEN: {
      return {
        ...state,
        modalOpen: action.modalOpen,
        // Clear activeRunId when opening modal so form is shown first
        activeRunId: action.modalOpen ? null : state.activeRunId,
      };
    }
    case ActionType.RESET_STATE: {
      return {
        ...initialState,
      };
    }
    case ActionType.SET_ASSOCIATIONS_STATE: {
      return {
        ...state,
        associationsState: action.associationsState,
      };
    }
    case ActionType.FETCH_LIBRARIES_REQUEST: {
      return {
        ...state,
        librariesLoading: true,
      };
    }
    case ActionType.FETCH_LIBRARIES_SUCCESS: {
      return {
        ...state,
        libraries: action.payload,
        librariesLoading: false,
      };
    }
    case ActionType.FETCH_LIBRARIES_FAILURE: {
      return {
        ...state,
        librariesError: action.error,
        librariesLoading: false,
      };
    }
    case ActionType.SET_ANALYSIS_INPUTS: {
      return {
        ...state,
        analysisInputs: {
          ...state.analysisInputs,
          ...action.payload,
        },
      };
    }
    case ActionType.ADD_RUN: {
      return {
        ...state,
        runs: [...state.runs, action.payload],
        activeRunId: action.payload.id,
      };
    }
    case ActionType.UPDATE_RUN: {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        runs: state.runs.map((run) => (run.id === id ? { ...run, ...updates } : run)),
      };
    }
    case ActionType.SET_ACTIVE_RUN: {
      return {
        ...state,
        activeRunId: action.payload,
      };
    }
    case ActionType.DELETE_RUN: {
      const newRuns = state.runs.filter((run) => run.id !== action.payload);
      return {
        ...state,
        runs: newRuns,
        // Clear activeRunId if the deleted run was active
        activeRunId: state.activeRunId === action.payload ? null : state.activeRunId,
      };
    }
    case ActionType.SET_STANDALONE_GENES: {
      return { ...state, standaloneGenes: action.payload };
    }
    default: {
      return state;
    }
  }
}

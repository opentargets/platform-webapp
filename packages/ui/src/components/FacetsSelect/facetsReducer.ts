import {
  type Action,
  ActionType,
  ALL_CATEGORY,
  DISEASE_CATEGORIES,
  ENTITY,
  type FacetState,
  TARGET_CATEGORIES,
} from "./facetsTypes";

export const initialFacetState: FacetState = {
  dataOptions: [],
  loading: false,
  availableCategories: {},
  categoryFilterValue: "",
  selectedFacets: [],
  suggestionOptions: [],
};

export function createInitialState(entityToGet: string): FacetState {
  const availableCategories =
    entityToGet === ENTITY.DISEASE ? DISEASE_CATEGORIES : TARGET_CATEGORIES;
  const categoryFilterValue = availableCategories[ALL_CATEGORY];
  const state = { ...initialFacetState, availableCategories, categoryFilterValue };
  return state;
}

export function facetsReducer(state: FacetState = initialFacetState, action: Action): FacetState {
  if (typeof state === undefined) {
    throw Error("State provided to facetsReducer is undefined");
  }
  switch (action.type) {
    case ActionType.RESET_FACETS: {
      const initialStateWithCategory = createInitialState(action.entityToGet);
      return {
        ...initialStateWithCategory,
        selectedFacets: [],
        dataOptions: [],
      };
    }
    case ActionType.SEARCH_FACETS: {
      return {
        ...state,
        dataOptions: action.payload,
        loading: false,
      };
    }
    case ActionType.SET_LOADING: {
      return {
        ...state,
        loading: action.loading,
      };
    }
    case ActionType.SEARCH_CATEGORY: {
      return {
        ...state,
        availableCategories: action.categories,
        categoryFilterValue: action.categories[ALL_CATEGORY],
      };
    }
    case ActionType.SET_CATEGORY: {
      return {
        ...state,
        loading: false,
        categoryFilterValue: action.payload.category,
        dataOptions: action.payload.suggestionOptions,
        suggestionOptions: action.payload.suggestionOptions,
      };
    }
    case ActionType.SELECT_FACET: {
      return {
        ...state,
        selectedFacets: action.payload,
        dataOptions: state.suggestionOptions,
      };
    }
    default: {
      throw Error("Unknown action: " + action);
      return state;
    }
  }
}

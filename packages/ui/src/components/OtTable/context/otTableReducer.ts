import { type Action, ActionType, type OtTableSSPState } from "../types/tableTypes";
import { getLoadingRows } from "../utils/tableUtils";

export const initialState: OtTableSSPState = {
  count: 0,
  loading: true,
  rows: getLoadingRows(10),
  cursor: null,
  freeTextQuery: "",
  initialLoading: true,
};

export function createInitialState(str: string): OtTableSSPState {
  return initialState;
}

export function otTableReducer(
  state: OtTableSSPState = initialState,
  action: Action
): OtTableSSPState {
  if (typeof state === undefined) {
    throw Error("State provided to table reducer is undefined");
  }
  switch (action.type) {
    case ActionType.SET_LOADING: {
      return {
        ...state,
        loading: action.loading,
      };
    }
    case ActionType.TEXT_SEARCH: {
      return {
        ...state,
        loading: true,
        freeTextQuery: action.freeQueryText,
        cursor: null,
      };
    }
    case ActionType.SET_DATA: {
      return {
        ...state,
        initialLoading: false,
        loading: false,
        count: action.payload.count,
        cursor: action.payload.cursor,
        rows: action.payload.rows,
      };
    }
    case ActionType.ADD_DATA: {
      return {
        ...state,
        loading: false,
        cursor: action.payload.cursor,
        rows: [...state.rows, ...action.payload.rows],
      };
    }
    default: {
      throw Error("Unknown action: " + action);
      return state;
    }
  }
}

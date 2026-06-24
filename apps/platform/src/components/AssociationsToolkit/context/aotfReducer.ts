import { defaulDatasourcesWeigths } from "../associationsUtils";
import { Action, ActionType, ENTITY, QueryState } from "../types";
import { isEqual } from "lodash";

export const initialState: QueryState = {
  enableIndirect: false,
  dataSourceControls: defaulDatasourcesWeigths,
  modifiedSourcesDataControls: false,
  includeMeasurements: false,
};

export function createInitialState({ entity }: { entity: ENTITY }): QueryState {
  return { ...initialState, enableIndirect: entity !== ENTITY.TARGET };
}

export function aotfReducer(state: QueryState = initialState, action: Action): QueryState {
  if (state === undefined) {
    throw Error("State provided to aotfReducer is undefined");
  }
  switch (action.type) {
    case ActionType.SET_ENABLE_INDIRECT: {
      return { ...state, enableIndirect: action.enableIndirect };
    }
    case ActionType.DATA_SOURCE_CONTROL: {
      const colUpdatedControls = { ...action.payload };
      const dataSourceControls = state.dataSourceControls.map(col => {
        if (col.id === colUpdatedControls.id) return colUpdatedControls;
        return col;
      });
      const modifiedSourcesDataControls = !isEqual(defaulDatasourcesWeigths, dataSourceControls);
      return { ...state, dataSourceControls, modifiedSourcesDataControls };
    }
    case ActionType.RESET_DATA_SOURCE_CONTROL: {
      return {
        ...state,
        dataSourceControls: defaulDatasourcesWeigths,
        modifiedSourcesDataControls: false,
      };
    }
    case ActionType.HANDLE_AGGREGATION_CLICK: {
      const aggregation = action.aggregation;
      const isAllActive = state.dataSourceControls
        .filter(el => el.aggregation === aggregation)
        .every(el => el.required);
      const isAnyOtherActive = state.dataSourceControls
        .filter(el => el.aggregation !== aggregation)
        .some(el => el.required);
      const dataSourceControls = state.dataSourceControls.map(col => {
        if (col.aggregation === aggregation) return { ...col, required: !isAllActive };
        return col;
      });
      return {
        ...state,
        dataSourceControls,
        modifiedSourcesDataControls: !isAllActive || isAnyOtherActive,
      };
    }
    case ActionType.SET_INCLUDE_MEASUREMENTS: {
      return { ...state, includeMeasurements: action.includeMeasurements };
    }
    case ActionType.SET_INITIAL_STATE: {
      return { ...initialState };
    }
    default: {
      throw Error("Unknown action: " + action);
    }
  }
}

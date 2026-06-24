import {
  type Action,
  ActionType,
  type AnalysisInputs,
  type AnalysisRun,
  type AssociationsState,
  type Gene,
} from "./types";

export function setModalOpen(modalOpen: boolean): Action {
  return {
    type: ActionType.SET_MODAL_OPEN,
    modalOpen,
  };
}

export function resetState(): Action {
  return {
    type: ActionType.RESET_STATE,
  };
}

export function setAssociationsState(associationsState: AssociationsState): Action {
  return {
    type: ActionType.SET_ASSOCIATIONS_STATE,
    associationsState,
  };
}

export function fetchLibrariesRequest(): Action {
  return {
    type: ActionType.FETCH_LIBRARIES_REQUEST,
  };
}

export function fetchLibrariesSuccess(libraries: string[]): Action {
  return {
    type: ActionType.FETCH_LIBRARIES_SUCCESS,
    payload: libraries,
  };
}

export function fetchLibrariesFailure(error: string): Action {
  return {
    type: ActionType.FETCH_LIBRARIES_FAILURE,
    error,
  };
}

export function setAnalysisInputs(inputs: Partial<AnalysisInputs>): Action {
  return {
    type: ActionType.SET_ANALYSIS_INPUTS,
    payload: inputs,
  };
}

export function addRun(run: AnalysisRun): Action {
  return {
    type: ActionType.ADD_RUN,
    payload: run,
  };
}

export function updateRun(
  id: string,
  updates: Partial<Omit<AnalysisRun, "id">>
): Action {
  return {
    type: ActionType.UPDATE_RUN,
    payload: { id, ...updates },
  };
}

export function setActiveRun(id: string | null): Action {
  return {
    type: ActionType.SET_ACTIVE_RUN,
    payload: id,
  };
}

export function deleteRun(id: string): Action {
  return {
    type: ActionType.DELETE_RUN,
    payload: id,
  };
}

export function setStandaloneGenes(genes: Gene[] | null): Action {
  return {
    type: ActionType.SET_STANDALONE_GENES,
    payload: genes,
  };
}

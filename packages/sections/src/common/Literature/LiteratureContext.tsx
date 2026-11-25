import isEmpty from "lodash/isEmpty";
import { createContext, type Dispatch, useContext, useReducer } from "react";
import type {
  DetailsActionType,
  DetailsStateType,
  LiteratureActionType,
  LiteratureStateType,
} from "./types";

function getInitialLiteratureState(): LiteratureStateType {
  return {
    id: "",
    category: ["disease", "drug", "target"],
    query: null,
    globalEntity: null,
    entities: [],
    selectedEntities: [],
    startYear: null,
    startMonth: null,
    endYear: null,
    endMonth: null,
    earliestPubYear: 0,
    litsIds: [],
    page: 0,
    pageSize: 5,
    litsCount: 0,
    loadingEntities: false,
  };
}

const initiaLiteratureDispatch: Dispatch<LiteratureActionType> = () => {};
const LiteratureContext = createContext<LiteratureStateType>(getInitialLiteratureState());
const LiteratureDispatchContext =
  createContext<Dispatch<LiteratureActionType>>(initiaLiteratureDispatch);

const initialDetailsDispatch: Dispatch<DetailsActionType> = () => {};
const DetailsContext = createContext<DetailsStateType>({});
const DetailsDispatchContext = createContext<Dispatch<DetailsActionType>>(initialDetailsDispatch);

function literatureReducer(literatureState: LiteratureStateType, action: LiteratureActionType) {
  switch (action.type) {
    case "loadingEntities":
      return {
        ...literatureState,
        loadingEntities: action.value,
      };
    case "tablePageSize":
      return {
        ...literatureState,
        pageSize: action.value,
      };
    case "selectedEntities":
      return {
        ...literatureState,
        selectedEntities: action.value,
      };
    case "stateUpdate":
      return {
        ...literatureState,
        ...action.value,
      };
    default:
      throw Error("invalid action type");
  }
}

function detailsReducer(detailsState: DetailsStateType, action: DetailsActionType) {
  switch (action.type) {
    case "addDetails":
      return { ...detailsState, ...action.value };
    case "setToLoading": {
      const newObj = { ...detailsState };
      for (const id of action.value) {
        newObj[id] = "loading";
      }
      return newObj;
    }
    case "setToTimedOut": {
      const newObj = { ...detailsState };
      for (const id of action.value) {
        if (newObj[id] === "loading") newObj[id] = "timedOut";
      }
      return newObj;
    }
  }
}

export function LiteratureProvider({ children }) {
  const [literature, literatureDispatch] = useReducer(
    literatureReducer,
    getInitialLiteratureState()
  );
  const [details, detailsDispatch] = useReducer(detailsReducer, {});

  return (
    <LiteratureContext.Provider value={literature}>
      <LiteratureDispatchContext.Provider value={literatureDispatch}>
        <DetailsContext.Provider value={details}>
          <DetailsDispatchContext.Provider value={detailsDispatch}>
            {children}
          </DetailsDispatchContext.Provider>
        </DetailsContext.Provider>
      </LiteratureDispatchContext.Provider>
    </LiteratureContext.Provider>
  );
}

export function useLiterature() {
  return useContext(LiteratureContext);
}

export function useLiteratureDispatch() {
  return useContext(LiteratureDispatchContext);
}

export function useSelectedCategories() {
  const { category } = useLiterature();
  return [...category].sort();
}

export function useDisplayedPublications() {
  // litsIds always holds the publications of the current page
  const { litsIds } = useLiterature();
  return isEmpty(litsIds) ? [] : litsIds;
}

export function useDetails() {
  return useContext(DetailsContext);
}

export function useDetailsDispatch() {
  return useContext(DetailsDispatchContext);
}

import { createContext, Dispatch } from "react";
import { Action, DownloadsState } from "../types/downloadTypes";
import { initialState } from "./downloadsReducer";

export const DownloadsContext = createContext<{
  state: DownloadsState;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

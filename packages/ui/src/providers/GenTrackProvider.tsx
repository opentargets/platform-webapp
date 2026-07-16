import { createScopedContext } from "@ot/utils";

export const { ScopedProvider, useScopedState, useScopedDispatch } = 
  createScopedContext({
    name: "genTrack",
    extraStateProperties: {
      data: null,
      xMin: 0,
      xMax: 100,
    },
    extraActions: {
      setData: (state, action) => ({ ...state, data: action.value }),
      setXMin: (state, action) => ({ ...state, xMin: action.value }),
      setXMax: (state, action) => ({ ...state, xMax: action.value }),
    }
  });

export const GenTrackProvider = ScopedProvider;
export const useGenTrackState = useScopedState;
export const useGenTrackDispatch = useScopedDispatch;
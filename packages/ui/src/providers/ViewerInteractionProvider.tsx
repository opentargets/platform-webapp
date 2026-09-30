import { createScopedContext } from "@ot/utils";

export const { ScopedProvider, useScopedState, useScopedDispatch } = createScopedContext({
  name: "viewerInteraction",
  extraStateProperties: {
    hoveredResi: null,
    clickedResi: null,
  },
  extraActions: {
    setHoveredResi: (state, action) => ({ ...state, hoveredResi: action.value }),
    setClickedResi: (state, action) => ({ ...state, clickedResi: action.value }),
  },
});

export const ViewerInteractionProvider = ScopedProvider;
export const useViewerInteractionState = useScopedState;
export const useViewerInteractionDispatch = useScopedDispatch;

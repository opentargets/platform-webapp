import { createScopedContext } from "@ot/utils";

export const { ScopedProvider, useScopedState, useScopedDispatch } = createScopedContext({
  name: "viewer",
  extraStateProperties: {
    viewer: null,
    atomsByResi: null,
  },
  extraActions: {
    _setViewer: (state, action) => {
      const newState = { ...state };
      newState.viewer = action.value;
      const atoms = newState.viewer.getModel().selectedAtoms();
      newState.atomsByResi = atoms?.length > 0 ? Map.groupBy(atoms, (atom) => atom.resi) : null;
      return newState;
    },
  },
});

export const ViewerProvider = ScopedProvider;
export const useViewerState = useScopedState;
export const useViewerDispatch = useScopedDispatch;

import { createContext, useContext, useReducer } from "react";

export function createScopedContext({
  name,
  extraStateProperties = {}, // key-value pairs are propertyName: initialValue
  extraActions = {}, // key-value pairs are actionType: (state, action) => newState
}) {
  const StateContext = createContext(null);
  const DispatchContext = createContext(null);

  const ScopedProvider = ({ reducer, initialState = {}, children }) => {
    function wrappedReducer(state, action) {
      return extraActions[action.type]
        ? extraActions[action.type](state, action)
        : reducer(state, action);
    }

    const [state, dispatch] = useReducer(wrappedReducer, {
      ...extraStateProperties,
      ...initialState,
    });

    return (
      <StateContext.Provider value={state}>
        <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
      </StateContext.Provider>
    );
  };

  const useScopedState = () => {
    const context = useContext(StateContext);
    if (context === undefined) {
      throw new Error(`useStateValue must be used within the ${name ?? ""} provider`);
    }
    return context;
  };

  const useScopedDispatch = () => {
    const context = useContext(DispatchContext);
    if (context === undefined) {
      throw new Error(`useDispatch must be used within the ${name ?? ""} provider`);
    }
    return context;
  };

  return {
    ScopedProvider,
    useScopedState,
    useScopedDispatch,
  };
}

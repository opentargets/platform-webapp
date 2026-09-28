import { createScopedContext } from "@ot/utils";

const { ScopedProvider, useScopedState, useScopedDispatch } = 
  createScopedContext({
    name: "genTrackTooltip",
    extraStateProperties: {
      datum: null,
      otherData: null,       // arbitrary info that can be used to set tooltip options
      globalXY: null,        // {x, y} of the datum with respect to the vis container
      activeCanvas: null,    // "outer" | "inner" | null
      sticky: false,         // true when tooltip is locked via click
      stickyGenomicX: null,  // genomic X coord of cursor-at-hover-entry (for tooltip pan/zoom tracking)
      stickyLabelCenter: null, // labelCenter of sticky gene (to identify which box stays visible)
      hover: null,           // { datum, globalXY, labelCenter } — always current hovered gene, never guarded
    },
    extraActions: {
      setHover: (state: any, action: any) => ({ ...state, hover: action.value }),
      setDatum: (state, action) => state.sticky ? state : ({ ...state, datum: action.value }),
      setOtherData: (state, action) => state.sticky ? state : ({ ...state, otherData: action.value }),
      setGlobalXY: (state, action) => state.sticky ? state : ({ ...state, globalXY: action.value }),
      setActiveCanvas: (state, action) => state.sticky ? state : ({ ...state, activeCanvas: action.value }),
      setSticky: (state, action) => ({
        ...state,
        sticky: action.value.sticky,
        stickyGenomicX: action.value.genomicX ?? null,
        stickyLabelCenter: action.value.labelCenter ?? null,
        ...(action.value.datum !== undefined && { datum: action.value.datum }),
        ...(action.value.globalXY !== undefined && { globalXY: action.value.globalXY }),
        ...(action.value.activeCanvas !== undefined && { activeCanvas: action.value.activeCanvas }),
      }),
      clearSticky: (state: any, _action: any) => ({ ...state, sticky: false, datum: null, otherData: null, globalXY: null, activeCanvas: null, stickyGenomicX: null, stickyLabelCenter: null, hover: null }),
    }
  });

export const GenTrackTooltipProvider = ScopedProvider;
export const useGenTrackTooltipState = useScopedState;
export const useGenTrackTooltipDispatch = useScopedDispatch;
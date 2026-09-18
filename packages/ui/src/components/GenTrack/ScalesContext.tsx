import { createContext, useContext, RefObject } from "react";
import type { TrackTransform } from "./TrackRegistry";

export interface YScaleInfo {
  yScale: number;
  yOffset: number;
  yMin: number;
  yMax: number;
  height: number;
  containerY: number;
}

export interface ScalesRef {
  // X-axis (shared across tracks in a GenTrack)
  xScale: number;
  xOffset: number;
  xMin: number;
  xMax: number;
  viewStart?: number;  // only for inner tracks
  viewEnd?: number;    // only for inner tracks
  
  // Per-track Y-axis transforms
  yScales: Map<string, YScaleInfo>;
  
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  tracksHeight?: number;

  // Track transform registry (stored here to avoid cross-Stage context issues)
  trackRegistry: Map<string, TrackTransform>;

  // Ticker update function — set by Tracks component inside <Stage> to trigger imperative Pixi renders
  tickerUpdate?: () => void;

  // Whether this scalesRef belongs to an inner (zoomed) track
  isInner?: boolean;

  // Sticky (click-locked) tooltip identity — stored here, rather than read via
  // useGenTrackTooltipState(), for the same reason as trackRegistry above: @pixi/react's
  // <Stage> renders its children through a separate React reconciler root that does not
  // bridge useContext reads made from inside it. Written by GenTrack.tsx's click handler
  // (which runs outside <Stage>, where context reads work) and consumed imperatively by
  // Pixi-rendered components (e.g. DataGeneBox, via useStickyTick) inside their useTick
  // callbacks, forced to re-check promptly via tickerUpdate() right after a click. See the
  // GenTrack README "context reads don't work inside the Pixi tree" section.
  stickyLabelCenter: number | null; // identity for genes, matches DataGeneBox's labelCenter
  stickyDatumId: string | null;     // identity for variants/other entities, matches datum.id
}

interface ScalesContextValue {
  scalesRef: RefObject<ScalesRef>;
}

const ScalesContext = createContext<ScalesContextValue | null>(null);

export function useScalesContext() {
  const context = useContext(ScalesContext);
  if (!context) {
    throw new Error("useScalesContext must be used within a ScalesContext.Provider");
  }
  return context;
}

export function useScalesRef() {
  return useScalesContext().scalesRef;
}

export function ScalesProvider({ 
  scalesRef, 
  children 
}: { 
  scalesRef: RefObject<ScalesRef>;
  children: React.ReactNode;
}) {
  return (
    <ScalesContext.Provider value={{ scalesRef }}>
      {children}
    </ScalesContext.Provider>
  );
}

export { ScalesContext };

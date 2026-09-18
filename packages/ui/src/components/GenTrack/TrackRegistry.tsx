import { createContext, useContext, useCallback, useRef } from "react";

export interface TrackTransform {
  dataToScreen: (dataPoint: { x: number; y: number }) => { screenX: number; screenY: number };
  screenToData: (screenPoint: { x: number; y: number }) => { dataX: number; dataY: number };
}

interface TrackRegistryContextValue {
  registerTrack: (id: string, transform: TrackTransform) => void;
  unregisterTrack: (id: string) => void;
  getTransform: (id: string) => TrackTransform | undefined;
}

const TrackRegistryContext = createContext<TrackRegistryContextValue | null>(null);

export function useTrackRegistry() {
  const context = useContext(TrackRegistryContext);
  if (!context) {
    throw new Error("useTrackRegistry must be used within a TrackRegistryContext.Provider");
  }
  return context;
}

export function useTrackTransform(trackId: string): TrackTransform | undefined {
  // Note: useTrackRegistry() only works outside <Stage>; for use inside Pixi,
  // access scalesRef.current.trackRegistry directly.
  try {
    const { getTransform } = useTrackRegistry();
    return getTransform(trackId);
  } catch {
    return undefined;
  }
}

export function TrackRegistryProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, TrackTransform>>(new Map());

  const registerTrack = useCallback((id: string, transform: TrackTransform) => {
    registryRef.current.set(id, transform);
  }, []);

  const unregisterTrack = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const getTransform = useCallback((id: string) => {
    return registryRef.current.get(id);
  }, []);

  return (
    <TrackRegistryContext.Provider value={{ registerTrack, unregisterTrack, getTransform }}>
      {children}
    </TrackRegistryContext.Provider>
  );
}

export { TrackRegistryContext };

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface GenTrackDragContextValue {
  isInnerDragging: boolean;
  setIsInnerDragging: (value: boolean) => void;
}

const GenTrackDragContext = createContext<GenTrackDragContextValue>({
  isInnerDragging: false,
  setIsInnerDragging: () => {},
});

export function GenTrackDragProvider({ children }: { children: ReactNode }) {
  const [isInnerDragging, setIsInnerDragging] = useState(false);
  const value = useMemo(
    () => ({ isInnerDragging, setIsInnerDragging }),
    [isInnerDragging],
  );
  return (
    <GenTrackDragContext.Provider value={value}>
      {children}
    </GenTrackDragContext.Provider>
  );
}

export function useGenTrackDragState(): boolean {
  return useContext(GenTrackDragContext).isInnerDragging;
}

export function useGenTrackDragDispatch(): (value: boolean) => void {
  return useContext(GenTrackDragContext).setIsInnerDragging;
}

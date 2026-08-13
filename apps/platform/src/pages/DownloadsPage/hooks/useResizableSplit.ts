import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ot-downloads-split-ratio";
const DEFAULT_RATIO = 0.5;
const MIN_PANE_PX = 260;
const EDGE_SNAP_PX = 32;
const KEYBOARD_STEP = 0.04;

function readStoredRatio(): number {
  if (typeof window === "undefined") return DEFAULT_RATIO;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : DEFAULT_RATIO;
}

/**
 * Drives the draggable split between the cards grid and the graph panel on
 * the downloads page. `ratio` is the cards pane's share of the row (0-1).
 * Dragging (or a keyboard nudge) all the way to either edge collapses that
 * pane so the other fills the whole row - "expand to whole view" is just the
 * extreme of the same drag, not a separate mode. Persisted to localStorage so
 * a user's preferred split survives a reload.
 */
export function useResizableSplit() {
  const [ratio, setRatio] = useState(readStoredRatio);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  // Clamp to a minimum pixel width per pane so neither shrinks to something
  // unusable, except once the pointer crosses close enough to an edge - then
  // snap fully shut so the other pane can actually reach 100%.
  const clampRatio = useCallback((nextRatio: number, containerWidth: number) => {
    if (containerWidth <= 0) return Math.min(1, Math.max(0, nextRatio));
    const minRatio = MIN_PANE_PX / containerWidth;
    const maxRatio = 1 - minRatio;
    if (nextRatio <= minRatio) {
      return nextRatio * containerWidth <= EDGE_SNAP_PX ? 0 : minRatio;
    }
    if (nextRatio >= maxRatio) {
      return (1 - nextRatio) * containerWidth <= EDGE_SNAP_PX ? 1 : maxRatio;
    }
    return nextRatio;
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      event.preventDefault();
      setIsDragging(true);

      const rect = container.getBoundingClientRect();

      const handleMove = (moveEvent: PointerEvent) => {
        const nextRatio = (moveEvent.clientX - rect.left) / rect.width;
        setRatio(clampRatio(nextRatio, rect.width));
      };
      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [clampRatio]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const width = containerRef.current?.getBoundingClientRect().width ?? 0;
      if (event.key === "ArrowLeft") setRatio(r => clampRatio(r - KEYBOARD_STEP, width));
      else if (event.key === "ArrowRight") setRatio(r => clampRatio(r + KEYBOARD_STEP, width));
      else if (event.key === "Home") setRatio(0);
      else if (event.key === "End") setRatio(1);
      else return;
      event.preventDefault();
    },
    [clampRatio]
  );

  return {
    containerRef,
    ratio,
    isDragging,
    cardsVisible: ratio > 0,
    graphVisible: ratio < 1,
    handlePointerDown,
    handleKeyDown,
  };
}

export default useResizableSplit;

import { useEffect, useRef, useCallback } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 20;
const ZOOM_STEP = 0.5;
const EASING_FACTOR = 0.4;

export interface UseZoomReturn {
  gRef: React.MutableRefObject<HTMLElement | null>;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  panState: React.MutableRefObject<{ x: number; y: number }>;
  isPanning: React.MutableRefObject<boolean>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleReset: () => void;
}

export function useZoom(): UseZoomReturn {
  const gRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Zoom manager via refs
  const zoomState = useRef({ current: 1, target: 1 });
  const panState = useRef({ x: 0, y: 0 });

  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);



  // Main animation loop - updates zoom and DOM directly
  useEffect(() => {
    // Initialize g element transform
    if (gRef.current) {
      (gRef.current as any).style.transform = `translate(0px, 0px) scale(1)`;
    }

    const animate = () => {
      // Update zoom via ref
      if (Math.abs(zoomState.current.current - zoomState.current.target) > 0.001) {
        const diff = zoomState.current.target - zoomState.current.current;
        const step = diff * EASING_FACTOR;
        zoomState.current.current += step;

        // Update DOM directly
        if (gRef.current) {
          (gRef.current as any).style.transform = `translate(${panState.current.x}px, ${panState.current.y}px) scale(${zoomState.current.current})`;
        }

      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Scroll to zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      zoomState.current.target = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, zoomState.current.target + delta)
      );
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.shiftKey) return; // middle click or shift+click to pan
    e.preventDefault();
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    panState.current.x += dx;
    panState.current.y += dy;

    if (gRef.current) {
      (gRef.current as any).style.transform = `translate(${panState.current.x}px, ${panState.current.y}px) scale(${zoomState.current.current})`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    zoomState.current.target = Math.min(MAX_ZOOM, zoomState.current.target + ZOOM_STEP * 2);
  }, []);

  const handleZoomOut = useCallback(() => {
    zoomState.current.target = Math.max(MIN_ZOOM, zoomState.current.target - ZOOM_STEP * 2);
  }, []);

  const handleReset = useCallback(() => {
    zoomState.current.target = 1;
    panState.current = { x: 0, y: 0 };
    if (gRef.current) {
      (gRef.current as any).style.transform = `translate(0px, 0px) scale(1)`;
    }
  }, []);

  return {
    gRef,
    svgRef,
    panState,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomIn,
    handleZoomOut,
    handleReset,
  };
}

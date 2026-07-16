import { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface PanZoomPanelProps {
  viewStart: number;
  viewEnd: number;
  onViewChange: (start: number, end: number) => void;
  canvasWidth: number;
  xMin: number;
  xMax: number;
  height?: number;
  windowHeight?: number;
  backgroundColor?: string;
}

interface DragState {
  type: 'move' | 'left' | 'right';
  rectLeft: number;
  startClientX: number;
  startTransformX: number;
  startWidth: number;
  start: number;
  end: number;
}

function PanZoomPanel({ viewStart, viewEnd, onViewChange, canvasWidth, xMin, xMax, height = 20, windowHeight, backgroundColor = 'transparent' }: PanZoomPanelProps) {
  const dragState = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const leftHandleRef = useRef<HTMLDivElement | null>(null);
  const rightHandleRef = useRef<HTMLDivElement | null>(null);
  const leftCurtainRef = useRef<HTMLDivElement | null>(null);
  const rightCurtainRef = useRef<HTMLDivElement | null>(null);
  const pendingViewRef = useRef<{ start: number; end: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Internal view state — owns current position, only initialized from props once
  const [internalView, setInternalView] = useState({ start: viewStart, end: viewEnd });
  const internalViewRef = useRef({ start: viewStart, end: viewEnd });

  const HANDLE_WIDTH = 8;
  const PANEL_HEIGHT = height;
  const WINDOW_HEIGHT = windowHeight ?? height;
  const BORDER_WIDTH = 1;
  const MIN_WINDOW_WIDTH_DATA = 10 * (xMax - xMin) / canvasWidth;
  const HANDLE_COLOR = '#444';

  const updateDOM = useCallback((start: number, end: number) => {
    const x = (start - xMin) / (xMax - xMin) * canvasWidth;
    const width = (end - start) / (xMax - xMin) * canvasWidth;
    if (windowRef.current) {
      windowRef.current.style.width = `${width}px`;
      windowRef.current.style.transform = `translateX(${x}px)`;
    }
    if (leftHandleRef.current) leftHandleRef.current.style.left = `${x - HANDLE_WIDTH}px`;
    if (rightHandleRef.current) rightHandleRef.current.style.left = `${x + width}px`;
    if (leftCurtainRef.current) leftCurtainRef.current.style.width = `${Math.max(0, x)}px`;
    if (rightCurtainRef.current) {
      rightCurtainRef.current.style.left = `${x + width}px`;
      rightCurtainRef.current.style.width = `${Math.max(0, canvasWidth - (x + width))}px`;
    }
  }, [xMin, xMax, canvasWidth, HANDLE_WIDTH]);

  // Sync DOM when canvasWidth changes (resize)
  useEffect(() => {
    updateDOM(internalViewRef.current.start, internalViewRef.current.end);
  }, [canvasWidth, updateDOM]);

  // Calculate initial window bounds for first render
  const windowX = (internalView.start - xMin) / (xMax - xMin) * canvasWidth;
  const windowWidth = (internalView.end - internalView.start) / (xMax - xMin) * canvasWidth;

  // schedule a batched view update via RAF
  const scheduleViewUpdate = useCallback((start: number, end: number) => {
    pendingViewRef.current = { start, end };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingViewRef.current) {
          onViewChange(pendingViewRef.current.start, pendingViewRef.current.end);
          pendingViewRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [onViewChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = dragState.current;
    if (!state) return;

    const { type, startClientX, startTransformX, startWidth, start, end } = state;
    const dxPx = e.clientX - startClientX;

    let newStart = start;
    let newEnd = end;
    let newX = startTransformX;
    let newWidth = startWidth;

    if (type === 'move') {
      const span = end - start;
      const dxData = dxPx / canvasWidth * (xMax - xMin);
      newStart = clamp(start + dxData, xMin, xMax - span);
      newEnd = newStart + span;
      newX = (newStart - xMin) / (xMax - xMin) * canvasWidth;
    } else if (type === 'left') {
      const dxData = dxPx / canvasWidth * (xMax - xMin);
      newStart = clamp(start + dxData, xMin, end - MIN_WINDOW_WIDTH_DATA);
      newEnd = end;
      newX = (newStart - xMin) / (xMax - xMin) * canvasWidth;
      newWidth = (newEnd - newStart) / (xMax - xMin) * canvasWidth;
    } else if (type === 'right') {
      const dxData = dxPx / canvasWidth * (xMax - xMin);
      newEnd = clamp(end + dxData, start + MIN_WINDOW_WIDTH_DATA, xMax);
      newStart = start;
      newX = (newStart - xMin) / (xMax - xMin) * canvasWidth;
      newWidth = (newEnd - newStart) / (xMax - xMin) * canvasWidth;
    }

    // imperative visual updates
    if (windowRef.current) {
      windowRef.current.style.transform = `translateX(${newX}px)`;
      windowRef.current.style.width = `${newWidth}px`;
    }
    if (leftHandleRef.current) leftHandleRef.current.style.left = `${newX - HANDLE_WIDTH}px`;
    if (rightHandleRef.current) rightHandleRef.current.style.left = `${newX + newWidth}px`;
    if (leftCurtainRef.current) leftCurtainRef.current.style.width = `${Math.max(0, newX)}px`;
    if (rightCurtainRef.current) {
      rightCurtainRef.current.style.left = `${newX + newWidth}px`;
      rightCurtainRef.current.style.width = `${Math.max(0, canvasWidth - (newX + newWidth))}px`;
    }
    // Keep internalViewRef current so next mousedown starts from here
    internalViewRef.current = { start: newStart, end: newEnd };

    // batch view update
    scheduleViewUpdate(newStart, newEnd);
  }, [canvasWidth, xMin, xMax, MIN_WINDOW_WIDTH_DATA, scheduleViewUpdate, HANDLE_WIDTH]);

  // Store handler refs so we can remove them in mouseup
  const moveHandlerRef = useRef<(e: MouseEvent) => void>();
  const upHandlerRef = useRef<() => void>();

  // Keep handleMouseUp ref current for the closure (initialized later)
  const handleMouseUpRef = useRef<() => void>(() => {});

  const handleMouseDown = useCallback((type: 'move' | 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const { start, end } = internalViewRef.current;
    const startX = (start - xMin) / (xMax - xMin) * canvasWidth;
    const startW = (end - start) / (xMax - xMin) * canvasWidth;
    dragState.current = {
      type,
      rectLeft: rect.left,
      startClientX: e.clientX,
      startTransformX: startX,
      startWidth: startW,
      start,
      end,
    };

    // Attach global listeners only during drag
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUpRef.current();

    moveHandlerRef.current = handleGlobalMouseMove;
    upHandlerRef.current = handleGlobalMouseUp;

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [xMin, xMax, canvasWidth, handleMouseMove]);

  const handleMouseUp = useCallback(() => {
    // Remove global listeners
    if (moveHandlerRef.current) {
      document.removeEventListener('mousemove', moveHandlerRef.current);
    }
    if (upHandlerRef.current) {
      document.removeEventListener('mouseup', upHandlerRef.current);
    }
    moveHandlerRef.current = undefined;
    upHandlerRef.current = undefined;

    dragState.current = null;
    const { start, end } = internalViewRef.current;
    onViewChange(start, end);
    setInternalView({ start, end });
  }, [onViewChange]);

  // Keep handleMouseUp ref current for the closure
  useEffect(() => {
    handleMouseUpRef.current = handleMouseUp;
  }, [handleMouseUp]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: canvasWidth,
        height: `${PANEL_HEIGHT}px`,
        backgroundColor,
        cursor: 'default',
      }}
    >
      {/* main window — border + blue fill, captures drag events */}
      <Box
        ref={windowRef}
        sx={{
          position: 'absolute',
          left: 0,
          top: `${(PANEL_HEIGHT - WINDOW_HEIGHT) / 2}px`,
          width: `${windowWidth}px`,
          height: `${WINDOW_HEIGHT}px`,
          transform: `translateX(${windowX}px)`,
          borderTop: `${BORDER_WIDTH}px solid ${HANDLE_COLOR}`,
          borderBottom: `${BORDER_WIDTH}px solid ${HANDLE_COLOR}`,
          borderLeft: 'none',
          borderRight: 'none',
          boxSizing: 'border-box',
          cursor: 'move',
          zIndex: 2,
        }}
        onMouseDown={(e) => handleMouseDown('move', e)}
      />

      {/* left curtain — fades out-of-window variants */}
      <Box
        ref={leftCurtainRef}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${Math.max(0, windowX)}px`,
          height: `${PANEL_HEIGHT}px`,
          backgroundColor: 'rgba(255,255,255,0.55)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* right curtain — fades out-of-window variants */}
      <Box
        ref={rightCurtainRef}
        sx={{
          position: 'absolute',
          left: `${windowX + windowWidth}px`,
          top: 0,
          width: `${Math.max(0, canvasWidth - (windowX + windowWidth))}px`,
          height: `${PANEL_HEIGHT}px`,
          backgroundColor: 'rgba(255,255,255,0.55)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />


      {/* border around full panel */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          border: '1.5px solid #bbb',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      />

      {/* left handle — semicircle cap (left half of circle) */}
      <Box
        ref={leftHandleRef}
        sx={{
          position: 'absolute',
          left: `${windowX - HANDLE_WIDTH}px`,
          top: `${(PANEL_HEIGHT - WINDOW_HEIGHT) / 2}px`,
          width: `${HANDLE_WIDTH}px`,
          height: `${WINDOW_HEIGHT}px`,
          cursor: 'ew-resize',
          zIndex: 4,
          backgroundColor: HANDLE_COLOR,
          borderRadius: `${WINDOW_HEIGHT}px 0 0 ${WINDOW_HEIGHT}px`,
        }}
        onMouseDown={(e) => handleMouseDown('left', e)}
      />

      {/* right handle — semicircle cap (right half of circle) */}
      <Box
        ref={rightHandleRef}
        sx={{
          position: 'absolute',
          left: `${windowX + windowWidth}px`,
          top: `${(PANEL_HEIGHT - WINDOW_HEIGHT) / 2}px`,
          width: `${HANDLE_WIDTH}px`,
          height: `${WINDOW_HEIGHT}px`,
          cursor: 'ew-resize',
          zIndex: 4,
          backgroundColor: HANDLE_COLOR,
          borderRadius: `0 ${WINDOW_HEIGHT}px ${WINDOW_HEIGHT}px 0`,
        }}
        onMouseDown={(e) => handleMouseDown('right', e)}
      />
    </Box>
  );
}

export default PanZoomPanel;
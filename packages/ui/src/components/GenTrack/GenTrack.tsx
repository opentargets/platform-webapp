import { Box } from "@mui/material";
import { Stage, Container, useApp } from '@pixi/react';
import { useMeasure } from "@uidotdev/usehooks";
import { useRef, useEffect, memo, useCallback, useState, forwardRef } from "react";
import PanZoomPanel, { type PanZoomPanelHandle } from "./PanZoomPanel";
import NestedXInfo from "./NestedXInfo";
import type { XAxisHandle } from "../GeneVis/XAxis";
import { useGenTrackState } from "../../providers/GenTrackProvider";
import { GenTrackDragProvider, useGenTrackDragDispatch, useGenTrackDragState } from "../../providers/GenTrackDragProvider";
import GenTrackTooltip from "./GenTrackTooltip";
import { useGenTrackTooltipDispatch, useGenTrackTooltipState } from "../../providers/GenTrackTooltipProvider";
import { ScalesProvider, type ScalesRef } from "./ScalesContext";
import { TrackRegistryProvider, type TrackTransform } from "./TrackRegistry";
import { CrosshairOverlay } from "./CrosshairOverlay";

function px(num) {
  return `${num}px`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

interface TooltipLayerProps {
  children: React.ReactNode;
  width: number;
  height: number;
  canvasType: string;
  tooltipProps: object;
  cursor?: string;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  crosshairs?: boolean;
}

const TooltipLayer = memo(forwardRef<HTMLDivElement, TooltipLayerProps>(function TooltipLayer({ children, width, height, canvasType, tooltipProps, cursor, onMouseDown, crosshairs = false }: TooltipLayerProps, ref) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value?: any }) => void;
  const genTrackTooltipState = useGenTrackTooltipState() as any;
  const isInnerDragging = useGenTrackDragState();
  const { onDatumClick } = (tooltipProps as Record<string, any>);

  const handleMouseEnter = () => {
    genTrackTooltipDispatch({ type: "setActiveCanvas", value: canvasType });
  };
  
  const handleMouseLeave = () => {
    genTrackTooltipDispatch({ type: "setActiveCanvas", value: null });
  };

  const handleClick = () => {
    if (isInnerDragging) return;
    const hover = genTrackTooltipState?.hover;
    if (canvasType === "inner" && hover?.datum && onDatumClick) {
      onDatumClick(hover.datum);
    }
  };

  const computedCursor = cursor ?? (
    canvasType === "inner" && genTrackTooltipState?.hover?.datum && onDatumClick ? "pointer" : "default"
  );

  if (!children && !crosshairs) return null;
  
  return (
    <Box 
      ref={ref}
      sx={{ 
        position: "absolute", 
        inset: 0, 
        pointerEvents: "auto",
        cursor: computedCursor,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onMouseDown={onMouseDown}
    >
      <GenTrackTooltip width={width} height={height} canvasType={canvasType} {...tooltipProps}>
        {children}
      </GenTrackTooltip>
    </Box>
  );
}));

function useInnerPanDrag(
  canvasWidth: number,
  xMin: number,
  xMax: number,
  scalesRefHolder: React.MutableRefObject<ScalesRef | null>,
  updateViewWindow: (start: number, end: number) => void,
  onDatumClick?: (datum: any) => void,
) {
  const genTrackTooltipState = useGenTrackTooltipState() as any;
  const setIsInnerDragging = useGenTrackDragDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartClientX = useRef(0);
  const dragStartStart = useRef(0);
  const dragStartEnd = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingViewRef = useRef<{ start: number; end: number } | null>(null);

  const scheduleViewUpdate = useCallback((start: number, end: number) => {
    pendingViewRef.current = { start, end };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingViewRef.current) {
          updateViewWindow(pendingViewRef.current.start, pendingViewRef.current.end);
          pendingViewRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [updateViewWindow]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const scales = scalesRefHolder.current;
    if (!scales || canvasWidth <= 0) return;
    const span = dragStartEnd.current - dragStartStart.current;
    if (span <= 0) return;
    const dxPx = e.clientX - dragStartClientX.current;
    const dxData = (dxPx / canvasWidth) * span;
    const newStart = clamp(dragStartStart.current - dxData, xMin, xMax - span);
    const newEnd = newStart + span;
    scheduleViewUpdate(newStart, newEnd);
  }, [canvasWidth, xMin, xMax, scalesRefHolder, scheduleViewUpdate]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingViewRef.current) {
      updateViewWindow(pendingViewRef.current.start, pendingViewRef.current.end);
      pendingViewRef.current = null;
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setIsDragging(false);
    // Keep the flag true through the overlay's click event; clear afterwards.
    setTimeout(() => setIsInnerDragging(false), 0);
  }, [updateViewWindow, handleMouseMove, setIsInnerDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const hover = genTrackTooltipState?.hover;
    if (hover?.datum) return;
    const scales = scalesRefHolder.current;
    if (!scales || canvasWidth <= 0) return;
    const span = (scales.viewEnd ?? xMax) - (scales.viewStart ?? xMin);
    const fullSpan = xMax - xMin;
    if (span <= 0 || span >= fullSpan) return;
    e.preventDefault();
    dragStartClientX.current = e.clientX;
    dragStartStart.current = scales.viewStart ?? xMin;
    dragStartEnd.current = scales.viewEnd ?? xMax;
    setIsDragging(true);
    setIsInnerDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [canvasWidth, xMin, xMax, scalesRefHolder, genTrackTooltipState, setIsInnerDragging, handleMouseMove, handleMouseUp]);

  // Clean up listeners if the overlay is unmounted while a drag is in progress
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsInnerDragging(false);
    };
  }, [handleMouseMove, handleMouseUp, setIsInnerDragging]);

  const cursor = isDragging
    ? "move"
    : genTrackTooltipState?.hover?.datum
      ? (onDatumClick ? "pointer" : "default")
      : "crosshair";

  return { cursor, handleMouseDown, isDragging };
}

interface InnerPanDragTooltipLayerProps {
  width: number;
  height: number;
  canvasType: string;
  tooltipProps: object;
  canvasWidth: number;
  xMin: number;
  xMax: number;
  scalesRefHolder: React.MutableRefObject<ScalesRef | null>;
  updateViewWindow: (start: number, end: number) => void;
  children: React.ReactNode;
  crosshairs?: boolean;
}

const InnerPanDragTooltipLayer = forwardRef<HTMLDivElement, InnerPanDragTooltipLayerProps>(function InnerPanDragTooltipLayer({
  width,
  height,
  canvasType,
  tooltipProps,
  canvasWidth,
  xMin,
  xMax,
  scalesRefHolder,
  updateViewWindow,
  children,
  crosshairs = false,
}, ref) {
  const innerPanDrag = useInnerPanDrag(
    canvasWidth,
    xMin,
    xMax,
    scalesRefHolder,
    updateViewWindow,
    (tooltipProps as any)?.onDatumClick,
  );

  return (
    <TooltipLayer
      ref={ref}
      width={width}
      height={height}
      canvasType={canvasType}
      tooltipProps={tooltipProps}
      cursor={innerPanDrag.cursor}
      onMouseDown={innerPanDrag.handleMouseDown}
      crosshairs={crosshairs}
    >
      {children}
    </TooltipLayer>
  );
});

interface TrackProps {
  isInner: boolean;
  trackId: string;
  scalesRef: React.RefObject<ScalesRef>;
}

export interface TrackLegendProps {
  data: any;
  isInner: boolean;
}

export type TrackLegendPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface Track {
  id: string;
  height?: number;
  yMin?: number;
  yMax?: number;
  Track: React.ComponentType<TrackProps>;
  YInfo?: React.ComponentType<{ data: any; start: number; end: number; isInner: boolean }>;
  onTick?: (container: any) => void;
  paddingTop?: number;
  Legend?: React.ComponentType<TrackLegendProps>;
  legendPosition?: TrackLegendPosition;
}

const legendPositionStyles: Record<TrackLegendPosition, Record<string, string>> = {
  "top-left": { top: "4px", left: "4px" },
  "top-right": { top: "4px", right: "4px" },
  "bottom-left": { bottom: "4px", left: "4px" },
  "bottom-right": { bottom: "4px", right: "4px" },
};

function TrackLegendsLayer({ tracks, yTrackStarts, data, isInner, zIndex = 3 }: {
  tracks: Track[];
  yTrackStarts: number[];
  data: any;
  isInner: boolean;
  zIndex?: number;
}) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex, pointerEvents: "none" }}>
      {tracks.map(({ id, height = 50, Legend, legendPosition = "top-right" }, index) => Legend ? (
        <Box key={id} sx={{ position: "absolute", top: yTrackStarts[index], height, left: 0, right: 0, pointerEvents: "none" }}>
          <Box data-gentrack-overlay-blocker sx={{ position: "absolute", ...legendPositionStyles[legendPosition], pointerEvents: "auto", cursor: "default" }}>
            <Legend data={data} isInner={isInner} />
          </Box>
        </Box>
      ) : null)}
    </Box>
  );
}

function computeTracksLayout(tracks: Track[], paddingBottom: number): { yTrackStarts: number[]; canvasHeight: number } {
  const yTrackStarts: number[] = [];
  let canvasHeight = 0;
  if (tracks?.length > 0) {
    for (const [index, track] of tracks.entries()) {
      yTrackStarts.push(index === 0
        ? (track.paddingTop ?? 0)
        : yTrackStarts[yTrackStarts.length - 1] + tracks[index - 1].height + (track.paddingTop ?? 0)
      );
    }
    canvasHeight = yTrackStarts[yTrackStarts.length - 1] + tracks[tracks.length - 1].height + paddingBottom;
  }
  return { yTrackStarts, canvasHeight };
}

interface TracksProps {
  tracks: Track[];
  canvasWidth: number;
  xMin: number;
  xMax: number;
  yTrackStarts: number[];
  isInner: boolean;
  scalesRef: React.RefObject<ScalesRef>;
  tickerUpdateRef: React.MutableRefObject<(() => void) | null>;
  onReady?: () => void;
  canvasBoxRef?: React.RefObject<HTMLDivElement | null>;
}

function Tracks({ 
  tracks, 
  canvasWidth, 
  xMin, 
  xMax, 
  yTrackStarts, 
  isInner,
  scalesRef,
  tickerUpdateRef,
  onReady,
  canvasBoxRef,
}: TracksProps) {
  const app = useApp();

  // Store ticker.update on both the dedicated ref and scalesRef so updateViewWindow can reach it
  tickerUpdateRef.current = () => app.ticker.update();
  if (scalesRef.current) scalesRef.current.tickerUpdate = () => app.ticker.update();
  const trackContainersRef = useRef([]);

  // Stop continuous ticking and recompute scales — runs whenever canvas geometry changes
  useEffect(() => {
    app.ticker.stop();
    // Hide canvas immediately to avoid flash of stale sprites during resize
    if (canvasBoxRef?.current) canvasBoxRef.current.style.visibility = "hidden";
    // Recompute xScale/xOffset synchronously so they're fresh before the deferred tick
    const s = scalesRef.current;
    if (s) {
      const domainMin = isInner && s.viewStart !== undefined ? s.viewStart : xMin;
      const domainMax = isInner && s.viewEnd !== undefined ? s.viewEnd : xMax;
      s.xScale = canvasWidth / (domainMax - domainMin);
      s.xOffset = -domainMin * s.xScale;
    }
    // Defer tick so all child DataSprite/DataRect refs are attached first
    const id = setTimeout(() => {
      app.ticker.update();
      // Reveal canvas imperatively — no React re-render, no flash
      if (canvasBoxRef?.current) canvasBoxRef.current.style.visibility = "visible";
      // Render one more tick after canvas becomes visible to ensure hit areas are calculated
      requestAnimationFrame(() => {
        app.ticker.update();
      });
      onReady?.();
    }, 0);
    return () => clearTimeout(id);
  }, [app, scalesRef, xMin, xMax, canvasWidth, isInner, onReady, canvasBoxRef]);

  // Register track transforms whenever tracks or scales change
  useEffect(() => {
    tracks.forEach((track: Track, index: number) => {
      const { id, height = 50, yMin = 0, yMax = 100 } = track;
      const yScale = height / (yMax - yMin);
      // yOffset is track-local only: maps dataY to pixels within the Container
      // (Container itself is already positioned at yTrackStarts[index])
      const yOffset = -yMin * yScale;
      
      // Update scales ref with y-scale info
      if (scalesRef.current) {
        scalesRef.current.yScales.set(id, {
          yScale,
          yOffset,
          yMin,
          yMax,
          height,
          containerY: yTrackStarts[index],
        });
      }
      
      // Register transform for cross-track features
      const transform: TrackTransform = {
        dataToScreen: ({ x, y }) => {
          const scales = scalesRef.current;
          if (!scales) return { screenX: 0, screenY: 0 };
          
          const xScale = scales.xScale;
          const xOffset = scales.xOffset;
          const yScaleInfo = scales.yScales.get(id);
          
          return {
            screenX: x * xScale + xOffset,
            screenY: yScaleInfo ? y * yScaleInfo.yScale + yScaleInfo.yOffset : y,
          };
        },
        screenToData: ({ x, y }) => {
          const scales = scalesRef.current;
          if (!scales) return { dataX: 0, dataY: 0 };
          
          const xScale = scales.xScale;
          const xOffset = scales.xOffset;
          const yScaleInfo = scales.yScales.get(id);
          
          return {
            dataX: (x - xOffset) / xScale,
            dataY: yScaleInfo ? (y - yScaleInfo.yOffset) / yScaleInfo.yScale : y,
          };
        },
      };
      
      scalesRef.current?.trackRegistry.set(id, transform);
    });
    
    return () => {
      tracks.forEach(({ id }: { id: string }) => {
        scalesRef.current?.trackRegistry.delete(id);
      });
    };
  }, [tracks, yTrackStarts, scalesRef]);

  // per-frame, per track updates (optional culling)
  useEffect(() => {
    const update = () => {
      if (!trackContainersRef.current.some(v => v)) return;
      for (const [index, { onTick }] of tracks.entries()) {
        onTick?.(trackContainersRef.current[index]);
      }
    };
    app.ticker.add(update);
    return () => { app.ticker.remove(update); };
  }, [tracks, app.ticker]);

  // Keep static props in scalesRef for DataSprite/useTick to read
  if (scalesRef.current) {
    scalesRef.current.xMin = xMin;
    scalesRef.current.xMax = xMax;
    scalesRef.current.canvasWidth = canvasWidth;
  }

  // On each pan/zoom tick, recompute xScale/xOffset from current viewStart/viewEnd
  // isInner is captured in closure — NOT stored on scalesRef (both Tracks share same ref)
  useEffect(() => {
    const updateScales = () => {
      const s = scalesRef.current;
      if (!s) return;
      const domainMin = isInner && s.viewStart !== undefined ? s.viewStart : xMin;
      const domainMax = isInner && s.viewEnd !== undefined ? s.viewEnd : xMax;
      s.xScale = canvasWidth / (domainMax - domainMin);
      s.xOffset = -domainMin * s.xScale;
    };
    app.ticker.add(updateScales);
    return () => { app.ticker.remove(updateScales); };
  }, [app, scalesRef, xMin, xMax, canvasWidth, isInner]);

  return (
    <>
      {tracks.map(({ id, height = 50, Track, yMin = 0, yMax = 100 }: Track, index: number) => {
        const yScale = height / (yMax - yMin);
        // Container is positioned at yTrackStarts[index]; DataSprite uses local track coords
        const containerY = yTrackStarts[index];
        
        return (
          <Container
            key={id}
            ref={el => (trackContainersRef.current[index] = el)}
            width={px(canvasWidth)}
            height={px(height)}
            y={containerY}
            x={0}
            scale={{ x: 1, y: 1 }}
          >
            <Track isInner={isInner} trackId={id} scalesRef={scalesRef}/>
          </Container>
        );
      })}
    </>
  );
}

interface GenTrackInnerProps {
  tracks: Track[];
  XInfo?: React.ComponentType<any>;
  XYInfo?: React.ComponentType<any>;
  xyInfoHeight?: number;
  Tooltip?: React.ComponentType;
  tooltipProps?: object;
  innerTracks?: Track[];
  InnerXInfo?: React.ComponentType<any>;
  InnerXYInfo?: React.ComponentType<any>;
  innerXYInfoHeight?: number;
  InnerTooltip?: React.ComponentType;
  innerTooltipProps?: object;
  yInfoWidth?: number;
  yInfoGap?: number;
  paddingBottom?: number;
  panZoomTopGap?: number;
  panZoomBottomGap?: number;
  overlayZoombar?: boolean;
  initialZoom?: [number | null, number | null];
  zoomLines?: boolean;
  crosshairs?: boolean;
  overlayGraphics?: React.ReactNode;
  innerOverlayGraphics?: React.ReactNode;
  underlayGraphics?: React.ReactNode;
  innerUnderlayGraphics?: React.ReactNode;
  onInnerScalesReady?: (scalesRef: React.RefObject<ScalesRef>) => void;
  _isInner?: boolean;
  _suppressTooltip?: boolean;
  _scalesRef?: React.RefObject<ScalesRef> | null;
  _innerTracksContainerRef?: React.RefObject<any>;
  _onScalesRefReady?: (ref: React.RefObject<ScalesRef>) => void;
  _onXAxisHandleReady?: (handle: XAxisHandle) => void;
}

function GenTrackInner({
  tracks,
  XInfo,
  XYInfo,
  xyInfoHeight = 32,
  Tooltip,
  tooltipProps = {},
  innerTracks,
  InnerXInfo,
  InnerXYInfo,
  innerXYInfoHeight = 32,
  InnerTooltip,
  innerTooltipProps = {},
  yInfoWidth = 160,
  yInfoGap = 16,
  paddingBottom = 16,
  panZoomTopGap = 16,
  panZoomBottomGap = 16,
  overlayZoombar = false,
  initialZoom = [null, null],
  zoomLines,
  crosshairs = true,
  overlayGraphics,
  innerOverlayGraphics,
  underlayGraphics,
  innerUnderlayGraphics,
  onInnerScalesReady,
  _isInner = false,
  _suppressTooltip = false,
  _scalesRef: parentScalesRef = null,
  _innerTracksContainerRef,
  _onScalesRefReady,
  _onXAxisHandleReady,
}: GenTrackInnerProps) {

  const ZOOM_LINE_WIDTH = 2;

  if (overlayZoombar && (!tracks || tracks.length === 0)) {
    throw new Error("GenTrack: overlayZoombar requires at least one top-level track");
  }

  const { data, xMin, xMax } = useGenTrackState();

  // Ref to ticker.update function — set by Tracks component which lives inside <Stage>
  const tickerUpdateRef = useRef<(() => void) | null>(null);

  // Each GenTrackInner always has its own scalesRef so outer/inner Stages never share xScale/xOffset
  const localScalesRef = useRef<ScalesRef>({
    xScale: 1,
    xOffset: 0,
    xMin,
    xMax,
    // Inner tracks inherit viewStart/viewEnd from parent; outer use initialZoom
    viewStart: _isInner && parentScalesRef?.current?.viewStart !== undefined
      ? parentScalesRef.current.viewStart
      : (initialZoom[0] ?? xMin),
    viewEnd: _isInner && parentScalesRef?.current?.viewEnd !== undefined
      ? parentScalesRef.current.viewEnd
      : (initialZoom[1] ?? xMax),
    yScales: new Map(),
    canvasWidth: 0,
    canvasHeight: 0,
    trackRegistry: new Map(),
  });

  const scalesRef = localScalesRef;

  // Notify parent of our scalesRef so it can push viewStart/viewEnd updates to us
  useEffect(() => {
    _onScalesRefReady?.(scalesRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // heights
  const { yTrackStarts, canvasHeight } = computeTracksLayout(tracks, paddingBottom);

  // widths — debounced so rapid resize doesn't thrash Pixi Stage recreation
  const [widthRef, { width: totalWidth }] = useMeasure();
  const [debouncedTotalWidth, setDebouncedTotalWidth] = useState(totalWidth);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTotalWidth(totalWidth), 50);
    return () => clearTimeout(id);
  }, [totalWidth]);
  const canvasWidth = (debouncedTotalWidth ?? 0) - yInfoWidth - yInfoGap;
  
  // Update scales ref when canvas size changes
  useEffect(() => {
    if (scalesRef.current) {
      scalesRef.current.canvasWidth = canvasWidth;
      scalesRef.current.canvasHeight = canvasHeight;
      scalesRef.current.tracksHeight = canvasHeight - paddingBottom;
    }
  }, [canvasWidth, canvasHeight, paddingBottom, scalesRef]);

  // refs
  const innerTracksContainerRef = useRef(null);
  const zoomLinesRef = useRef<HTMLElement | null>(null);
  const windowUnderlayRef = useRef<HTMLDivElement | null>(null);
  // Holds a reference to the inner GenTrackInner's own scalesRef so we can push viewStart/viewEnd to it
  const innerScalesRefHolder = useRef<ScalesRef | null>(null);
  // Holds a reference to the inner XAxis imperative handle for direct D3 updates
  const innerXAxisHandleRef = useRef<XAxisHandle | null>(null);
  // Hide canvas until first tick fires to avoid flash of black/default-positioned sprites
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const onTracksReady = useCallback(() => {/* canvas revealed imperatively via canvasBoxRef */}, []);

  const updateWindowUnderlay = useCallback((start: number, end: number, width: number) => {
    const u = windowUnderlayRef.current;
    if (!u || width <= 0) return;
    const left = (start - xMin) / (xMax - xMin) * width;
    const right = (end - xMin) / (xMax - xMin) * width;
    u.style.left = `${left}px`;
    u.style.width = `${right - left}px`;
  }, [xMin, xMax]);

  // Helper to imperatively update zoom line DOM positions
  const updateZoomLines = useCallback((start: number, end: number, width: number) => {
    const z = zoomLinesRef.current;
    if (!z || width <= 0) return;
    const left = (start - xMin) / (xMax - xMin) * width;
    const right = width - ((end - xMin) / (xMax - xMin) * width);
    z.style.left = `${left - ZOOM_LINE_WIDTH}px`;
    z.style.right = `${right - ZOOM_LINE_WIDTH}px`;
    z.style.borderLeftStyle = left <= 0 ? "none" : "solid";
    z.style.borderRightStyle = right <= 0 ? "none" : "solid";
  }, [xMin, xMax]);

  // Resync zoom lines and underlay whenever canvasWidth changes
  useEffect(() => {
    const inner = innerScalesRefHolder.current;
    if (inner && canvasWidth > 0) {
      updateZoomLines(inner.viewStart ?? xMin, inner.viewEnd ?? xMax, canvasWidth);
      updateWindowUnderlay(inner.viewStart ?? xMin, inner.viewEnd ?? xMax, canvasWidth);
    }
  }, [canvasWidth, xMin, xMax, updateZoomLines, updateWindowUnderlay]);

  const panZoomPanelRef = useRef<PanZoomPanelHandle | null>(null);
  // DOM node of the inner tooltip/pan-drag layer — reused as the crosshair's mousemove
  // listener target, so the crosshair can be rendered as a separate, higher z-index sibling
  // (above the legend) while still tracking the same pointer movement.
  const crosshairContainerRef = useRef<HTMLDivElement | null>(null);

  // Callback to update view window (used by PanZoomPanel) — no React state, purely imperative
  const updateViewWindow = useCallback((start: number, end: number) => {
    // Push to inner scalesRef (the zoomed canvas)
    const inner = innerScalesRefHolder.current;
    if (inner) {
      inner.viewStart = start;
      inner.viewEnd = end;
      // Recompute xScale/xOffset synchronously so children read fresh values in useTick
      inner.xScale = canvasWidth / (end - start);
      inner.xOffset = -start * inner.xScale;
      inner.tickerUpdate?.();
    }
    updateZoomLines(start, end, canvasWidth);
    updateWindowUnderlay(start, end, canvasWidth);
    innerXAxisHandleRef.current?.update(start, end);
    panZoomPanelRef.current?.updateView(start, end);
  }, [canvasWidth, updateZoomLines, updateWindowUnderlay]);


  return (
    <ScalesProvider scalesRef={scalesRef}>
      <TrackRegistryProvider>
        <GenTrackDragProvider>
        <Box
          ref={widthRef}
          sx={{ display: "flex", flexDirection: "column" }}
        >
          
          {/* XInfo - only render when canvasWidth valid since e.g. D3 axis complains if not */}
          {canvasWidth > 0 && (XInfo || XYInfo) && (
            <Box sx={{ display: "flex", columnGap: px(yInfoGap) }}>
              <Box sx={{ height: px(xyInfoHeight), width: px(yInfoWidth) }}>
                {XYInfo && <XYInfo data={data} isInner={_isInner} />}
              </Box>
              <Box sx={{ height: px(xyInfoHeight), width: px(canvasWidth) }}>
                {XInfo && (_isInner 
                  ? <NestedXInfo
                      data={data}
                      scalesRef={scalesRef}
                      isInner={_isInner}
                      XInfo={XInfo}
                      canvasWidth={canvasWidth}
                      onHandleReady={_onXAxisHandleReady}
                    />
                  : <XInfo
                      data={data}
                      start={xMin}
                      end={xMax}
                      isInner={_isInner}
                      canvasWidth={canvasWidth}
                    />
                )}
              </Box>
            </Box>
          )}

          {/* container for yInfos and Pixi canvas */}
          {tracks?.length > 0 && (
            <Box sx={{ display: "flex", columnGap: px(yInfoGap) }}>

              {/* yInfos */}
              <Box sx={{
                width: px(yInfoWidth), 
                height: px(canvasHeight),
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
              }}>
                {tracks.map(({ id, height, paddingTop, YInfo, yMin = 0, yMax = 100 }) => (
                  <Box key={id} sx={{ width: px(yInfoWidth), height: px(height), mt: px(paddingTop) }}>
                    {YInfo && <YInfo data={data} start={yMin} end={yMax} isInner={_isInner}/>}
                  </Box>
                ))}
              </Box>

              {/* Pixi canvas — hidden until first tick positions all sprites */}
              <Box ref={canvasBoxRef} sx={{ width: canvasWidth, height: canvasHeight, position: "relative", zIndex: _isInner ? 1 : undefined, visibility: "hidden" }}>
                {overlayZoombar && innerTracks && innerTracks.length > 0 && (
                  <Box
                    ref={windowUnderlayRef}
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "100%",
                      left: `${((scalesRef.current?.viewStart ?? xMin) - xMin) / (xMax - xMin) * canvasWidth}px`,
                      width: `${((scalesRef.current?.viewEnd ?? xMax) - (scalesRef.current?.viewStart ?? xMin)) / (xMax - xMin) * canvasWidth}px`,
                      backgroundColor: "#f0f5fe",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  />
                )}
                <Box sx={{ position: "relative", zIndex: 1 }}>
                <Stage
                  width={canvasWidth}
                  height={canvasHeight}
                  options={{ backgroundAlpha: 0, autoStart: false, antialias: true }}
                  onMount={app => { app.stage.eventMode = "static"; }}
                >
                  {underlayGraphics && (
                    <Container>
                      {underlayGraphics}
                    </Container>
                  )}
                  <Container ref={_isInner ? _innerTracksContainerRef : null}>
                    <Tracks
                      tracks={tracks}
                      canvasWidth={canvasWidth}
                      xMin={xMin}
                      xMax={xMax}
                      yTrackStarts={yTrackStarts}
                      isInner={_isInner}
                      scalesRef={scalesRef}
                      tickerUpdateRef={tickerUpdateRef}
                      onReady={onTracksReady}
                      canvasBoxRef={canvasBoxRef}
                    />
                  </Container>
                  {overlayGraphics && (
                    <Container>
                      {overlayGraphics}
                    </Container>
                  )}
                </Stage>
                {Tooltip && !_suppressTooltip && (
                  <TooltipLayer
                    width={canvasWidth}
                    height={canvasHeight}
                    canvasType={_isInner ? "inner" : "outer"}
                    tooltipProps={tooltipProps}
                  >
                    <Tooltip />   
                  </TooltipLayer>
                )}
                {/* When _isInner, legends are rendered by the parent instead, above the crosshair overlay */}
                {!_isInner && (
                  <TrackLegendsLayer tracks={tracks} yTrackStarts={yTrackStarts} data={data} isInner={_isInner} />
                )}
                </Box>
                
                {/* zoom lines overlay */}
                {zoomLines && innerTracks && innerTracks.length > 0 && (
                  <Box
                    ref={zoomLinesRef}
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 5,
                      borderTop: 0,
                      borderBottom: 0,
                      borderLeft: `${ZOOM_LINE_WIDTH}px`,
                      borderRight: `${ZOOM_LINE_WIDTH}px`,
                      borderStyle: "solid",
                      borderColor: "#00aaff",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* zoombar overlay — sits over top tracks, blocks pointer events to tracks beneath */}
                {overlayZoombar && innerTracks && innerTracks.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: canvasWidth,
                      height: canvasHeight,
                      zIndex: 10,
                      pointerEvents: "none",
                    }}
                  >
                    <Box sx={{ pointerEvents: "auto" }}>
                      <PanZoomPanel
                        ref={panZoomPanelRef}
                        viewStart={scalesRef.current?.viewStart ?? xMin}
                        viewEnd={scalesRef.current?.viewEnd ?? xMax}
                        onViewChange={updateViewWindow}
                        canvasWidth={canvasWidth}
                        xMin={xMin}
                        xMax={xMax}
                        height={canvasHeight}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* inner tracks */}
          {innerTracks && innerTracks.length > 0 && (
            <>   
              {!overlayZoombar && (
                <Box sx={{
                  pt: px(panZoomTopGap),
                  pb: px(panZoomBottomGap),
                  pl: px(yInfoWidth + yInfoGap),
                }}>
                  <PanZoomPanel
                    ref={panZoomPanelRef}
                    viewStart={scalesRef.current?.viewStart ?? xMin}
                    viewEnd={scalesRef.current?.viewEnd ?? xMax}
                    onViewChange={updateViewWindow}
                    canvasWidth={canvasWidth}
                    xMin={xMin}
                    xMax={xMax}
                  />
                </Box>
              )}

              <Box 
                sx={{ 
                  position: "relative",
                  pointerEvents: "none", // Allow clicks to pass through the container
                }}
              >
                <GenTrackInner
                  tracks={innerTracks}
                  yInfoGap={yInfoGap}
                  XInfo={InnerXInfo}
                  XYInfo={InnerXYInfo}
                  xyInfoHeight={innerXYInfoHeight}
                  yInfoWidth={yInfoWidth}
                  panZoomBottomGap={panZoomBottomGap}
                  Tooltip={InnerTooltip}
                  tooltipProps={innerTooltipProps}
                  overlayGraphics={innerOverlayGraphics}
                  underlayGraphics={innerUnderlayGraphics}
                  _isInner={true}
                  _scalesRef={scalesRef}
                  _innerTracksContainerRef={innerTracksContainerRef}
                  _onScalesRefReady={(ref) => { innerScalesRefHolder.current = ref.current; onInnerScalesReady?.(ref); }}
                  _onXAxisHandleReady={(handle) => { innerXAxisHandleRef.current = handle; }}
                  _suppressTooltip={!!InnerTooltip}
                />
                {/* Inner tooltip rendered here — outside the outer canvas stacking context — so it paints above the zoombar */}
                {(InnerTooltip || crosshairs) && canvasWidth > 0 && (
                  <Box sx={{
                    position: "absolute",
                    bottom: 0,
                    left: px(yInfoWidth + yInfoGap),
                    width: px(canvasWidth),
                    height: px(innerScalesRefHolder.current?.canvasHeight ?? canvasHeight),
                    zIndex: 20,
                    pointerEvents: "none",
                  }}>
                    <InnerPanDragTooltipLayer
                      ref={crosshairContainerRef}
                      width={canvasWidth}
                      height={innerScalesRefHolder.current?.canvasHeight ?? canvasHeight}
                      canvasType="inner"
                      tooltipProps={innerTooltipProps}
                      canvasWidth={canvasWidth}
                      xMin={xMin}
                      xMax={xMax}
                      scalesRefHolder={innerScalesRefHolder}
                      updateViewWindow={updateViewWindow}
                      crosshairs={crosshairs}
                    >
                      {InnerTooltip ? <InnerTooltip /> : null}
                    </InnerPanDragTooltipLayer>
                  </Box>
                )}
                {/* Inner legends rendered here — above the crosshair/tooltip layer (zIndex 20) so they're never hidden behind it.
                    Anchored via bottom (like the inner tooltip box above) so its top lands at the true canvas top,
                    regardless of the recursed GenTrackInner's own InnerXInfo row height. */}
                {innerTracks.some(track => track.Legend) && canvasWidth > 0 && (
                  <Box sx={{
                    position: "absolute",
                    bottom: 0,
                    left: px(yInfoWidth + yInfoGap),
                    width: px(canvasWidth),
                    height: px(innerScalesRefHolder.current?.canvasHeight ?? canvasHeight),
                    zIndex: 22,
                    pointerEvents: "none",
                  }}>
                    <TrackLegendsLayer
                      tracks={innerTracks}
                      yTrackStarts={computeTracksLayout(innerTracks, 16).yTrackStarts}
                      data={data}
                      isInner={true}
                      zIndex={0}
                    />
                  </Box>
                )}
                {/* Crosshair rendered above the legend (zIndex 24) — listens for pointer movement on the
                    same DOM node as the tooltip/pan-drag layer (crosshairContainerRef) but paints on top
                    of the legend so it's visible even while the cursor is over it. */}
                {crosshairs && canvasWidth > 0 && (
                  <Box sx={{
                    position: "absolute",
                    bottom: 0,
                    left: px(yInfoWidth + yInfoGap),
                    width: px(canvasWidth),
                    height: px(innerScalesRefHolder.current?.canvasHeight ?? canvasHeight),
                    zIndex: 24,
                    pointerEvents: "none",
                  }}>
                    <CrosshairOverlay
                      width={canvasWidth}
                      height={innerScalesRefHolder.current?.canvasHeight ?? canvasHeight}
                      containerRef={crosshairContainerRef}
                    />
                  </Box>
                )}
              </Box>
            </>
          )}

        </Box>
        </GenTrackDragProvider>
      </TrackRegistryProvider>
    </ScalesProvider>
  );
}

// Wrapper component that provides the outermost providers
function GenTrack(props: Omit<GenTrackInnerProps, '_scalesRef' | '_isInner' | '_innerTracksContainerRef'>) {
  const localScalesRef = useRef<ScalesRef>({
    xScale: 1,
    xOffset: 0,
    xMin: 0,
    xMax: 100,
    yScales: new Map(),
    trackRegistry: new Map(),
    canvasWidth: 0,
    canvasHeight: 0,
  });

  return (
    <ScalesProvider scalesRef={localScalesRef}>
      <TrackRegistryProvider>
        <GenTrackInner {...props} _scalesRef={localScalesRef} />
      </TrackRegistryProvider>
    </ScalesProvider>
  );
}

export default GenTrack;

import { Box } from "@mui/material";
import { Stage, Container, useApp } from '@pixi/react';
import { useMeasure } from "@uidotdev/usehooks";
import { useRef, useEffect, memo, useCallback, useState } from "react";
import PanZoomPanel from "./PanZoomPanel";
import NestedXInfo from "./NestedXInfo";
import type { XAxisHandle } from "../GeneVis/XAxis";
import { useGenTrackState } from "../../providers/GenTrackProvider";
import GenTrackTooltip from "./GenTrackTooltip";
import { useGenTrackTooltipDispatch, useGenTrackTooltipState } from "../../providers/GenTrackTooltipProvider";
import { ScalesProvider, type ScalesRef } from "./ScalesContext";
import { TrackRegistryProvider, type TrackTransform } from "./TrackRegistry";

function px(num) {
  return `${num}px`;
}

interface TooltipLayerProps {
  children: React.ReactNode;
  width: number;
  height: number;
  canvasType: string;
  tooltipProps: object;
}

const TooltipLayer = memo(function TooltipLayer({ children, width, height, canvasType, tooltipProps }: TooltipLayerProps) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value?: any }) => void;
  const genTrackTooltipState = useGenTrackTooltipState() as any;
  const { onDatumClick } = (tooltipProps as Record<string, any>);

  const handleMouseEnter = () => {
    genTrackTooltipDispatch({ type: "setActiveCanvas", value: canvasType });
  };
  
  const handleMouseLeave = () => {
    genTrackTooltipDispatch({ type: "setActiveCanvas", value: null });
  };

  const handleClick = () => {
    const hover = genTrackTooltipState?.hover;
    if (canvasType === "inner" && hover?.datum && onDatumClick) {
      onDatumClick(hover.datum);
    }
  };

  if (!children) return null;
  
  return (
    <Box 
      sx={{ 
        position: "absolute", 
        inset: 0, 
        pointerEvents: "auto",
        cursor: canvasType === "inner" && genTrackTooltipState?.hover?.datum && onDatumClick ? "pointer" : "default",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <GenTrackTooltip width={width} height={height} canvasType={canvasType} {...tooltipProps}>
        {children}
      </GenTrackTooltip>
    </Box>
  );
});

interface TrackProps {
  isInner: boolean;
  trackId: string;
  scalesRef: React.RefObject<ScalesRef>;
}

interface Track {
  id: string;
  height?: number;
  yMin?: number;
  yMax?: number;
  Track: React.ComponentType<TrackProps>;
  YInfo?: React.ComponentType<{ data: any; start: number; end: number; isInner: boolean }>;
  onTick?: (container: any) => void;
  paddingTop?: number;
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
  overlayGraphics?: React.ReactNode;
  innerOverlayGraphics?: React.ReactNode;
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
  overlayGraphics,
  innerOverlayGraphics,
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
  const yTrackStarts = [];
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
  }, [canvasWidth, updateZoomLines, updateWindowUnderlay]);


  return (
    <ScalesProvider scalesRef={scalesRef}>
      <TrackRegistryProvider>
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
              <Box ref={canvasBoxRef} sx={{ width: canvasWidth, height: canvasHeight, position: "relative", visibility: "hidden" }}>
                {overlayZoombar && innerTracks && innerTracks.length > 0 && (
                  <Box
                    ref={windowUnderlayRef}
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "100%",
                      left: `${((scalesRef.current?.viewStart ?? xMin) - xMin) / (xMax - xMin) * canvasWidth}px`,
                      width: `${((scalesRef.current?.viewEnd ?? xMax) - (scalesRef.current?.viewStart ?? xMin)) / (xMax - xMin) * canvasWidth}px`,
                      backgroundColor: "#e8f0fe",
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
                  _isInner={true}
                  _scalesRef={scalesRef}
                  _innerTracksContainerRef={innerTracksContainerRef}
                  _onScalesRefReady={(ref) => { innerScalesRefHolder.current = ref.current; onInnerScalesReady?.(ref); }}
                  _onXAxisHandleReady={(handle) => { innerXAxisHandleRef.current = handle; }}
                  _suppressTooltip={!!InnerTooltip}
                />
                {/* Inner tooltip rendered here — outside the outer canvas stacking context — so it paints above the zoombar */}
                {InnerTooltip && canvasWidth > 0 && (
                  <Box sx={{
                    position: "absolute",
                    top: 0,
                    left: px(yInfoWidth + yInfoGap),
                    width: px(canvasWidth),
                    height: "100%",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}>
                    <TooltipLayer
                      width={canvasWidth}
                      height={innerScalesRefHolder.current?.canvasHeight ?? canvasHeight}
                      canvasType="inner"
                      tooltipProps={innerTooltipProps}
                    >
                      <InnerTooltip />
                    </TooltipLayer>
                  </Box>
                )}
              </Box>
            </>
          )}

        </Box>
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
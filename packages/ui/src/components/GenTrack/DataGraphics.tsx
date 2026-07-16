import { useRef } from 'react';
import { Graphics, useTick } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';

interface DataRectProps {
  scalesRef: RefObject<ScalesRef>;
  trackId?: string;
  x: number;
  y?: number;
  width: number;
  height: number;
  color?: number;
  alpha?: number;
}

/**
 * A filled rectangle whose position and size are computed imperatively on each
 * ticker update from data-space coordinates, exactly like DataSprite.
 * Required when ticker.stop() is used — Graphics draw callbacks run at React
 * render time and would otherwise use stale xScale/xOffset.
 */
export function DataRect({
  scalesRef,
  trackId,
  x: dataX,
  y: dataY = 0,
  width: dataWidth,
  height: dataHeight,
  color = 0xffffff,
  alpha = 1,
}: DataRectProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    const screenX = dataX * scales.xScale + scales.xOffset;
    const screenW = dataWidth * scales.xScale;

    const yScaleInfo = trackId ? scales.yScales.get(trackId) : undefined;
    const screenY = yScaleInfo
      ? dataY * yScaleInfo.yScale + yScaleInfo.yOffset
      : dataY;
    const screenH = dataHeight * (yScaleInfo?.yScale ?? 1);

    // Cull if outside canvas bounds
    if (screenX + screenW < 0 || screenX > scales.canvasWidth) {
      g.clear();
      return;
    }

    g.clear();
    g.beginFill(color, alpha);
    g.drawRect(screenX, screenY, screenW, screenH);
    g.endFill();
  });

  return <Graphics ref={gRef} />;
}

interface DataBackgroundProps {
  scalesRef: RefObject<ScalesRef>;
  trackId?: string;
  color?: number | string;
  alpha?: number;
}

/**
 * A full-width filled rectangle. When trackId is provided covers just that track's
 * height; when omitted covers the full canvas height.
 */
export function DataBackground({
  scalesRef,
  trackId,
  color = 0xf5f5f5,
  alpha = 1,
}: DataBackgroundProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    let screenY: number;
    let screenH: number;
    if (trackId) {
      const yScaleInfo = scales.yScales.get(trackId);
      if (!yScaleInfo) return;
      screenY = yScaleInfo.yOffset;
      screenH = yScaleInfo.height;
    } else {
      screenY = 0;
      screenH = scales.canvasHeight;
    }

    g.clear();
    g.beginFill(color, alpha);
    g.drawRect(0, screenY, scales.canvasWidth, screenH);
    g.endFill();
  });

  return <Graphics ref={gRef} />;
}

interface DataWindowFillProps {
  scalesRef: RefObject<ScalesRef>;
  trackId: string;
  color?: number | string;
  alpha?: number;
}

/**
 * Fills the zoombox region (viewStart → viewEnd) for the given track height.
 * Reads viewStart/viewEnd from scalesRef so it stays in sync with pan/zoom.
 */
export function DataWindowFill({
  scalesRef,
  trackId,
  color = 0xe8f0fe,
  alpha = 1,
}: DataWindowFillProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    const yScaleInfo = scales.yScales.get(trackId);
    if (!yScaleInfo) return;

    const viewStart = scales.viewStart ?? scales.xMin;
    const viewEnd = scales.viewEnd ?? scales.xMax;
    const screenX1 = Math.max(0, viewStart * scales.xScale + scales.xOffset);
    const screenX2 = Math.min(scales.canvasWidth, viewEnd * scales.xScale + scales.xOffset);

    g.clear();
    if (screenX2 <= screenX1) return;
    g.beginFill(color, alpha);
    g.drawRect(screenX1, yScaleInfo.yOffset, screenX2 - screenX1, yScaleInfo.height);
    g.endFill();
  });

  return <Graphics ref={gRef} />;
}

interface DataVLineProps {
  scalesRef: RefObject<ScalesRef>;
  trackId?: string;
  x: number;
  color?: number;
  alpha?: number;
  lineWidth?: number;
}

/**
 * A full-canvas-height vertical line at a given data-space x value.
 * Draws in canvas-absolute y coordinates (spanning all tracks) by compensating
 * for the track Container's y offset. Redraws imperatively on each tick.
 */
export function DataVLine({
  scalesRef,
  trackId = '',
  x: dataX,
  color = 0x000000,
  alpha = 0.4,
  lineWidth = 1,
}: DataVLineProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    const screenX = dataX * scales.xScale + scales.xOffset;

    // Cull if outside canvas bounds
    if (screenX < 0 || screenX > scales.canvasWidth) {
      g.clear();
      return;
    }

    // The Container this Graphics lives in is positioned at containerY in canvas space.
    // To draw from canvas top to bottom we subtract that offset.
    const yScaleInfo = scales.yScales.get(trackId);
    const containerY = yScaleInfo ? yScaleInfo.containerY : 0;

    const bottomY = (scales.tracksHeight ?? scales.canvasHeight) - containerY;

    g.clear();
    g.lineStyle(lineWidth, color, alpha);
    g.moveTo(screenX, -containerY);
    g.lineTo(screenX, bottomY);
  });

  return <Graphics ref={gRef} />;
}

interface DataHLineProps {
  scalesRef: RefObject<ScalesRef>;
  trackId?: string;
  y: number;
  color?: number;
  alpha?: number;
  strokePixels?: number;
}

/**
 * A full-width horizontal line at a given data-space y value.
 * Redraws imperatively on each tick so it stays correct during pan/zoom.
 */
export function DataHLine({
  scalesRef,
  trackId,
  y: dataY,
  color = 0x000000,
  alpha = 1,
  strokePixels = 1,
}: DataHLineProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    const yScaleInfo = trackId ? scales.yScales.get(trackId) : undefined;
    const screenY = yScaleInfo
      ? dataY * yScaleInfo.yScale + yScaleInfo.yOffset
      : dataY;

    g.clear();
    g.lineStyle(strokePixels, color, alpha);
    g.moveTo(0, screenY);
    g.lineTo(scales.canvasWidth, screenY);
  });

  return <Graphics ref={gRef} />;
}

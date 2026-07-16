import { useRef, useCallback, useLayoutEffect } from 'react';
import { useGenTrackTooltipState } from '../../providers/GenTrackTooltipProvider';
import { Sprite, useTick, useApp } from '@pixi/react';
import { Sprite as PixiSprite, Graphics as PixiGraphics, Texture } from 'pixi.js';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';
import { getHoverBoxColor } from '../GeneVis/helpers';

const _rectTextureCache = new Map<any, Texture>();

function getOrCreateRectTexture(app: any): Texture {
  if (!_rectTextureCache.has(app)) {
    const g = new PixiGraphics();
    g.beginFill(0xffffff);
    g.drawRect(0, 0, 1, 1);
    g.endFill();
    _rectTextureCache.set(app, app.renderer.generateTexture(g));
    g.destroy(true);
  }
  return _rectTextureCache.get(app)!;
}

interface DataGeneBoxProps {
  scalesRef: RefObject<ScalesRef>;
  trackId?: string;
  intronStart: number;      // gene start in genomic coords
  intronEnd: number;        // gene end in genomic coords
  labelWidthPixels: number; // label width in screen pixels (constant)
  labelCenter: number;      // label center x in genomic coords
  y: number;                // box top y in data coords
  height: number;           // box height in data coords
  biotype: string;          // gene biotype for hover color
  isL2G?: boolean;
  pointerover?: (e: any) => void;
  pointerout?: (e: any) => void;
  pointertap?: (e: any) => void;
}

const PADDING_PIXELS = 4; // constant screen-space padding around gene+label

export function DataGeneBox({
  scalesRef,
  trackId,
  intronStart,
  intronEnd,
  labelWidthPixels,
  labelCenter,
  y,
  height,
  biotype,
  isL2G = false,
  pointerover,
  pointerout,
  pointertap,
}: DataGeneBoxProps) {
  const app = useApp();
  const spriteRef = useRef<PixiSprite | null>(null);
  const texture = getOrCreateRectTexture(app);

  // Get pale hover color from centralized palette
  const hoverTint = getHoverBoxColor(biotype, isL2G);

  const tooltipState = useGenTrackTooltipState() as any;
  const isMyGeneSticky = tooltipState?.stickyLabelCenter !== null &&
    tooltipState?.stickyLabelCenter !== undefined &&
    tooltipState?.stickyLabelCenter === labelCenter;

  // Ref written every render so event handlers always read the current value (no stale closures)
  const isMyGeneStickyRef = useRef(false);
  isMyGeneStickyRef.current = isMyGeneSticky;

  const handlePointerOver = useCallback((e: any) => {
    const sprite = spriteRef.current;
    if (sprite) {
      sprite.tint = hoverTint;
      sprite.alpha = 1.0;
      app.render();
    }
    pointerover?.(e);
  }, [pointerover, app, hoverTint]);

  const handlePointerOut = useCallback((e: any) => {
    const sprite = spriteRef.current;
    if (sprite && !isMyGeneStickyRef.current) {
      sprite.tint = hoverTint;
      sprite.alpha = 0;
      app.render();
    }
    pointerout?.(e);
  }, [pointerout, app, hoverTint]);

  // Safety-net: sync sprite alpha when isMyGeneSticky transitions
  // (covers the narrow race where pointerout fired before the first post-click render)
  useLayoutEffect(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    sprite.alpha = isMyGeneSticky ? 1.0 : 0;
    app.render();
  }, [isMyGeneSticky, app]);

  // Imperative update on every tick - recalculates bounds based on current zoom
  useTick(() => {
    const sprite = spriteRef.current;
    const scales = scalesRef.current;
    if (!sprite || !scales) return;

    const xScale = scales.xScale;
    const yScaleInfo = trackId ? scales.yScales.get(trackId) : undefined;

    // Convert label width from pixels to genomic coords using CURRENT xScale
    const labelWidthGenomic = labelWidthPixels / xScale;
    const paddingGenomic = PADDING_PIXELS / xScale;

    // Compute box bounds in genomic coords (dynamic based on zoom)
    const labelLeft = labelCenter - labelWidthGenomic / 2;
    const labelRight = labelCenter + labelWidthGenomic / 2;

    const boxX = Math.min(intronStart, labelLeft) - paddingGenomic;
    const boxRight = Math.max(intronEnd, labelRight) + paddingGenomic;
    const boxWidth = boxRight - boxX;

    // Convert to screen coords
    const screenX = boxX * xScale + scales.xOffset;
    const screenY = yScaleInfo
      ? y * yScaleInfo.yScale + yScaleInfo.yOffset
      : y;
    const screenWidth = boxWidth * xScale;
    const screenHeight = height * (yScaleInfo?.yScale ?? 1);

    // Update sprite position and size (preserve alpha - managed by event handlers)
    sprite.x = screenX;
    sprite.y = screenY;
    sprite.width = Math.max(screenWidth, 1);
    sprite.height = Math.max(screenHeight, 1);
    sprite.visible = screenX + screenWidth > 0 && screenX < scales.canvasWidth;
  });

  const scales = scalesRef.current;
  const initialX = scales ? intronStart * scales.xScale + scales.xOffset : 0;
  const yScaleInfo = trackId && scales ? scales.yScales.get(trackId) : undefined;
  const initialY = yScaleInfo ? y * yScaleInfo.yScale + yScaleInfo.yOffset : y;

  return (
    <Sprite
      ref={spriteRef}
      texture={texture}
      x={initialX}
      y={initialY}
      width={100}
      height={height}
      tint={hoverTint}
      alpha={0}
      eventMode="static"
      pointerover={handlePointerOver}
      pointerout={handlePointerOut}
      pointertap={pointertap}
    />
  );
}

import { useRef, useCallback } from 'react';
import { Sprite, useTick, useApp } from '@pixi/react';
import { Sprite as PixiSprite, Graphics as PixiGraphics, Texture } from 'pixi.js';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';
import { isPointerOverCanvas } from './pointerOcclusion';
import { useStickyTick } from './useStickyTick';

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
  hoverBoxColor?: number;    // color for the hover highlight box
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
  hoverBoxColor,
  pointerover,
  pointerout,
  pointertap,
}: DataGeneBoxProps) {
  const app = useApp();
  const spriteRef = useRef<PixiSprite | null>(null);
  const texture = getOrCreateRectTexture(app);

  // Color for the hover highlight box
  const hoverTint = hoverBoxColor ?? 0xcccccc;

  // Sticky (click-locked) check reads scalesRef.current.stickyLabelCenter — NOT via
  // useGenTrackTooltipState() — because @pixi/react's <Stage> renders its children
  // (including this component) through a separate React reconciler root that does not
  // bridge useContext reads made from inside it (props/closures/refs cross fine, context
  // reads do not). See ScalesContext.tsx / useStickyTick.ts / GenTrack/README.md.
  //
  // This intentionally does not use React state/context to drive the alpha update: an
  // earlier attempt read tooltip state in getGenesTracks.tsx (where context reads do
  // work) and passed the result down as a prop, but that made getGenesTracks()/
  // GeneVisInner re-render on every hover (not just sticky transitions), which — because
  // getGenesTracks() creates a fresh `Track` component function on every call — caused
  // full remounts of the Pixi track subtree on every hover, visible as flicker across the
  // whole visualization. useStickyTick avoids re-rendering the outer tree entirely.
  const isMyGeneStickyRef = useStickyTick(
    scalesRef,
    scales => scales.stickyLabelCenter === labelCenter,
    isStuck => {
      const sprite = spriteRef.current;
      if (sprite) {
        sprite.alpha = isStuck ? 1.0 : 0;
        app.render();
      }
    },
  );

  const handlePointerOver = useCallback((e: any) => {
    if (!isPointerOverCanvas(e)) return;
    // Suppress the hover highlight reveal when a *different* gene/variant is currently
    // stuck — hovering elsewhere while something is pinned shouldn't visually highlight a
    // box whose tooltip won't actually show (tooltip content stays frozen on the stuck
    // datum while sticky). The pointer cursor already signals it's still clickable, and
    // `pointerover` below still fires so click-to-switch continues to work.
    const scales = scalesRef.current;
    const somethingElseStuck = scales != null
      && (scales.stickyLabelCenter != null || scales.stickyDatumId != null)
      && scales.stickyLabelCenter !== labelCenter;
    if (!somethingElseStuck) {
      const sprite = spriteRef.current;
      if (sprite) {
        sprite.tint = hoverTint;
        sprite.alpha = 1.0;
        app.render();
      }
    }
    pointerover?.(e);
  }, [pointerover, app, hoverTint, scalesRef, labelCenter]);

  const handlePointerTap = useCallback((e: any) => {
    if (!isPointerOverCanvas(e)) return;
    pointertap?.(e);
  }, [pointertap, app]);

  const handlePointerOut = useCallback((e: any) => {
    const sprite = spriteRef.current;
    // Check fresh rather than relying on isMyGeneStickyRef (only updated on tick) so a
    // pointerout that happens between ticks still sees the current sticky state.
    const isStuck = scalesRef.current?.stickyLabelCenter === labelCenter;
    isMyGeneStickyRef.current = isStuck;
    if (sprite && !isStuck) {
      sprite.tint = hoverTint;
      sprite.alpha = 0;
      app.render();
    }
    pointerout?.(e);
  }, [pointerout, app, hoverTint, scalesRef, labelCenter, isMyGeneStickyRef]);

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
      pointertap={handlePointerTap}
    />
  );
}

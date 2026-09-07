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
  stickyBorderColor?: number; // color for the sticky highlight border
  pointerover?: (e: any) => void;
  pointerout?: (e: any) => void;
  pointertap?: (e: any) => void;
}

const PADDING_PIXELS = 4; // constant screen-space padding around gene+label
const STICKY_BORDER_TINT = 0x424242;
const STICKY_BORDER_PIXELS = 1;

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
  stickyBorderColor,
  pointerover,
  pointerout,
  pointertap,
}: DataGeneBoxProps) {
  const app = useApp();
  const spriteRef = useRef<PixiSprite | null>(null);
  const borderRefs = useRef<Array<PixiSprite | null>>([]);
  const texture = getOrCreateRectTexture(app);

  // Color for the hover highlight box
  const hoverTint = hoverBoxColor ?? 0xcccccc;
  const stickyBorderTint = stickyBorderColor ?? STICKY_BORDER_TINT;
  const setBorderAlpha = useCallback((alpha: number) => {
    for (const border of borderRefs.current) {
      if (border) border.alpha = alpha;
    }
  }, []);

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
        sprite.tint = hoverTint;
        sprite.alpha = isStuck ? 1.0 : 0;
        setBorderAlpha(isStuck ? 1.0 : 0);
        app.render();
      }
    },
  );

  const handlePointerOver = useCallback((e: any) => {
    if (!isPointerOverCanvas(e)) return;
    const scales = scalesRef.current;
    const sprite = spriteRef.current;
    if (sprite) {
      sprite.tint = hoverTint;
      sprite.alpha = 1.0;
      setBorderAlpha(scales?.stickyLabelCenter === labelCenter ? 1.0 : 0);
      app.render();
    }
    pointerover?.(e);
  }, [pointerover, app, hoverTint, scalesRef, labelCenter, setBorderAlpha]);

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
      setBorderAlpha(0);
      app.render();
    }
    pointerout?.(e);
  }, [pointerout, app, hoverTint, scalesRef, labelCenter, isMyGeneStickyRef, setBorderAlpha]);

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

    // Update the fill and fixed-pixel border position and size (alpha is event-managed).
    const renderedWidth = Math.max(screenWidth, 1);
    const renderedHeight = Math.max(screenHeight, 1);
    const isVisible = screenX + screenWidth > 0 && screenX < scales.canvasWidth;
    sprite.x = screenX;
    sprite.y = screenY;
    sprite.width = renderedWidth;
    sprite.height = renderedHeight;
    sprite.visible = isVisible;

    const horizontalThickness = Math.min(STICKY_BORDER_PIXELS, renderedHeight);
    const verticalThickness = Math.min(STICKY_BORDER_PIXELS, renderedWidth);
    const [top, right, bottom, left] = borderRefs.current;
    if (top) {
      top.x = screenX;
      top.y = screenY;
      top.width = renderedWidth;
      top.height = horizontalThickness;
      top.visible = isVisible;
    }
    if (right) {
      right.x = screenX + renderedWidth - verticalThickness;
      right.y = screenY;
      right.width = verticalThickness;
      right.height = renderedHeight;
      right.visible = isVisible;
    }
    if (bottom) {
      bottom.x = screenX;
      bottom.y = screenY + renderedHeight - horizontalThickness;
      bottom.width = renderedWidth;
      bottom.height = horizontalThickness;
      bottom.visible = isVisible;
    }
    if (left) {
      left.x = screenX;
      left.y = screenY;
      left.width = verticalThickness;
      left.height = renderedHeight;
      left.visible = isVisible;
    }
  });

  const scales = scalesRef.current;
  const initialX = scales ? intronStart * scales.xScale + scales.xOffset : 0;
  const yScaleInfo = trackId && scales ? scales.yScales.get(trackId) : undefined;
  const initialY = yScaleInfo ? y * yScaleInfo.yScale + yScaleInfo.yOffset : y;

  return (
    <>
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
      {[0, 1, 2, 3].map(index => (
        <Sprite
          key={index}
          ref={border => { borderRefs.current[index] = border; }}
          texture={texture}
          tint={stickyBorderTint}
          alpha={0}
          eventMode="none"
        />
      ))}
    </>
  );
}

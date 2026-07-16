import { useRef, useState } from 'react';
import { Sprite, useTick, useApp } from '@pixi/react';
import { Sprite as PixiSprite, Graphics as PixiGraphics, Application as PixiApplication, Texture } from 'pixi.js';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';

const _rectTextureCache = new WeakMap<PixiApplication, Texture>();

function getOrCreateRectTexture(app: PixiApplication): Texture {
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

const CIRCLE_TEX_SIZE = 64;

const _circleTextureCache = new WeakMap<PixiApplication, Texture>();

function getOrCreateCircleTexture(app: PixiApplication): Texture {
  if (!_circleTextureCache.has(app)) {
    const r = CIRCLE_TEX_SIZE / 2;
    const g = new PixiGraphics();
    g.beginFill(0xffffff);
    g.drawCircle(r, r, r);
    g.endFill();
    _circleTextureCache.set(app, app.renderer.generateTexture(g));
    g.destroy(true);
  }
  return _circleTextureCache.get(app)!;
}

const RING_DEFAULT_STROKE_PIXELS = 2;

const _ringTextureCache = new WeakMap<PixiApplication, Map<string, Texture>>();

function getOrCreateRingTexture(app: PixiApplication, strokePixels: number, radiusPixels: number): Texture {
  let map = _ringTextureCache.get(app);
  if (!map) { map = new Map(); _ringTextureCache.set(app, map); }
  const key = `${strokePixels}:${radiusPixels}`;
  if (!map.has(key)) {
    const dpr = window.devicePixelRatio || 1;
    const displayDiameter = radiusPixels * 2;
    const size = Math.ceil(displayDiameter * dpr);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const sw = strokePixels * dpr;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = sw;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - sw / 2, 0, Math.PI * 2);
    ctx.stroke();
    map.set(key, Texture.from(canvas));
  }
  return map.get(key)!;
}

interface DataSpriteProps {
  // — common (all shapes) —
  scalesRef: RefObject<ScalesRef>;
  x: number;
  y?: number;
  trackId?: string;
  texture?: any;
  shape?: 'rect' | 'circle' | 'ring';
  tint?: number | string;
  alpha?: number;
  anchor?: [number, number]; // default [0,0] for rect, [0.5,0.5] for circle/ring
  eventMode?: 'static' | 'dynamic' | 'none';
  pointerover?: (e: any) => void;
  pointerout?: (e: any) => void;
  pointerdown?: (e: any) => void;
  // — rect only —
  width?: number;
  height?: number;
  minPixelWidth?: number;
  minPixelHeight?: number;
  snapWidth?: boolean;
  snapHeight?: boolean;
  // — circle / ring only —
  radius?: number;        // data-space radius (scales with xScale)
  radiusPixels?: number;  // fixed pixel radius (overrides radius)
  // — ring only —
  strokePixels?: number;
}

export function DataSprite({
  scalesRef,
  x: dataX,
  y: dataY = 0,
  width: dataWidth,
  height: dataHeight,
  minPixelWidth = 0,
  minPixelHeight = 0,
  snapWidth = false,
  snapHeight = false,
  trackId,
  texture,
  shape = 'rect',
  radius,
  radiusPixels,
  strokePixels = RING_DEFAULT_STROKE_PIXELS,
  anchor: anchorProp,
  ...spriteProps
}: DataSpriteProps) {
  const app = useApp();
  const isCircular = shape === 'circle' || shape === 'ring';

  const resolvedTexture = texture ?? (
    shape === 'circle' ? getOrCreateCircleTexture(app)
    : shape === 'ring' ? getOrCreateRingTexture(app, strokePixels, radiusPixels ?? 8)
    : getOrCreateRectTexture(app)
  );

  const spriteRef = useRef<PixiSprite | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const resolvedAnchor = anchorProp ?? (isCircular ? [0.5, 0.5] : undefined);

  // Compute initial screen position (will be updated by useTick)
  const scales = scalesRef.current;
  const initialScreenX = scales ? dataX * scales.xScale + scales.xOffset : 0;
  const yScaleInfo = trackId && scales ? scales.yScales.get(trackId) : undefined;
  const initialScreenY = yScaleInfo
    ? dataY * yScaleInfo.yScale + yScaleInfo.yOffset
    : 0;

  // Update position imperatively every tick — reads latest scalesRef without React re-render
  useTick(() => {
    const sprite = spriteRef.current;
    const scales = scalesRef.current;
    if (!sprite || !scales) return;

    const screenX = dataX * scales.xScale + scales.xOffset;
    const yScaleInfo = trackId ? scales.yScales.get(trackId) : undefined;
    const screenY = yScaleInfo
      ? dataY * yScaleInfo.yScale + yScaleInfo.yOffset
      : dataY;

    if (isCircular) {
      const screenDiameter = radiusPixels !== undefined
        ? radiusPixels * 2
        : (radius ?? 0) * 2 * scales.xScale;

      sprite.width = screenDiameter;
      sprite.height = screenDiameter;
      sprite.visible = screenX + screenDiameter > 0 && screenX < scales.canvasWidth;
    } else {
      let screenWidth = dataWidth !== undefined ? dataWidth * scales.xScale : sprite.texture.width;
      let screenHeight = dataHeight !== undefined
        ? dataHeight * (yScaleInfo?.yScale ?? 1)
        : sprite.texture.height;

      if (minPixelWidth > 0) screenWidth = Math.max(screenWidth, minPixelWidth);
      if (minPixelHeight > 0) screenHeight = Math.max(screenHeight, minPixelHeight);

      const finalW = snapWidth ? Math.max(1, Math.round(screenWidth)) : screenWidth;
      const finalH = snapHeight ? Math.max(1, Math.round(screenHeight)) : screenHeight;

      sprite.visible = screenX + finalW > 0 && screenX < scales.canvasWidth;
      sprite.width = finalW;
      sprite.height = finalH;
    }

    sprite.x = screenX;
    sprite.y = screenY;
    
    // After first positioning with eventMode, trigger re-render to make sprite visible
    if (!isPositioned && scales && spriteProps.eventMode) {
      setIsPositioned(true);
    }
  });

  return (
    <Sprite
      ref={spriteRef}
      texture={resolvedTexture}
      x={initialScreenX}
      y={initialScreenY}
      visible={isPositioned}
      {...spriteProps}
      {...(resolvedAnchor !== undefined && { anchor: resolvedAnchor })}
    />
  );
}

import { useRef } from 'react';
import { Sprite, Text, useTick, useApp } from '@pixi/react';
import { Text as PixiText, TextStyle, Sprite as PixiSprite, Graphics as PixiGraphics, Texture } from 'pixi.js';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';

const _bgTextureCache = new WeakMap<any, Texture>();

function getOrCreateBgTexture(app: any): Texture {
  if (!_bgTextureCache.has(app)) {
    const g = new PixiGraphics();
    g.beginFill(0xffffff);
    g.drawRect(0, 0, 1, 1);
    g.endFill();
    _bgTextureCache.set(app, app.renderer.generateTexture(g));
    g.destroy(true);
  }
  return _bgTextureCache.get(app)!;
}

interface DataTextProps {
  scalesRef: RefObject<ScalesRef>;
  x: number;
  y?: number;
  text: string;
  trackId?: string;
  style?: TextStyle;
  anchor?: [number, number];
  alpha?: number;
  rotation?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  backgroundPaddingX?: number;
  backgroundPaddingY?: number;
}

export function DataText({ 
  scalesRef,
  x: dataX,
  y: dataY = 0,
  trackId,
  text,
  style,
  anchor,
  alpha = 1,
  rotation = 0,
  backgroundColor,
  backgroundAlpha = 1,
  backgroundPaddingX = 0,
  backgroundPaddingY = 0,
}: DataTextProps) {
  const app = useApp();
  const textRef = useRef<PixiText | null>(null);
  const bgRef = useRef<PixiSprite | null>(null);
  const hasBg = backgroundColor !== undefined;
  const bgTexture = hasBg ? getOrCreateBgTexture(app) : undefined;

  useTick(() => {
    const t = textRef.current;
    const scales = scalesRef.current;
    if (!t || !scales) return;

    const screenX = dataX * scales.xScale + scales.xOffset;
    const yScaleInfo = trackId ? scales.yScales.get(trackId) : undefined;
    const screenY = yScaleInfo
      ? dataY * yScaleInfo.yScale + yScaleInfo.yOffset
      : dataY;

    // Cull if outside canvas bounds
    const isVisible = screenX + t.width > 0 && screenX < scales.canvasWidth;
    t.visible = isVisible;
    t.x = screenX;
    t.y = screenY;

    // Size and position background sprite to match text bounds
    const bg = bgRef.current;
    if (bg && hasBg) {
      bg.visible = isVisible;
      const anchorX = anchor?.[0] ?? 0;
      const anchorY = anchor?.[1] ?? 0;
      bg.x = screenX - anchorX * t.width - backgroundPaddingX;
      bg.y = screenY - anchorY * t.height - backgroundPaddingY;
      bg.width = t.width + backgroundPaddingX * 2;
      bg.height = t.height + backgroundPaddingY * 2;
    }
  });

  if (hasBg) {
    return (
      <>
        <Sprite
          ref={bgRef}
          texture={bgTexture!}
          tint={backgroundColor}
          alpha={backgroundAlpha}
          visible={false}
        />
        <Text
          ref={textRef}
          text={text}
          style={style}
          anchor={anchor}
          alpha={alpha}
          rotation={rotation}
        />
      </>
    );
  }

  return (
    <Text
      ref={textRef}
      text={text}
      style={style}
      anchor={anchor}
      alpha={alpha}
      rotation={rotation}
    />
  );
}

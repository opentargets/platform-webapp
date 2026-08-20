import { useApp } from '@pixi/react';
import { useMemo, useCallback, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { Graphics } from '@pixi/react';


// create normal graphics rectangle
export function Rectangle(props) {
  const draw = useCallback(
    (g) => {
      g.clear();
      g.beginFill(props.color, props.alpha ?? 1);
      g.drawRect(props.x, props.y, props.width, props.height);
      g.endFill();
    },
    [props],
  );

  return <Graphics draw={draw} />;  // make all interactive for now !!!
}

// reusable rectangle texture
export function useRectangleTexture(
  width = 64,
  height = 64
): PIXI.Texture {
  const app = useApp();

  const texture = useMemo(() => {
    const g = new PIXI.Graphics();

    g.beginFill(0xffffff);
    g.drawRect(0, 0, width, height);
    g.endFill();

    const tex = app.renderer.generateTexture(g);

    g.destroy(true);

    return tex;
  }, [app, width, height]);

  // optional but safe cleanup if texture changes
  useEffect(() => {
    return () => {
      texture.destroy(true);
    };
  }, [texture]);

  return texture;
}

// reusable circle texture
export function useCircleTexture(radius = 32) {
  const app = useApp();

  return useMemo(() => {
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff);
    g.drawCircle(radius, radius, radius);
    g.endFill();

    const texture = app.renderer.generateTexture(g);
    g.destroy(true);

    return texture;
  }, [app, radius]);
}

// Ring texture (stroke only)
export function useRingTexture(radius = 32, strokeWidth = 3) {
  const app = useApp();
  return useMemo(() => {
    const g = new PIXI.Graphics();
    g.lineStyle(strokeWidth, 0xffffff);
    g.drawCircle(radius, radius, radius - strokeWidth / 2);
    const texture = app.renderer.generateTexture(g);
    g.destroy(true);
    return texture;
  }, [app, radius, strokeWidth]);
}
import { useRef } from "react";
import { Graphics, useTick } from "@pixi/react";
import { Graphics as PixiGraphics } from "pixi.js";
import type { RefObject } from "react";
import type { ScalesRef } from "./ScalesContext";

interface RegionBoundaryOverlayProps {
  scalesRef: RefObject<ScalesRef>;
  color?: number;
  widthPx?: number;
  maxAlpha?: number;
}

// Use 1px strips to create a gradient effect at the region boundaries - inefficient but works
export function RegionBoundaryOverlay({
  scalesRef,
  color = 0x9e9e9e,
  widthPx = 24,
  maxAlpha = 0.22,
}: RegionBoundaryOverlayProps) {
  const gRef = useRef<PixiGraphics | null>(null);

  useTick(() => {
    const g = gRef.current;
    const scales = scalesRef.current;
    if (!g || !scales) return;

    const { xMin, xMax, canvasWidth, canvasHeight, xScale, xOffset } = scales;
    const viewStart = scales.viewStart ?? xMin;
    const viewEnd = scales.viewEnd ?? xMax;

    g.clear();

    // Left boundary at xMin: opaque at the boundary, fading inward to the right.
    if (xMin < viewEnd) {
      const screenX = xMin * xScale + xOffset;
      if (screenX + widthPx > 0 && screenX < canvasWidth) {
        for (let i = 0; i < widthPx; i++) {
          const x = screenX + i;
          if (x < 0 || x >= canvasWidth) continue;
          const alpha = maxAlpha * (1 - i / widthPx);
          if (alpha <= 0.001) continue;
          g.beginFill(color, alpha);
          g.drawRect(Math.floor(x), 0, 1, canvasHeight);
          g.endFill();
        }
      }
    }

    // Right boundary at xMax: opaque at the boundary, fading inward to the left.
    if (xMax > viewStart) {
      const screenX = xMax * xScale + xOffset;
      if (screenX - widthPx < canvasWidth && screenX > 0) {
        for (let i = 0; i < widthPx; i++) {
          const x = screenX - 1 - i;
          if (x < 0 || x >= canvasWidth) continue;
          const alpha = maxAlpha * (1 - i / widthPx);
          if (alpha <= 0.001) continue;
          g.beginFill(color, alpha);
          g.drawRect(Math.floor(x), 0, 1, canvasHeight);
          g.endFill();
        }
      }
    }
  });

  return <Graphics ref={gRef} />;
}

export default RegionBoundaryOverlay;

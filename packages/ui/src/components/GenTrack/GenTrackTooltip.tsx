import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGenTrackTooltipState, useGenTrackTooltipDispatch } from "../../providers/GenTrackTooltipProvider";
import { Box } from "@mui/material";

function prefersAfterAnchor(anchorStart: number, anchorEnd: number, tooltipSize: number, viewportSize: number) {
  const spaceBefore = anchorStart;
  const spaceAfter = viewportSize - anchorEnd;
  const fitsBefore = spaceBefore >= tooltipSize;
  const fitsAfter = spaceAfter >= tooltipSize;

  if (fitsBefore !== fitsAfter) return fitsAfter;
  return spaceAfter >= spaceBefore;
}

function GenTrackTooltip({
  width,  
  height,
  canvasType,
  
  // following props can be a function: (datum, otherData) => value
  xAnchor = "right",   // "left" | "right" | "center" | "adapt" | "plotLeft" | "plotRight";
  yAnchor = "bottom",  // "top" | "bottom" | "center" | "adapt" | "anchorAdapt" | "plotTop" | "plotBottom";
  dx = 0,
  dy = 0,
  gap = 0,
  tooltipWidth = 0,
  scalesRef = null,    // optional: when provided + sticky, tooltip X tracks gene during pan/zoom
  children
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipBoxRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: tooltipWidth, height: 0 });
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value?: any }) => void;

  const genTrackTooltipState = useGenTrackTooltipState();
  const { datum, otherData, globalXY, activeCanvas, sticky, stickyGenomicX, stickyLabelCenter } = (genTrackTooltipState as any) ?? {};

  useLayoutEffect(() => {
    const box = tooltipBoxRef.current;
    if (!box) return;

    const updateSize = () => {
      const { width: nextWidth, height: nextHeight } = box.getBoundingClientRect();
      setTooltipSize(size => size.width === nextWidth && size.height === nextHeight
        ? size
        : { width: nextWidth, height: nextHeight });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(box);
    return () => observer.disconnect();
  }, [datum, otherData, activeCanvas, canvasType]);

  // rAF loop: while sticky, track gene X (pan/zoom) + Y (scroll) imperatively, and auto-dismiss when needed
  // MUST be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!sticky || !scalesRef || stickyGenomicX == null) return;
    const stickyYAnchor = typeof yAnchor === "function" ? yAnchor(datum) : yAnchor;
    const initialScales = (scalesRef as any)?.current;
    // Capture view state at sticky start — used to detect pan/zoom and resize
    const initialCanvasWidth = initialScales?.canvasWidth ?? 0;
    const initialXOffset = initialScales?.xOffset ?? 0;
    const initialXScale  = initialScales?.xScale  ?? 1;
    // Classify gene by pixel size at click time to pick dismissal strategy.
    // Tiny genes (sub-pixel wide at current zoom) use label-center visibility;
    // normal/large genes use the 10px pixel-visibility check.
    const genStart: number = (datum as any)?.genomicLocation?.start ?? 0;
    const genEnd: number = (datum as any)?.genomicLocation?.end ?? 0;
    const initialGenePixels = genEnd > genStart ? (genEnd - genStart) * initialXScale : 0;
    const isTinyGene = initialGenePixels < 10;
    let rafId: number;
    const update = () => {
      const box = tooltipBoxRef.current;
      const scales = (scalesRef as any)?.current;
      const anchor = anchorRef.current;
      if (box && scales && anchor) {
        // Dismiss if widget was resized
        if (scales.canvasWidth !== initialCanvasWidth) {
          genTrackTooltipDispatch({ type: "clearSticky" });
          return;
        }
        // Dismiss when gene is no longer meaningfully in view — but ONLY after a real pan/zoom.
        const hasViewChanged = scales.xOffset !== initialXOffset || scales.xScale !== initialXScale;
        if (hasViewChanged) {
          const viewStart = -scales.xOffset / scales.xScale;
          const viewEnd = (scales.canvasWidth - scales.xOffset) / scales.xScale;
          if (!isTinyGene) {
            // Gene was large at click time: dismiss when < 10px of genomic extent is visible
            const visibleGenomic = Math.max(0, Math.min(genEnd, viewEnd) - Math.max(genStart, viewStart));
            const visiblePixels = visibleGenomic * scales.xScale;
            if (visiblePixels < 10) {
              genTrackTooltipDispatch({ type: "clearSticky" });
              return;
            }
          } else if (stickyLabelCenter != null) {
            // Tiny gene (< 10px at click time): dismiss when label center goes out of view
            if (stickyLabelCenter < viewStart || stickyLabelCenter > viewEnd) {
              genTrackTooltipDispatch({ type: "clearSticky" });
              return;
            }
          }
        }
        // X: track gene genomic position through pan/zoom
        const anchorRect = anchor.getBoundingClientRect();
        const originXV = anchorRect.left;
        const screenX = stickyGenomicX * scales.xScale + scales.xOffset;
        let newLeft: number;
        const anchorX = originXV + screenX;
        const adaptiveTooltipWidth = box.getBoundingClientRect().width || tooltipWidth;
        if (xAnchor === "right" || (xAnchor === "adapt" && !prefersAfterAnchor(anchorX, anchorX, adaptiveTooltipWidth, window.innerWidth))) {
          newLeft = anchorX - adaptiveTooltipWidth + dx - gap;
        } else {
          newLeft = anchorX + dx + gap;
        }
        if (newLeft < 0) newLeft = 0;
        box.style.left = `${newLeft}px`;
        // Y: recompute from anchor bounds each frame to follow page scroll.
        if (stickyYAnchor === "anchorAdapt" && globalXY?.boxTopPageY != null && globalXY?.boxBottomPageY != null) {
          const boxTop = globalXY.boxTopPageY - window.scrollY;
          const boxBottom = globalXY.boxBottomPageY - window.scrollY;
          const tooltipHeight = box.getBoundingClientRect().height;
          if (!prefersAfterAnchor(boxTop, boxBottom, tooltipHeight + (dy || 4), window.innerHeight)) {
            box.style.top = `${boxTop - (dy || 4)}px`;
            box.style.transform = "translateY(-100%)";
          } else {
            box.style.top = `${boxBottom + (dy || 4)}px`;
            box.style.transform = "";
          }
        } else if (globalXY?.boxTopPageY != null) {
          const newTop = globalXY.boxTopPageY - window.scrollY - (dy || 4);
          box.style.top = `${newTop}px`;
          box.style.transform = "translateY(-100%)";
        }
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [sticky, scalesRef, stickyGenomicX, stickyLabelCenter, datum, globalXY, xAnchor, yAnchor, tooltipWidth, dx, dy, width, genTrackTooltipDispatch]);

  if (!genTrackTooltipState) return <div ref={anchorRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
  if (!datum && !otherData) return <div ref={anchorRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
  if (activeCanvas !== canvasType) return <div ref={anchorRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;

  if (typeof xAnchor === "function") xAnchor = xAnchor(datum);
  let resolvedYAnchor = yAnchor;
  if (typeof resolvedYAnchor === "function") resolvedYAnchor = resolvedYAnchor(datum);
  if (typeof dx === "function") dx = dx(datum, otherData);
  if (typeof dy === "function") dy = dy(datum, otherData);

  const { x, y, boxTopPageY, boxBottomPageY } = globalXY ?? {};

  // All coordinates are viewport-relative (position: fixed), which avoids all scroll/page-coord issues.
  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const originXV = anchorRect?.left ?? 0; // viewport X of canvas left edge
  const originYV = anchorRect?.top ?? 0;  // viewport Y of canvas top edge
  const adaptiveTooltipWidth = tooltipSize.width || tooltipWidth;

  // Compute viewport-left X
  let fixedLeft: number;
  if (xAnchor === "plotLeft") {
    fixedLeft = originXV;
  } else if (xAnchor === "plotRight") {
    fixedLeft = originXV + width - tooltipWidth;
  } else if (xAnchor === "center") {
    fixedLeft = originXV + x - tooltipWidth / 2;
  } else if (xAnchor === "left" || (xAnchor === "adapt" && prefersAfterAnchor(originXV + x, originXV + x, adaptiveTooltipWidth, window.innerWidth))) {
    fixedLeft = originXV + x + dx + gap;
  } else {
    fixedLeft = originXV + x - (xAnchor === "adapt" ? adaptiveTooltipWidth : tooltipWidth) + dx - gap;
  }
  // Clamp left edge to viewport
  if (fixedLeft < 0) fixedLeft = 0;

  // Compute viewport-top Y — boxTopPageY is page-absolute, convert to viewport
  let fixedTop: number;
  let transformY: string | undefined;
  if (resolvedYAnchor === "plotTop") {
    fixedTop = originYV;
  } else if (resolvedYAnchor === "plotBottom") {
    fixedTop = originYV + height;
    transformY = "-100%";
  } else if (resolvedYAnchor === "center") {
    fixedTop = originYV + y;
    transformY = "-50%";
  } else if (resolvedYAnchor === "boxTop" && boxTopPageY !== undefined) {
    // boxTopPageY is page-absolute; convert to viewport by subtracting scrollY
    fixedTop = boxTopPageY - window.scrollY - (dy || 4);
    transformY = "-100%";
  } else if (resolvedYAnchor === "anchorAdapt" && boxTopPageY !== undefined && boxBottomPageY !== undefined) {
    // Choose the side with more room in the viewport, anchored to its bounds.
    const boxTop = boxTopPageY - window.scrollY;
    const boxBottom = boxBottomPageY - window.scrollY;
    if (!prefersAfterAnchor(boxTop, boxBottom, tooltipSize.height + (dy || 4), window.innerHeight)) {
      fixedTop = boxTop - (dy || 4);
      transformY = "-100%";
    } else {
      fixedTop = boxBottom + (dy || 4);
      transformY = undefined;
    }
  } else if (resolvedYAnchor === "adapt") {
    const anchorY = globalXY?.pointerPageY != null
      ? globalXY.pointerPageY - window.scrollY
      : originYV + y;
    if (!prefersAfterAnchor(anchorY, anchorY, tooltipSize.height + (dy || 4), window.innerHeight)) {
      fixedTop = anchorY - (dy || 4);
      transformY = "-100%";
    } else {
      fixedTop = anchorY + (dy || 4);
    }
  } else if (resolvedYAnchor === "bottom") {
    fixedTop = originYV + y - dy;
    transformY = "-100%";
  } else {
    fixedTop = originYV + y + dy;
  }

  return (
    <>
      <div ref={anchorRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      {anchorRef.current && createPortal(
        <Box
          ref={tooltipBoxRef}
          onClick={e => e.stopPropagation()}
          sx={{
            position: "fixed",
            left: fixedLeft,
            top: fixedTop,
            transform: transformY ? `translateY(${transformY})` : undefined,
            pointerEvents: "auto",
            zIndex: 9999,
          }}
        >
          {children}
        </Box>,
        document.body
      )}
    </>
  );
}

export default GenTrackTooltip;

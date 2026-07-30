import { Box } from "@mui/material";
import { format, scaleLinear } from "d3";
import { useEffect, useRef } from "react";
import { useViewerInteractionDispatch, useViewerInteractionState } from "ui";
import { useViewerState } from "../../providers/ViewerProvider";

const trackHeight = 8;
const topSpace = 24;
const bottomSpace = 26;
const totalHeight = trackHeight + topSpace + bottomSpace;

function svgElement(tag: string) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function tickGroup({
  x = 0,
  label = "",
  position = "bottom",
  strokeWidth = 1,
  fontSize = 11.5,
  fontWeight = 400,
}) {
  const g = svgElement("g");
  g.setAttribute("transform", `translate(${x - 0.5}, 0)`);
  let yLine, yLabel, dominantBaseline;
  if (position === "top") {
    yLine = topSpace - 5;
    yLabel = yLine - 3;
    dominantBaseline = "auto";
  } else {
    yLine = topSpace + trackHeight;
    yLabel = yLine + 8;
    dominantBaseline = "hanging";
  }
  g.setAttribute("pointer-events", "none");
  const line = svgElement("line");
  line.setAttribute("y1", yLine);
  line.setAttribute("y2", yLine + 5);
  line.setAttribute("stroke-width", strokeWidth);
  line.setAttribute("stroke", "#000");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  g.append(line);
  if (label) {
    const text = svgElement("text");
    text.textContent = label;
    text.setAttribute("y", yLabel);
    text.setAttribute("font-size", fontSize);
    text.setAttribute("font-weight", fontWeight);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", dominantBaseline);
    text.classList.add("_track_text_");
    g.append(text);
  }
  return g;
}

function updateTextScale(textOrSvg) {
  let xScale;
  const textElements =
    textOrSvg.tagName.toLowerCase() === "text"
      ? [textOrSvg]
      : textOrSvg.querySelectorAll("._track_text_");
  for (const text of textElements) {
    if (!xScale) {
      text.setAttribute("transform", `scale(1, 1)`);
      xScale ??= text.getCTM().a;
    }
    text.setAttribute("transform", `scale(${1 / xScale}, 1)`);
  }
}

// currently for alphaFold only - assumes single/first structure and contiguous
// residue indices from 1 to structure length
export default function ViewerTrack({ trackColor, trackTicks }) {
  const viewerState = useViewerState();
  const viewerInteractionState = useViewerInteractionState();
  const viewerInteractionDispatch = useViewerInteractionDispatch();
  const svgRef = useRef(null);

  function handlePointerMove(event) {
    const rect = event.target;
    const resi = Number(rect?.dataset?.resi);
    viewerInteractionDispatch({
      type: "setHoveredResi",
      value: resi ?? null,
    });
  }

  function handleMouseleave(event) {
    viewerInteractionDispatch({ type: "setHoveredResi", value: null });
  }

  function handleClick(event) {
    viewerInteractionDispatch({
      type: "setHoveredResi",
      value: null,
    });
    viewerInteractionDispatch({
      type: "setClickedResi",
      value: event.target.dataset.resi,
    });
  }

  // add svg elements
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!viewerState.viewer || !viewerState.atomsByResi) return;
    const nResidues = viewerState.atomsByResi.size;
    svg.setAttribute("viewBox", `0 0 ${nResidues} ${totalHeight}`);
    const rects = [];
    for (const resi of viewerState.atomsByResi.keys()) {
      // visible rect
      const rect = svgElement("rect");
      rect.setAttribute("x", resi - 1);
      rect.setAttribute("y", topSpace);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", trackHeight);
      rect.setAttribute("fill", trackColor(viewerState, resi));
      rect.setAttribute("pointer-events", "none");
      rect.setAttribute("shape-rendering", "crispEdges");

      // larger invisible rect for interaction
      const invisibleRect = svgElement("rect");
      invisibleRect.setAttribute("x", resi - 1);
      invisibleRect.setAttribute("y", 0);
      invisibleRect.setAttribute("width", 1);
      invisibleRect.setAttribute("height", totalHeight);
      invisibleRect.setAttribute("stoke", "none");
      invisibleRect.setAttribute("fill-opacity", 0); // so can still trigger evevnts
      invisibleRect.setAttribute("data-resi", resi);
      invisibleRect.addEventListener("click", handleClick);
      rects.push(rect, invisibleRect);
    }

    // add rects and event handlers
    svg.append(...rects);
    svg.addEventListener("pointermove", handlePointerMove);
    svg.addEventListener("mouseleave", handleMouseleave);

    // track ticks
    if (trackTicks) {
      svg.append(
        ...trackTicks(viewerState).map(({ resi, label }) =>
          tickGroup({
            x: resi,
            position: "top",
            fontWeight: 500,
            label,
          })
        )
      );
    }

    // add hover tick group once and reuse
    const g = tickGroup({ position: "top", label: " " });
    g.style.display = "none";
    g.classList.add("_hovered_tick_group_");
    svg.append(g);

    // axis
    const ticks = scaleLinear().domain([0, nResidues]).ticks();
    if (ticks[0] === 0) ticks[0] = 1;
    const tickFormatter = format(",");
    svg.append(
      ...ticks.map((value) =>
        tickGroup({
          x: value,
          label: tickFormatter(value),
        })
      )
    );
    updateTextScale(svg);
    window.addEventListener("resize", () => updateTextScale(svg));
  }, [viewerState]);

  // hide/show clicked resi tick
  useEffect(() => {
    if (!viewerInteractionState) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.querySelector("._clicked_tick_group_")?.remove();
    const resi = viewerInteractionState.clickedResi;
    if (resi) {
      const g = tickGroup({
        x: resi,
        label: `${viewerState.atomsByResi.get(+resi)[0].resn} ${resi}`,
        position: "top",
        fontWeight: 500,
      });
      g.classList.add("_clicked_tick_group_");
      svg.append(g);
      updateTextScale(g.querySelector("text"));
    }
  }, [viewerState, viewerInteractionState?.clickedResi]);

  useEffect(() => {
    if (!viewerInteractionState) return;
    const svg = svgRef.current;
    if (!svg) return;
    const resi = viewerInteractionState.hoveredResi;
    const g = svg.querySelector("._hovered_tick_group_");
    if (!g) return;
    if (resi) {
      g.setAttribute("transform", `translate(${resi - 0.5}, 0)`);
      const text = g.querySelector("text");
      text.textContent = `${viewerState.atomsByResi.get(+resi)[0].resn} ${resi}`;
      g.style.display = "inline";
    } else {
      g.style.display = "none";
    }
  }, [viewerInteractionState?.hoveredResi]);

  if (!viewerInteractionState) return null;

  return (
    <Box
      sx={{
        height: `${totalHeight}px`,
        display: "flex",
        alignItems: "center",
        px: 3,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: `${totalHeight}px`,
          overflow: "visible",
        }}
      >
        {/* rectangles and highlight added by useEffect */}
      </svg>
    </Box>
  );
}

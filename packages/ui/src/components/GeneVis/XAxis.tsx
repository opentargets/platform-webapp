import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { scaleLinear, axisTop, select, format } from "d3";
import { grey } from "@mui/material/colors";
import { Box } from "@mui/material";

export interface XAxisHandle {
  update: (start: number, end: number) => void;
}

function drawAxis(gEl: SVGGElement | null, start: number, end: number, canvasWidth: number) {
  if (!gEl) return;
  const scale = scaleLinear().domain([start, end]).range([0, canvasWidth]);
  const kbFormat = format(",");
  const axis = axisTop(scale)
    .ticks(8)
    .tickSizeOuter(0)
    .tickFormat(d => end - start < 1_000_000
      ? `${kbFormat(+d / 1_000)} kb`
      : `${kbFormat(+d / 1_000_000)} mb`
    );
  const axisSelection = select(gEl).call(axis);
  axisSelection.selectAll("text")
    .style("font-size", "11px")
    .style("font-family", "'Inter', sans-serif");
  axisSelection.select(".domain").style("stroke", grey[600]);
  axisSelection.selectAll(".tick line").style("stroke", grey[600]);
}

const XAxis = forwardRef<XAxisHandle, { start: number; end: number; canvasWidth: number }>(function XAxis({ start, end, canvasWidth }, ref) {
  const axisRef = useRef<SVGGElement | null>(null);

  useImperativeHandle(ref, () => ({
    update(newStart: number, newEnd: number) {
      drawAxis(axisRef.current, newStart, newEnd, canvasWidth);
    },
  }), [canvasWidth]);

  useEffect(() => {
    drawAxis(axisRef.current, start, end, canvasWidth);
  }, [start, end, canvasWidth]);

  return (
    <Box sx={{ height: "100%", display: "flex", alignItems: "end" }}>
      <svg width={canvasWidth} height={30} style={{ overflow: "visible" }}>
        <g ref={axisRef} transform="translate(0, 30)" />
      </svg>
    </Box>
  );
});

export default XAxis;
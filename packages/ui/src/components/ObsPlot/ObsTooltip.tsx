import { ReactElement } from "react";
import { Box } from "@mui/material";

type TooltipProps = {
  width: number;
  height: number;
  xAnchor?: "left" | "right" | "center" | "adapt" | "plotLeft" | "plotRight";
  yAnchor?: "top" | "bottom" | "center" | "adapt" | "plotTop" | "plotBottom";
  dx?: number;
  dy?: number;
  xAccessor: (d: any, i?: number) => number;
  yAccessor: (d: any, i?: number) => number;
  renderTooltip: (datum: any, otherData?: any) => ReactElement;
  chart: ReactElement;
  datum: any;
  otherData?: any;
};

function ObsTooltip({
  width,
  height,
  xAnchor = "adapt",
  yAnchor = "adapt",
  dx = 0,
  dy = 0,
  xAccessor,
  yAccessor,
  renderTooltip,
  chart,
  datum,
  otherData,
}: TooltipProps) {
  if (!datum) return null;

  const x = chart.scale("x").apply(xAccessor(datum));
  const y = chart.scale("y").apply(yAccessor(datum));

  let left, right, transformX;
  if (xAnchor === "plotLeft") {
    left = 0;
  } else if (xAnchor === "plotRight") {
    right = 0;
  } else if (xAnchor === "center") {
    left = x;
    transformX = "-50%";
  } else if (xAnchor === "left" || (xAnchor === "adapt" && x < width / 2)) {
    left = x + dx;
  } else {
    right = width - x + dx;
  }

  let top, bottom, transformY;
  if (yAnchor === "plotTop") {
    top = 0;
  } else if (yAnchor === "plotBottom") {
    bottom = 0;
  } else if (yAnchor === "center") {
    top = y;
    transformY = "-50%";
  } else if (yAnchor === "bottom" || (yAnchor === "adapt" && y > height / 2)) {
    bottom = height - y + dy;
  } else {
    top = y + dy;
  }

  return (
    <Box
      width={width}
      height={height}
      position="absolute"
      top={0}
      left={0}
      sx={{ pointerEvents: "none", zIndex: 1 }}
    >
      <Box
        sx={{
          position: "absolute",
          left,
          right,
          top,
          bottom,
          transform: `translate(${transformX ?? 0}, ${transformY ?? 0})`,
          pointerEvents: "auto",
        }}
      >
        {renderTooltip(datum, otherData)}
      </Box>
    </Box>
  );
}

export default ObsTooltip;

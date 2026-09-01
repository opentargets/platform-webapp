import { Box, Fade } from "@mui/material";
import { useMeasure } from "@uidotdev/usehooks";
import { type ReactElement, useState } from "react";
import { ObsChart, ObsTooltip } from "ui";

type ObsPlotProps = {
  data: any;
  otherData?: any;
  minWidth?: number;
  maxWidth?: number;
  height: number;
  renderChart: (param: { data: any; otherData?: any; height: number }) => SVGSVGElement;
  fadeElement?: (elmt: SVGElement) => void;
  highlightElement?: (elmt: SVGElement) => void;
  resetElement?: (elmt: SVGElement) => void;
  xTooltip?: (d: any, i?: number) => number;
  yTooltip?: (d: any, i?: number) => number;
  xAnchorTooltip?: "left" | "right" | "center" | "adapt" | "plotLeft" | "plotRight";
  yAnchorTooltip?: "top" | "bottom" | "center" | "adapt" | "plotTop" | "plotBottom";
  dxTooltip?: number;
  dyTooltip?: number;
  renderTooltip?: (datum: any) => ReactElement;
  positionInfo?: "top" | "bottom" | "left" | "right";
  gapInfo: number;
  renderInfo: (chart: ReactElement | null) => ReactElement;
  renderSVGOverlay: (chart: SVGSVGElement) => SVGElement | null;
};

function ObsPlot({
  data,
  otherData,
  minWidth,
  maxWidth,
  height,
  renderChart,
  fadeElement,
  highlightElement,
  resetElement,
  xTooltip,
  yTooltip,
  xAnchorTooltip,
  yAnchorTooltip,
  dxTooltip,
  dyTooltip,
  renderTooltip,
  positionInfo = "top",
  gapInfo,
  renderInfo,
  renderSVGOverlay,
}: ObsPlotProps) {
  const [ref, { width: measuredWidth }] = useMeasure();
  const [chart, setChart] = useState(null);
  const [datum, setDatum] = useState(null);

  const hasTooltip = Boolean(xTooltip && yTooltip && renderTooltip);

  let width = measuredWidth;
  if (maxWidth != null) width = Math.min(width, maxWidth);
  if (minWidth != null) width = Math.max(width, minWidth);

  const infoElement = renderInfo?.(chart);

  const chartElement = (
    <Box sx={{ width }}>
      <Fade in>
        <Box>
          <ObsChart
            data={data}
            otherData={otherData}
            width={width}
            height={height}
            renderChart={renderChart}
            hasTooltip={hasTooltip}
            fadeElement={fadeElement}
            highlightElement={highlightElement}
            resetElement={resetElement}
            setChart={setChart}
            setDatum={setDatum}
            renderSVGOverlay={renderSVGOverlay}
          />
          {hasTooltip && (
            <ObsTooltip
              width={width}
              height={height}
              xAnchor={xAnchorTooltip}
              yAnchor={yAnchorTooltip}
              dx={dxTooltip}
              dy={dyTooltip}
              xAccessor={xTooltip}
              yAccessor={yTooltip}
              renderTooltip={renderTooltip}
              chart={chart}
              datum={datum}
              otherData={otherData}
            />
          )}
        </Box>
      </Fade>
    </Box>
  );

  if (!infoElement) {
    return (
      <Box position="relative" display="flex" justifyContent="center" ref={ref}>
        {chartElement}
      </Box>
    );
  }

  const infoTopOrBottom = positionInfo === "top" || positionInfo === "bottom";

  // info on left jumps to above-left when narrow window, info on right jumps to
  // below-left
  return (
    <Box position="relative" display="flex" justifyContent="center" ref={ref}>
      <Box
        display="flex"
        flexDirection={infoTopOrBottom ? "column" : "row"}
        gap={`${gapInfo}px`}
        flexWrap={infoTopOrBottom ? "nowrap" : "wrap"}
      >
        {positionInfo === "top" || positionInfo === "left" ? (
          <>
            {infoElement}
            {chartElement}
          </>
        ) : (
          <>
            {chartElement}
            {infoElement}
          </>
        )}
      </Box>
    </Box>
  );
}

export default ObsPlot;

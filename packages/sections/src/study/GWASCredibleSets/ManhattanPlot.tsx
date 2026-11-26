import { useTheme } from "@mui/material";
import * as PlotLib from "@observablehq/plot";
import { chromosomeInfo, type StudyCredibleSet } from "@ot/constants";
import {
  Box,
  Link,
  Navigate,
  ObsPlot,
  ScientificNotation,
  Skeleton,
  TooltipRow,
  TooltipTable,
  Typography,
} from "ui";

export type ManhattanPlotRow = Pick<
  StudyCredibleSet,
  | "credibleSetId"
  | "leadVariantId"
  | "leadChromosome"
  | "leadPosition"
  | "pValueMantissa"
  | "pValueExponent"
>;

type PlotRow = ManhattanPlotRow & {
  pValueMantissa: number;
  pValueExponent: number;
  _y: number;
  _genomePosition: number;
};

function ManhattanPlot({
  loading,
  data: originalData,
}: {
  loading: boolean;
  data?: ManhattanPlotRow[];
}) {
  const theme = useTheme();

  const height = 360;
  const markColor = theme.palette.primary.main;
  const background = theme.palette.background.paper;

  if (loading) return <Skeleton height={height} />;

  const data = (originalData ?? []).flatMap<PlotRow>((row) => {
    const chromosome = chromosomeInfoMap.get(row.leadChromosome.replace(/^chr/i, "").toUpperCase());
    const { pValueMantissa, pValueExponent, leadPosition } = row;
    if (
      !chromosome ||
      pValueMantissa == null ||
      !Number.isFinite(pValueMantissa) ||
      pValueMantissa <= 0 ||
      pValueExponent == null ||
      !Number.isFinite(pValueExponent) ||
      !Number.isFinite(leadPosition) ||
      leadPosition < 1 ||
      leadPosition > chromosome.length
    ) {
      return [];
    }
    return [
      {
        ...row,
        pValueMantissa,
        pValueExponent,
        _y: Math.log10(pValueMantissa) + pValueExponent,
        _genomePosition: chromosome.start + leadPosition,
      },
    ];
  });
  if (data.length === 0) {
    return (
      <Typography align="center" mt={1}>
        No data available for this plot
      </Typography>
    );
  }

  const yMax = 0;
  let yMin = Infinity;
  for (const d of data) {
    yMin = Math.min(yMin, d._y);
  }

  function highlightElement(elmt: SVGElement) {
    elmt.style.fill = markColor;
    elmt.style.strokeOpacity = "1";
    if (elmt.tagName === "line") elmt.style.strokeWidth = "1.7";
  }

  function fadeElement(elmt: SVGElement) {
    elmt.style.fill = background;
    elmt.style.strokeOpacity = "0.6";
    elmt.style.strokeWidth = "1";
  }

  function resetElement(elmt: SVGElement) {
    elmt.style.fill = background;
    elmt.style.strokeOpacity = "1";
    elmt.style.strokeWidth = "1";
  }

  function renderChart({
    data,
    width,
    height,
  }: {
    data: PlotRow[];
    width?: number;
    height: number;
  }) {
    return PlotLib.plot({
      width,
      height,
      marginTop: 30,
      marginLeft: 80,
      marginRight: 40,
      style: { fontSize: "11px", fontWeight: "500" },
      x: {
        domain: [0, genomeLength],
      },
      y: {
        domain: [yMin, yMax],
        reverse: true,
        nice: true,
      },
      marks: [
        // x-axis
        PlotLib.axisX({
          stroke: "#888",
          ticks: [0, ...chromosomes.map((chromo) => chromo.end)],
          tickSize: 16,
          tickFormat: () => "",
        }),
        PlotLib.ruleY([0], {
          stroke: "#888",
        }),

        // y-axis
        PlotLib.axisY({
          stroke: "#888",
          label: "-log₁₀(pValue)",
          labelAnchor: "top",
          labelArrow: "none",
          tickFormat: (v) => Math.abs(v),
        }),
        PlotLib.ruleX([0], {
          stroke: "#888",
        }),

        // grid lines
        PlotLib.gridX(
          chromosomes.map((chromo) => chromo.end),
          {
            x: (d) => d,
            stroke: "#cecece",
            strokeOpacity: 1,
            strokeDasharray: "3, 4",
          }
        ),

        // text mark for the x-axis labels
        PlotLib.text(chromosomes, {
          x: (d) => d.midpoint,
          y: yMax,
          text: (d) => d.chromosome,
          lineAnchor: "top",
          dy: 6,
        }),

        // standard marks
        PlotLib.ruleX(data, {
          x: (d) => d._genomePosition,
          y: (d) => d._y,
          y2: yMax,
          strokeWidth: 1,
          stroke: markColor,
          className: "obs-tooltip",
        }),
        PlotLib.dot(data, {
          x: (d) => d._genomePosition,
          y: (d) => d._y,
          strokeWidth: 1,
          stroke: markColor,
          fill: background,
          r: 3,
          className: "obs-tooltip",
        }),
      ],
    });
  }

  return (
    <ObsPlot
      data={data}
      height={height}
      renderChart={renderChart}
      xTooltip={(d) => d._genomePosition}
      yTooltip={(d) => d._y}
      dxTooltip={10}
      dyTooltip={10}
      renderTooltip={renderTooltip}
      fadeElement={fadeElement}
      highlightElement={highlightElement}
      resetElement={resetElement}
    />
  );
}

export default ManhattanPlot;

function renderTooltip(datum: PlotRow) {
  return (
    <Box
      sx={{
        background: "#fffc",
        borderColor: "#ddd",
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0.2rem",
        padding: "0.25em 0.5rem",
      }}
    >
      <TooltipTable>
        <TooltipRow label="Credible set">
          <Box display="flex">
            <Navigate to={`/credible-set/${datum.credibleSetId}`} />
          </Box>
        </TooltipRow>
        <TooltipRow label="Lead variant">
          <Link to={`/variant/${datum.leadVariantId}`}>{datum.leadVariantId}</Link>
        </TooltipRow>
        <TooltipRow label="P-value">
          <ScientificNotation number={[datum.pValueMantissa, datum.pValueExponent]} dp={2} />
        </TooltipRow>
      </TooltipTable>
    </Box>
  );
}

let genomeLength = 0;
const chromosomes = chromosomeInfo.map((chromo) => {
  const start = genomeLength;
  genomeLength += chromo.length;
  return { ...chromo, start, end: genomeLength, midpoint: (start + genomeLength) / 2 };
});

const chromosomeInfoMap = new Map(chromosomes.map((obj) => [obj.chromosome, obj]));

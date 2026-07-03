import { Box, Skeleton, useTheme } from "@mui/material";
import * as PlotLib from "@observablehq/plot";
import { credsetConfidenceMap, naLabel } from "@ot/constants";
import {
  ClinvarStars,
  DisplayVariantId,
  Link,
  Navigate,
  ObsPlot,
  ScientificNotation,
  Tooltip,
  TooltipRow,
  TooltipTable,
} from "ui";

function ManhattanPlot({ loading, data: originalData }) {
  const theme = useTheme();

  const height = 360;
  const markColor = theme.palette.primary.main;
  const background = theme.palette.background.paper;

  if (loading) return <Skeleton height={height} />;

  if (originalData == null) return null;

  const data = structuredClone(
    originalData.filter((d) => {
      return d.pValueMantissa != null && d.pValueExponent != null && d.variant != null;
    })
  );
  if (data.length === 0) return null;

  const yMax = 0;
  let yMin = Infinity;
  for (const d of data) {
    const y = Math.log10(d.pValueMantissa) + d.pValueExponent;
    yMin = Math.min(yMin, y);
    d._y = y;
    d._genomePosition = cumulativePosition(d.variant);
  }

  function highlightElement(elmt) {
    elmt.style.fill = markColor;
    elmt.style.strokeOpacity = 1;
    if (elmt.tagName === "line") elmt.style.strokeWidth = 1.7;
  }

  function fadeElement(elmt) {
    elmt.style.fill = background;
    elmt.style.strokeOpacity = 0.6;
    elmt.style.strokeWidth = 1;
  }

  function resetElement(elmt) {
    elmt.style.fill = background;
    elmt.style.strokeOpacity = 1;
    elmt.style.strokeWidth = 1;
  }

  function renderChart({ data, width, height }) {
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
          ticks: [0, ...chromosomeInfo.map((chromo) => chromo.end)],
          tickSize: 16,
          tickFormat: (v) => "",
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
          chromosomeInfo.map((chromo) => chromo.end),
          {
            x: (d) => d,
            stroke: "#cecece",
            strokeOpacity: 1,
            strokeDasharray: "3, 4",
          }
        ),

        // text mark for the x-axis labels
        PlotLib.text(chromosomeInfo, {
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

function renderTooltip(datum) {
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
            <Navigate to={`/credible-set/${datum.studyLocusId}`} />
          </Box>
        </TooltipRow>
        <TooltipRow label="Lead variant">
          <Link asyncTooltip to={`/variant/${datum.variant.id}`}>
            <DisplayVariantId
              variantId={datum.variant.id}
              referenceAllele={datum.variant.referenceAllele}
              alternateAllele={datum.variant.alternateAllele}
              expand={false}
            />
          </Link>
        </TooltipRow>
        <TooltipRow label="P-value">
          <ScientificNotation number={[datum.pValueMantissa, datum.pValueExponent]} dp={2} />
        </TooltipRow>
        <TooltipRow label="Beta">{datum.beta?.toPrecision(3) ?? naLabel}</TooltipRow>
        <TooltipRow label="Fine-mapping">
          <Box display="flex" flexDirection="column" gap={0.25}>
            <Box display="flex" gap={0.5}>
              Method: {datum.finemappingMethod ?? naLabel}
            </Box>
            <Box display="flex" gap={0.5}>
              Confidence:{" "}
              {datum.confidence ? (
                <Tooltip title={datum.confidence} style="">
                  <ClinvarStars num={credsetConfidenceMap[datum.confidence]} />
                </Tooltip>
              ) : (
                naLabel
              )}
            </Box>
          </Box>
        </TooltipRow>
        <TooltipRow label="L2G">
          <Box display="flex" flexDirection="column" gap={0.25}>
            <Box display="flex" gap={0.5}>
              Top:{" "}
              {datum.l2GPredictions?.rows?.[0]?.target ? (
                <Link asyncTooltip to={`/target/${datum.l2GPredictions.rows[0].target.id}`}>
                  {datum.l2GPredictions.rows[0].target.approvedSymbol}
                </Link>
              ) : (
                naLabel
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              Score: {datum.l2GPredictions?.rows?.[0]?.score?.toFixed(3) ?? naLabel}
            </Box>
          </Box>
        </TooltipRow>
        <TooltipRow label="Credible set size">
          {datum.locus?.count ? datum.locus.count.toLocaleString() : naLabel}
        </TooltipRow>
      </TooltipTable>
    </Box>
  );
}

// from: https://www.ncbi.nlm.nih.gov/grc/human/data
// (first tab: "Chromosome lengths")
const chromosomeInfo = [
  { chromosome: "1", length: 248956422 },
  { chromosome: "2", length: 242193529 },
  { chromosome: "3", length: 198295559 },
  { chromosome: "4", length: 190214555 },
  { chromosome: "5", length: 181538259 },
  { chromosome: "6", length: 170805979 },
  { chromosome: "7", length: 159345973 },
  { chromosome: "8", length: 145138636 },
  { chromosome: "9", length: 138394717 },
  { chromosome: "10", length: 133797422 },
  { chromosome: "11", length: 135086622 },
  { chromosome: "12", length: 133275309 },
  { chromosome: "13", length: 114364328 },
  { chromosome: "14", length: 107043718 },
  { chromosome: "15", length: 101991189 },
  { chromosome: "16", length: 90338345 },
  { chromosome: "17", length: 83257441 },
  { chromosome: "18", length: 80373285 },
  { chromosome: "19", length: 58617616 },
  { chromosome: "20", length: 64444167 },
  { chromosome: "21", length: 46709983 },
  { chromosome: "22", length: 50818468 },
  { chromosome: "X", length: 156040895 },
  { chromosome: "Y", length: 57227415 },
];

chromosomeInfo.forEach((chromo, i) => {
  chromo.start = chromosomeInfo[i - 1]?.end ?? 0;
  chromo.end = chromo.start + chromo.length;
  chromo.midpoint = (chromo.start + chromo.end) / 2;
});

const genomeLength = chromosomeInfo.at(-1).end;

const chromosomeInfoMap = new Map(chromosomeInfo.map((obj) => [obj.chromosome, obj]));

function cumulativePosition({ chromosome, position }) {
  return chromosomeInfoMap.get(chromosome).start + position;
}

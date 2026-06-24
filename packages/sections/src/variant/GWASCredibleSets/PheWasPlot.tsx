import { Box, Chip, Skeleton, Typography, useTheme } from "@mui/material";
import * as PlotLib from "@observablehq/plot";
import { credsetConfidenceMap, naLabel } from "@ot/constants";
import { Fragment } from "react";
import {
  ClinvarStars,
  DataDownloader,
  DisplayVariantId,
  Link,
  Navigate,
  ObsPlot,
  ScientificNotation,
  Tooltip,
  TooltipRow,
  TooltipTable,
} from "ui";

const palette = [
  "#27B4AE",
  "#4047C4",
  "#F48730",
  "#DB4281",
  "#7E84F4",
  "#78DF76",
  "#1C7AED",
  "#7129CD",
  "#E7C73B",
  "#C95F1E",
  "#188E61",
  "#BEE952",
];

function PheWasPlot({
  columns,
  query,
  variables,
  loading,
  data: originalData,
  pageId,
  pageReferenceAllele,
  pageAlternateAllele,
}) {
  const height = 460;
  const theme = useTheme();
  const background = theme.palette.background.paper;

  if (loading) return <Skeleton height={height} />;

  if (originalData == null) return null;

  const data = structuredClone(
    originalData.filter((d) => {
      return d.pValueMantissa != null && d.pValueExponent != null && d.variant != null;
    })
  );
  if (data.length === 0) return null;

  const therapeuticPriorities = {
    EFO_0001444: { name: "measurement", rank: 1 },
    MONDO_0045024: { name: "cancer or benign tumor", rank: 2 },
    OTAR_0000018: { name: "genetic, familial or congenital", rank: 3 },
    MONDO_0005550: { name: "infectious disease", rank: 4 },
    OTAR_0000009: { name: "injury, poisoning or complication", rank: 5 },
    OTAR_0000014: { name: "pregnancy or perinatal", rank: 6 },
    MONDO_0024458: { name: "visual system", rank: 7 },
    MONDO_0004995: { name: "cardiovascular", rank: 8 },
    MONDO_0002356: { name: "pancreas", rank: 9 },
    MONDO_0002515: { name: "liver", rank: 10 },
    EFO_0010282: { name: "gastrointestinal", rank: 11 },
    OTAR_0000017: { name: "reproductive system or breast", rank: 12 },
    MONDO_0002051: { name: "integumentary system", rank: 13 },
    MONDO_0005151: { name: "endocrine system", rank: 14 },
    OTAR_0000010: { name: "respiratory or thoracic", rank: 15 },
    MONDO_0002118: { name: "urinary system", rank: 16 },
    OTAR_0000006: { name: "musculoskeletal or connective ...", rank: 17 },
    MONDO_0021205: { name: "disorder of ear", rank: 18 },
    MONDO_0005046: { name: "immune system", rank: 19 },
    MONDO_0005570: { name: "hematologic", rank: 20 },
    MONDO_0005071: { name: "nervous system", rank: 21 },
    MONDO_0002025: { name: "psychiatric", rank: 22 },
    OTAR_0000020: { name: "nutritional or metabolic", rank: 23 },
    GO_0008150: { name: "biological process", rank: 24 },
    EFO_0000651: { name: "phenotype", rank: 25 },
    EFO_0002571: { name: "medical procedure", rank: 26 },
    MONDO_0005583: { name: "animal disease", rank: 27 },
  };

  function getTherapeuticArea(row) {
    let bestId = null;
    let bestRank = Infinity;
    const areaIds = row.study.diseases.flatMap((d) => {
      return d.therapeuticAreas.map((area) => area.id);
    });
    for (const id of areaIds) {
      const rank = therapeuticPriorities[id]?.rank;
      if (rank < bestRank) {
        bestId = id;
        bestRank = rank;
      }
    }
    return bestId
      ? { id: bestId, name: therapeuticPriorities[bestId].name }
      : { id: "__uncategorised__", name: "Uncategorised" };
  }

  let yMin = Infinity;
  const yMax = 0;
  const diseaseGroups = new Map();
  for (const row of data) {
    row._pageId = pageId;
    row._y = Math.log10(row.pValueMantissa) + row.pValueExponent;
    yMin = Math.min(yMin, row._y);
    const { id, name } = getTherapeuticArea(row);
    row._therapeuticAreaId = id;
    diseaseGroups.has(id)
      ? diseaseGroups.get(id).data.push(row)
      : diseaseGroups.set(id, { name, data: [row] });
  }

  let sortedDiseaseIds = // disease ids sorted by disease name
    [...diseaseGroups].sort((a, b) => a[1].name.localeCompare(b[1].name)).map((a) => a[0]);
  if (diseaseGroups.has("__uncategorised__")) {
    sortedDiseaseIds = sortedDiseaseIds.filter((id) => id !== "__uncategorised__");
    sortedDiseaseIds.push("__uncategorised__");
  }
  const xIntervals = new Map();
  let xCumu = 0;
  const xGap = data.length / 300; // gap between groups
  const xPad = data.length / 500; // padding at end of groups
  const sortedData = [];
  for (const [index, id] of sortedDiseaseIds.entries()) {
    const { data: newRows } = diseaseGroups.get(id);
    xCumu += xGap;
    xIntervals.set(id, { start: xCumu, index });
    xCumu += xPad;
    newRows.sort((row1, row2) => row1._y - row2._y);
    for (const row of newRows) {
      row._x = xCumu + 0.5;
      xCumu += 1;
      sortedData.push(row);
    }
    xCumu += xPad;
    xIntervals.get(id).end = xCumu;
  }

  return (
    <div>
      <ChartControls data={originalData} query={query} columns={columns} variables={variables} />
      <Typography variant="body2" py={1} pr={2} textAlign="right">
        <span style={{ fontSize: 10 }}>▲</span> Beta &gt; 0&emsp;&emsp;
        <span style={{ fontSize: 10 }}>▼</span> Beta &lt; 0&emsp;&emsp;
        <span style={{ fontSize: 10 }}>●</span> Beta {naLabel}&emsp;&emsp; Filled symbol:{" "}
        <b>
          <DisplayVariantId
            variantId={pageId}
            referenceAllele={pageReferenceAllele}
            alternateAllele={pageAlternateAllele}
            expand={false}
          />
        </b>{" "}
        is lead variant
      </Typography>
      <ObsPlot
        data={sortedData}
        otherData={{
          pageId,
          background,
          xCumu,
          xIntervals,
          diseaseGroups,
          yMin,
          yMax,
        }}
        height={height}
        renderChart={renderChart}
        xTooltip={(d) => d._x}
        yTooltip={(d) => d._y}
        yAnchorTooltip="plotTop"
        dxTooltip={20}
        renderTooltip={renderTooltip}
        fadeElement={fadeElement}
        highlightElement={highlightElement}
        resetElement={resetElement}
      />
    </div>
  );
}

export default PheWasPlot;

function ChartControls({ data, query, variables, columns }) {
  return (
    <Box
      sx={{
        borderRadius: 1,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1,
        mb: 2,
      }}
    >
      <DataDownloader
        fileStem={`gwas-credible-sets-variant`}
        btnLabel="Export"
        rows={data}
        query={query}
        variables={variables}
        columns={columns}
      />
    </Box>
  );
}

function highlightElement(elmt) {
  elmt.style.fillOpacity = 1;
  elmt.style.strokeOpacity = 1;
  elmt.style.strokeWidth = 1.7;
}

function fadeElement(elmt) {
  elmt.style.fillOpacity = 0.4;
  elmt.style.strokeOpacity = 0.4;
  elmt.style.strokeWidth = 1.3;
}

function resetElement(elmt) {
  elmt.style.fillOpacity = 1;
  elmt.style.strokeOpacity = 1;
  elmt.style.strokeWidth = 1.3;
}

function renderChart({
  data,
  otherData: { pageId, background, xCumu, xIntervals, diseaseGroups, yMin, yMax },
  width,
  height,
}) {
  return PlotLib.plot({
    width,
    height,
    marginLeft: 80,
    marginRight: 50,
    marginTop: 30,
    marginBottom: 130,
    style: { fontSize: "11px", fontWeight: "500" },
    x: {
      domain: [0, xCumu],
      axis: false,
    },
    y: {
      domain: [yMin, yMax],
      reverse: true,
      nice: true,
    },
    marks: [
      // ruleY mark for multi-segment x-axis
      PlotLib.ruleY(xIntervals, {
        x1: (d) => d[1].start,
        x2: (d) => d[1].end,
        y: yMax,
        stroke: (d, i) => palette[i],
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

      // text mark for x-ticks
      PlotLib.text(xIntervals, {
        x: (d) => (d[1].start + d[1].end) / 2,
        y: yMax,
        dy: 5,
        text: (d) => diseaseGroups.get(d[0]).name,
        textAnchor: "start",
        lineAnchor: "top",
        rotate: 45,
        fill: (d, i) => palette[i],
      }),

      // standard marks
      PlotLib.dot(data, {
        x: (d) => d._x,
        y: (d) => d._y,
        r: 2.55,
        symbol: (d) => (d.beta == null ? "circle" : "triangle"),
        stroke: (d) => palette[xIntervals.get(d._therapeuticAreaId).index],
        fill: (d) =>
          d.variant.id === pageId
            ? palette[xIntervals.get(d._therapeuticAreaId).index]
            : background,
        strokeWidth: 1.3,
        rotate: (d) => (d.beta < 0 ? 180 : 0),
        className: "obs-tooltip",
      }),
    ],
  });
}

function renderTooltip(datum) {
  const valueMaxWidth = "200px";

  const displayId = (
    <DisplayVariantId
      variantId={datum.variant.id}
      referenceAllele={datum.variant.referenceAllele}
      alternateAllele={datum.variant.alternateAllele}
      expand={false}
    />
  );

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
          {datum.variant.id === datum._pageId ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {displayId}
              <Chip label="self" variant="outlined" size="small" />
            </Box>
          ) : (
            <Link asyncTooltip to={`/variant/${datum.variant.id}`}>
              {displayId}
            </Link>
          )}
        </TooltipRow>
        <TooltipRow label="Reported trait" valueWidth={valueMaxWidth} truncateValue>
          {datum.study?.traitFromSource ?? naLabel}
        </TooltipRow>
        <TooltipRow label="Disease/phenotype" valueWidth={valueMaxWidth} truncateValue>
          {datum.study?.diseases?.length > 0 ? (
            <>
              {datum.study.diseases.map((d, i) => (
                <Fragment key={d.id}>
                  {i > 0 && ", "}
                  <Link asyncTooltip to={`/disease/${d.id}`}>
                    {d.name}
                  </Link>
                </Fragment>
              ))}
            </>
          ) : (
            naLabel
          )}
        </TooltipRow>
        <TooltipRow label="Study">
          {datum.study ? (
            <Link asyncTooltip to={`/study/${datum.study.id}`}>
              {datum.study.id}
            </Link>
          ) : (
            naLabel
          )}
        </TooltipRow>
        <TooltipRow label="P-value">
          <ScientificNotation number={[datum.pValueMantissa, datum.pValueExponent]} dp={2} />
        </TooltipRow>
        <TooltipRow label="Beta">{datum.beta?.toPrecision(3) ?? naLabel}</TooltipRow>
        <TooltipRow label="Posterior probability">
          {datum.locus?.rows?.[0].posteriorProbability.toPrecision(3) ?? naLabel}
        </TooltipRow>
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
        <TooltipRow label="Credible set size">{datum.locusSize?.count ?? naLabel}</TooltipRow>
      </TooltipTable>
    </Box>
  );
}

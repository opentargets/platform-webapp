import { Box, Paper, Typography } from "@mui/material";
import * as Plot from "@observablehq/plot";
import { ObsPlot } from "ui";
import type { MetricRow } from "./MetricsPage";

type StudyTypeCount = { name: string; category: string; count: number };
type LabelLayout = {
  item: StudyTypeCount;
  index: number;
  center: number;
  isExternal: boolean;
  position?: "above" | "below";
  lane?: number;
};

const labelFill = "#fff";
const barHeight = 72;
const externalLabelGap = 12;
const externalLabelPadding = 8;
const externalLabelLaneHeight = 22;
const externalLabelOffset = 18;
const insideLabelPadding = 12;
const studyTypeColors = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
];

function formatStudyType(name: string) {
  return name.replaceAll(/(gwas|qtl)/ig, (match) => match.toUpperCase());
}

function ByStudyTypeHBar({
  data,
  dataset,
  metric = "studyType",
  title,
}: {
  data: MetricRow[];
  dataset: string;
  metric?: string;
  title: string;
}) {
  const studyTypeOrder = getStudyTypeOrder(data);
  const chartData: StudyTypeCount[] = data
    .filter(
      (row) =>
        row.dataset === dataset &&
        row.kind === "grouping" &&
        row.metric === metric &&
        row.group_value
    )
    .map((row) => ({
      name: row.group_value,
      category: getStudyTypeCategory(row.group_value),
      count: row.value,
    }))
    .sort(
      (a, b) =>
        getStudyTypeRank(a.category, studyTypeOrder) - getStudyTypeRank(b.category, studyTypeOrder)
    );

  if (chartData.length === 0) return null;

  return (
    <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ m: 0, position: "absolute" }}>
          {title}
        </Typography>
        <ObsPlot
          data={chartData}
          minWidth={320}
          height={barHeight}
          renderChart={renderChart}
          gapInfo={0}
          renderInfo={() => null}
        />
      </Box>
    </Paper>
  );

  function renderChart({ data, width }: { data: StudyTypeCount[]; width?: number }) {
    const chartWidth = width ?? 0;
    const totalCount = data.reduce((total, item) => total + item.count, 0);
    const labels = calculateLabelLayout(data, chartWidth, totalCount);
    const externalLabels = labels
      .filter((label) => label.isExternal)
      .map((label, index) => ({
        ...label,
        position: index % 2 === 0 ? "above" : "below",
        lane: Math.floor(index / 2) + 1,
      }));
    const aboveLanes = Math.ceil(
      externalLabels.filter((label) => label.position === "above").length
    );
    const belowLanes = Math.ceil(
      externalLabels.filter((label) => label.position === "below").length
    );
    const marginTop = externalLabelPadding + aboveLanes * externalLabelLaneHeight;
    const marginBottom = externalLabelPadding + belowLanes * externalLabelLaneHeight;
    const chartHeight = marginTop + barHeight + marginBottom;
    const externalLabelIndexes = new Set(externalLabels.map((label) => label.index));

    const chart = Plot.plot({
      width: chartWidth,
      height: chartHeight,
      marginTop,
      marginBottom,
      marginLeft: 0,
      marginRight: 0,
      x: { axis: null },
      y: { axis: null },
      marks: [
        Plot.barX(
          data,
          Plot.stackX({
            x: "count",
            y: () => "Studies",
            fill: (item) => getStudyTypeColor(item.category, studyTypeOrder),
            insetTop: 2,
            insetBottom: 2,
            className: "study-type-segment",
          })
        ),
        Plot.text(
          data,
          Plot.stackX1({
            x: "count",
            y: () => "Studies",
            text: (item, index) =>
              externalLabelIndexes.has(index) ? "" : formatStudyType(item.name),
            textAnchor: "start",
            dx: 6,
            dy: -16,
            fill: labelFill,
            fontSize: 13.5,
            fontWeight: 700,
          })
        ),
        Plot.text(
          data,
          Plot.stackX1({
            x: "count",
            y: () => "Studies",
            text: (item, index) =>
              externalLabelIndexes.has(index) ? "" : item.count.toLocaleString(),
            textAnchor: "start",
            dx: 6,
            fill: labelFill,
            fontSize: 12,
            fontWeight: 400,
          })
        ),
        Plot.text(
          data,
          Plot.stackX1({
            x: "count",
            y: () => "Studies",
            text: (item, index) =>
              externalLabelIndexes.has(index)
                ? ""
                : `${((item.count / totalCount) * 100).toFixed(1)}%`,
            textAnchor: "start",
            dx: 6,
            dy: 16,
            fill: labelFill,
            fontSize: 12,
            fontWeight: 400,
          })
        ),
      ],
    }) as SVGSVGElement;

    appendExternalLabels({
      chart,
      labels: externalLabels,
      totalCount,
    });

    return chart;
  }
}

function getStudyTypeOrder(data: MetricRow[]) {
  const studyTypes = data
    .filter(
      (row) =>
        row.dataset === "study" &&
        row.kind === "grouping" &&
        row.metric === "studyType" &&
        row.group_value
    )
    .sort((a, b) => b.value - a.value)
    .map((row) => getStudyTypeCategory(row.group_value));
  const orderedStudyTypes = ["gwas", ...studyTypes.filter((studyType) => studyType !== "gwas")];

  return new Map(orderedStudyTypes.map((studyType, index) => [studyType, index]));
}

function getStudyTypeCategory(name: string) {
  return name.split("-")[1] ?? name;
}

function getStudyTypeColor(category: string, studyTypeOrder: Map<string, number>) {
  const index = getStudyTypeRank(category, studyTypeOrder);
  return studyTypeColors[index % studyTypeColors.length];
}

function getStudyTypeRank(category: string, studyTypeOrder: Map<string, number>) {
  return studyTypeOrder.get(category) ?? studyTypeColors.length;
}

function calculateLabelLayout(
  data: StudyTypeCount[],
  width: number,
  totalCount: number
): LabelLayout[] {
  let segmentStart = 0;

  return data.map((item, index) => {
    const segmentWidth = (item.count / totalCount) * width;
    const labelWidth = Math.max(
      measureText(formatStudyType(item.name), "700 14px sans-serif"),
      measureText(item.count.toLocaleString(), "400 12px sans-serif"),
      measureText(
        `${((item.count / totalCount) * 100).toFixed(1)}%`,
        "400 12px sans-serif"
      )
    );
    const center = segmentStart + segmentWidth / 2;
    segmentStart += segmentWidth;

    return {
      item,
      index,
      center,
      isExternal: labelWidth + insideLabelPadding > segmentWidth,
    };
  });
}

function appendExternalLabels({
  chart,
  labels,
  totalCount,
}: {
  chart: SVGSVGElement;
  labels: LabelLayout[];
  totalCount: number;
}) {
  const namespace = "http://www.w3.org/2000/svg";
  const segments = Array.from(
    chart.querySelectorAll<SVGRectElement>("g.study-type-segment rect")
  );

  labels.forEach((label) => {
    if (!label.position || !label.lane) return;

    const segment = segments.find(
      (element) => (element as SVGRectElement & { __data__?: number }).__data__ === label.index
    );
    if (!segment) return;

    const isAbove = label.position === "above";
    const segmentX = Number(segment.getAttribute("x"));
    const segmentWidth = Number(segment.getAttribute("width"));
    const segmentTop = Number(segment.getAttribute("y"));
    const segmentHeight = Number(segment.getAttribute("height"));
    const center = segmentX + segmentWidth / 2;
    const segmentBottom = segmentTop + segmentHeight;
    const isRightAligned = center >= Number(chart.getAttribute("width")) / 2;
    const labelY = isAbove
      ? segmentTop - externalLabelOffset - (label.lane - 1) * externalLabelLaneHeight
      : segmentBottom + externalLabelOffset + (label.lane - 1) * externalLabelLaneHeight;
    const lineEnd = center + (isRightAligned ? -externalLabelGap : externalLabelGap);
    const path = document.createElementNS(namespace, "path");
    const text = document.createElementNS(namespace, "text");

    path.setAttribute(
      "d",
      `M${center},${isAbove ? segmentTop : segmentBottom}V${labelY}H${lineEnd}`
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1");
    chart.append(path);

    text.setAttribute(
      "x",
      `${lineEnd + (isRightAligned ? -externalLabelPadding / 2 : externalLabelPadding / 2)}`
    );
    text.setAttribute("y", `${labelY + 2}`);
    text.setAttribute("fill", "currentColor");
    text.setAttribute("font-size", "12");
    text.setAttribute("text-anchor", isRightAligned ? "end" : "start");
    text.setAttribute("dominant-baseline", "middle");
    appendTextSpan(text, formatStudyType(label.item.name), 13.5, 600);
    appendTextSpan(text, `\u00a0${label.item.count.toLocaleString()}`, 12, 400);
    appendTextSpan(text, `\u00a0${((label.item.count / totalCount) * 100).toFixed(1)}%`, 12, 400);
    chart.append(text);
  });
}

function appendTextSpan(text: SVGTextElement, value: string, fontSize: number, fontWeight: number) {
  const span = document.createElementNS("http://www.w3.org/2000/svg", "tspan");

  span.setAttribute("font-size", `${fontSize}`);
  span.setAttribute("font-weight", `${fontWeight}`);
  span.textContent = value;
  text.append(span);
}

function measureText(value: string, font: string) {
  const context = document.createElement("canvas").getContext("2d");

  if (!context) return value.length * 8;
  context.font = font;
  return context.measureText(value).width;
}

export default ByStudyTypeHBar;

import { Box, Paper, Typography } from "@mui/material";
import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { MetricRow } from "./MetricsPage";

type StudyTypeCount = { name: string; count: number };
type StudyTypeArc = d3.PieArcDatum<StudyTypeCount>;

const chartHeight = 360;
const labelOffset = 24;

function formatStudyType(name: string) {
  return name.replaceAll(/(gwas|qtl)/gi, (match) => match.toUpperCase());
}

function ByStudyTypeDonut({
  data,
  dataset,
  title,
}: {
  data: MetricRow[];
  dataset: string;
  title: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartData: StudyTypeCount[] = data
    .filter(
      (row) =>
        row.dataset === dataset &&
        row.kind === "grouping" &&
        row.expression === "studyType" &&
        row.group_value
    )
    .map((row) => ({ name: row.group_value, count: row.value }))
    .sort((a, b) => b.count - a.count);

  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const radius = Math.min(width, chartHeight) / 2 - 80;
    const totalCount = d3.sum(chartData, (item) => item.count);
    const pie = d3.pie<StudyTypeCount>().value((item) => item.count).sort(null);
    const arc = d3.arc<StudyTypeArc>().innerRadius(radius * 0.6).outerRadius(radius);
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(chartData.map((item) => item.name));
    const labelRadius = radius + labelOffset;
    const chart = svg
      .attr("viewBox", `0 0 ${width} ${chartHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .selectAll<SVGGElement, null>("g.chart")
      .data([null])
      .join("g")
      .attr("class", "chart")
      .attr("transform", `translate(${width / 2},${chartHeight / 2})`);
    const arcs = pie(chartData);

    chart.selectAll("*").remove();

    chart
      .selectAll<SVGPathElement, StudyTypeArc>("path.segment")
      .data(arcs)
      .join("path")
      .attr("class", "segment")
      .attr("fill", (item) => color(item.data.name))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("d", arc);

    chart
      .selectAll<SVGLineElement, StudyTypeArc>("line.label-connector")
      .data(arcs)
      .join("line")
      .attr("class", "label-connector")
      .attr("x1", (item) => polarPoint(item, radius)[0])
      .attr("y1", (item) => polarPoint(item, radius)[1])
      .attr("x2", (item) => polarPoint(item, labelRadius)[0])
      .attr("y2", (item) => polarPoint(item, labelRadius)[1])
      .attr("stroke", "#5a5f5f");

    const labels = chart
      .selectAll<SVGTextElement, StudyTypeArc>("text.label")
      .data(arcs)
      .join("text")
      .attr("class", "label")
      .attr("transform", (item) => {
        const [x, y] = polarPoint(item, labelRadius);
        return `translate(${x},${y})`;
      })
      .attr("text-anchor", (item) => (polarPoint(item, labelRadius)[0] >= 0 ? "start" : "end"))
      .attr("dominant-baseline", "middle")
      .attr("fill", "#343a40")
      .attr("font-size", 12);

    labels
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "-1.1em")
      .attr("font-weight", 700)
      .text((item) => formatStudyType(item.data.name));

    labels
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .attr("font-weight", 400)
      .text((item) => item.data.count.toLocaleString());

    labels
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.2em")
      .attr("font-weight", 400)
      .text((item) => `${((item.data.count / totalCount) * 100).toFixed(1)}%`);
  }, [chartData]);

  if (chartData.length === 0) return null;

  return (
    <Paper sx={{ py: 2, px: 3, maxWidth: "100%" }} elevation={0} variant="outlined">
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        {title}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <svg ref={svgRef} width="100%" height={chartHeight} role="img" aria-label={title} />
      </Box>
    </Paper>
  );
}

function polarPoint(arc: StudyTypeArc, distance: number): [number, number] {
  const angle = (arc.startAngle + arc.endAngle) / 2;
  return [Math.sin(angle) * distance, -Math.cos(angle) * distance];
}

export default ByStudyTypeDonut;

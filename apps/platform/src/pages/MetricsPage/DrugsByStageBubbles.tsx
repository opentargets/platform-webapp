import { Box, Typography, useTheme } from "@mui/material";
import { getContrastRatio } from "@mui/material/styles";
import { clinicalStageCategories, SEQUENTIAL_SCHEME_BLUE } from "@ot/constants";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { interpolateRgbBasis } from "d3";
import type { MetricRow } from "./MetricsPage";

type ClinicalStage = { value: string; name: string; index: number };
type StageCount = ClinicalStage & { count: number };
type Layout = "wide" | "compact" | "stacked";

const maxCircleDiameter = 88;
const externalCountHeight = 16;
const externalCountGap = 3;
const preclinicalIndex = clinicalStageCategories.PRECLINICAL.index;
const approvalIndex = clinicalStageCategories.APPROVAL.index;

export function interpolateColor(t) {
  return interpolateRgbBasis(SEQUENTIAL_SCHEME_BLUE.slice(1))(t);
}

function DrugsByStageBubbles({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const stages: ClinicalStage[] = Object.entries(clinicalStageCategories)
    .map(([value, { label, index }]) => ({ value, name: label, index }))
    .sort((a, b) => a.index - b.index);

  const counts = new Map(
    data
      .filter(
        (row) =>
          (row.dataset === "drug_molecule" || row.dataset === "clinical_report") &&
          row.kind === "grouping" &&
          row.metric === "clinicalStage" &&
          row.group_value
      )
      .map((row) => [`${row.dataset}:${row.group_value}`, row.value])
  );
  const drugData = stages.map((stage) => ({ ...stage, count: counts.get(`drug_molecule:${stage.value}`) ?? 0 }));
  const reportData = stages.map((stage) => ({ ...stage, count: counts.get(`clinical_report:${stage.value}`) ?? 0 }));
  const maxDrugCount = Math.max(...drugData.map((stage) => stage.count));
  const maxReportCount = Math.max(...reportData.map((stage) => stage.count));

  useLayoutEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      setAvailableWidth((currentWidth) => (currentWidth === width ? currentWidth : width));
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [maxDrugCount, maxReportCount]);

  if (maxDrugCount === 0 && maxReportCount === 0) return null;

  const layout: Layout = availableWidth >= 1200 ? "wide" : availableWidth >= 760 ? "compact" : "stacked";
  const hasSideLabels = layout !== "stacked";
  const rowLabelWidth = layout === "wide" ? 120 : 94;
  const firstStageInset = layout === "wide" ? 16 : 8;
  const diagonalLabelGutter = 36;
  const minimumStageWidth = 42;
  const minimumChartWidth = (hasSideLabels ? rowLabelWidth + firstStageInset : firstStageInset) + stages.length * minimumStageWidth;
  const chartWidth = Math.max(availableWidth, minimumChartWidth);
  const stageColumnWidth = Math.max(
    minimumStageWidth,
    (chartWidth - (hasSideLabels ? rowLabelWidth : 0) - firstStageInset - diagonalLabelGutter) / stages.length
  );
  const bubbleRowHeight = layout === "wide" ? 104 : layout === "compact" ? 96 : 92;
  const bubbleCenterY = bubbleRowHeight / 2;
  const reportRowHeight = layout === "wide" ? 140 : layout === "compact" ? 126 : 116;
  const maxBarHeight = layout === "wide" ? 115 : layout === "compact" ? 100 : 88;
  const maxBubbleDiameter = Math.min(maxCircleDiameter, Math.max(24, stageColumnWidth - 12));
  const barWidth = Math.min(60, Math.max(10, stageColumnWidth * 0.62));
  const gridTemplateColumns = `repeat(${stages.length}, minmax(0, 1fr))`;

  return (
    <Box sx={{ minWidth: 0, pb: 1.5 }}>
      <Box ref={chartRef} sx={{ overflowX: "auto", mt: 2 }}>
        <Box sx={{ minWidth: `${minimumChartWidth}px` }}>
          <StageLabels />
          <CoverageRow title="Drugs or candidates by max stage"><DrugBubbles data={drugData} maxCount={maxDrugCount} /></CoverageRow>
          <CoverageRow title="Clinical reports"><ReportBars data={reportData} maxCount={maxReportCount} /></CoverageRow>
        </Box>
      </Box>
    </Box>
  );

  function StageLabels() {
    const labels = (
      <Box sx={{ overflowX: "clip" }}>
        <Box sx={{ display: "grid", gridTemplateColumns, ml: `${firstStageInset}px`, mr: `${diagonalLabelGutter}px` }}>
          {stages.map((stage) => (
            <Box key={stage.value} sx={{ height: "78px", position: "relative" }}>
              <Typography
                variant="caption"
                sx={{
                  bottom: 8,
                  fontSize: "13.5px",
                  left: "50%",
                  lineHeight: 1.2,
                  position: "absolute",
                  px: 0.5,
                  right: "auto",
                  textAlign: "center",
                  transform: "rotate(-40deg)",
                  transformOrigin: "left bottom",
                  width: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {stage.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );

    if (!hasSideLabels) return labels;
    return <Box sx={{ display: "grid", gridTemplateColumns: `${rowLabelWidth}px minmax(0, 1fr)` }}><Box />{labels}</Box>;
  }

  function CoverageRow({ title, children }: { title: string; children: ReactNode }) {
    if (!hasSideLabels) {
      return (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ display: "block", fontWeight: 700, mb: 0.5, fontSize: 13 }}>{title}</Typography>
          {children}
        </Box>
      );
    }

    return (
      <Box sx={{ display: "grid", gridTemplateColumns: `${rowLabelWidth}px minmax(0, 1fr)` }}>
        <Typography align="right" variant="caption" sx={{ alignSelf: "center", fontWeight: 700, pr: 2, fontSize: 13 }}>{title}</Typography>
        {children}
      </Box>
    );
  }

  function DrugBubbles({ data: bubbleData, maxCount }: { data: StageCount[]; maxCount: number }) {
    return (
      <Box sx={{ display: "grid", gridTemplateColumns, height: `${bubbleRowHeight}px`, ml: `${firstStageInset}px`, mr: `${diagonalLabelGutter}px`, position: "relative" }}>
        <Box sx={{ bgcolor: theme.palette.grey[300], height: "1px", left: `${((preclinicalIndex + 0.5) / stages.length) * 100}%`, position: "absolute", top: `${bubbleCenterY - 0.5}px`, width: `${((approvalIndex - preclinicalIndex) / stages.length) * 100}%`, zIndex: 0 }} />
        {bubbleData.map((stage) => {
          if (stage.count === 0) return <Box key={stage.value} />;

          const countLabel = stage.count.toLocaleString();
          const diameter = Math.max(2, (Math.sqrt(stage.count) / Math.sqrt(maxCount)) * maxBubbleDiameter);
          const showCountInside = diameter >= countLabel.length * 7 + 12;

          return (
            <Box key={stage.value} sx={{ position: "relative", zIndex: 1 }}>
              {!showCountInside && (
                <Typography align="center" variant="caption" sx={{ fontSize: "12.5px", fontWeight: 400, height: `${externalCountHeight}px`, left: 0, lineHeight: `${externalCountHeight}px`, position: "absolute", right: 0, top: `${bubbleCenterY - diameter / 2 - externalCountHeight - externalCountGap}px` }}>
                  {countLabel}
                </Typography>
              )}
              <Box aria-label={`${stage.name}: ${countLabel} drugs`} sx={{ alignItems: "center", bottom: "12px", display: "flex", justifyContent: "center", left: 0, position: "absolute", right: 0, top: "12px" }}>
                <Box sx={{ alignItems: "center", bgcolor: stageColor(stage), borderRadius: "50%", boxShadow: theme.boxShadow.md, display: "flex", height: `${diameter}px`, justifyContent: "center", minHeight: "2px", minWidth: "2px", width: `${diameter}px` }}>
                  {showCountInside && <Typography variant="caption" sx={{ color: countTextColor(stage), fontSize: "12.5px", fontWeight: 400 }}>{countLabel}</Typography>}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  function ReportBars({ data: barData, maxCount }: { data: StageCount[]; maxCount: number }) {
    return (
      <Box sx={{ alignItems: "end", display: "grid", gridTemplateColumns, height: `${reportRowHeight}px`, ml: `${firstStageInset}px`, mr: `${diagonalLabelGutter}px` }}>
        {barData.map((stage) => {
          if (stage.count === 0) return <Box key={stage.value} />;

          const countLabel = stage.count.toLocaleString();
          const height = Math.max(1, (stage.count / maxCount) * maxBarHeight);
          const showCountInside = height >= 28 && barWidth >= countLabel.length * 7 + 10;

          return (
            <Box key={stage.value} sx={{ height: "100%", position: "relative" }}>
              <Box aria-label={`${stage.name}: ${countLabel} clinical reports`} sx={{ alignItems: "flex-start", bgcolor: stageColor(stage), bottom: 0, display: "flex", height: `${height}px`, justifyContent: "center", left: "50%", position: "absolute", pt: showCountInside ? 0.5 : 0, transform: "translateX(-50%)", width: `${barWidth}px` }}>
                {showCountInside && <Typography variant="caption" sx={{ color: countTextColor(stage), fontSize: "12.5px", fontWeight: 400 }}>{countLabel}</Typography>}
              </Box>
              {!showCountInside && <Typography align="center" variant="caption" sx={{ bottom: height + 1, fontSize: "12.5px", fontWeight: 400, left: 0, position: "absolute", right: 0 }}>{countLabel}</Typography>}
            </Box>
          );
        })}
      </Box>
    );
  }

  function stageColor(stage: Pick<ClinicalStage, "index">) {
    if (stage.index === clinicalStageCategories.UNKNOWN.index) return "#e3e3e3";
    return interpolateColor(
      (stage.index - preclinicalIndex) / (approvalIndex - preclinicalIndex)
    );
  }

  function countTextColor(stage: ClinicalStage) {
    const backgroundColor = stageColor(stage);

    return getContrastRatio(backgroundColor, theme.palette.text.primary) >= getContrastRatio(backgroundColor, theme.palette.common.white)
      ? "#000000"
      : theme.palette.common.white;
  }
}

export default DrugsByStageBubbles;

import { Box, Typography, useTheme } from "@mui/material";
import { clinicalStageCategories } from "@ot/constants";
import type { MetricRow } from "./MetricsPage";

type ClinicalStage = { value: string; name: string; index: number };
type StageCount = ClinicalStage & { count: number };

const maxCircleDiameter = 88;
const stageColumnWidth = 88;
const rowLabelWidth = 125;
const firstStageInset = 25;
const bubbleRowHeight = 112;
const bubbleCenterY = bubbleRowHeight / 2;
const externalCountHeight = 16;
const externalCountGap = 3;
const preclinicalIndex = clinicalStageCategories.PRECLINICAL.index;
const approvalIndex = clinicalStageCategories.APPROVAL.index;
const gradientStart = [240, 197, 132];
const gradientEnd = [82, 162, 55];

function DrugsbyStageBubbles({ data }: { data: MetricRow[] }) {
  const theme = useTheme();
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
  const drugData = stages.map((stage) => ({
    ...stage,
    count: counts.get(`drug_molecule:${stage.value}`) ?? 0,
  }));
  const reportData = stages.map((stage) => ({
    ...stage,
    count: counts.get(`clinical_report:${stage.value}`) ?? 0,
  }));
  const maxDrugCount = Math.max(...drugData.map((stage) => stage.count));
  const maxReportCount = Math.max(...reportData.map((stage) => stage.count));

  if (maxDrugCount === 0 && maxReportCount === 0) return null;

  const gridTemplateColumns = `repeat(${stages.length}, minmax(${stageColumnWidth}px, 1fr))`;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ m: 0 }}>
        Drug coverage
      </Typography>
      <Box sx={{ overflowX: "auto", mt: 2 }}>
        <Box sx={{ minWidth: rowLabelWidth + firstStageInset + stages.length * stageColumnWidth }}>
          <Box sx={{ display: "grid", gridTemplateColumns: `${rowLabelWidth}px minmax(0, 1fr)` }}>
            <Box />
            <Box sx={{ display: "grid", gridTemplateColumns, ml: `${firstStageInset}px` }}>
              {stages.map((stage) => (
                <Typography
                  key={stage.value}
                  align="center"
                  variant="caption"
                  sx={{ fontSize: "13.5px", lineHeight: 1.2, minHeight: "26px", px: 0.5 }}
                >
                  {stage.name}
                </Typography>
              ))}
            </Box>
          </Box>
          <CoverageRow title="Drugs - max stage">
            <DrugBubbles data={drugData} maxCount={maxDrugCount} />
          </CoverageRow>
          <CoverageRow title="Clinical reports">
            <ReportBars data={reportData} maxCount={maxReportCount} />
          </CoverageRow>
        </Box>
      </Box>
      <Typography variant="caption" component="p" sx={{ pt: 4, fontSize: 13 }}>Note: if we like this, will need improvement to work on narrower screens</Typography>
    </Box>
  );

  function CoverageRow({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <Box sx={{ display: "grid", gridTemplateColumns: `${rowLabelWidth}px minmax(0, 1fr)` }}>
        <Typography align="right" variant="caption" sx={{ alignSelf: "center", fontWeight: 700, pr: 2 }}>
          {title}
        </Typography>
        {children}
      </Box>
    );
  }

  function DrugBubbles({ data: bubbleData, maxCount }: { data: StageCount[]; maxCount: number }) {
    return (
      <Box sx={{ position: "relative", display: "grid", gridTemplateColumns, height: `${bubbleRowHeight}px`, ml: `${firstStageInset}px` }}>
        <Box
          sx={{
            position: "absolute",
            top: `${bubbleCenterY - 0.5}px`,
            left: `${((preclinicalIndex + 0.5) / stages.length) * 100}%`,
            width: `${((approvalIndex - preclinicalIndex) / stages.length) * 100}%`,
            height: "1px",
            bgcolor: theme.palette.grey[300],
            zIndex: 0,
          }}
        />
        {bubbleData.map((stage) => {
          if (stage.count === 0) return <Box key={stage.value} />;

          const countLabel = stage.count.toLocaleString();
          const diameter = (Math.sqrt(stage.count) / Math.sqrt(maxCount)) * maxCircleDiameter;
          const fill = stageColor(stage);
          const showCountInside = diameter >= countLabel.length * 7 + 12;

          return (
            <Box key={stage.value} sx={{ position: "relative", zIndex: 1 }}>
              {!showCountInside && (
                <Typography
                  align="center"
                  variant="caption"
                  sx={{
                    position: "absolute",
                    top: `${bubbleCenterY - diameter / 2 - externalCountHeight - externalCountGap}px`,
                    left: 0,
                    right: 0,
                    height: `${externalCountHeight}px`,
                    lineHeight: `${externalCountHeight}px`,
                    fontSize: "12.5px",
                    fontWeight: 400,
                  }}
                >
                  {countLabel}
                </Typography>
              )}
              <Box
                aria-label={`${stage.name}: ${countLabel} drugs`}
                sx={{
                  position: "absolute",
                  top: "12px",
                  bottom: "12px",
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    minWidth: "2px",
                    minHeight: "2px",
                    borderRadius: "50%",
                    bgcolor: fill,
                    boxShadow: theme.boxShadow.md,
                  }}
                >
                  {showCountInside && (
                    <Typography
                      variant="caption"
                      sx={{ color: countTextColor(stage), fontSize: "12.5px", fontWeight: 400 }}
                    >
                      {countLabel}
                    </Typography>
                  )}
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
      <Box sx={{ display: "grid", gridTemplateColumns, height: "145px", alignItems: "end", ml: `${firstStageInset}px` }}>
        {barData.map((stage) => {
          if (stage.count === 0) return <Box key={stage.value} />;

          const countLabel = stage.count.toLocaleString();
          const height = (stage.count / maxCount) * 115;
          const showCountInside = height >= 28;
          const fill = stageColor(stage);

          return (
            <Box key={stage.value} sx={{ position: "relative", height: "100%" }}>
              <Box
                aria-label={`${stage.name}: ${countLabel} clinical reports`}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: "14px",
                  right: "14px",
                  height: `${height}px`,
                  bgcolor: fill,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  pt: 0.5,
                }}
              >
                {showCountInside && (
                  <Typography
                    variant="caption"
                    sx={{ color: countTextColor(stage), fontSize: "12.5px", fontWeight: 400 }}
                  >
                    {countLabel}
                  </Typography>
                )}
              </Box>
              {!showCountInside && (
                <Typography
                  align="center"
                  variant="caption"
                  sx={{
                    position: "absolute",
                    bottom: `${height + 4}px`,
                    left: 0,
                    right: 0,
                    fontSize: "12.5px",
                    fontWeight: 400,
                  }}
                >
                  {countLabel}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  function stageColor(stage: Pick<ClinicalStage, "index">) {
    if (stage.index === clinicalStageCategories.UNKNOWN.index) return "rgb(225, 239, 249)";

    const position = Math.min(
      Math.max((stage.index - preclinicalIndex) / (approvalIndex - preclinicalIndex), 0),
      1
    );
    const color = gradientStart.map((start, index) => Math.round(start + (gradientEnd[index] - start) * position));
    return `rgb(${color.join(", ")})`;
  }

  function countTextColor(stage: ClinicalStage) {
    return stage.index === clinicalStageCategories.UNKNOWN.index || stage.index === preclinicalIndex
      ? theme.palette.text.primary
      : theme.palette.common.white;
  }
}

export default DrugsbyStageBubbles;

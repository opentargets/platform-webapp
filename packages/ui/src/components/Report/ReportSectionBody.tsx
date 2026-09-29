import React from "react";
import { Box, Typography } from "@mui/material";
import { ReportSectionContext } from "../../providers/ReportSectionContext";
import { ReportComponentStateProvider } from "../../providers/ReportComponentStateContext";
import { ReportSection } from "../../types/report";
import { getRenderFunctions, useReportSectionContent } from "../../hooks/useReportSectionRenderer";

/**
 * Whether a section can render a chart view. Only resolves render functions —
 * nothing is mounted, so it's safe to call for collapsed sections.
 */
export const sectionHasChart = (section: ReportSection): boolean => {
  const { renderChart } = getRenderFunctions(section);
  return !!renderChart && renderChart() != null;
};

/**
 * Rendered widget for an expanded report section.
 * This is the only place useReportSectionContent runs, so collapsed rows never
 * mount their Body (and never re-run its query).
 */
export const ReportSectionBody: React.FC<{ section: ReportSection; id: string }> = ({
  section,
  id,
}) => {
  const content = useReportSectionContent(section);
  const showChart = section.selectedView === "chart" && content.chart != null;
  const rendered = showChart ? content.chart : content.body;

  return (
    <Box
      id={id}
      role="region"
      aria-label={section.definition.name}
      sx={{
        borderTop: "1px solid",
        borderColor: "grey.300",
        p: "14px",
        "& > div, & > table, & > svg, & > canvas": {
          width: "100%",
          height: "auto",
        },
      }}
    >
      <ReportComponentStateProvider initialState={section.componentState}>
        <ReportSectionContext.Provider
          value={{
            entityId: section.entityId,
            entityLabel: section.entityLabel,
            entityType: section.definition.entity,
          }}
        >
          {rendered}
        </ReportSectionContext.Provider>
      </ReportComponentStateProvider>
      {!rendered && (
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", fontSize: "0.8rem", color: "grey.700", textAlign: "center" }}
        >
          Content not available. Navigate to the {section.definition.entity} page to load section
          content.
        </Typography>
      )}
    </Box>
  );
};

export default ReportSectionBody;

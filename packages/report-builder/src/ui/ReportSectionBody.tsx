import React from "react";
import { Box, Typography } from "@mui/material";
import type { ReportSection } from "../core";
import { useWidgetDefinition, WidgetRenderer } from "../react";

/** Whether the section's registered widget offers a chart view. */
export const useSectionHasChart = (section: ReportSection): boolean =>
  !!useWidgetDefinition(section)?.views?.includes("chart");

/**
 * Rendered widget for an expanded report section. This is the only place the
 * widget mounts, so collapsed rows never mount their Body (and never re-run its query).
 */
export const ReportSectionBody: React.FC<{ section: ReportSection; id: string }> = ({ section, id }) => (
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
    <WidgetRenderer
      section={section}
      missing={(s) => (
        <Typography
          variant="body2"
          sx={{ fontStyle: "italic", fontSize: "0.8rem", color: "grey.700", textAlign: "center" }}
        >
          Section not available - no renderer found for {s.definition.name}. Navigate to the{" "}
          {s.definition.entity} page to load section content.
        </Typography>
      )}
    />
  </Box>
);

export default ReportSectionBody;

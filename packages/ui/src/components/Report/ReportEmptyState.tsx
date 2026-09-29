import React, { ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface ReportEmptyStateProps {
  onAddBlock: (anchorEl: HTMLElement) => void;
  // Rendered under the prompt, e.g. the inline inspector on narrow screens
  footer?: ReactNode;
}

const pillSx = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  px: "7px",
  border: "1px solid rgb(196,196,196)",
  borderRadius: "2px",
  fontSize: 12,
  whiteSpace: "nowrap",
  verticalAlign: "1px",
} as const;

/**
 * Main area of the drawer while the active report has no blocks
 */
export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({ onAddBlock, footer }) => (
  <Box sx={{ bgcolor: "grey.50", overflowY: "auto", minHeight: 0, px: 2, pb: 4 }}>
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        pt: 7,
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700, color: "#616161" }}>
        This report is empty
      </Typography>
      <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
        Go to any section on a target, disease or drug page and click{" "}
        <Box component="span" sx={pillSx}>
          + Add to report
        </Box>
        . It appears here with the filters you had set.
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <Button
          variant="outlined"
          aria-haspopup="dialog"
          onClick={(e) => onAddBlock(e.currentTarget)}
          sx={{ height: 36, flexShrink: 0 }}
        >
          + Add a block
        </Button>
        <Typography sx={{ fontSize: 13, color: "#616161" }}>
          Text, headings, images or data, to start with a question or context.
        </Typography>
      </Box>
      {footer}
    </Box>
  </Box>
);

export default ReportEmptyState;

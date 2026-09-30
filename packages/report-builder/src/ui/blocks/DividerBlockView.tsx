import React from "react";
import { Box } from "@mui/material";
import { DividerBlock } from "../../core";
import { InlineBlockFrame } from "./BlockFrames";
import { FOCUS_TARGET_ATTR } from "./BlockEditorContext";
import { BlockViewProps } from "./types";

export const DividerBlockView: React.FC<BlockViewProps<DividerBlock>> = ({ block, index }) => (
  <InlineBlockFrame reportSectionId={block.reportSectionId} index={index} title="Divider">
    <Box
      role="separator"
      tabIndex={-1}
      {...{ [FOCUS_TARGET_ATTR]: "" }}
      sx={{ py: "13px", outline: "none", "&:focus-visible": { bgcolor: "#f2f8fd" } }}
    >
      <Box sx={{ height: "1px", bgcolor: "grey.300" }} />
    </Box>
  </InlineBlockFrame>
);

export default DividerBlockView;

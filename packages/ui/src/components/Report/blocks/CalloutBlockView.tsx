import React from "react";
import { Box, Typography } from "@mui/material";
import { CalloutBlock, CalloutTone } from "../../../types/report";
import { InlineBlockFrame } from "./BlockFrames";
import { useBlockEditor } from "./BlockEditorContext";
import { RichTextEditor } from "./RichTextEditor";
import { BlockViewProps } from "./types";

export const CALLOUT_TONES: Record<CalloutTone, { label: string; border: string; bg: string; name: string }> =
  {
    info: { label: "NOTE", border: "primary.main", bg: "#f2f8fd", name: "Note" },
    finding: { label: "FINDING", border: "primary.dark", bg: "#e3f0fa", name: "Finding" },
    warning: { label: "CAVEAT", border: "secondary.main", bg: "#ffefec", name: "Caveat" },
  };

export const CalloutBlockView: React.FC<BlockViewProps<CalloutBlock>> = ({ block, index }) => {
  const { updateBlock } = useBlockEditor();
  const tone = CALLOUT_TONES[block.tone];

  return (
    <InlineBlockFrame
      reportSectionId={block.reportSectionId}
      index={index}
      title={`${tone.name} callout`}
      menuItems={(Object.keys(CALLOUT_TONES) as CalloutTone[])
        .filter((t) => t !== block.tone)
        .map((t) => ({
          label: `Change to ${CALLOUT_TONES[t].name.toLowerCase()}`,
          onClick: () => updateBlock(block.reportSectionId, { tone: t }),
        }))}
    >
      <Box
        sx={{ borderLeft: "3px solid", borderColor: tone.border, bgcolor: tone.bg, p: "8px 14px", my: 0.5 }}
      >
        <Typography
          sx={{
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 11,
            color: tone.border,
            letterSpacing: ".06em",
            mb: 0.25,
          }}
        >
          {tone.label}
        </Typography>
        <RichTextEditor
          doc={block.doc}
          ariaLabel={`${tone.name} callout`}
          placeholder="Write a note…"
          onChange={(doc) => updateBlock(block.reportSectionId, { doc })}
        />
      </Box>
    </InlineBlockFrame>
  );
};

export default CalloutBlockView;

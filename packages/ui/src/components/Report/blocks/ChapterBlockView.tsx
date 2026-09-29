import React, { useEffect, useState } from "react";
import { Box, InputBase, Typography } from "@mui/material";
import { ChapterBlock } from "../../../types/report";
import { InlineBlockFrame } from "./BlockFrames";
import { FOCUS_TARGET_ATTR, useBlockEditor } from "./BlockEditorContext";
import { BlockViewProps } from "./types";

/**
 * Full-width chapter band. The number is derived (chapters up to and including
 * this one), never stored.
 */
export const ChapterBlockView: React.FC<BlockViewProps<ChapterBlock>> = ({ block, index }) => {
  const { report, updateBlock } = useBlockEditor();
  const [title, setTitle] = useState(block.title);

  useEffect(() => setTitle(block.title), [block.title]);

  const number = report.sections.slice(0, index + 1).filter((b) => b.kind === "chapter").length;
  const save = () => {
    if (title !== block.title) updateBlock(block.reportSectionId, { title });
  };

  return (
    <InlineBlockFrame
      reportSectionId={block.reportSectionId}
      index={index}
      title={block.title ? `Chapter ${number} · ${block.title}` : `Chapter ${number}`}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          gap: 1,
          pt: 1,
          pb: 0.75,
          borderBottom: "1px solid",
          borderColor: "grey.300",
        }}
      >
        <Typography component="span" sx={{ fontSize: 20, fontWeight: 700, color: "#616161", flexShrink: 0 }}>
          {number} ·
        </Typography>
        <InputBase
          fullWidth
          value={title}
          placeholder="Chapter title"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          inputProps={{ "aria-label": `Chapter ${number} title`, [FOCUS_TARGET_ATTR]: "" }}
          sx={{ fontSize: 20, fontWeight: 700, color: "#616161", "& input": { p: 0 } }}
        />
      </Box>
    </InlineBlockFrame>
  );
};

export default ChapterBlockView;

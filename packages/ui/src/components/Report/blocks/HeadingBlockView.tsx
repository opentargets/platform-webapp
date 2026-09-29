import React, { useEffect, useState } from "react";
import { Box, InputBase, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { HeadingBlock } from "../../../types/report";
import { InlineBlockFrame } from "./BlockFrames";
import { FOCUS_TARGET_ATTR, useBlockEditor } from "./BlockEditorContext";
import { createBlock } from "./defaults";
import { BlockViewProps } from "./types";

const LEVEL_SX = {
  2: { fontSize: 20, fontWeight: 700, color: "#616161" },
  3: { fontSize: 16, fontWeight: 700, color: "#616161" },
} as const;

/**
 * Single-line plain heading with an H2 | H3 toggle shown while focused
 */
export const HeadingBlockView: React.FC<BlockViewProps<HeadingBlock>> = ({ block, index }) => {
  const { report, updateBlock, insertBlock, removeBlock } = useBlockEditor();
  const [text, setText] = useState(block.text);
  const [focused, setFocused] = useState(false);

  useEffect(() => setText(block.text), [block.text]);

  const save = () => {
    if (text !== block.text) updateBlock(block.reportSectionId, { text });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
      insertBlock(createBlock("text", report.sections), index + 1);
    } else if (event.key === "Backspace" && text === "") {
      event.preventDefault();
      removeBlock(block.reportSectionId, { focusPrevious: true });
    }
  };

  return (
    <InlineBlockFrame reportSectionId={block.reportSectionId} index={index} title={block.text || "Heading"}>
      <Box
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
        }}
        sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}
      >
        <InputBase
          fullWidth
          value={text}
          placeholder={block.level === 2 ? "Heading" : "Subheading"}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          inputProps={{
            "aria-label": `Heading level ${block.level}`,
            [FOCUS_TARGET_ATTR]: "",
          }}
          sx={{ ...LEVEL_SX[block.level], "& input": { p: 0 } }}
        />
        {focused && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={block.level}
            onChange={(_, level: 2 | 3 | null) => level && updateBlock(block.reportSectionId, { level })}
            aria-label="Heading level"
            sx={{
              flexShrink: 0,
              "& .MuiToggleButton-root": { py: 0, px: 0.75, fontSize: 11, textTransform: "none" },
            }}
          >
            <ToggleButton value={2}>H2</ToggleButton>
            <ToggleButton value={3}>H3</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>
    </InlineBlockFrame>
  );
};

export default HeadingBlockView;

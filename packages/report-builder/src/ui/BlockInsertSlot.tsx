import React from "react";
import { Box, ButtonBase } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useBlockEditor } from "./blocks/BlockEditorContext";

interface BlockInsertSlotProps {
  // Index the new block will be inserted at
  insertIndex: number;
  // Title of the block above, for the accessible label (omit for the top slot)
  afterTitle?: string;
  // Hidden while dragging: slots would read as false drop targets
  hidden?: boolean;
  // Shown at rest (the slot after the last block); others appear on hover/focus
  alwaysVisible?: boolean;
}

/**
 * Thin row with a `+` at its left edge that opens the block menu at this position
 */
export const BlockInsertSlot: React.FC<BlockInsertSlotProps> = ({
  insertIndex,
  afterTitle,
  hidden,
  alwaysVisible = false,
}) => {
  const { openInserter } = useBlockEditor();

  return (
    <Box
      sx={{
        position: "relative",
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        visibility: hidden ? "hidden" : "visible",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: "1px",
          bgcolor: "primary.main",
          opacity: 0,
        },
        "&:hover::before, &:focus-within::before": { opacity: 1 },
        "&:hover .insert-slot-button, & .insert-slot-button.Mui-focusVisible": {
          opacity: 1,
          bgcolor: "#e3f0fa",
        },
      }}
    >
      <ButtonBase
        className="insert-slot-button"
        aria-label={afterTitle ? `Add block after ${afterTitle}` : "Add block at start"}
        aria-haspopup="dialog"
        onClick={(e) => openInserter({ insertIndex, anchorEl: e.currentTarget })}
        sx={{
          position: "relative",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1px solid",
          borderColor: "primary.main",
          color: "primary.main",
          bgcolor: "transparent",
          fontSize: 10,
          opacity: alwaysVisible ? 1 : 0,
          transition: "opacity 120ms, background-color 120ms",
        }}
      >
        <FontAwesomeIcon icon={faPlus} />
      </ButtonBase>
    </Box>
  );
};

export default BlockInsertSlot;

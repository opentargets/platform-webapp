import React, { useState } from "react";
import { Divider, IconButton, Menu, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { useBlockEditor } from "./BlockEditorContext";

export interface BlockMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface BlockMenuProps {
  reportSectionId: string;
  title: string;
  // Kind-specific items shown above the common Duplicate / Move / Remove
  items?: BlockMenuItem[];
  size?: number;
}

/**
 * The `⋯` menu every block gets: kind-specific items, then Duplicate, Move up,
 * Move down, Remove.
 */
export const BlockMenu: React.FC<BlockMenuProps> = ({ reportSectionId, title, items = [], size = 28 }) => {
  const { report, duplicateBlock, moveBlock, removeBlock } = useBlockEditor();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const index = report.sections.findIndex((b) => b.reportSectionId === reportSectionId);

  const run = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };

  return (
    <>
      <IconButton
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        sx={{ width: size, height: size, fontSize: 13, color: "grey.600" }}
      >
        <FontAwesomeIcon icon={faEllipsis} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ list: { dense: true } }}
      >
        {items.map((item) => (
          <MenuItem key={item.label} onClick={run(item.onClick)} disabled={item.disabled}>
            {item.label}
          </MenuItem>
        ))}
        {items.length > 0 && <Divider />}
        <MenuItem onClick={run(() => duplicateBlock(reportSectionId))}>Duplicate</MenuItem>
        <MenuItem onClick={run(() => moveBlock(reportSectionId, -1))} disabled={index <= 0}>
          Move up
        </MenuItem>
        <MenuItem
          onClick={run(() => moveBlock(reportSectionId, 1))}
          disabled={index === -1 || index >= report.sections.length - 1}
        >
          Move down
        </MenuItem>
        <MenuItem
          onClick={run(() =>
            removeBlock(reportSectionId, { confirm: `Remove "${title}" from this report?` })
          )}
          sx={{ color: "error.main" }}
        >
          Remove
        </MenuItem>
      </Menu>
    </>
  );
};

export default BlockMenu;

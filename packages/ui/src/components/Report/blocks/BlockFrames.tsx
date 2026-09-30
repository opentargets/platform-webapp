import React, { ReactNode } from "react";
import { Box } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { ROW_HEADER_ATTR } from "../ReportSectionRow";
import { BlockMenu, BlockMenuItem } from "./BlockMenu";
import { useSortableBlock } from "../SortableBlock";

const dragHandleSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "grey.400",
  cursor: "grab",
  "&:active": { cursor: "grabbing" },
  touchAction: "none",
} as const;

export const blockChromeSx = {
  bgcolor: "#fff",
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: "2px",
} as const;

interface InlineBlockFrameProps {
  reportSectionId: string;
  index: number;
  title: string;
  menuItems?: BlockMenuItem[];
  children: ReactNode;
}

/**
 * Narrative blocks (text, heading, callout, divider, chapter): always inline and
 * editable, never collapsed. Drag handle and `⋯` appear in the gutters on hover.
 */
export const InlineBlockFrame: React.FC<InlineBlockFrameProps> = ({
  reportSectionId,
  title,
  menuItems,
  children,
}) => {
  const { handleRef, isDragging } = useSortableBlock();

  return (
    <Box
      data-report-section-id={reportSectionId}
      sx={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "24px minmax(0,1fr) 32px",
        alignItems: "start",
        opacity: isDragging ? 0.85 : 1,
        "& .block-gutter": { opacity: 0, transition: "opacity 120ms" },
        "&:hover .block-gutter, &:focus-within .block-gutter": { opacity: 1 },
      }}
    >
      <Box
        ref={handleRef}
        className="block-gutter"
        aria-label={`Drag to reorder ${title}`}
        sx={{ ...dragHandleSx, height: 28 }}
      >
        <FontAwesomeIcon icon={faGripVertical} />
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
      <Box className="block-gutter" sx={{ display: "flex", justifyContent: "flex-end" }}>
        <BlockMenu reportSectionId={reportSectionId} title={title} items={menuItems} />
      </Box>
    </Box>
  );
};

interface CollapsibleBlockRowProps {
  reportSectionId: string;
  index: number;
  title: string;
  expanded: boolean;
  onToggle: (reportSectionId: string) => void;
  onHeaderKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  // Header content between the drag handle and the `⋯` menu
  header: ReactNode;
  // Controls shown at the right of the header, before `⋯` (e.g. Run)
  actions?: ReactNode;
  menuItems?: BlockMenuItem[];
  children?: ReactNode;
}

/**
 * Image and data blocks: a header row that expands to the full editor/content,
 * matching the widget rows.
 */
export const CollapsibleBlockRow: React.FC<CollapsibleBlockRowProps> = ({
  reportSectionId,
  title,
  expanded,
  onToggle,
  onHeaderKeyDown,
  header,
  actions,
  menuItems,
  children,
}) => {
  const { handleRef, isDragging } = useSortableBlock();
  const bodyId = `report-block-body-${reportSectionId}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(reportSectionId);
      return;
    }
    onHeaderKeyDown?.(event);
  };

  // Clicks on inputs/buttons inside the header shouldn't toggle the row
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Box
      data-report-section-id={reportSectionId}
      sx={{
        ...blockChromeSx,
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        aria-label={`${title}, ${expanded ? "collapse" : "expand"}`}
        {...{ [ROW_HEADER_ATTR]: "" }}
        onClick={() => onToggle(reportSectionId)}
        onKeyDown={handleKeyDown}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          p: "10px 12px",
          cursor: "pointer",
          minWidth: 0,
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
        }}
      >
        <Box ref={handleRef} aria-label={`Drag to reorder ${title}`} onClick={stop} sx={dragHandleSx}>
          <FontAwesomeIcon icon={faGripVertical} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>{header}</Box>
        <Box
          onClick={stop}
          onKeyDown={stop}
          sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
        >
          {actions}
          <BlockMenu reportSectionId={reportSectionId} title={title} items={menuItems} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", color: expanded ? "primary.main" : "grey.500" }}>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
        </Box>
      </Box>
      {expanded && (
        <Box
          id={bodyId}
          sx={{ display: isDragging ? "none" : "block", borderTop: "1px solid", borderColor: "grey.300" }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};

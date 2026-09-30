import React, { ReactNode } from "react";
import { Avatar, Box, Chip, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { ReportSection } from "../../types/report";
import { CapturedStateSummaryChip } from "./CapturedStateChips";
import { ReportSectionBody } from "./ReportSectionBody";
import { useSortableBlock } from "./SortableBlock";

export const ROW_HEADER_ATTR = "data-report-row-header";

interface ReportSectionRowProps {
  section: ReportSection;
  index: number;
  expanded: boolean;
  onToggle: (reportSectionId: string) => void;
  onHeaderKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  // Rendered under the body when expanded (inline inspector on narrow layouts)
  children?: ReactNode;
}

/**
 * One report section: a collapsed header row, plus the widget body when expanded
 */
export const ReportSectionRow: React.FC<ReportSectionRowProps> = ({
  section,
  expanded,
  onToggle,
  onHeaderKeyDown,
  children,
}) => {
  const { handleRef, isDragging } = useSortableBlock();
  const bodyId = `report-section-body-${section.reportSectionId}`;
  const { definition } = section;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(section.reportSectionId);
      return;
    }
    onHeaderKeyDown(event);
  };

  return (
    <Box
      data-report-section-id={section.reportSectionId}
      sx={{
        bgcolor: "#fff",
        border: "1px solid",
        borderColor: "grey.300",
        borderRadius: "2px",
        opacity: isDragging ? 0.85 : 1,
      }}
    >
      {/* Header */}
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        {...{ [ROW_HEADER_ATTR]: "" }}
        onClick={() => onToggle(section.reportSectionId)}
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
        <Box
          ref={handleRef}
          aria-label={`Drag to reorder ${definition.name}`}
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: "flex",
            alignItems: "center",
            color: "grey.400",
            cursor: "grab",
            "&:active": { cursor: "grabbing" },
            touchAction: "none",
          }}
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </Box>

        <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: "primary.dark", color: "white" }}>
          {definition.shortName || definition.name.charAt(0)}
        </Avatar>

        <Typography
          noWrap
          sx={{ fontSize: 14, fontWeight: 700, color: "#616161", minWidth: 0, flexShrink: 1 }}
        >
          {definition.name}
        </Typography>

        {section.entityLabel && (
          <Chip
            label={section.entityLabel}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 10, flexShrink: 0 }}
          />
        )}

        <CapturedStateSummaryChip state={section.componentState} definition={definition} />

        {definition.isPrivate && <Chip label="Private" size="small" variant="outlined" />}
        {section.chipText && <Chip label={section.chipText} size="small" />}

        <Box
          sx={{
            ml: "auto",
            display: "flex",
            alignItems: "center",
            color: expanded ? "primary.main" : "grey.500",
          }}
        >
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
        </Box>
      </Box>

      {/* Body — only mounted when expanded; hidden (not unmounted) while dragging */}
      {expanded && (
        <Box sx={{ display: isDragging ? "none" : "block" }}>
          <ReportSectionBody key={section.stateCapturedAt ?? 0} section={section} id={bodyId} />
          {children}
        </Box>
      )}
    </Box>
  );
};

export default ReportSectionRow;

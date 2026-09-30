import React, { ReactNode, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ReportBlock, ReportSection, isWidget } from "../../types/report";
import { ReportSectionRow, ROW_HEADER_ATTR } from "./ReportSectionRow";
import { BlockInsertSlot } from "./BlockInsertSlot";
import { SortableBlock } from "./SortableBlock";
import { BlockRenderer, blockTitle, COLLAPSIBLE_KINDS } from "./blocks/BlockRenderer";

interface ReportSectionListProps {
  sections: ReportBlock[];
  // Collapsible rows are expanded unless listed here
  collapsedIds: Set<string>;
  onToggleCollapsed: (reportSectionId: string) => void;
  onSetCollapsed: (collapsedIds: Set<string>) => void;
  // The block shown in the inspector (last one clicked or focused)
  selectedSectionId: string | null;
  onSelect: (reportSectionId: string | null) => void;
  // Inline inspector rendered under the selected row (narrow layouts only)
  renderInlineInspector?: (section: ReportBlock) => ReactNode;
  // Rendered after the rows (e.g. the report summary on narrow layouts)
  footer?: ReactNode;
  // Insert slots hide while a drag is in progress
  isDragging?: boolean;
}

const titleOf = (block: ReportBlock) => (isWidget(block) ? block.definition.name : blockTitle(block));

const isCollapsible = (block: ReportBlock) => isWidget(block) || COLLAPSIBLE_KINDS.has(block.kind);

/**
 * Scrollable list pane: header ("N sections · drag to reorder", "Collapse all")
 * plus sortable blocks, with an insert slot above the first block and under
 * every block. Widgets, images and data blocks are collapsible rows, expanded by
 * default; narrative blocks are always inline. Clicking or focusing inside a
 * block selects it for the inspector.
 */
export const ReportSectionList: React.FC<ReportSectionListProps> = ({
  sections,
  collapsedIds,
  onToggleCollapsed,
  onSetCollapsed,
  selectedSectionId,
  onSelect,
  renderInlineInspector,
  footer,
  isDragging = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const headers = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(`[${ROW_HEADER_ATTR}]`) ?? []
    );
    const current = headers.indexOf(event.currentTarget);
    const next = headers[current + (event.key === "ArrowDown" ? 1 : -1)];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    // Clear the selection first; only let Esc reach the drawer (and close it) when nothing is selected
    if (event.key === "Escape" && selectedSectionId) {
      event.stopPropagation();
      onSelect(null);
    }
  };

  const collapsibleIds = sections.filter(isCollapsible).map((s) => s.reportSectionId);
  const anyExpanded = collapsibleIds.some((id) => !collapsedIds.has(id));

  const widgetCount = sections.filter(isWidget).length;
  const blockCount = sections.length - widgetCount;
  const summary = [
    `${widgetCount} section${widgetCount !== 1 ? "s" : ""}`,
    blockCount > 0 ? `${blockCount} block${blockCount !== 1 ? "s" : ""}` : null,
    "drag to reorder",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      ref={containerRef}
      onKeyDown={handleListKeyDown}
      sx={{
        position: "relative",
        bgcolor: "grey.50",
        p: "18px",
        overflowY: "auto",
        minHeight: 0,
        height: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: "grey.600", flex: 1 }}>
          {summary}
        </Typography>
        <Button
          size="small"
          onClick={() => onSetCollapsed(anyExpanded ? new Set(collapsibleIds) : new Set())}
          disabled={collapsibleIds.length === 0}
          sx={{ textTransform: "none" }}
        >
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>

      <BlockInsertSlot insertIndex={0} hidden={isDragging} />
      {sections.map((section, index) => {
        const id = section.reportSectionId;
        const expanded = !collapsedIds.has(id);
        const selected = id === selectedSectionId;
        return (
          // The block, its inline inspector and the insert slot under it move as one sortable item
          <SortableBlock key={id} id={id} index={index}>
            <Box
              onMouseDownCapture={() => !selected && onSelect(id)}
              onFocusCapture={() => !selected && onSelect(id)}
              // Selected collapsible rows get the primary border
              sx={selected ? { "& > [data-report-section-id]": { borderColor: "primary.main" } } : undefined}
            >
              {isWidget(section) ? (
                <ReportSectionRow
                  section={section as ReportSection}
                  index={index}
                  expanded={expanded}
                  onToggle={onToggleCollapsed}
                  onHeaderKeyDown={handleHeaderKeyDown}
                />
              ) : (
                <BlockRenderer
                  block={section}
                  index={index}
                  expanded={expanded}
                  onToggle={onToggleCollapsed}
                  onHeaderKeyDown={handleHeaderKeyDown}
                />
              )}
              {selected && isCollapsible(section) && renderInlineInspector?.(section)}
            </Box>
            <BlockInsertSlot
              insertIndex={index + 1}
              afterTitle={titleOf(section)}
              hidden={isDragging}
              alwaysVisible={index === sections.length - 1}
            />
          </SortableBlock>
        );
      })}

      {footer}
    </Box>
  );
};

export default ReportSectionList;

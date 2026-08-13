import { Box } from "@mui/material";

interface DownloadsSplitDividerProps {
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Draggable divider between the cards grid and the graph panel, styled as a
 * scrollbar-like handle (track + thumb) rather than a pair of buttons.
 * Dragging all the way to either edge collapses that pane so the other fills
 * the whole row - "expand to whole view" is just the extreme of the drag.
 */
function DownloadsSplitDivider({ isDragging, onPointerDown, onKeyDown }: DownloadsSplitDividerProps) {
  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize cards and network panels. Drag to an edge to expand that panel to full width."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      sx={{
        display: { xs: "none", md: "flex" },
        alignSelf: "stretch",
        // The cards grid (the row's tallest column) routinely extends well
        // beyond the viewport, so stretching to the full row height would
        // center the thumb somewhere in the middle of that whole scrollable
        // height - often off-screen. Sticking the divider to the remaining
        // viewport height below the filter bar instead (matching the graph
        // panel's own sticky breakpoint/offset - see DownloadsPage) keeps the
        // thumb centered in view, wherever the page is scrolled to. Below
        // `lg` the graph panel isn't sticky either, so this falls back to the
        // plain `alignSelf: stretch` behavior above.
        position: { lg: "sticky" },
        top: { lg: 72 },
        height: { lg: "calc(100vh - 72px)" },
        maxHeight: { lg: "100%" },
        zIndex: { lg: 101 },
        width: 20,
        alignItems: "center",
        justifyContent: "center",
        cursor: "col-resize",
        touchAction: "none",
        outline: "none",
        "&:hover .split-thumb, &:focus-visible .split-thumb": {
          backgroundColor: "grey.500",
          opacity: 1,
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 3,
          borderRadius: 1.5,
          backgroundColor: "grey.200",
        }}
      />
      <Box
        className="split-thumb"
        sx={{
          position: "relative",
          width: 6,
          height: 64,
          borderRadius: 3,
          backgroundColor: theme => (isDragging ? theme.palette.primary.main : theme.palette.grey[400]),
          opacity: isDragging ? 1 : 0.5,
          transition: "background-color 120ms ease, opacity 120ms ease",
        }}
      />
    </Box>
  );
}

export default DownloadsSplitDivider;

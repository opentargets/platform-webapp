import { Box, Button, Menu, MenuItem, CircularProgress } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import type { Core as CytoscapeCore } from "cytoscape";
import { exportAsJPEG, exportAsCytoscapeJSON, exportAsPNG, copyNetworkToClipboard } from "../utils/exportUtils";

interface ExportButtonsProps {
  cyRef: React.MutableRefObject<CytoscapeCore | null>;
}

export function ExportButtons({ cyRef }: ExportButtonsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setExportError(null);
  };

  const handleExport = async (exportType: "jpeg" | "png" | "json" | "clipboard") => {
    if (!cyRef.current) {
      setExportError("Network visualization not available");
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `network-${timestamp}`;

      switch (exportType) {
        case "jpeg":
          await exportAsJPEG(cyRef.current, filename);
          break;
        case "png":
          await exportAsPNG(cyRef.current, filename);
          break;
        case "json":
          exportAsCytoscapeJSON(cyRef.current, filename);
          break;
        case "clipboard":
          await copyNetworkToClipboard(cyRef.current);
          break;
      }

      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setExportError(errorMessage);
      console.error(`Export error (${exportType}):`, error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Button
        id="export-button"
        aria-controls={open ? "export-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        disabled={isExporting}
        size="small"
        variant="outlined"
        sx={{ textTransform: "none" }}
        startIcon={isExporting ? <CircularProgress size={16} /> : <FontAwesomeIcon icon={faDownload} />}
        endIcon={<FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "12px" }} />}
      >
        {isExporting ? "Exporting..." : "Export"}
      </Button>
      <Menu
        id="export-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={() => handleExport("jpeg")}>
          Export as JPEG
        </MenuItem>
        <MenuItem onClick={() => handleExport("png")}>
          Export as PNG
        </MenuItem>
        <MenuItem onClick={() => handleExport("json")}>
          Export as Cytoscape JSON
        </MenuItem>
        <MenuItem onClick={() => handleExport("clipboard")}>
          Copy to Clipboard (JSON)
        </MenuItem>
      </Menu>
      {exportError && (
        <span style={{ color: "red", fontSize: "0.75rem" }}>
          Error: {exportError}
        </span>
      )}
    </Box>
  );
}

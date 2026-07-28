/**
 * Component: GraphControls
 * Toolbar for graph manipulation: zoom, pan, reset, export
 */

import React, { useState } from 'react';
import {
  Stack,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faArrowRotateLeft,
  faImage,
  faFileCode,
} from '@fortawesome/free-solid-svg-icons';
import { GraphController } from '../hooks/useForceGraph';

interface GraphControlsProps {
  controller: GraphController | null;
  onReset?: () => void;
  sx?: any;
}

/**
 * Controls for graph navigation and export
 */
const GraphControls: React.FC<GraphControlsProps> = ({ controller, onReset, sx = {} }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleZoomIn = () => {
    controller?.zoomIn();
  };

  const handleZoomOut = () => {
    controller?.zoomOut();
  };

  const handleFitView = () => {
    controller?.fit();
  };

  const handleCenter = () => {
    controller?.center();
  };

  const handleResetView = () => {
    controller?.reset();
    onReset?.();
  };

  const handleExportImage = async () => {
    if (!controller) return;
    setIsExporting(true);

    try {
      controller.exportPNG();
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!controller) return;

    try {
      controller.exportJSON();
    } catch (error) {
      console.error('Error exporting JSON:', error);
    }
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      {/* Zoom controls */}
      <Tooltip title="Zoom in" arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleZoomIn}
            disabled={!controller}
            aria-label="Zoom in"
          >
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} size="sm" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Zoom out" arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleZoomOut}
            disabled={!controller}
            aria-label="Zoom out"
          >
            <FontAwesomeIcon icon={faMagnifyingGlassMinus} size="sm" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Vertical divider */}
      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      {/* View controls */}
      <Tooltip title="Restore the original zoom, position and selection" arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleResetView}
            disabled={!controller}
            aria-label="Reset view"
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} size="sm" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Vertical divider */}
      <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

      {/* Export controls */}
      <Tooltip title="Download the current view as a PNG image" arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleExportImage}
            disabled={!controller || isExporting}
            aria-label="Save as image"
          >
            <FontAwesomeIcon icon={faImage} size="sm" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Download the graph's nodes and edges as JSON" arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleExportJSON}
            disabled={!controller}
            aria-label="Export data as JSON"
          >
            <FontAwesomeIcon icon={faFileCode} size="sm" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
};

export default GraphControls;

/**
 * Component: GraphControls
 * Toolbar for graph navigation and export, styled to match the Schema /
 * Access Data buttons on the dataset card so the two views read as one
 * product.
 */

import React from 'react';
import { ButtonGroup, Button, Tooltip } from '@mui/material';
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
  const handleResetView = () => {
    controller?.reset();
    onReset?.();
  };

  return (
    <ButtonGroup
      variant="outlined"
      color="primary"
      size="small"
      sx={{ alignSelf: 'flex-start', ...sx }}
    >
      <Tooltip title="Zoom in" arrow>
        <Button onClick={() => controller?.zoomIn()} aria-label="Zoom in">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} size="sm" />
        </Button>
      </Tooltip>
      <Tooltip title="Zoom out" arrow>
        <Button onClick={() => controller?.zoomOut()} aria-label="Zoom out">
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} size="sm" />
        </Button>
      </Tooltip>
      <Tooltip title="Reset view" arrow>
        <Button onClick={handleResetView} aria-label="Reset view">
          <FontAwesomeIcon icon={faArrowRotateLeft} size="sm" />
        </Button>
      </Tooltip>
      <Tooltip title="Download PNG" arrow>
        <Button onClick={() => controller?.exportPNG()} aria-label="Download PNG">
          <FontAwesomeIcon icon={faImage} size="sm" />
        </Button>
      </Tooltip>
      <Tooltip title="Download SVG" arrow>
        <Button onClick={() => controller?.exportSVG()} aria-label="Download SVG">
          <FontAwesomeIcon icon={faFileCode} size="sm" />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
};

export default GraphControls;

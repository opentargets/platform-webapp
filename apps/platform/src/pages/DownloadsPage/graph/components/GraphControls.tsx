/**
 * Component: GraphControls
 * Toolbar for graph navigation and export, styled to match the Schema /
 * Access Data buttons on the dataset card so the two views read as one
 * product.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { ButtonGroup, MuiButton, MuiTooltip } from 'ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faArrowRotateLeft,
  faImage,
  faSitemap,
} from '@fortawesome/free-solid-svg-icons';
import { GraphController } from '../hooks/useForceGraph';

interface GraphControlsProps {
  controller: GraphController | null;
  onReset?: () => void;
  /** Shows the "Schema diagram" link button - suppressed when GraphControls is reused on the schema-diagram page itself */
  showDiagramLink?: boolean;
  sx?: any;
}

/**
 * Controls for graph navigation and export
 */
const GraphControls: React.FC<GraphControlsProps> = ({ controller, onReset, showDiagramLink = true, sx = {} }) => {
  const navigate = useNavigate();

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
      <MuiTooltip title="Zoom in" arrow>
        <MuiButton onClick={() => controller?.zoomIn()} aria-label="Zoom in">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} size="sm" />
        </MuiButton>
      </MuiTooltip>
      <MuiTooltip title="Zoom out" arrow>
        <MuiButton onClick={() => controller?.zoomOut()} aria-label="Zoom out">
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} size="sm" />
        </MuiButton>
      </MuiTooltip>
      <MuiTooltip title="Reset view" arrow>
        <MuiButton onClick={handleResetView} aria-label="Reset view">
          <FontAwesomeIcon icon={faArrowRotateLeft} size="sm" />
        </MuiButton>
      </MuiTooltip>
      <MuiTooltip title="Download SVG" arrow>
        <MuiButton onClick={() => controller?.exportSVG()} aria-label="Download SVG">
          <FontAwesomeIcon icon={faImage} size="sm" />
        </MuiButton>
      </MuiTooltip>
      {showDiagramLink && (
        <MuiTooltip title="View schema diagram" arrow>
          <MuiButton onClick={() => navigate('/downloads/schema-diagram')} aria-label="View schema diagram">
            <FontAwesomeIcon icon={faSitemap} size="sm" />
          </MuiButton>
        </MuiTooltip>
      )}
    </ButtonGroup>
  );
};

export default GraphControls;

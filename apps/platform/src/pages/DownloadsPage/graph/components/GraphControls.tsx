/**
 * Component: GraphControls
 * Toolbar for graph manipulation: zoom, pan, reset, export
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
  Box,
  Button,
  IconButton,
  Divider,
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faExpand,
  faCrosshairs,
  faArrowRotateLeft,
  faImage,
  faFileCode,
} from '@fortawesome/free-solid-svg-icons';
import { Core } from 'cytoscape';

interface GraphControlsProps {
  cy: Core | null;
  onReset?: () => void;
  sx?: any;
}

/**
 * Controls for graph navigation and export
 */
const GraphControls: React.FC<GraphControlsProps> = ({ cy, onReset, sx = {} }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleZoomIn = () => {
    if (!cy) return;
    cy.zoom(cy.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    if (!cy) return;
    cy.zoom(cy.zoom() / 1.2);
  };

  const handleFitView = () => {
    if (!cy) return;
    cy.fit(undefined, 50);
  };

  const handleCenter = () => {
    if (!cy) return;
    cy.center();
  };

  const handleResetView = () => {
    if (!cy) return;
    cy.reset();
    onReset?.();
  };

  const handleExportImage = async () => {
    if (!cy) return;
    setIsExporting(true);

    try {
      const png = cy.png({ full: true });
      const link = document.createElement('a');
      link.href = png;
      link.download = 'graph-visualization.png';
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!cy) return;

    try {
      const json = cy.json();
      const dataStr = JSON.stringify(json, null, 2);
      const link = document.createElement('a');
      link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      link.download = 'graph-data.json';
      link.click();
    } catch (error) {
      console.error('Error exporting JSON:', error);
    }
  };

  return (
    <Card sx={{ ...sx }}>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          {/* Title */}
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
            Graph Controls
          </Typography>

          {/* Zoom section */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}
            >
              Zoom
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Tooltip title="Zoom in" arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleZoomIn}
                    disabled={!cy}
                    aria-label="Zoom in"
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} size="xs" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Zoom out" arrow>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleZoomOut}
                    disabled={!cy}
                    aria-label="Zoom out"
                    sx={{ border: '1px solid', borderColor: 'divider' }}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} size="xs" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>

          <Divider />

          {/* View section */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}
            >
              View
            </Typography>
            <Stack spacing={0.75}>
              <Tooltip title="Zoom and pan so every node is visible" arrow>
                <Button
                  size="small"
                  onClick={handleFitView}
                  disabled={!cy}
                  variant="outlined"
                  fullWidth
                  startIcon={<FontAwesomeIcon icon={faExpand} size="xs" />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Fit to screen
                </Button>
              </Tooltip>
              <Tooltip title="Re-center the graph without changing zoom" arrow>
                <Button
                  size="small"
                  onClick={handleCenter}
                  disabled={!cy}
                  variant="outlined"
                  fullWidth
                  startIcon={<FontAwesomeIcon icon={faCrosshairs} size="xs" />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Center
                </Button>
              </Tooltip>
              <Tooltip title="Restore the original zoom, position and selection" arrow>
                <Button
                  size="small"
                  onClick={handleResetView}
                  disabled={!cy}
                  variant="outlined"
                  fullWidth
                  startIcon={<FontAwesomeIcon icon={faArrowRotateLeft} size="xs" />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Reset view
                </Button>
              </Tooltip>
            </Stack>
          </Box>

          <Divider />

          {/* Export section */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}
            >
              Export
            </Typography>
            <Stack spacing={0.75}>
              <Tooltip title="Download the current view as a PNG image" arrow>
                <Button
                  size="small"
                  onClick={handleExportImage}
                  disabled={!cy || isExporting}
                  variant="outlined"
                  fullWidth
                  startIcon={<FontAwesomeIcon icon={faImage} size="xs" />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  {isExporting ? 'Exporting…' : 'Save as image'}
                </Button>
              </Tooltip>
              <Tooltip title="Download the graph's nodes and edges as JSON" arrow>
                <Button
                  size="small"
                  onClick={handleExportJSON}
                  disabled={!cy}
                  variant="outlined"
                  fullWidth
                  startIcon={<FontAwesomeIcon icon={faFileCode} size="xs" />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Export data (JSON)
                </Button>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default GraphControls;

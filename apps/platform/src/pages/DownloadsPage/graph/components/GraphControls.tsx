/**
 * Component: GraphControls
 * Toolbar for graph manipulation: zoom, pan, reset, export
 */

import React, { useState } from 'react';
import { Card, CardContent, Stack, Tooltip, Typography, Box, Button } from '@mui/material';
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
      <CardContent sx={{ p: 1 }}>
        <Stack spacing={0.5}>
          {/* Title */}
          <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center', pb: 1 }}>
            Controls
          </Typography>

          {/* Zoom controls */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Zoom In">
              <Button size="small" onClick={handleZoomIn} disabled={!cy} variant="outlined">
                +
              </Button>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <Button size="small" onClick={handleZoomOut} disabled={!cy} variant="outlined">
                −
              </Button>
            </Tooltip>
          </Box>

          {/* View controls */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Fit All Nodes">
              <Button size="small" onClick={handleFitView} disabled={!cy} variant="outlined">
                Fit
              </Button>
            </Tooltip>
            <Tooltip title="Center View">
              <Button size="small" onClick={handleCenter} disabled={!cy} variant="outlined">
                Center
              </Button>
            </Tooltip>
          </Box>

          {/* Reset controls */}
          <Box>
            <Tooltip title="Reset View">
              <Button
                size="small"
                onClick={handleResetView}
                disabled={!cy}
                variant="outlined"
                fullWidth
              >
                Reset
              </Button>
            </Tooltip>
          </Box>

          {/* Export controls */}
          <Box sx={{ pt: 1, borderTop: '1px solid #e0e0e0' }}>
            <Tooltip title="Export as Image">
              <Button
                size="small"
                onClick={handleExportImage}
                disabled={!cy || isExporting}
                variant="outlined"
                fullWidth
              >
                Image
              </Button>
            </Tooltip>
          </Box>

          <Tooltip title="Export as JSON">
            <Button
              size="small"
              onClick={handleExportJSON}
              disabled={!cy}
              variant="outlined"
              fullWidth
            >
              JSON
            </Button>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default GraphControls;

/**
 * Component: GraphLegend
 * Legend showing node types, colors, and sizes
 */

import React from 'react';
import { Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { getNodeTypes } from '../utils/nodeClassifier';

interface GraphLegendProps {
  sx?: any;
}

/**
 * Display legend for graph node types
 */
const GraphLegend: React.FC<GraphLegendProps> = ({ sx = {} }) => {
  const nodeTypes = getNodeTypes();

  const legendItems = [
    {
      type: 'core',
      label: nodeTypes.core.label,
      color: nodeTypes.core.color,
      description: 'Master datasets: Target, Disease, Drug, Variant, Study',
    },
    {
      type: 'evidence',
      label: nodeTypes.evidence.label,
      color: nodeTypes.evidence.color,
      description: 'Datasets with foreign key relationships to core entities',
    },
    {
      type: 'attribute',
      label: nodeTypes.attribute.label,
      color: nodeTypes.attribute.color,
      description: 'Helper tables and ontologies',
    },
  ];

  return (
    <Card
      sx={{
        height: 'fit-content',
        ...sx,
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Legend
        </Typography>

        <Stack spacing={2}>
          {legendItems.map((item) => (
            <Box key={item.type} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Color swatch */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  border: `3px solid ${item.color}`,
                  flexShrink: 0,
                }}
              />

              {/* Text info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {item.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* Statistics section */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            How to use:
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '16px', fontSize: '12px' }}>
            <li>Click a node to select and highlight connections</li>
            <li>Hover over nodes to see details</li>
            <li>Drag to pan, scroll to zoom</li>
            <li>Use controls to reset view</li>
          </ul>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphLegend;

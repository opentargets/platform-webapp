/**
 * Component: GraphTooltip
 * Hover/detail view showing node or edge information
 */

import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface GraphTooltipProps {
  selectedNode?: {
    id: string;
    label: string;
    type: string;
    degree?: number;
    description?: string;
  } | null;
  sx?: any;
}

/**
 * Display details about selected node or edge
 */
const GraphTooltip: React.FC<GraphTooltipProps> = ({
  selectedNode,
  sx = {},
}) => {
  if (!selectedNode) {
    return (
      <Card sx={{ ...sx }}>
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Select a node to view details
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const typeColors: Record<string, string> = {
    core: '#2196F3',
    evidence: '#FF9800',
    attribute: '#4CAF50',
  };

  const typeLabels: Record<string, string> = {
    core: 'Core Entity',
    evidence: 'Evidence Dataset',
    attribute: 'Attribute/Ontology',
  };

  return (
    <Card sx={{ ...sx }}>
      <CardContent>
        {/* Header with name and type */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {selectedNode.label}
          </Typography>
          <Chip
            label={typeLabels[selectedNode.type] || selectedNode.type}
            size="small"
            sx={{
              backgroundColor: typeColors[selectedNode.type] || '#999',
              color: '#fff',
            }}
          />
        </Box>

        {/* ID */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ID:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
            {selectedNode.id}
          </Typography>
        </Box>

        {/* Degree (connections) */}
        {selectedNode.degree !== undefined && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Connections:
            </Typography>
            <Typography variant="body2">
              {selectedNode.degree} relationship{selectedNode.degree !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}

        {/* Description */}
        {selectedNode.description && (
          <Box sx={{ mb: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Description:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '12px' }}>
              {selectedNode.description}
            </Typography>
          </Box>
        )}

        {/* Info box */}
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            borderLeft: `3px solid ${typeColors[selectedNode.type] || '#999'}`,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Click to select • Hover for more info
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GraphTooltip;

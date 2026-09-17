/**
 * Component: GraphTooltip
 * Compact floating tooltip that follows the pointer while hovering a node.
 * Clicking a node opens the full `DatasetCard` in the graph's right-hand
 * panel instead - see GraphVisualization.
 */

import React from 'react';
import { Card, Typography, Box } from '@mui/material';
import { getCategoryColor } from '../../categoryColors';

interface TooltipNode {
  id: string;
  label: string;
  type: string;
  degree?: number;
  description?: string;
}

interface GraphTooltipProps {
  node: TooltipNode;
  position: { x: number; y: number };
  sx?: any;
}

const GraphTooltip: React.FC<GraphTooltipProps> = ({ node, position, sx = {} }) => {
  const color = getCategoryColor(node.type);

  return (
    <Box
      sx={{
        position: 'fixed',
        left: position?.x,
        top: position?.y,
        transform: 'translate(-50%, calc(-100% - 12px))',
        zIndex: 1300,
        pointerEvents: 'none',
        ...sx,
      }}
    >
      <Card
        elevation={4}
        sx={{
          px: 1.25,
          py: 0.75,
          maxWidth: 280,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
          {node.label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {node.type}
        </Typography>
        {node.description && (
          <Typography
            variant="caption"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            {node.description}
          </Typography>
        )}
      </Card>
    </Box>
  );
};

export default GraphTooltip;

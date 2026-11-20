/**
 * Component: GraphEdgeTooltip
 * Describes what an edge is: which dataset references which, and through
 * which field(s). Opened by clicking an edge and pinned where it was
 * clicked, with a close button.
 */

import React from 'react';
import { Card, Typography, Box, IconButton } from '@mui/material';

export interface EdgeTooltipInfo {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  references: Array<{ sourceField: string; targetField: string }>;
}

interface GraphEdgeTooltipProps {
  edge: EdgeTooltipInfo;
  position: { x: number; y: number };
  onClose?: () => void;
}

const GraphEdgeTooltip: React.FC<GraphEdgeTooltipProps> = ({ edge, position, onClose }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 12px)',
        zIndex: 1300,
      }}
    >
      <Card elevation={4} sx={{ px: 1.5, py: 1, maxWidth: 360, minWidth: 220 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.3, flex: 1 }}>
            {edge.sourceLabel} → {edge.targetLabel}
          </Typography>
          <IconButton size="small" aria-label="Close edge details" onClick={onClose} sx={{ mt: -0.5, mr: -0.75 }}>
            ×
          </IconButton>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {edge.sourceLabel} references {edge.targetLabel} through{' '}
          {edge.references.length === 1 ? 'this field' : `${edge.references.length} fields`}:
        </Typography>
        <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
          {edge.references.map(({ sourceField, targetField }) => (
            <Typography
              key={`${sourceField}->${targetField}`}
              variant="caption"
              component="div"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', py: 0.125 }}
            >
              {sourceField} → {edge.targetLabel}.{targetField}
            </Typography>
          ))}
        </Box>
      </Card>
    </Box>
  );
};

export default GraphEdgeTooltip;

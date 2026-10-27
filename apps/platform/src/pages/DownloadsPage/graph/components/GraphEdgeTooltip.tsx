/**
 * Component: GraphEdgeTooltip
 * Describes what an edge is: which dataset references which, and through
 * which field(s). Shown following the pointer while hovering an edge, and
 * pinned in place (with a close button) once the edge is clicked.
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
  /** Pinned tooltips are interactive (scrollable, closable); hover ones follow the pointer and ignore it */
  pinned?: boolean;
  onClose?: () => void;
}

const HOVER_REFERENCE_LIMIT = 5;

const GraphEdgeTooltip: React.FC<GraphEdgeTooltipProps> = ({ edge, position, pinned = false, onClose }) => {
  const shown = pinned ? edge.references : edge.references.slice(0, HOVER_REFERENCE_LIMIT);
  const hiddenCount = edge.references.length - shown.length;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: pinned ? 'translate(-50%, 12px)' : 'translate(-50%, calc(-100% - 12px))',
        zIndex: 1300,
        pointerEvents: pinned ? 'auto' : 'none',
      }}
    >
      <Card elevation={4} sx={{ px: 1.5, py: 1, maxWidth: 360, minWidth: 220 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.3, flex: 1 }}>
            {edge.sourceLabel} → {edge.targetLabel}
          </Typography>
          {pinned && (
            <IconButton size="small" aria-label="Close edge details" onClick={onClose} sx={{ mt: -0.5, mr: -0.75 }}>
              ×
            </IconButton>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {edge.sourceLabel} references {edge.targetLabel} through{' '}
          {edge.references.length === 1 ? 'this field' : `${edge.references.length} fields`}:
        </Typography>
        <Box sx={{ maxHeight: pinned ? 220 : 'none', overflowY: pinned ? 'auto' : 'visible' }}>
          {shown.map(({ sourceField, targetField }) => (
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
        {hiddenCount > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            +{hiddenCount} more - click the edge to see all
          </Typography>
        )}
      </Card>
    </Box>
  );
};

export default GraphEdgeTooltip;

/**
 * Component: NodePopover
 * Hover preview for a network node (the restyled GraphTooltip). Unlike a
 * tooltip it holds buttons, so it stays put where the hover started and the
 * parent keeps it open while the pointer is over it (see GraphVisualization).
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, Typography } from 'ui';
import BasketToggleButton from '../../components/BasketToggleButton';
import CategoryDot from '../../components/CategoryDot';
import DatasetActionLinks from '../../components/DatasetActionLinks';
import { MONO_FONT, RADIUS, shadow } from '../../components/tokens';

export interface PopoverNode {
  id: string;
  label: string;
  type: string;
  description?: string;
}

interface NodePopoverProps {
  node: PopoverNode;
  /** Viewport position of the pointer when the hover started */
  position: { x: number; y: number };
  inBasket: boolean;
  onToggleBasket: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const WIDTH = 380;
const GAP = 12;
const MARGIN = 8;

const NodePopover: React.FC<NodePopoverProps> = ({
  node,
  position,
  inBasket,
  onToggleBasket,
  onMouseEnter,
  onMouseLeave,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null);

  // Prefer sitting above the pointer, centred; flip below when there's no
  // room, and keep the whole card inside the viewport either way.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(position.x - WIDTH / 2, MARGIN), vw - WIDTH - MARGIN);
    const above = position.y - GAP - height;
    const top = above >= MARGIN ? above : Math.min(position.y + GAP, vh - height - MARGIN);
    setPlacement({ left, top });
  }, [position.x, position.y, node.id]);

  return (
    <Box
      ref={ref}
      role="dialog"
      aria-label={`${node.label} preview`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={theme => ({
        position: 'fixed',
        left: placement?.left ?? position.x,
        top: placement?.top ?? position.y,
        visibility: placement ? 'visible' : 'hidden',
        width: WIDTH,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        zIndex: 1300,
        padding: '12px 14px',
        backgroundColor: '#fff',
        border: `1px solid ${theme.palette.grey[400]}`,
        borderRadius: RADIUS,
        boxShadow: shadow(theme, 'md'),
        fontSize: '.8125rem',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CategoryDot category={node.type} />
        <Typography component="span" sx={theme => ({ fontSize: '.75rem', color: theme.palette.grey[600] })}>
          {node.type}
        </Typography>
      </Box>
      <Typography component="div" sx={theme => ({ fontSize: '1rem', fontWeight: 700, color: theme.palette.grey[800], lineHeight: 1.3, mt: 0.5 })}>
        {node.label}
      </Typography>
      <Typography component="div" sx={theme => ({ fontFamily: MONO_FONT, fontSize: '.75rem', color: theme.palette.grey[500] })}>
        {node.id}
      </Typography>
      {node.description && (
        <Typography
          sx={theme => ({
            mt: 0.75,
            color: theme.palette.grey[700],
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          })}
        >
          {node.description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
        <DatasetActionLinks datasetId={node.id} />
        <Box sx={{ flex: 1 }} />
        <BasketToggleButton
          inBasket={inBasket}
          onToggle={() => onToggleBasket(node.id)}
          addLabel="Add to basket"
          datasetName={node.label}
        />
      </Box>
    </Box>
  );
};

export default NodePopover;

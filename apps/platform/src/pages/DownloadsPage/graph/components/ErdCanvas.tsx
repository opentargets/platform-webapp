/**
 * Component: ErdCanvas
 * The schema-diagram page's canvas: mirrors GraphCanvas, but drives the ERD
 * (table-card) rendering hook instead of the main force graph's.
 */

import React, { useEffect } from 'react';
import { Box } from 'ui';
import { useErdGraph, GraphController, GraphPointerPosition } from '../hooks/useErdGraph';
import type { ForceLayoutConfig } from '../utils/layoutConfig';

interface ErdCanvasProps {
  nodes: any[];
  edges: any[];
  matchedIds?: Set<string> | null;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string, position?: GraphPointerPosition) => void;
  onEdgeHover?: (edgeId: string | null, position?: GraphPointerPosition) => void;
  layoutConfig?: ForceLayoutConfig;
  onGraphReady?: (controller: GraphController | null) => void;
  sx?: any;
}

const ErdCanvas: React.FC<ErdCanvasProps> = ({
  nodes,
  edges,
  matchedIds,
  onNodeDeselect,
  onEdgeSelect,
  onEdgeHover,
  layoutConfig,
  onGraphReady,
  sx = {},
}) => {
  const { containerRef, isReady, controller } = useErdGraph({
    nodes,
    edges,
    matchedIds,
    layoutConfig,
    onNodeDeselect,
    onEdgeSelect,
    onEdgeHover,
  });

  useEffect(() => {
    onGraphReady?.(isReady ? controller : null);
  }, [isReady, controller, onGraphReady]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 320,
        backgroundColor: '#fff',
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 1,
        boxSizing: 'border-box',
        p: 3,
        display: 'flex',
        ...sx,
      }}
    >
      {/* The d3 mount point - kept unpadded so container.clientWidth/clientHeight match the actual rendered SVG size */}
      <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </Box>
  );
};

ErdCanvas.displayName = 'ErdCanvas';

export default ErdCanvas;

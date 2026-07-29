/**
 * Component: GraphCanvas
 * D3 force-directed graph container and renderer
 */

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useForceGraph, GraphController, GraphPointerPosition } from '../hooks/useForceGraph';
import type { ForceLayoutConfig } from '../utils/layoutConfig';

interface GraphCanvasProps {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  /** Id of a node to highlight from outside the canvas (e.g. hovering its card) */
  externalHighlightId?: string | null;
  onNodeSelect?: (nodeId: string, position?: GraphPointerPosition) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string | null, position?: GraphPointerPosition) => void;
  layoutConfig?: ForceLayoutConfig;
  onGraphReady?: (controller: GraphController | null) => void;
  sx?: any;
}

/**
 * GraphCanvas manages the D3 force simulation lifecycle and interactions
 */
const GraphCanvas = React.memo(
  ({
    nodes,
    edges,
    selectedNode,
    externalHighlightId,
    onNodeSelect,
    onNodeDeselect,
    onEdgeSelect,
    onNodeHover,
    layoutConfig,
    onGraphReady,
    sx = {},
  }: GraphCanvasProps) => {
    const { containerRef, isReady, controller } = useForceGraph({
      nodes,
      edges,
      selectedNode,
      externalHighlightId,
      layoutConfig,
      onNodeSelect,
      onNodeDeselect,
      onEdgeSelect,
      onNodeHover,
    });

    // Notify parent once the graph controller is ready
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
        {/* The d3 mount point - kept unpadded so container.clientWidth/clientHeight
            match the actual rendered SVG size */}
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden' }} />
      </Box>
    );
  }
);

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;

/**
 * Component: GraphCanvas
 * D3 force-directed graph container and renderer. Unframed: the surrounding
 * NetworkView draws the border, header and overlays.
 */

import React, { useEffect } from 'react';
import { Box } from 'ui';
import { useForceGraph, GraphController, GraphPointerPosition } from '../hooks/useForceGraph';
import type { ForceLayoutConfig } from '../utils/layoutConfig';

interface GraphCanvasProps {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  selectedEdge?: string | null;
  /** Basket ids while in basket scope; null when every node is in scope */
  basketIds?: Set<string> | null;
  onNodeSelect?: (nodeId: string, position?: GraphPointerPosition) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string, position?: GraphPointerPosition) => void;
  onEdgeHover?: (edgeId: string | null, position?: GraphPointerPosition) => void;
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
    selectedEdge,
    basketIds = null,
    onNodeSelect,
    onNodeDeselect,
    onEdgeSelect,
    onEdgeHover,
    onNodeHover,
    layoutConfig,
    onGraphReady,
    sx = {},
  }: GraphCanvasProps) => {
    const { containerRef, isReady, controller } = useForceGraph({
      nodes,
      edges,
      selectedNode,
      selectedEdge,
      basketIds,
      layoutConfig,
      onNodeSelect,
      onNodeDeselect,
      onEdgeSelect,
      onEdgeHover,
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
          boxSizing: 'border-box',
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

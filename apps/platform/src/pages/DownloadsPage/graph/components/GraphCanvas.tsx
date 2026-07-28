/**
 * Component: GraphCanvas
 * D3 force-directed graph container and renderer
 */

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useForceGraph, GraphController } from '../hooks/useForceGraph';
import type { ForceLayoutConfig } from '../utils/layoutConfig';

interface GraphCanvasProps {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
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
    onNodeSelect,
    onNodeDeselect,
    onEdgeSelect,
    layoutConfig,
    onGraphReady,
    sx = {},
  }: GraphCanvasProps) => {
    console.log('GraphCanvas render', { nodes, edges, selectedNode });
    const { containerRef, isReady, controller } = useForceGraph({
      nodes,
      edges,
      selectedNode,
      layoutConfig,
      onNodeSelect,
      onNodeDeselect,
      onEdgeSelect,
    });

    // Notify parent once the graph controller is ready
    useEffect(() => {
      onGraphReady?.(isReady ? controller : null);
    }, [isReady, controller, onGraphReady]);

    return (
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      />
    );
  }
);

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;


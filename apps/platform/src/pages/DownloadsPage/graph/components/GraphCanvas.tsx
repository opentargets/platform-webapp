/**
 * Component: GraphCanvas
 * Cytoscape container and instance manager
 */

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useCytoscapeInstance } from '../hooks/useCytoscapeInstance';
import { useGraphInteractions, useGraphManipulation } from '../hooks/useGraphInteractions';
import { Core } from 'cytoscape';

interface GraphCanvasProps {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
  layoutConfig?: any;
  onCytoscapeReady?: (cy: Core | null) => void;
  sx?: any;
}

/**
 * GraphCanvas manages Cytoscape instance lifecycle and interactions
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
    onCytoscapeReady,
    sx = {},
  }: GraphCanvasProps) => {
    const { cy, containerRef, isReady } = useCytoscapeInstance({
      nodes,
      edges,
      layoutConfig,
    });

    // Set up interaction handlers
    useGraphInteractions({
      cy,
      onNodeSelect,
      onNodeDeselect,
      onEdgeSelect,
    });

    // Get manipulation utilities
    const { selectNode, deselectAll } = useGraphManipulation(cy);

    // Handle external node selection
    useEffect(() => {
      if (!isReady || !cy) return;

      if (selectedNode) {
        selectNode(selectedNode);
      } else {
        deselectAll();
      }
    }, [selectedNode, isReady, cy, selectNode, deselectAll]);

    // Notify parent when Cytoscape is ready
    useEffect(() => {
      if (isReady) {
        onCytoscapeReady?.(cy);
      }
    }, [isReady, cy, onCytoscapeReady]);

    return (
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          ...sx,
        }}
      />
    );
  }
);

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;

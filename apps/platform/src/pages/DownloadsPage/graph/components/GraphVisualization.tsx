/**
 * Component: GraphVisualization
 * Main container orchestrating graph visualization
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import GraphCanvas from './GraphCanvas';
import GraphLegend from './GraphLegend';
import GraphControls from './GraphControls';
import GraphTooltip from './GraphTooltip';
import useGraphData from '../hooks/useGraphData';
import useGraphLayout from '../hooks/useGraphLayout';
import { GraphController } from '../hooks/useForceGraph';

interface GraphVisualizationProps {
  sx?: any;
}

interface SelectedNodeInfo {
  id: string;
  label: string;
  type: string;
  degree?: number;
  description?: string;
}

/**
 * Main graph visualization component with all interactive features
 */
const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  sx = {},
}) => {
  // State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [controller, setController] = useState<GraphController | null>(null);
  
  // Get graph data from schema context
  const { nodes: allNodes, edges: allEdges } = useGraphData();
  
  // Extract all unique categories from nodes
  const allCategories = useMemo(
    () => Array.from(new Set(allNodes.map((n) => n.data?.type).filter(Boolean))),
    [allNodes]
  );
  
  const [visibleCategories, setVisibleCategories] = useState<string[]>(allCategories);

  // Filter nodes and edges based on visible categories
  const { nodes, edges } = useMemo(() => {
    const visibleNodeIds = new Set(
      allNodes
        .filter((node) => visibleCategories.includes(node.data.type))
        .map((node) => node.data.id)
    );

    const filteredNodes = allNodes.filter((node) => visibleNodeIds.has(node.data.id));
    const filteredEdges = allEdges.filter(
      (edge) => visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [allNodes, allEdges, visibleCategories]);

  // Get layout configuration
  const { layoutConfig } = useGraphLayout({
    nodeCount: nodes.length,
    edgeCount: edges.length,
    responsive: true,
  });

  // Handle node selection
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.data.id === nodeId);
      if (node) {
        setSelectedNode({
          id: node.data.id,
          label: node.data.label,
          type: node.data.type,
          degree: node.data.degree,
          description: node.data.description,
        });
      }
    },
    [nodes]
  );

  const handleNodeDeselect = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleGraphReady = useCallback((graphController: GraphController | null) => {
    setController(graphController);
  }, []);

  const handleCategoryToggle = useCallback((category: string, visible: boolean) => {
    setVisibleCategories((prev) => {
      if (visible) {
        return [...prev, category];
      } else {
        return prev.filter((c) => c !== category);
      }
    });
  }, []);

  // Note: Available layouts can be retrieved with getAvailableLayouts() if needed

  return (
    <Box sx={{ width: '100%', height: '100%', ...sx }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafafa',
        }}
      >
        {/* Title */}
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Data Schema Graph
        </Typography>

        {/* Info text */}
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Force-directed visualization of {nodes.length} datasets and {edges.length} relationships.
          The layout automatically positions core entities (Target, Disease) at the center, with
          evidence datasets bridging them in a hub-and-spoke topology.
        </Typography>

        {/* Main layout */}
        <Box sx={{ display: 'flex', gap: 2, minHeight: 0, flex: 1 }}>
          {/* Graph canvas */}


          {/* Sidebar */}
          <Box
            sx={{
              width: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: 'auto',
              pr: 1,
            }}
          >
            {/* Tooltip/Details */}
            <GraphTooltip selectedNode={selectedNode} />

            {/* Controls */}
            <GraphControls controller={controller} onReset={handleNodeDeselect} />

            {/* Legend */}
            <GraphLegend 
              nodes={allNodes}
              visibleCategories={visibleCategories}
              onCategoryToggle={handleCategoryToggle}
            />

            {/* Stats */}
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Statistics
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Nodes
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {nodes.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Edges
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {edges.length}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Layout info */}
            <Paper sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Current Layout
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Force-Directed
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Physics-based positioning for organic hub-and-spoke topology
              </Typography>
            </Paper>
          </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: 600, flex: 1 }}>
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode?.id}
              onNodeSelect={handleNodeSelect}
              onNodeDeselect={handleNodeDeselect}
              onEdgeSelect={(edgeId) => {
                // Handle edge selection if needed
                console.log('Selected edge:', edgeId);
              }}
              layoutConfig={layoutConfig}
              onGraphReady={handleGraphReady}
              sx={{
                height: '100%',
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

GraphVisualization.displayName = 'GraphVisualization';

export default GraphVisualization;

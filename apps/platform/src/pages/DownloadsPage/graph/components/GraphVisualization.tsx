/**
 * Component: GraphVisualization
 * Main container orchestrating graph visualization
 */

import React, { useState, useCallback, useMemo, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import GraphCanvas from './GraphCanvas';
import GraphControls from './GraphControls';
import GraphTooltip from './GraphTooltip';
import useGraphData from '../hooks/useGraphData';
import useGraphLayout from '../hooks/useGraphLayout';
import { GraphController, GraphPointerPosition } from '../hooks/useForceGraph';
import { DownloadsContext } from '../../context/DownloadsContext';
import DownloadsFilter from '../../DownloadsFilter';
import DownloadsCard from '../../DownloadsCard';

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

interface HoveredNodeInfo extends SelectedNodeInfo {
  position: GraphPointerPosition;
}

/**
 * Main graph visualization component with all interactive features
 */
const GraphVisualization: React.FC<GraphVisualizationProps> = ({ sx = {} }) => {
  const { state } = useContext(DownloadsContext);

  // The selected node lives in the URL (`?node=`), not local state, so a
  // link from the card view ("N connections") can land here with the right
  // node already highlighted, and the selection survives a refresh/share.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNodeId = searchParams.get('node');

  // State
  const [hoveredNode, setHoveredNode] = useState<HoveredNodeInfo | null>(null);
  const [controller, setController] = useState<GraphController | null>(null);

  // Get graph data from schema context
  const { nodes: allNodes, edges: allEdges } = useGraphData();

  // Filter nodes by the same search text + category filters the card view
  // uses (DownloadsContext), so switching tabs keeps the same dataset subset.
  const { nodes, edges } = useMemo(() => {
    const query = state.freeTextQuery?.toLowerCase() ?? '';
    const matchesQuery = (n: any) =>
      !query ||
      n.data.label?.toLowerCase().includes(query) ||
      n.data.description?.toLowerCase().includes(query);
    const matchesCategory = (n: any) =>
      !state.selectedFilters.length || state.selectedFilters.includes(n.data.type);

    const visibleIds = new Set(
      allNodes.filter((n) => matchesQuery(n) && matchesCategory(n)).map((n) => n.data.id)
    );
    const filteredNodes = allNodes.filter((n) => visibleIds.has(n.data.id));
    const filteredEdges = allEdges.filter(
      (e) => visibleIds.has(e.data.source) && visibleIds.has(e.data.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [allNodes, allEdges, state.freeTextQuery, state.selectedFilters]);

  // Map graph node id -> full download row, so clicking a node can open the
  // same DatasetCard the card view uses (a RecordSet's id is the FileSet's
  // id with the "-fileset" suffix stripped - see DownloadsCard/utils.js).
  const rowById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    state.rows.forEach((row: any) => {
      map.set(String(row['@id']).replace('-fileset', ''), row);
    });
    return map;
  }, [state.rows]);

  // Get layout configuration
  const { layoutConfig } = useGraphLayout({
    nodeCount: nodes.length,
    edgeCount: edges.length,
    responsive: true,
  });

  // Derive the selected node's info from the URL-sourced id
  const selectedNode = useMemo<SelectedNodeInfo | null>(() => {
    const node = selectedNodeId && nodes.find((n) => n.data.id === selectedNodeId);
    if (!node) return null;
    return {
      id: node.data.id,
      label: node.data.label,
      type: node.data.type,
      degree: node.data.degree,
      description: node.data.description,
    };
  }, [nodes, selectedNodeId]);

  // Handle node selection - written back to the URL
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('node', nodeId);
        return next;
      });
    },
    [setSearchParams]
  );

  const handleNodeDeselect = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('node');
      return next;
    });
  }, [setSearchParams]);

  // Handle node hover (compact floating tooltip)
  const handleNodeHover = useCallback(
    (nodeId: string | null, position?: GraphPointerPosition) => {
      if (!nodeId || !position) {
        setHoveredNode(null);
        return;
      }
      const node = nodes.find((n) => n.data.id === nodeId);
      if (node) {
        setHoveredNode({
          id: node.data.id,
          label: node.data.label,
          type: node.data.type,
          degree: node.data.degree,
          description: node.data.description,
          position,
        });
      }
    },
    [nodes]
  );

  const handleGraphReady = useCallback((graphController: GraphController | null) => {
    setController(graphController);
  }, []);

  const selectedRow = selectedNode ? rowById.get(selectedNode.id) : undefined;

  return (
    <Box sx={{ width: '100%', height: '100%', ...sx }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'transparent',
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
          {/* Sidebar - shared with the card view: same DownloadsFilter component and state */}
          <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GraphControls controller={controller} onReset={handleNodeDeselect} />
            <DownloadsFilter />
          </Box>

          {/* Graph canvas */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 'min(70vh, 720px)',
              flex: 1,
            }}
          >
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode?.id}
              onNodeSelect={handleNodeSelect}
              onNodeDeselect={handleNodeDeselect}
              onNodeHover={handleNodeHover}
              layoutConfig={layoutConfig}
              onGraphReady={handleGraphReady}
              sx={{ height: '100%' }}
            />

            {/* Detail panel - the same DatasetCard the card view uses, incl.
                Schema/Access Data buttons - floats over the canvas instead of
                pushing its layout, so the graph doesn't reflow on selection */}
            {selectedRow && (
              <Box sx={{ position: 'absolute', top: 24, right: 24, width: 350, maxHeight: 'calc(100% - 48px)', overflowY: 'auto' }}>
                <DownloadsCard data={selectedRow} />
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Compact tooltip that follows the pointer while hovering a node */}
      {hoveredNode && hoveredNode.id !== selectedNode?.id && (
        <GraphTooltip node={hoveredNode} position={hoveredNode.position} />
      )}
    </Box>
  );
};

GraphVisualization.displayName = 'GraphVisualization';

export default GraphVisualization;

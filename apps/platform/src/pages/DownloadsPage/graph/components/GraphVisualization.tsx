/**
 * Component: GraphVisualization
 * The "Network" pane - a force-directed view of the dataset schema graph.
 * Lives side by side with the card list (see DownloadsPage), sharing a single
 * page's worth of state rather than deep-linkable URL params: filters come
 * from DownloadsContext, and the selected/hovered node are lifted into
 * DownloadsPage (via `selectedNodeId`/`onNodeSelect`/`onNodeDeselect` and
 * `externalHighlightId`/`onNodeHoverChange`) so both panes stay in sync.
 */

import React, { useState, useCallback, useMemo, useContext } from 'react';
import { Box } from '@mui/material';
import GraphCanvas from './GraphCanvas';
import GraphControls from './GraphControls';
import GraphTooltip from './GraphTooltip';
import useGraphData from '../hooks/useGraphData';
import useGraphLayout from '../hooks/useGraphLayout';
import { GraphController, GraphPointerPosition } from '../hooks/useForceGraph';
import { DownloadsContext } from '../../context/DownloadsContext';

interface GraphVisualizationProps {
  sx?: any;
  /** Id of a node to raise from outside the canvas (e.g. hovering its card) */
  externalHighlightId?: string | null;
  /** Called as the pointer hovers/unhovers a node, so the matching card's border can be raised */
  onNodeHoverChange?: (nodeId: string | null) => void;
  /** The currently selected (clicked) node id, owned by the parent */
  selectedNodeId?: string | null;
  /** Called when a node is clicked */
  onNodeSelect?: (nodeId: string) => void;
  /** Called when the selection is cleared (click on empty canvas, or "reset view") */
  onNodeDeselect?: () => void;
}

interface HoveredNodeInfo {
  id: string;
  label: string;
  type: string;
  degree?: number;
  description?: string;
  position: GraphPointerPosition;
}

/**
 * The network pane: canvas, zoom/export controls, and the pointer-follow tooltip
 */
const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  sx = {},
  externalHighlightId = null,
  onNodeHoverChange,
  selectedNodeId = null,
  onNodeSelect,
  onNodeDeselect,
}) => {
  const { state } = useContext(DownloadsContext);

  const [hoveredNode, setHoveredNode] = useState<HoveredNodeInfo | null>(null);
  const [controller, setController] = useState<GraphController | null>(null);

  // Get graph data from schema context
  const { nodes: allNodes, edges: allEdges } = useGraphData();

  // Filter nodes by the same search text + category filters the card view
  // uses (DownloadsContext), so the two panes always show the same subset.
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

  // Get layout configuration
  const { layoutConfig } = useGraphLayout({
    nodeCount: nodes.length,
    edgeCount: edges.length,
    responsive: true,
  });

  // Only pass the selected id through if it's actually visible under the
  // current filters - otherwise every node would read as "unrelated" and fade.
  const hasSelectedNode = Boolean(
    selectedNodeId && nodes.some((n) => n.data.id === selectedNodeId)
  );

  // Handle node hover (compact floating tooltip + raising the matching card)
  const handleNodeHover = useCallback(
    (nodeId: string | null, position?: GraphPointerPosition) => {
      onNodeHoverChange?.(nodeId);
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
    [nodes, onNodeHoverChange]
  );

  const handleGraphReady = useCallback((graphController: GraphController | null) => {
    setController(graphController);
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', ...sx }}>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedNode={hasSelectedNode ? selectedNodeId : null}
        externalHighlightId={externalHighlightId}
        onNodeSelect={onNodeSelect}
        onNodeDeselect={onNodeDeselect}
        onNodeHover={handleNodeHover}
        layoutConfig={layoutConfig}
        onGraphReady={handleGraphReady}
        sx={{ height: '100%' }}
      />

      <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
        <GraphControls
          controller={controller}
          onReset={onNodeDeselect}
          sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}
        />
      </Box>

      {/* Compact tooltip that follows the pointer while hovering a node */}
      {hoveredNode && <GraphTooltip node={hoveredNode} position={hoveredNode.position} />}
    </Box>
  );
};

GraphVisualization.displayName = 'GraphVisualization';

export default GraphVisualization;

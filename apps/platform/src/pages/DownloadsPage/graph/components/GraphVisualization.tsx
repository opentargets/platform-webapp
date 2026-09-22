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
import { Box } from 'ui';
import GraphCanvas from './GraphCanvas';
import GraphControls from './GraphControls';
import GraphTooltip from './GraphTooltip';
import GraphEdgeTooltip, { EdgeTooltipInfo } from './GraphEdgeTooltip';
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
  const [hoveredEdge, setHoveredEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);

  // Get graph data from schema context
  const { nodes: allNodes, edges: allEdges } = useGraphData();

  // The canvas renders the full node/edge set minus datasets with no
  // schema-declared relationship to anything else in the graph (degree 0) -
  // those have no edges to draw, so keeping them only forces the radial
  // layout (see radialLayout.ts) to reserve an entire extra ring of space
  // for them far from the connected part of the graph. This is distinct
  // from the category/search filters the card view uses: those toggle on
  // every keystroke/click, so instead of re-filtering `nodes`/`edges`
  // (which would tear down and rebuild the whole simulation, keyed off
  // their identity - see useGraphSimulation) matches are dimmed in place
  // via `filterMatchedIds` below. The degree filter below only changes when
  // `allNodes` itself does, i.e. when the underlying schema data changes.
  const nodes = useMemo(() => allNodes.filter((n) => (n.data.degree ?? 0) > 0), [allNodes]);
  const edges = useMemo(() => {
    const keptIds = new Set(nodes.map((n) => n.data.id));
    return allEdges.filter((e) => keptIds.has(e.data.source) && keptIds.has(e.data.target));
  }, [allEdges, nodes]);

  const filterMatchedIds = useMemo(() => {
    const query = state.freeTextQuery?.toLowerCase() ?? '';
    const hasCategoryFilter = state.selectedFilters.length > 0;
    if (!query && !hasCategoryFilter) return null;

    const matchesQuery = (n: any) =>
      !query ||
      n.data.label?.toLowerCase().includes(query) ||
      n.data.description?.toLowerCase().includes(query);
    const matchesCategory = (n: any) => !hasCategoryFilter || state.selectedFilters.includes(n.data.type);

    return new Set(allNodes.filter((n) => matchesQuery(n) && matchesCategory(n)).map((n) => n.data.id));
  }, [allNodes, state.freeTextQuery, state.selectedFilters]);

  // Get layout configuration
  const { layoutConfig } = useGraphLayout();

  // Only pass the selected id through if it still exists in the data - guards
  // against a stale id after the underlying schema changes.
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

  // Resolve an edge id to what the tooltip needs: the two datasets' names and
  // the field-level references (see dataTransformer's `references`).
  const describeEdge = useCallback(
    (edgeId: string): EdgeTooltipInfo | null => {
      const edge = edges.find((e) => e.data.id === edgeId);
      if (!edge) return null;
      const labelOf = (id: string) => nodes.find((n) => n.data.id === id)?.data.label ?? id;
      return {
        id: edgeId,
        sourceLabel: labelOf(edge.data.source),
        targetLabel: labelOf(edge.data.target),
        references: edge.data.references ?? [],
      };
    },
    [edges, nodes]
  );

  const handleEdgeHover = useCallback((edgeId: string | null, position?: GraphPointerPosition) => {
    setHoveredEdge(edgeId && position ? { id: edgeId, position } : null);
  }, []);

  const handleEdgeSelect = useCallback((edgeId: string, position?: GraphPointerPosition) => {
    if (position) setPinnedEdge({ id: edgeId, position });
    setHoveredEdge(null);
  }, []);

  // Anything that moves focus elsewhere (selecting a node, clicking empty
  // canvas, "reset view") closes a pinned edge.
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      setPinnedEdge(null);
      onNodeSelect?.(nodeId);
    },
    [onNodeSelect]
  );
  const handleNodeDeselect = useCallback(() => {
    setPinnedEdge(null);
    onNodeDeselect?.();
  }, [onNodeDeselect]);

  const hoveredEdgeInfo = hoveredEdge && hoveredEdge.id !== pinnedEdge?.id ? describeEdge(hoveredEdge.id) : null;
  const pinnedEdgeInfo = pinnedEdge ? describeEdge(pinnedEdge.id) : null;

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
        filterMatchedIds={filterMatchedIds}
        selectedEdge={pinnedEdge?.id ?? null}
        onNodeSelect={handleNodeSelect}
        onNodeDeselect={handleNodeDeselect}
        onEdgeSelect={handleEdgeSelect}
        onEdgeHover={handleEdgeHover}
        onNodeHover={handleNodeHover}
        layoutConfig={layoutConfig}
        onGraphReady={handleGraphReady}
        sx={{ height: '100%' }}
      />

      <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
        <GraphControls
          controller={controller}
          onReset={handleNodeDeselect}
          sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}
        />
      </Box>

      {/* Compact tooltip that follows the pointer while hovering a node */}
      {hoveredNode && <GraphTooltip node={hoveredNode} position={hoveredNode.position} />}

      {/* Edge details: follows the pointer on hover, pinned in place on click */}
      {hoveredEdgeInfo && hoveredEdge && <GraphEdgeTooltip edge={hoveredEdgeInfo} position={hoveredEdge.position} />}
      {pinnedEdgeInfo && pinnedEdge && (
        <GraphEdgeTooltip
          edge={pinnedEdgeInfo}
          position={pinnedEdge.position}
          pinned
          onClose={() => setPinnedEdge(null)}
        />
      )}
    </Box>
  );
};

GraphVisualization.displayName = 'GraphVisualization';

export default GraphVisualization;

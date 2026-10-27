/**
 * Component: GraphVisualization
 * The network canvas plus its pointer-driven overlays: the node hover
 * popover and the edge tooltips. Selection, basket scope and the canvas
 * controls are owned by the parent (NetworkView), which also renders the
 * details panel, legend and header around this component.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from 'ui';
import GraphCanvas from './GraphCanvas';
import NodePopover, { PopoverNode } from './NodePopover';
import GraphEdgeTooltip, { EdgeTooltipInfo } from './GraphEdgeTooltip';
import useGraphLayout from '../hooks/useGraphLayout';
import { GraphController, GraphPointerPosition } from '../hooks/useForceGraph';

interface GraphVisualizationProps {
  nodes: any[];
  edges: any[];
  sx?: any;
  /** The currently selected (clicked) node id, owned by the parent */
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDeselect?: () => void;
  /** Basket ids while the scope is "basket"; null otherwise */
  basketIds?: Set<string> | null;
  inBasket: (id: string) => boolean;
  onToggleBasket: (id: string) => void;
  onControllerReady?: (controller: GraphController | null) => void;
}

interface HoveredNode extends PopoverNode {
  position: GraphPointerPosition;
}

/** Delay before a hover popover closes once the pointer leaves the node, so it can reach the popover */
const POPOVER_CLOSE_DELAY = 180;

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes,
  edges,
  sx = {},
  selectedNodeId = null,
  onNodeSelect,
  onNodeDeselect,
  basketIds = null,
  inBasket,
  onToggleBasket,
  onControllerReady,
}) => {
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { layoutConfig } = useGraphLayout();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHoveredNode(null), POPOVER_CLOSE_DELAY);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Only pass the selected id through if it still exists in the data - guards
  // against a stale id after the underlying schema changes.
  const hasSelectedNode = Boolean(selectedNodeId && nodes.some((n) => n.data.id === selectedNodeId));

  // Hovering a node opens its popover where the pointer is and keeps it there
  // (it holds buttons, so it can't follow the pointer); leaving the node
  // starts a short countdown the popover itself can cancel.
  const handleNodeHover = useCallback(
    (nodeId: string | null, position?: GraphPointerPosition) => {
      if (!nodeId || !position) {
        scheduleClose();
        return;
      }
      cancelClose();
      setHoveredNode((current) => {
        if (current?.id === nodeId) return current;
        const node = nodes.find((n) => n.data.id === nodeId);
        if (!node) return current;
        return {
          id: node.data.id,
          label: node.data.label,
          type: node.data.type,
          description: node.data.description,
          position,
        };
      });
    },
    [nodes, cancelClose, scheduleClose]
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
  // canvas) closes a pinned edge and the hover popover.
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      setPinnedEdge(null);
      cancelClose();
      setHoveredNode(null);
      onNodeSelect?.(nodeId);
    },
    [onNodeSelect, cancelClose]
  );
  const handleNodeDeselect = useCallback(() => {
    setPinnedEdge(null);
    onNodeDeselect?.();
  }, [onNodeDeselect]);

  const hoveredEdgeInfo = hoveredEdge && hoveredEdge.id !== pinnedEdge?.id ? describeEdge(hoveredEdge.id) : null;
  const pinnedEdgeInfo = pinnedEdge ? describeEdge(pinnedEdge.id) : null;

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', ...sx }}>
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedNode={hasSelectedNode ? selectedNodeId : null}
        basketIds={basketIds}
        selectedEdge={pinnedEdge?.id ?? null}
        onNodeSelect={handleNodeSelect}
        onNodeDeselect={handleNodeDeselect}
        onEdgeSelect={handleEdgeSelect}
        onEdgeHover={handleEdgeHover}
        onNodeHover={handleNodeHover}
        layoutConfig={layoutConfig}
        onGraphReady={onControllerReady}
        sx={{ height: '100%' }}
      />

      {hoveredNode && (
        <NodePopover
          node={hoveredNode}
          position={hoveredNode.position}
          inBasket={inBasket(hoveredNode.id)}
          onToggleBasket={onToggleBasket}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}

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

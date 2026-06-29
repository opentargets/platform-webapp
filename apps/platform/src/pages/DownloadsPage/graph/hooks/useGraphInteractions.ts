/**
 * Hook: useGraphInteractions
 * Manages user interactions: click, hover, selection, highlighting
 */

import { useEffect, useCallback } from 'react';
import { Core, EventObject } from 'cytoscape';

interface UseGraphInteractionsOptions {
  cy: Core | null;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
}

/**
 * Set up event handlers for graph interactions
 */
export const useGraphInteractions = ({
  cy,
  onNodeSelect,
  onNodeDeselect,
  onEdgeSelect,
}: UseGraphInteractionsOptions): void => {
  // Handle node tap/selection
  const handleNodeTap = useCallback(
    (event: EventObject) => {
      if (!cy) return;

      const node = event.target;
      const nodeId = node.data('id');

      // Clear previous selection
      cy.elements().removeClass('selected');
      cy.elements().removeClass('highlighted');

      // Select the tapped node
      node.addClass('selected');
      onNodeSelect?.(nodeId);

      // Highlight connected edges and nodes
      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      connectedEdges.addClass('highlighted');
      connectedNodes.addClass('active');
    },
    [cy, onNodeSelect]
  );

  // Handle canvas tap (deselect)
  const handleCanvasTap = useCallback(
    (event: EventObject) => {
      if (event.target !== cy) return;

      if (cy) {
        cy.elements().removeClass('selected');
        cy.elements().removeClass('highlighted');
        cy.elements().removeClass('active');
      }

      onNodeDeselect?.();
    },
    [cy, onNodeDeselect]
  );

  // Handle edge tap
  const handleEdgeTap = useCallback(
    (event: EventObject) => {
      if (!cy) return;

      const edge = event.target;
      const edgeId = edge.data('id');

      // Clear previous selection
      cy.elements().removeClass('selected');
      cy.elements().removeClass('highlighted');

      // Highlight the edge and its connected nodes
      edge.addClass('highlighted');
      edge.source().addClass('active');
      edge.target().addClass('active');

      onEdgeSelect?.(edgeId);
    },
    [cy, onEdgeSelect]
  );

  // Handle node hover (show tooltip)
  const handleNodeMouseover = useCallback(
    (event: EventObject) => {
      if (!cy) return;
      const node = event.target;
      node.addClass('hover');
    },
    [cy]
  );

  const handleNodeMouseout = useCallback(
    (event: EventObject) => {
      if (!cy) return;
      const node = event.target;
      node.removeClass('hover');
    },
    [cy]
  );

  // Attach event handlers
  useEffect(() => {
    if (!cy) return;

    cy.on('tap', 'node', handleNodeTap);
    cy.on('tap', handleCanvasTap);
    cy.on('tap', 'edge', handleEdgeTap);
    cy.on('mouseover', 'node', handleNodeMouseover);
    cy.on('mouseout', 'node', handleNodeMouseout);

    return () => {
      cy.off('tap', 'node', handleNodeTap);
      cy.off('tap', handleCanvasTap);
      cy.off('tap', 'edge', handleEdgeTap);
      cy.off('mouseover', 'node', handleNodeMouseover);
      cy.off('mouseout', 'node', handleNodeMouseout);
    };
  }, [cy, handleNodeTap, handleCanvasTap, handleEdgeTap, handleNodeMouseover, handleNodeMouseout]);
};

/**
 * Utility functions for graph manipulation
 */
export const useGraphManipulation = (cy: Core | null) => {
  const selectNode = useCallback(
    (nodeId: string) => {
      if (!cy) return;
      const node = cy.getElementById(nodeId);
      node.addClass('selected');
    },
    [cy]
  );

  const deselectAll = useCallback(() => {
    if (!cy) return;
    cy.elements().removeClass('selected');
  }, [cy]);

  const highlightPath = useCallback(
    (sourceId: string, targetId: string) => {
      if (!cy) return;
      cy.elements().removeClass('highlighted');

      const source = cy.getElementById(sourceId);
      const target = cy.getElementById(targetId);

      if (!source.empty() && !target.empty()) {
        const shortestPath = cy.elements().aStar({
          root: source,
          goal: target,
        }).path;

        if (shortestPath) {
          shortestPath.addClass('highlighted');
        }
      }
    },
    [cy]
  );

  const zoomToFit = useCallback(() => {
    if (!cy) return;
    cy.fit(undefined, 50);
  }, [cy]);

  const resetZoom = useCallback(() => {
    if (!cy) return;
    cy.reset();
  }, [cy]);

  return {
    selectNode,
    deselectAll,
    highlightPath,
    zoomToFit,
    resetZoom,
  };
};

export default useGraphInteractions;

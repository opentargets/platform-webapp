import type { Core, ElementDefinition, LayoutOptions } from "cytoscape";
import cytoscape from "cytoscape";
import { createStylesheet } from "./stylesheet";
import {
  createEdgeTooltipHTML,
  createNodeTooltipHTML,
  removeTooltip,
  styleAndAppendTooltip,
} from "./tooltips";

/**
 * Initializes Cytoscape instance with event handlers
 */
export function initializeCytoscapeInstance(
  container: HTMLDivElement,
  elements: ElementDefinition[],
  layoutConfig: Record<string, unknown>,
  viewMode: "genes" | "pathways",
  tooltipsRef: React.MutableRefObject<Set<HTMLDivElement>>,
  onNodeClick?: (data: Record<string, unknown>) => void,
  onEdgeClick?: (data: Record<string, unknown>) => void
): Core {
  const stylesheet = createStylesheet();
  const cy = cytoscape({
    container,
    elements,
    style: stylesheet,
    layout: layoutConfig as unknown as LayoutOptions,
    wheelSensitivity: 0.1,
    // Enable selection functionality
    selectionType: "single",
    // userSelectableElements: true,
    autoungrabify: false,
  });

  // Node hover handler
  cy.on("mouseover", "node", (evt) => {
    const node = evt.target;
    const data = node.data();
    const tooltip = document.createElement("div");
    tooltip.className = "cytoscape-tooltip";
    tooltipsRef.current.add(tooltip);

    const tooltipHTML = createNodeTooltipHTML(viewMode, data);
    tooltip.innerHTML = tooltipHTML;
    styleAndAppendTooltip(tooltip);

    const updatePosition = (clientX: number, clientY: number) => {
      try {
        // Position tooltip near mouse with small offset
        tooltip.style.left = `${clientX + 10}px`;
        tooltip.style.top = `${clientY + 10}px`;
      } catch (err) {
        console.warn("[NODE_HOVER] Failed to update position:", err);
      }
    };

    // Update position on mouse move
    const mouseMoveListener = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    container.addEventListener("mousemove", mouseMoveListener);

    node.on("mouseout", () => {
      container.removeEventListener("mousemove", mouseMoveListener);
      removeTooltip(tooltip, tooltipsRef, "NODE_MOUSEOUT");
    });
  });

  // Edge hover handler
  cy.on("mouseover", "edge", (evt) => {
    const edge = evt.target;
    const data = edge.data();
    const tooltip = document.createElement("div");
    tooltip.className = "cytoscape-tooltip";
    tooltipsRef.current.add(tooltip);

    const tooltipHTML = createEdgeTooltipHTML(viewMode, data);
    tooltip.innerHTML = tooltipHTML;
    styleAndAppendTooltip(tooltip);

    const updatePosition = (clientX: number, clientY: number) => {
      try {
        // Position tooltip near mouse with small offset
        tooltip.style.left = `${clientX + 10}px`;
        tooltip.style.top = `${clientY + 10}px`;
      } catch (err) {
        console.warn("[EDGE_HOVER] Failed to update position:", err);
      }
    };

    // Update position on mouse move
    const mouseMoveListener = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    container.addEventListener("mousemove", mouseMoveListener);

    edge.on("mouseout", () => {
      container.removeEventListener("mousemove", mouseMoveListener);
      removeTooltip(tooltip, tooltipsRef, "EDGE_MOUSEOUT");
    });
  });

  // Node click handler - handle selection with Ctrl/Cmd+click support
  cy.on("click", "node", (evt) => {
    const node = evt.target;
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const isMultiSelectKey = isMac ? evt.originalEvent.metaKey : evt.originalEvent.ctrlKey;
    if (isMultiSelectKey) {
      // Ctrl/Cmd+click: toggle selection for this node
      if (node.selected()) {
        node.unselect();
      } else {
        node.select();
      }
    } else {
      // Regular click: select only this node, deselect others
      cy.nodes().unselect();
      node.select();
      // Open modal for single click without modifier
      if (onNodeClick) {
       
        onNodeClick(node.data());
      }
    }

    const selectedCount = cy.nodes(":selected").length;
  });

  // Canvas click handler - deselect all when clicking background
  cy.on("click", (evt) => {
    if (evt.target === cy) {
      // Clicking on canvas, not on any element
      cy.nodes().unselect();
      cy.edges().unselect();
    }
  });

  // Edge click handler - show modal with shared genes
  cy.on("click", "edge", (evt) => {
    const edge = evt.target;
    if (onEdgeClick) {
      onEdgeClick(edge.data());
    }
  });

  // Add keyboard support for selection (attach to container for scoped behavior)
  const keydownHandler = (evt: KeyboardEvent) => {
    if ((evt.ctrlKey || evt.metaKey) && evt.key === "a") {
      // Ctrl/Cmd+A: select all nodes
      evt.preventDefault();
      cy.nodes().select();
    }
  };

  container.addEventListener("keydown", keydownHandler);

  // Store cleanup reference for hiding tooltips when modal is clicked
  (cy as any)._hideTooltips = () => {
    tooltipsRef.current.forEach((tooltip) => {
      removeTooltip(tooltip, tooltipsRef, "MODAL_CLICK");
    });
  };

  return cy;

}

/**
 * Cleans up Cytoscape instance and tooltips
 */
export function cleanupCytoscapeInstance(
  cy: Core | null,
  tooltipsRef: React.MutableRefObject<Set<HTMLDivElement>>
): void {
  if (!cy) return;

  // Remove keyboard event listener
  const selectionHandler = (cy as any)._selectionKeydownHandler;
  if (selectionHandler) {
    selectionHandler.container.removeEventListener("keydown", selectionHandler.handler);
    delete (cy as any)._selectionKeydownHandler;
  }

  // Remove hideTooltips reference
  delete (cy as any)._hideTooltips;

  let cleanupIndex = 0;
  for (const tooltip of tooltipsRef.current) {
    cleanupIndex++;
    try {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      } else {
      }
    } catch (err) {
    }
  }
  tooltipsRef.current.clear();

  try {
    cy.destroy();
  } catch (err) {
  }
}

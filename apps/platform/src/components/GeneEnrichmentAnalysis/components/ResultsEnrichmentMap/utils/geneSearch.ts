import type { ElementDefinition } from "cytoscape";

/**
 * Find all nodes and edges that contain the searched gene or match pathway name/ID
 */
export function findNodesAndEdgesWithGene(
  elements: ElementDefinition[],
  geneSymbol: string
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (!geneSymbol || geneSymbol.trim().length === 0) {
    return { nodeIds, edgeIds };
  }

  const searchTerm = geneSymbol.toUpperCase();

  for (const element of elements) {
    if (element.data?.source) {
      // This is an edge - search for genes in shared genes
      const sharedGenes = (element.data?.sharedGenes as string[]) || [];
      if (sharedGenes.some((gene) => gene.toUpperCase().includes(searchTerm))) {
        edgeIds.add(element.data.id as string);
        // Highlight both connected nodes
        nodeIds.add(element.data.source as string);
        nodeIds.add(element.data.target as string);
      }
    } else {
      // This is a node - search for pathway ID and display label
      const pathwayId = (element.data?.id as string) || "";
      const displayLabel = (element.data?.displayLabel as string) || "";
      const pathwayName = (element.data?.pathwayName as string) || "";

      if (
        pathwayId.toUpperCase().includes(searchTerm) ||
        displayLabel.toUpperCase().includes(searchTerm) ||
        pathwayName.toUpperCase().includes(searchTerm)
      ) {
        nodeIds.add(element.data.id as string);
      }
    }
  }

  console.log(`[GENE_SEARCH] Found ${nodeIds.size} nodes and ${edgeIds.size} edges for: ${searchTerm}`);
  return { nodeIds, edgeIds };
}

/**
 * Update element classes to show/hide based on search
 */
export function updateElementHighlight(
  cy: any,
  nodeIds: Set<string>,
  edgeIds: Set<string>,
  isSearchActive: boolean
): void {
  if (!cy) return;

  if (!isSearchActive || (nodeIds.size === 0 && edgeIds.size === 0)) {
    // Clear all highlights
    cy.elements().removeClass("highlighted dimmed");
  } else {
    // Add dimmed class to all elements
    cy.elements().addClass("dimmed");

    // Remove dimmed class from highlighted elements
    for (const nodeId of nodeIds) {
      cy.getElementById(nodeId).removeClass("dimmed").addClass("highlighted");
    }
    for (const edgeId of edgeIds) {
      cy.getElementById(edgeId).removeClass("dimmed").addClass("highlighted");
    }
  }
}

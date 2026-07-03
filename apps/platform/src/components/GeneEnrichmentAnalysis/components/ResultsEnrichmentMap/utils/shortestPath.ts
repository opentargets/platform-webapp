import type { Core } from "cytoscape";

/**
 * Represents a shortest path result
 */
export interface ShortestPathResult {
  pathFound: boolean;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  distance: number;
  connectingGenes: string[];
}

export function findShortestPath(
  cy: Core,
  sourceId: string,
  targetId: string
): ShortestPathResult {
    console.log(cy.elements());
  const sourceNode = cy.getElementById(sourceId);
  console.log(sourceId, targetId, sourceNode);
  if (!sourceNode || sourceNode.length === 0) {
    return { pathFound: false, pathNodeIds: [], pathEdgeIds: [], distance: Infinity, connectingGenes: [] };
  }

  const targetNode = cy.getElementById(targetId);
  if (!targetNode || targetNode.length === 0) {
    return { pathFound: false, pathNodeIds: [], pathEdgeIds: [], distance: Infinity, connectingGenes: [] };
  }

  // ✅ Use the options object form as documented
  const dijkstra = cy.elements().dijkstra({
    root: sourceNode,
    weight: (edge) => {
      const jaccardCoefficient = (edge.data("jaccardCoefficient") as number) || 0.1;
      return 1 / Math.max(jaccardCoefficient, 0.01);
    },
  });

  const pathToTarget = dijkstra.pathTo(targetNode);

  if (!pathToTarget || pathToTarget.length === 0) {
    return { pathFound: false, pathNodeIds: [], pathEdgeIds: [], distance: Infinity, connectingGenes: [] };
  }

  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  const connectingGenes = new Set<string>();

  for (let i = 0; i < pathToTarget.length; i++) {
    const element = pathToTarget[i];
    if (element.isNode()) {
      pathNodeIds.push(element.id());
    } else if (element.isEdge()) {
      pathEdgeIds.push(element.id());
      const sharedGenes = (element.data("sharedGenes") as string[]) || [];
      sharedGenes.forEach((gene) => connectingGenes.add(gene));
    }
  }

  return {
    pathFound: true,
    pathNodeIds,
    pathEdgeIds,
    distance: dijkstra.distanceTo(targetNode),
    connectingGenes: Array.from(connectingGenes),
  };
}

/**
 * Find all pathways containing a specific gene in their leading edge genes
 * 
 * @param cy - Cytoscape instance
 * @param searchGene - Gene symbol to search for
 * @returns Set of pathway node IDs containing the gene
 */
export function findPathwaysWithGeneInLeadingEdge(
  cy: Core,
  searchGene: string
): Set<string> {
  const pathwayNodeIds = new Set<string>();

  if (!searchGene || searchGene.trim().length === 0) {
    return pathwayNodeIds;
  }

  const searchTerm = searchGene.toUpperCase();

  cy.nodes().forEach((node) => {
    const leadingEdgeGenes = (node.data("leadingEdgeGenes") as string[]) || [];
    if (leadingEdgeGenes.some((gene) => gene.toUpperCase().includes(searchTerm))) {
      pathwayNodeIds.add(node.id());
    }
  });

  return pathwayNodeIds;
}

/**
 * Compute subgraph connecting a set of pathway nodes through gene overlap
 * Returns the minimal subgraph that connects all input pathways
 * 
 * @param cy - Cytoscape instance
 * @param targetPathwayIds - Set of pathway IDs to connect
 * @param searchGene - Optional gene to highlight in connections
 * @returns Object with connected node IDs, edge IDs, and shortest path info
 */
export function computeGeneSubgraph(
  cy: Core,
  targetPathwayIds: Set<string>,
  searchGene?: string
): {
  connectedNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
  shortestPaths: Map<string, ShortestPathResult>;
} {
  const connectedNodeIds = new Set<string>(targetPathwayIds);
  const connectedEdgeIds = new Set<string>();
  const shortestPaths = new Map<string, ShortestPathResult>();

  if (targetPathwayIds.size < 2) {
    return { connectedNodeIds, connectedEdgeIds, shortestPaths };
  }

  // Find shortest paths between all pairs of target pathways
  const pathwayArray = Array.from(targetPathwayIds);
  for (let i = 0; i < pathwayArray.length; i++) {
    for (let j = i + 1; j < pathwayArray.length; j++) {
      const source = pathwayArray[i];
      const target = pathwayArray[j];
      const pathKey = `${source}-${target}`;

      const path = findShortestPath(cy, source, target);
      shortestPaths.set(pathKey, path);

      if (path.pathFound) {
        path.pathNodeIds.forEach((nodeId) => connectedNodeIds.add(nodeId));
        path.pathEdgeIds.forEach((edgeId) => connectedEdgeIds.add(edgeId));
      }
    }
  }

  return { connectedNodeIds, connectedEdgeIds, shortestPaths };
}

/**
 * Filter edges to only those that carry a specific gene
 * Useful for visualizing how a single gene connects pathways
 * 
 * @param cy - Cytoscape instance
 * @param gene - Gene symbol to filter by
 * @returns Set of edge IDs that contain this gene in their shared genes
 */
export function filterEdgesByGene(cy: Core, gene: string): Set<string> {
  const edgeIds = new Set<string>();

  if (!gene || gene.trim().length === 0) {
    return edgeIds;
  }

  const searchTerm = gene.toUpperCase();

  cy.edges().forEach((edge) => {
    const sharedGenes = (edge.data("sharedGenes") as string[]) || [];
    if (sharedGenes.some((g) => g.toUpperCase().includes(searchTerm))) {
      edgeIds.add(edge.id());
    }
  });

  return edgeIds;
}

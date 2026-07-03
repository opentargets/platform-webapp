import { ElementDefinition } from "cytoscape";
import type { GseaResult } from "../../../api/gseaApi";

type GeneListField = "Leading edge genes" | "Pathway genes";

/**
 * Extract gene list from comma-separated string in Leading edge genes field
 */
export function getPathwayGenesList(result: GseaResult): string[] {
  const field = "Pathway genes";
  return getGeneList(result, field);
}

export function getLeadingEdgeGenesList(result: GseaResult): string[] {
  const field = "Leading edge genes";
  return getGeneList(result, field);
}

export function getGeneList(
  result: GseaResult,
  field: GeneListField
): string[] {
  const genes = result[field];
  if (!genes) return [];
  // Handle both array format (new) and string format (legacy)
  if (Array.isArray(genes)) {
    return genes.filter(Boolean);
  }
  return genes
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * Calculate Jaccard similarity coefficient between two sets
 * Formula: |A ∩ B| / |A ∪ B| as per Enrichment Map paper
 * Used for pathway view similarity
 */
export function jaccardSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 || setB.length === 0) return 0;
  const b = new Set(setB);
  const intersection = setA.filter((item) => b.has(item)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate overlap similarity between two sets
 * Formula: |A ∩ B| / min(|A|, |B|)
 * Less biased than Jaccard for hub genes (genes with many pathways)
 * since denominator uses the smaller set size rather than union
 * Used for gene view similarity
 */
export function overlapSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 || setB.length === 0) return 0;
  const b = new Set(setB);
  let intersection = 0;
  for (const item of setA) {
    if (b.has(item)) intersection++;
  }
  const minSize = Math.min(setA.length, setB.length);
  return minSize > 0 ? intersection / minSize : 0;
}

/**
 * Filter elements to remove isolated nodes (nodes without any edges)
 * This dynamically removes nodes as similarity/FDR thresholds are adjusted
 *
 * @param elements - Combined array of nodes and edges from Cytoscape
 * @returns Filtered elements with isolated nodes removed
 */
export function filterNodesWithoutEdges(
  elements: Array<ElementDefinition>
): {
  elements: Array<ElementDefinition>;
  droppedNodesCount: number;
} {
  // Build a set of all node IDs that exist in the input
  const existingNodeIds = new Set<string>();
  let totalNodes = 0;
  for (const el of elements) {
    const data = el.data as Record<string, unknown> | undefined;
    if (!data?.source && !data?.target) {
      // This is a node
      existingNodeIds.add(data?.id as string);
      totalNodes++;
    }
  }

  // Identify edges and the nodes they connect
  const validEdges = new Set<string>();
  const nodesWithValidEdges = new Set<string>();
  const invalidEdges: Array<{ edgeId: string; source: string; target: string; reason: string }> = [];

  for (const el of elements) {
    const data = el.data as Record<string, unknown> | undefined;
    if (data?.source && data?.target) {
      const source = data.source as string;
      const target = data.target as string;
      // Only keep edges where BOTH nodes exist
      if (existingNodeIds.has(source) && existingNodeIds.has(target)) {
        validEdges.add(el.data?.id as string);
        nodesWithValidEdges.add(source);
        nodesWithValidEdges.add(target);
      } else {
        invalidEdges.push({
          edgeId: el.data?.id as string,
          source,
          target,
          reason: !existingNodeIds.has(source) && !existingNodeIds.has(target) 
            ? "both nodes missing" 
            : !existingNodeIds.has(source) 
            ? `source missing: ${source}`
            : `target missing: ${target}`,
        });
      }
    }
  }

  // Filter: keep nodes that have valid edges and edges that are valid
  const filteredElements = elements.filter((el) => {
    const data = el.data as Record<string, unknown> | undefined;
    if (data?.source && data?.target) {
      // This is an edge, keep only if both nodes exist
      return validEdges.has(el.data?.id as string);
    }
    // This is a node, keep only if it has valid edges
    return nodesWithValidEdges.has(data?.id as string);
  });

  const droppedNodes = Array.from(existingNodeIds).filter((nodeId) => !nodesWithValidEdges.has(nodeId));
  const droppedNodesCount = droppedNodes.length;

  console.log("[FILTER_NODES_WITHOUT_EDGES] Details:", {
    totalNodes,
    nodesWithValidEdges: nodesWithValidEdges.size,
    droppedNodesCount,
    droppedNodeIds: droppedNodes,
    invalidEdgesCount: invalidEdges.length,
    invalidEdges: invalidEdges.slice(0, 50), // Log first 50 invalid edges
    missingSourceNodes: [...new Set(invalidEdges.filter(e => !existingNodeIds.has(e.source)).map(e => e.source))],
    missingTargetNodes: [...new Set(invalidEdges.filter(e => !existingNodeIds.has(e.target)).map(e => e.target))],
  });

  return {
    elements: filteredElements,
    droppedNodesCount,
  };
}

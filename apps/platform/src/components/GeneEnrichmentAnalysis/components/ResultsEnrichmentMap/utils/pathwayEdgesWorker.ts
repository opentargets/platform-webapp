import type { ElementDefinition } from "cytoscape";
import type { GseaResult } from "../../../api/gseaApi";

// Import helper functions - these need to be available in worker context
function overlapSimilarity(setA: string[], setB: string[]): number {
  if (setA.length === 0 || setB.length === 0) return 0;
  const b = new Set(setB);
  const intersection = setA.filter((item) => b.has(item)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

interface WorkerMessage {
  pathwayIds: string[];
  pathwayGenes: Record<string, string[]>; // Use plain object instead of Map
  pathwayNameMap: Record<string, string>; // Use plain object instead of Map
  pathwayLinkMap: Record<string, string | undefined>; // Use plain object instead of Map
  nodes: ElementDefinition[];
  similarityThreshold: number;
  results: Array<GseaResult>;
}

interface WorkerResult {
  elements: ElementDefinition[];
  stats: {
    totalPathways: number;
    displayedPathways: number;
    edges: number;
    totalGenes: number;
    significantCount: number;
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const start = performance.now();
  
  const { pathwayIds, pathwayGenes, pathwayNameMap, pathwayLinkMap, nodes, similarityThreshold, results } = event.data;

  // Sort pathways by FDR significance and limit to top 300 if more than 300
  const sortedPathwayIds = pathwayIds
    .map((id) => {
      const result = results.find((r) => (r.ID as string) === id || (r.Pathway as string) === id);
      return { id, fdr: result?.FDR as number || 1 };
    })
    .sort((a, b) => a.fdr - b.fdr)
    .slice(0, pathwayIds.length > 200 ? 200 : pathwayIds.length)
    .map((item) => item.id);

  const edges: ElementDefinition[] = [];
  const edgeSet = new Set<string>();
  let edgeCount = 0;
  const edgeStart = performance.now();
  
  // Filter nodes to only include the sorted pathway IDs (limited to 300)
  const sortedPathwayIdSet = new Set(sortedPathwayIds);
  const filteredNodes = nodes.filter((node) => {
    if (node.data?.id && sortedPathwayIdSet.has(node.data.id as string)) {
      return true;
    }
    return false;
  });
  
  // OPTIMIZATION: Build gene index to only compare pathways that share genes
  // This reduces comparisons from ~45k to typically <5k for sparse gene networks
  const geneIndex = new Map<string, string[]>();
  for (const pathwayId of sortedPathwayIds) {
    const genes = pathwayGenes[pathwayId] || [];
    for (const gene of genes) {
      if (!geneIndex.has(gene)) {
        geneIndex.set(gene, []);
      }
      geneIndex.get(gene)!.push(pathwayId);
    }
  }

  // Track compared pairs to avoid duplicates when pathways share multiple genes
  const comparedPairs = new Set<string>();
  let comparisonCount = 0;

  // Only compare pathways that actually share genes
  for (const [gene, pathwaysWithGene] of geneIndex.entries()) {
    // Compare all pairs of pathways containing this gene
    for (let i = 0; i < pathwaysWithGene.length; i++) {
      for (let j = i + 1; j < pathwaysWithGene.length; j++) {
        const idA = pathwaysWithGene[i];
        const idB = pathwaysWithGene[j];
        
        // Create canonical pair key to avoid comparing same pair twice
        const pairKey = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
        
        if (!comparedPairs.has(pairKey)) {
          comparedPairs.add(pairKey);
          comparisonCount++;
          
          const genesA = pathwayGenes[idA] || [];
          const genesB = pathwayGenes[idB] || [];

          if (genesA.length === 0 || genesB.length === 0) continue;

          const similarity = overlapSimilarity(genesA, genesB);

          if (similarity >= similarityThreshold) {
            if (!edgeSet.has(pairKey)) {
              edgeSet.add(pairKey);

              const setA = new Set(genesA);
              const sharedGenes = genesB.filter((g) => setA.has(g));

              edges.push({
                data: {
                  id: pairKey,
                  source: idA,
                  target: idB,
                  sourceName: pathwayNameMap[idA],
                  targetName: pathwayNameMap[idB],
                  sourceLink: pathwayLinkMap[idA],
                  targetLink: pathwayLinkMap[idB],
                  sharedGenes,
                  sharedCount: sharedGenes.length,
                  similarityIndex: similarity,
                  edgeWidth: Math.max(1.5, similarity * 5),
                  edgeOpacity: Math.min(1, Math.max(0.5, similarity * 1.5)),
                },
              });
              edgeCount++;
            }
          }
        }
      }
    }
  }



  // If no edges were created, don't display any nodes
  if (edges.length === 0) {
    const result: WorkerResult = {
      elements: [],
      stats: {
        totalPathways: results.length,
        displayedPathways: 0,
        edges: 0,
        totalGenes: 0,
        significantCount: results.filter((r) => (r.FDR as number) < 0.05).length,
      },
    };
    self.postMessage(result);
    return;
  }

  // Track which nodes are actually connected by edges
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.data?.source as string);
    connectedNodeIds.add(edge.data?.target as string);
  }

  // Only include nodes that have at least one connection
  const connectedNodes = filteredNodes.filter((node) =>
    connectedNodeIds.has(node.data?.id as string)
  );

  const result: WorkerResult = {
    elements: [...connectedNodes, ...edges],
    stats: {
      totalPathways: results.length,
      displayedPathways: connectedNodes.length,
      edges: edgeCount,
      totalGenes: 0,
      significantCount: results.filter((r) => (r.FDR as number) < 0.05).length,
    },
  };

  self.postMessage(result);
};

export {};
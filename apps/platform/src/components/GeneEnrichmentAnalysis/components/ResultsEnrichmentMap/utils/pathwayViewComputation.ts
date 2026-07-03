import type { ElementDefinition } from "cytoscape";
import type { GseaResult } from "../../../api/gseaApi";
import { getGeneList, overlapSimilarity } from "./index";
import type { ComputedStats } from "./types";

/**
 * Computes pathway view elements (nodes and edges)
 * Routes to async or sync computation based on data type and size
 */
export async function computePathwayViewElements(
  results: Array<GseaResult>,
  nodes: ElementDefinition[],
  similarityThreshold: number,
  nesValueMap: Record<string, number>,
  displayNesRange: { min: number; max: number },
  nesColorPalette: string[]
): Promise<{
  elements: cytoscape.ElementDefinition[];
  stats: ComputedStats;
}> {
  // Results are already filtered by FDR/p-value/NES in useElementComputation
  // Use them directly without re-filtering
  const displayResults = results.length > 0 ? results : [];

  const geneToPathways = new Map<string, string[]>();

  for (const r of displayResults) {
    const geneList_ = getGeneList(r as unknown as GseaResult);
    for (const gene of geneList_) {
      if (!geneToPathways.has(gene)) {
        geneToPathways.set(gene, []);
      }
      const pathways = geneToPathways.get(gene);
      if (pathways) {
        pathways.push(r.Pathway as string);
      }
    }
  }

  const pathwayGenes = new Map<string, string[]>();
  for (const r of displayResults) {
    pathwayGenes.set(
      (r.ID as string) || (r.Pathway as string),
      getGeneList(r as unknown as GseaResult)
    );
  }

  // Create maps for pathway ID -> name and link lookup
  const pathwayNameMap = new Map<string, string>();
  const pathwayLinkMap = new Map<string, string | undefined>();
  for (const r of displayResults) {
    const id = (r.ID as string) || (r.Pathway as string);
    pathwayNameMap.set(id, r.Pathway as string);
    pathwayLinkMap.set(id, r.Link as string | undefined);
  }

  const pathwayIds = Array.from(pathwayGenes.keys());

  // For larger pathway datasets (>300 terms), use web worker to avoid blocking the main thread
  // With N pathways, we compute ~N*(N-1)/2 pairwise comparisons
  // 300 pathways = 45k comparisons (fast on main thread)
  // 6554 pathways = 21.5M comparisons (MUST use worker to avoid freeze)
  const largeDatasetThreshold = 300;
  
  if (pathwayIds.length > largeDatasetThreshold) {
    return computePathwayEdgesWithWorker(
      pathwayIds,
      pathwayGenes,
      pathwayNameMap,
      pathwayLinkMap,
      nodes,
      similarityThreshold,
      results
    );
  }

  // For smaller datasets, use synchronous computation
  return computePathwayEdgesSync(
    pathwayIds,
    pathwayGenes,
    pathwayNameMap,
    pathwayLinkMap,
    nodes,
    similarityThreshold,
    results
  );
}

/**
 * Offload edge computation to web worker to prevent browser freezing
 */
async function computePathwayEdgesWithWorker(
  pathwayIds: string[],
  pathwayGenes: Map<string, string[]>,
  pathwayNameMap: Map<string, string>,
  pathwayLinkMap: Map<string, string | undefined>,
  nodes: ElementDefinition[],
  similarityThreshold: number,
  results: Array<GseaResult>
): Promise<{
  elements: cytoscape.ElementDefinition[];
  stats: any;
}> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[ENRICHMENT_MAP] Creating web worker...`);
      const workerStartTime = performance.now();
      
      // Create a new worker instance
      const worker = new Worker(new URL('./pathwayEdgesWorker.ts', import.meta.url), { type: 'module' });
      console.log(`[ENRICHMENT_MAP] Worker created successfully`);

      // Set up message handler
      worker.onmessage = (event) => {
        const duration = performance.now() - workerStartTime;
        console.log(`[ENRICHMENT_MAP] ✅ Worker completed in ${duration.toFixed(0)}ms: ${event.data.stats.edges} edges, ${event.data.stats.displayedPathways} pathways`);
        resolve(event.data);
        worker.terminate();
      };

      worker.onerror = (error) => {
        console.error(`[ENRICHMENT_MAP] ❌ Worker error:`, error);
        reject(error);
        worker.terminate();
      };

      // Convert Maps to plain objects for serialization
      const pathwayGenesObj: Record<string, string[]> = {};
      pathwayGenes.forEach((value, key) => {
        pathwayGenesObj[key] = value;
      });

      const pathwayNameMapObj: Record<string, string> = {};
      pathwayNameMap.forEach((value, key) => {
        pathwayNameMapObj[key] = value;
      });

      const pathwayLinkMapObj: Record<string, string | undefined> = {};
      pathwayLinkMap.forEach((value, key) => {
        pathwayLinkMapObj[key] = value;
      });

      console.log(`[ENRICHMENT_MAP] 📤 Sending ${pathwayIds.length} pathways to worker (${nodes.length} nodes)...`);

      // Send data to worker
      worker.postMessage({
        pathwayIds,
        pathwayGenes: pathwayGenesObj,
        pathwayNameMap: pathwayNameMapObj,
        pathwayLinkMap: pathwayLinkMapObj,
        nodes,
        similarityThreshold,
        results,
      });
    } catch (error) {
      console.error(`[ENRICHMENT_MAP] ❌ Failed to create worker, falling back to sync:`, error);
      // Fallback to sync computation if worker fails
      resolve(computePathwayEdgesSync(pathwayIds, pathwayGenes, pathwayNameMap, pathwayLinkMap, nodes, similarityThreshold, results));
    }
  });
}


/**
 * Synchronous computation for smaller datasets
 */
function computePathwayEdgesSync(
  pathwayIds: string[],
  pathwayGenes: Map<string, string[]>,
  pathwayNameMap: Map<string, string>,
  pathwayLinkMap: Map<string, string | undefined>,
  nodes: ElementDefinition[],
  similarityThreshold: number,
  results: Array<GseaResult>
) {
  const edges: ElementDefinition[] = [];
  const edgeSet = new Set<string>();
  let edgeCount = 0;

  for (let i = 0; i < pathwayIds.length; i++) {
    for (let j = i + 1; j < pathwayIds.length; j++) {
      const idA = pathwayIds[i];
      const idB = pathwayIds[j];
      const genesA = pathwayGenes.get(idA) || [];
      const genesB = pathwayGenes.get(idB) || [];

      if (genesA.length === 0 || genesB.length === 0) continue;

      const similarity = overlapSimilarity(genesA, genesB)

      const minThreshold = 0.01;
      const threshold = Math.max(minThreshold, similarityThreshold);

      if (similarity >= threshold) {
        const edgeId = `${idA}-${idB}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);

          const setA = new Set(genesA);
          const sharedGenes = genesB.filter((g) => setA.has(g));

          edges.push({
            data: {
              id: edgeId,
              source: idA,
              target: idB,
              sourceName: pathwayNameMap.get(idA),
              targetName: pathwayNameMap.get(idB),
              sourceLink: pathwayLinkMap.get(idA),
              targetLink: pathwayLinkMap.get(idB),
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

  // If no edges were created, don't display any nodes
  if (edges.length === 0) {
    return {
      elements: [],
      stats: {
        totalPathways: results.length,
        displayedPathways: 0,
        edges: 0,
        totalGenes: 0,
        significantCount: results.filter((r) => (r.FDR as number) < 0.05).length,
      },
    };
  }

  // Track which nodes are actually connected by edges
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.data?.source as string);
    connectedNodeIds.add(edge.data?.target as string);
  }

  // Only include nodes that have at least one connection
  const connectedNodes = nodes.filter((node) =>
    connectedNodeIds.has(node.data?.id as string)
  );

  return {
    elements: [...connectedNodes, ...edges],
    stats: {
      totalPathways: results.length,
      displayedPathways: connectedNodes.length,
      edges: edgeCount,
      totalGenes: 0,
      significantCount: results.filter((r) => (r.FDR as number) < 0.05).length,
    },
  };
}

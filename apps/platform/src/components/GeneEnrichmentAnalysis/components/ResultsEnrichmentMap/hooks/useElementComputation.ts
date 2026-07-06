import { useEffect, useMemo, useState, startTransition } from "react";
import type { ElementDefinition } from "cytoscape";
import {
  buildPathwayViewNodes,
  computePathwayViewElements,
  useDebounce,
  filterNodesWithoutEdges,
} from "../utils";
import type { ComputedStats } from "../utils";
import { mapToPrioritizationColor, PRIORITISATION_COLORS } from "../../../utils/colorPalettes";
import { GseaResult } from "../../../api/gseaApi";
import { Gene } from "../../../types";

/**
 * Manages element computation including NES range, FDR filtering, node building, and element assembly
 */
export function useElementComputation(
  results: Array<GseaResult>,
  genes: { symbol: string }[] | undefined,
  similarityThreshold: number,
  sizeBy: "significance" | "pathwaySize" | "geneCount",
  fdrThreshold: number,
  pValueThreshold: number,
  nesRange: [number, number]
) {
  const [computedElements, setComputedElements] = useState<ElementDefinition[]>([]);
  const [computedStats, setComputedStats] = useState<ComputedStats>({
    edges: 0,
    significantCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get initial NES range from full results data
  const nesDataRange = useMemo(() => {
    const nesValues = results.map((r) => r.NES as number).filter((nes) => typeof nes === "number");
    if (nesValues.length === 0) return { min: -3, max: 3 };
    return {
      min: Math.min(...nesValues),
      max: Math.max(...nesValues),
    };
  }, [results]);

  // Debounced state
  const debouncedSimilarityThreshold = useDebounce(similarityThreshold, 300);
  const debouncedSizeBy = useDebounce(sizeBy, 300);
  const debouncedFdrThreshold = useDebounce(fdrThreshold, 300);
  const debouncedPValueThreshold = useDebounce(pValueThreshold, 300);
  const debouncedNesRange = useDebounce(nesRange, 300);

  // Show loader when inputs change
  useEffect(() => {
    setIsLoading(true);
  }, [debouncedSimilarityThreshold, debouncedSizeBy, debouncedFdrThreshold, debouncedPValueThreshold, debouncedNesRange]);

  // FDR, p-value, and NES filtered results
  const fdrFilteredResults = useMemo(() => {
    const filtered = results.filter((r) => {
      const fdr = r.FDR as number;
      const pValue = r["p-value"] as number;
      const nes = r.NES as number;
      const fdrPass = fdr < debouncedFdrThreshold;
      const pValuePass = pValue < debouncedPValueThreshold;
      const nesPass = nes >= debouncedNesRange[0] && nes <= debouncedNesRange[1];
      return fdrPass && pValuePass && nesPass;
    });

    return filtered;
  }, [results, debouncedFdrThreshold, debouncedPValueThreshold, debouncedNesRange]);

  // Memoized NES range for color scaling
  const displayNesRange = useMemo(() => {
    const nesValues = fdrFilteredResults
      .map((r) => r.NES as number)
      .filter((nes) => typeof nes === "number");
    const range = nesValues.length === 0 ? { min: 0, max: 0 } : {
      min: Math.min(...nesValues),
      max: Math.max(...nesValues),
    };
    return range;
  }, [fdrFilteredResults]);

  // Compute pathway nodes (uncolored)
  const { nodes: uncoloredNodes } = useMemo(() => {
    const significantResults = fdrFilteredResults.filter((r) => (r.FDR as number) < 0.25);
    const displayResults = significantResults.length > 0 ? significantResults : fdrFilteredResults.slice(0, 50);

    const result = buildPathwayViewNodes(displayResults, genes as Array<Gene>);

    const stats = {
      ...result.stats,
      totalPathways: fdrFilteredResults.length,
      displayedPathways: result.nodes.length,
      significantCount: results.filter((r) => (r.FDR as number) < 0.05).length,
    };

    return { nodes: result.nodes, initialStats: stats };
  }, [fdrFilteredResults, genes, results]);


  // Assemble elements
  useEffect(() => {


    const computeElements = async () => {

      // Yield to browser to allow loader to render before computation starts
      await new Promise(resolve => setTimeout(resolve, 50));
      

      const start = performance.now();
      
      // Build NES value map for worker
      const nesValueMap: Record<string, number> = {};
      for (const result of fdrFilteredResults) {
        const id = (result.ID as string) || (result.Pathway as string);
        if (typeof result.NES === "number") {
          nesValueMap[id] = result.NES;
        }
      }
      
      const { elements, stats } = await computePathwayViewElements(
        fdrFilteredResults,
        uncoloredNodes,
        debouncedSimilarityThreshold,
        nesValueMap,
        displayNesRange,
        PRIORITISATION_COLORS
      );
  
      
      // Apply NES coloring to received elements (non-blocking chunks)

      const colorStart = performance.now();
      const chunkSize = 500;
      const coloredElements: ElementDefinition[] = [];
      
      const applyColorsInChunks = async (startIdx: number): Promise<void> => {
        const endIdx = Math.min(startIdx + chunkSize, elements.length);
        
        for (let i = startIdx; i < endIdx; i++) {
          const el = elements[i];
          if (el.data?.source) {
            coloredElements.push(el); // Keep edges as-is
            continue;
          }
          
          const nodeId = el.data?.id as string;
          const nesValue = nesValueMap[nodeId];
          if (nesValue !== undefined && nesValue !== null) {
            const color = mapToPrioritizationColor(nesValue, displayNesRange.min, displayNesRange.max);
            coloredElements.push({
              ...el,
              data: { ...el.data, color },
            });
          } else {
            coloredElements.push(el);
          }
        }
        
        if (endIdx < elements.length) {
          // Yield to browser before next chunk
          await new Promise(resolve => setTimeout(resolve, 0));
          await applyColorsInChunks(endIdx);
        }
      };
      
      await applyColorsInChunks(0);
      startTransition(() => {
        setComputedElements(coloredElements);
        
        // Log what came from the worker/computation
        const workerNodes = coloredElements.filter((el) => !el.data?.source);
        const workerEdges = coloredElements.filter((el) => el.data?.source);

        
        // Use the same filtering logic as Cytoscape rendering
        const { elements: filteredElementsAfterValidation } = filterNodesWithoutEdges(coloredElements);  
        
        const filteredNodes = filteredElementsAfterValidation.filter((el) => !el.data?.source);
        const filteredEdges = filteredElementsAfterValidation.filter((el) => el.data?.source);
        
        
        setComputedStats({
          ...stats,
          totalPathways: fdrFilteredResults.length,
          displayedPathways: filteredNodes.length,
          edges: filteredEdges.length,
        });
        
        setIsLoading(false);
      });
    };

    // Wrap in requestAnimationFrame to show loader immediately before computation
    const frameId = requestAnimationFrame(() => {

      computeElements();
    });

    return () => {

      cancelAnimationFrame(frameId);
    };
  }, [fdrFilteredResults, debouncedSimilarityThreshold, uncoloredNodes]);

  return {
    computedElements,
    computedStats,
    nesDataRange,
    nesRange: displayNesRange,
    isLoading,
  };
}

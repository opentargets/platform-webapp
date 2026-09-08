import { useEffect } from "react";
import type { Core as CytoscapeCore, ElementDefinition } from "cytoscape";
import {
  findNodesAndEdgesWithGene,
  updateElementHighlight,
} from "../utils";

/**
 * Manages gene/pathway search highlighting
 */
export function useGeneSearch(
  cyRef: React.MutableRefObject<CytoscapeCore | null>,
  computedElements: ElementDefinition[],
  searchQuery: string
) {
  useEffect(() => {
    if (!cyRef.current || !computedElements) return;

    // Gene/pathway search mode
    const { nodeIds, edgeIds } = findNodesAndEdgesWithGene(computedElements, searchQuery);
    const isSearchActive = searchQuery.trim().length > 0;
    updateElementHighlight(cyRef.current, nodeIds, edgeIds, isSearchActive);
  }, [searchQuery, computedElements, cyRef]);
}

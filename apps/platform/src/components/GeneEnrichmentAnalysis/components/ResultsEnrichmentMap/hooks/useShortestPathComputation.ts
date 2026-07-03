import { useEffect } from "react";
import type { Core as CytoscapeCore } from "cytoscape";
import { findShortestPath } from "../utils";
import type { ShortestPathResult } from "../utils/shortestPath";

/**
 * Manages two-pathway shortest path computation and visualization
 */
export function useShortestPathComputation(
  cyRef: React.MutableRefObject<CytoscapeCore | null>,
  selectedPathways: { source: string | null; target: string | null },
  onPathFound: (path: ShortestPathResult | null) => void,
  onComputingChange: (isComputing: boolean) => void
) {
  useEffect(() => {
    if (!cyRef.current || !selectedPathways.source || !selectedPathways.target) {
      return;
    }

    onComputingChange(true);

    const path = findShortestPath(cyRef.current, selectedPathways.source, selectedPathways.target);
    onPathFound(path);

    if (path.pathFound) {
      // Highlight the shortest path
      cyRef.current.elements().removeClass("shortestPath dimmed");

      for (const nodeId of path.pathNodeIds) {
        cyRef.current.getElementById(nodeId).addClass("shortestPath");
      }
      for (const edgeId of path.pathEdgeIds) {
        cyRef.current.getElementById(edgeId).addClass("shortestPath");
      }

    onComputingChange(false);
  }, [selectedPathways, onPathFound, onComputingChange, cyRef]);
}

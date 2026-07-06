/**
 * Cytoscape layout configuration for pathway view
 */
export function getLayoutConfig(
  _viewMode: "genes" | "pathways",
  _nodeCount?: number
): Record<string, unknown> {
  const layoutConfig: Record<string, unknown> = {
    name: "cose",
    animate: false,
    animationDuration: 500,
  };

  // Pathways layout with optimized settings for clustering
  return {
    ...layoutConfig,
    nodeRepulsion: () => 400000,
    edgeElasticity: () => 200,
    nestingFactor: 0.1,
    gravity: 1,
    numIter: 2500,
    fit: true,
    tile: false,
    minNodeSpacing: 30,
  };
}

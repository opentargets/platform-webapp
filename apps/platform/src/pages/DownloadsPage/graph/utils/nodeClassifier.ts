/**
 * Node enrichment for the network graph: degree, category colour and the
 * set of core entities the radial layout uses as hubs.
 */

import { getCategoryColor } from '../../categoryColors';

export const CORE_ENTITIES = new Set(['target', 'disease', 'drug', 'variant', 'study']);

interface CytoscapeNode {
  data: any;
  classes?: string[];
}

/**
 * Enrich nodes with their degree (connection count) and category colour.
 * `type` is the dataset's category (see dataTransformer.classifyRecordSetType).
 */
export const enrichNodesWithClassification = (
  nodes: CytoscapeNode[],
  edges: Array<{ data: { source: string; target: string } }>
): CytoscapeNode[] => {
  const degreeMap = new Map<string, number>();
  nodes.forEach((node) => {
    degreeMap.set(node.data.id, 0);
  });

  edges.forEach((edge) => {
    const source = edge.data.source;
    const target = edge.data.target;
    degreeMap.set(source, (degreeMap.get(source) || 0) + 1);
    degreeMap.set(target, (degreeMap.get(target) || 0) + 1);
  });

  return nodes.map((node) => {
    const degree = degreeMap.get(node.data.id) || 0;
    const type = node.data.type || 'uncategorized';
    return {
      ...node,
      data: {
        ...node.data,
        type,
        color: getCategoryColor(type),
        degree,
      },
      classes: [type],
    };
  });
};

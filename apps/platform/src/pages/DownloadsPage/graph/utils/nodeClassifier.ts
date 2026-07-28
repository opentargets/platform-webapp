/**
 * Classify nodes into categories based on type and connectivity
 * Returns styling information for force-directed graph visualization
 */

import { getCategoryColor } from './colorPool';

type NodeType = 'core' | 'evidence' | 'attribute';

interface NodeConfig {
  size: number;
  color: string;
  borderWidth: number;
  label: string;
  zIndex: number;
}

interface ClassifiedNode {
  type: NodeType;
  size: number;
  color: string;
  borderWidth: number;
  label: string;
  zIndex: number;
  degree: number;
}

const CORE_ENTITIES = new Set(['target', 'disease', 'drug', 'variant', 'study']);

const EVIDENCE_KEYWORDS = [
  'evidence',
  'crispr',
  'clinvar',
  'chembl',
  'literature',
  'orphanet',
  'ontology',
  'score',
  'mutations',
  'phenotype',
  'pathway',
  'cosmic',
  'expression',
  'gwas',
  'interaction',
  'genetics',
];

const NODE_CONFIG: Record<NodeType, NodeConfig> = {
  core: {
    size: 80,
    color: '#2196F3',
    borderWidth: 3,
    label: 'Core Entity',
    zIndex: 100,
  },
  evidence: {
    size: 60,
    color: '#FF9800',
    borderWidth: 2,
    label: 'Evidence Dataset',
    zIndex: 50,
  },
  attribute: {
    size: 40,
    color: '#4CAF50',
    borderWidth: 2,
    label: 'Attribute/Ontology',
    zIndex: 30,
  },
};

/**
 * Classify a node based on its ID, label, and degree (connection count)
 */
export const classifyNode = (
  nodeId: string,
  nodeLabel: string,
  degree: number = 0
): ClassifiedNode => {
  const normalizedId = nodeId.toLowerCase();
  const normalizedLabel = nodeLabel.toLowerCase();

  // Rule 1: Check if it's a core entity
  if (CORE_ENTITIES.has(normalizedId)) {
    return {
      type: 'core',
      ...NODE_CONFIG.core,
      degree,
    };
  }

  // Rule 2: Check if it's an evidence dataset
  const isEvidence = EVIDENCE_KEYWORDS.some(
    (keyword) => normalizedId.includes(keyword) || normalizedLabel.includes(keyword)
  );

  if (isEvidence || degree > 1) {
    return {
      type: 'evidence',
      ...NODE_CONFIG.evidence,
      degree,
    };
  }

  // Rule 3: Everything else is an attribute
  return {
    type: 'attribute',
    ...NODE_CONFIG.attribute,
    degree,
  };
};



interface CytoscapeNode {
  data: any;
  classes?: string[];
}

/**
 * Enrich nodes with classification and degree information
 */
export const enrichNodesWithClassification = (
  nodes: CytoscapeNode[],
  edges: Array<{ data: { source: string; target: string } }>
): CytoscapeNode[] => {
  // Extract unique categories and sort them (same as legend)
  const uniqueCategories = Array.from(
    new Set(nodes.map((node) => node.data.type || 'uncategorized'))
  ).sort();

  // Create dynamic color mapping using the same getCategoryColor function as the legend
  const categoryColorMap = new Map<string, string>();
  uniqueCategories.forEach((category, index) => {
    categoryColorMap.set(category, getCategoryColor(index));
  });

  // Calculate degree for each node
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

  // Classify each node with dynamically assigned colors
  return nodes.map((node) => {
    const degree = degreeMap.get(node.data.id) || 0;
    const originalType = node.data.type || 'uncategorized';
    const color = categoryColorMap.get(originalType) || '#757575';
    
    // Determine size based on degree
    let size = 40;
    if (degree > 5) size = 80;
    else if (degree > 2) size = 60;

    return {
      ...node,
      data: {
        ...node.data,
        type: originalType,
        color,
        size,
        borderWidth: 2,
        degree,
      },
      classes: [originalType],
    };
  });
};

/**
 * Get all node types configuration
 */
export const getNodeTypes = (): Record<NodeType, NodeConfig> => NODE_CONFIG;

export default {
  classifyNode,
  enrichNodesWithClassification,
  getNodeTypes,
  CORE_ENTITIES,
};

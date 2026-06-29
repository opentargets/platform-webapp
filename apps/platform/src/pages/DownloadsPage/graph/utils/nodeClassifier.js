/**
 * Classify nodes into categories based on type and connectivity
 * Returns styling information for force-directed graph visualization
 */

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

const NODE_CONFIG = {
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
 * @param {string} nodeId - The unique identifier for the node
 * @param {string} nodeLabel - Human-readable label for the node
 * @param {number} degree - Number of connections (incoming + outgoing)
 * @returns {Object} Classification with type, size, color, etc.
 */
export const classifyNode = (nodeId, nodeLabel, degree = 0) => {
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

/**
 * Enrich nodes with classification and degree information
 * @param {Array} nodes - Cytoscape nodes array
 * @param {Array} edges - Cytoscape edges array
 * @returns {Array} Enriched nodes with classification
 */
export const enrichNodesWithClassification = (nodes, edges) => {
  // Calculate degree for each node
  const degreeMap = new Map();
  nodes.forEach((node) => {
    degreeMap.set(node.data.id, 0);
  });

  edges.forEach((edge) => {
    const source = edge.data.source;
    const target = edge.data.target;
    degreeMap.set(source, (degreeMap.get(source) || 0) + 1);
    degreeMap.set(target, (degreeMap.get(target) || 0) + 1);
  });

  // Classify each node
  return nodes.map((node) => {
    const degree = degreeMap.get(node.data.id) || 0;
    const classification = classifyNode(node.data.id, node.data.label, degree);

    return {
      ...node,
      data: {
        ...node.data,
        ...classification,
      },
      classes: [node.data.type || 'attribute'],
    };
  });
};

/**
 * Get all node types configuration
 * @returns {Object} Map of node types to their config
 */
export const getNodeTypes = () => NODE_CONFIG;

export default {
  classifyNode,
  enrichNodesWithClassification,
  getNodeTypes,
  CORE_ENTITIES,
};

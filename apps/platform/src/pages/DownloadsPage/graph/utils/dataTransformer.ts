/**
 * Transform downloads data into Cytoscape-compatible graph structure
 * Converts schema metadata into nodes and edges with proper classifications
 */

import { enrichNodesWithClassification } from './nodeClassifier';

interface DownloadDataset {
  id: string;
  name: string;
  [key: string]: any;
}

interface SchemaField {
  name: string;
  type: string;
  reference?: string;
}

interface DatasetSchema {
  dataset: string;
  fields: SchemaField[];
}

interface CytoscapeNodeData {
  id: string;
  label: string;
  [key: string]: any;
}

interface CytoscapeNode {
  data: CytoscapeNodeData;
  classes?: string[];
}

interface CytoscapeEdgeData {
  id?: string;
  source: string;
  target: string;
  [key: string]: any;
}

interface CytoscapeEdge {
  data: CytoscapeEdgeData;
}

interface TransformedGraph {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

/**
 * Extract foreign key relationships from schema fields
 */
const extractReferences = (fields: SchemaField[]): string[] => {
  return fields
    .filter((field) => field.reference)
    .map((field) => field.reference as string);
};

/**
 * Transform flat downloads data into graph nodes
 */
export const transformDownloadsToNodes = (
  downloads: DownloadDataset[]
): CytoscapeNode[] => {
  return downloads.map((dataset) => ({
    data: {
      id: dataset.id || dataset.name,
      label: dataset.name,
      description: dataset.description || '',
      type: 'evidence', // Default classification, will be enriched
    },
  }));
};

/**
 * Transform schema relationships into graph edges
 */
export const transformSchemaToEdges = (
  schemas: DatasetSchema[]
): CytoscapeEdge[] => {
  const edges: CytoscapeEdge[] = [];
  let edgeId = 0;

  schemas.forEach((schema) => {
    const references = extractReferences(schema.fields);
    references.forEach((targetId) => {
      edges.push({
        data: {
          id: `edge-${edgeId++}`,
          source: schema.dataset,
          target: targetId,
        },
      });
    });
  });

  return edges;
};

/**
 * Main transformation function: downloads + schemas → graph
 */
export const transformDownloadsToGraph = (
  downloads: DownloadDataset[],
  schemas?: DatasetSchema[]
): TransformedGraph => {
  // Transform datasets to nodes
  let nodes = transformDownloadsToNodes(downloads);

  // Transform schemas to edges (if provided)
  let edges: CytoscapeEdge[] = [];
  if (schemas && schemas.length > 0) {
    edges = transformSchemaToEdges(schemas);
  }

  // Enrich nodes with classification based on edges
  nodes = enrichNodesWithClassification(nodes, edges);

  return { nodes, edges };
};

/**
 * Create a simple graph from just node names and relationships
 * Useful when full schema data isn't available
 */
export const createSimpleGraph = (
  nodeNames: string[],
  relationships: Array<[string, string]>
): TransformedGraph => {
  const nodes: CytoscapeNode[] = nodeNames.map((name) => ({
    data: {
      id: name.toLowerCase(),
      label: name,
      type: 'evidence',
    },
  }));

  const edges: CytoscapeEdge[] = relationships.map((rel, idx) => ({
    data: {
      id: `edge-${idx}`,
      source: rel[0].toLowerCase(),
      target: rel[1].toLowerCase(),
    },
  }));

  const enrichedNodes = enrichNodesWithClassification(nodes, edges);

  return {
    nodes: enrichedNodes,
    edges,
  };
};

/**
 * Merge multiple graph data sources into one
 */
export const mergeGraphs = (...graphs: TransformedGraph[]): TransformedGraph => {
  const mergedNodes = new Map<string, CytoscapeNode>();
  const mergedEdges: CytoscapeEdge[] = [];
  let edgeId = 0;

  graphs.forEach((graph) => {
    // Merge nodes (dedup by id)
    graph.nodes.forEach((node) => {
      if (!mergedNodes.has(node.data.id)) {
        mergedNodes.set(node.data.id, node);
      }
    });

    // Merge edges
    graph.edges.forEach((edge) => {
      mergedEdges.push({
        data: {
          ...edge.data,
          id: `edge-${edgeId++}`,
        },
      });
    });
  });

  return {
    nodes: Array.from(mergedNodes.values()),
    edges: mergedEdges,
  };
};

/**
 * Filter graph data by node type
 */
export const filterGraphByNodeType = (
  graph: TransformedGraph,
  types: string[]
): TransformedGraph => {
  const filteredNodeIds = new Set(
    graph.nodes
      .filter((node) => types.includes(node.data.type))
      .map((node) => node.data.id)
  );

  return {
    nodes: graph.nodes.filter((node) => filteredNodeIds.has(node.data.id)),
    edges: graph.edges.filter(
      (edge) =>
        filteredNodeIds.has(edge.data.source) && filteredNodeIds.has(edge.data.target)
    ),
  };
};

export default {
  transformDownloadsToGraph,
  transformDownloadsToNodes,
  transformSchemaToEdges,
  createSimpleGraph,
  mergeGraphs,
  filterGraphByNodeType,
};

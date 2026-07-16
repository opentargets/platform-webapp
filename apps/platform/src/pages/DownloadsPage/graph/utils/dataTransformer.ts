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
 * Croissant (schema.org-style) RecordSet metadata types.
 * This is the shape of items inside the Downloads page's `recordSet` field
 * (56 datasets describing the Open Targets data model).
 */
export interface CroissantFieldReference {
  field: { '@id': string };
}

export interface CroissantField {
  '@type'?: string;
  '@id': string;
  name: string;
  description?: string;
  dataType?: string;
  repeated?: boolean;
  references?: CroissantFieldReference;
  subField?: CroissantField[];
}

export interface CroissantRecordSet {
  '@type'?: string;
  '@id': string;
  name: string;
  description?: string;
  key?: { '@id': string } | Array<{ '@id': string }>;
  field: CroissantField[];
}

/**
 * Dataset ids that represent the platform's master/core entities
 */
const CORE_RECORD_SET_IDS = new Set(['target', 'disease', 'drug_molecule', 'variant', 'study']);

/**
 * Dataset ids that behave as ontology/reference lookup tables rather than
 * evidence datasets tied directly to a core entity
 */
const ATTRIBUTE_RECORD_SET_IDS = new Set(['go', 'reactome', 'so', 'biosample', 'disease_hpo']);

/**
 * Classify a RecordSet (dataset) id into one of the three graph node types
 */
export const classifyRecordSetType = (id: string): 'core' | 'evidence' | 'attribute' => {
  if (CORE_RECORD_SET_IDS.has(id)) return 'core';
  if (ATTRIBUTE_RECORD_SET_IDS.has(id)) return 'attribute';
  return 'evidence';
};

/**
 * Strip the trailing "[Category]" tag Open Targets appends to RecordSet
 * descriptions, e.g. "...evidence data. [Target-Disease]" -> "...evidence data."
 */
const stripCategoryTag = (description = ''): string =>
  description.replace(/\s*\[[^\]]*\]\s*$/, '').trim();

/**
 * Recursively walk a RecordSet's fields (and any nested subFields) collecting
 * the id of every dataset referenced through a foreign key ("references")
 */
const collectReferencedDatasetIds = (fields: CroissantField[] = []): string[] => {
  const referenced: string[] = [];

  fields.forEach((field) => {
    const refFieldId = field.references?.field?.['@id'];
    if (refFieldId) {
      const datasetId = refFieldId.split('/').slice(0, -1).join('/');
      if (datasetId) referenced.push(datasetId);
    }
    if (field.subField?.length) {
      referenced.push(...collectReferencedDatasetIds(field.subField));
    }
  });

  return referenced;
};

/**
 * Transform the Downloads page's `recordSet` (Croissant schema) data into a
 * Cytoscape-compatible graph: one node per dataset, and one edge per unique
 * foreign key relationship between datasets (deduplicated, self-references
 * and references to datasets outside the recordSet are dropped).
 */
export const transformRecordSetToGraph = (
  recordSets: CroissantRecordSet[] = []
): TransformedGraph => {
  const datasetIds = new Set(recordSets.map((recordSet) => recordSet['@id']));

  const nodes: CytoscapeNode[] = recordSets.map((recordSet) => ({
    data: {
      id: recordSet['@id'],
      label: recordSet.name,
      description: stripCategoryTag(recordSet.description),
      fieldCount: recordSet.field?.length ?? 0,
      type: classifyRecordSetType(recordSet['@id']),
    },
  }));

  const seenEdges = new Set<string>();
  const edges: CytoscapeEdge[] = [];

  recordSets.forEach((recordSet) => {
    const referencedIds = collectReferencedDatasetIds(recordSet.field);

    referencedIds.forEach((targetId) => {
      if (targetId === recordSet['@id'] || !datasetIds.has(targetId)) return;

      const edgeKey = `${recordSet['@id']}->${targetId}`;
      if (seenEdges.has(edgeKey)) return;
      seenEdges.add(edgeKey);

      edges.push({
        data: {
          id: `edge-${edges.length}`,
          source: recordSet['@id'],
          target: targetId,
        },
      });
    });
  });

  // Compute connection count per node (used for tooltip/legend display)
  const degreeMap = new Map<string, number>();
  nodes.forEach((node) => degreeMap.set(node.data.id, 0));
  edges.forEach((edge) => {
    degreeMap.set(edge.data.source, (degreeMap.get(edge.data.source) || 0) + 1);
    degreeMap.set(edge.data.target, (degreeMap.get(edge.data.target) || 0) + 1);
  });

  const nodesWithDegree = nodes.map((node) => ({
    ...node,
    data: { ...node.data, degree: degreeMap.get(node.data.id) || 0 },
  }));

  return { nodes: nodesWithDegree, edges };
};

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
  transformRecordSetToGraph,
  createSimpleGraph,
  mergeGraphs,
  filterGraphByNodeType,
};

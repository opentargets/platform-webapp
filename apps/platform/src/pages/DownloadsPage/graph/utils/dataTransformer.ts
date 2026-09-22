/**
 * Transform downloads data into Cytoscape-compatible graph structure
 * Converts schema metadata into nodes and edges with proper classifications
 */

import { enrichNodesWithClassification } from './nodeClassifier';
import { getCategoryColor } from '../../categoryColors';

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
 * Convert TransformedGraph to Cytoscape-compatible ElementDefinition array
 * Flattens nodes and edges into a single array for use with Cytoscape constructor
 */
export const toCytoscapeElements = (graph: TransformedGraph): Array<CytoscapeNode | CytoscapeEdge> => {
  return [...graph.nodes, ...graph.edges];
};

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
 * Extract category tags from description (e.g., "[Target-Disease]" -> "Target-Disease")
 */
const extractCategoryFromDescription = (description?: string): string => {
  if (!description) return 'uncategorized';
  const match = description.match(/\[(.*?)\]/);
  if (match && match[1] && match[0] !== '[]') {
    // Return the first category if multiple are separated by commas
    return match[1].split(',')[0].trim();
  }
  return 'uncategorized';
};

/**
 * Classify a RecordSet by extracting its category from the description tag
 * This matches the same categorization logic used in the downloads filter
 */
export const classifyRecordSetType = (
  _id: string,
  description?: string
): string => {
  return extractCategoryFromDescription(description);
};

/**
 * Strip the trailing "[Category]" tag Open Targets appends to RecordSet
 * descriptions, e.g. "...evidence data. [Target-Disease]" -> "...evidence data."
 */
const stripCategoryTag = (description = ''): string =>
  description.replace(/\s*\[[^\]]*\]\s*$/, '').trim();

/** One foreign-key reference: a field (by path, for nested fields) pointing at a field of another dataset */
export interface FieldReference {
  targetDatasetId: string;
  /** Dotted path to the referencing field within its own dataset, e.g. "targets.targetId" for a nested field */
  sourceField: string;
  /** Name of the referenced field within the target dataset */
  targetField: string;
}

/**
 * Recursively walk a RecordSet's fields (and any nested subFields) collecting
 * every foreign-key reference: which field references which field of which
 * other dataset.
 */
const collectFieldReferences = (fields: CroissantField[] = [], parentPath = ''): FieldReference[] => {
  const references: FieldReference[] = [];

  fields.forEach((field) => {
    const path = parentPath ? `${parentPath}.${field.name}` : field.name;
    const refFieldId = field.references?.field?.['@id'];
    if (refFieldId) {
      const parts = refFieldId.split('/');
      const targetDatasetId = parts.slice(0, -1).join('/');
      if (targetDatasetId) {
        references.push({ targetDatasetId, sourceField: path, targetField: parts[parts.length - 1] });
      }
    }
    if (field.subField?.length) {
      references.push(...collectFieldReferences(field.subField, path));
    }
  });

  return references;
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
      type: classifyRecordSetType(recordSet['@id'], recordSet.description),
    },
  }));

  const edgeByKey = new Map<string, CytoscapeEdge>();
  const edges: CytoscapeEdge[] = [];

  recordSets.forEach((recordSet) => {
    collectFieldReferences(recordSet.field).forEach((ref) => {
      const targetId = ref.targetDatasetId;
      if (targetId === recordSet['@id'] || !datasetIds.has(targetId)) return;

      const edgeKey = `${recordSet['@id']}->${targetId}`;
      let edge = edgeByKey.get(edgeKey);
      if (!edge) {
        edge = {
          data: {
            id: `edge-${edges.length}`,
            source: recordSet['@id'],
            target: targetId,
            references: [] as Array<{ sourceField: string; targetField: string }>,
          },
        };
        edgeByKey.set(edgeKey, edge);
        edges.push(edge);
      }
      const already = edge.data.references.some(
        (r: { sourceField: string; targetField: string }) =>
          r.sourceField === ref.sourceField && r.targetField === ref.targetField
      );
      if (!already) edge.data.references.push({ sourceField: ref.sourceField, targetField: ref.targetField });
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

  // Enrich nodes with proper classification (type: core/evidence/attribute, colors, sizes)
  const enrichedNodes = enrichNodesWithClassification(nodesWithDegree, edges);

  return { nodes: enrichedNodes, edges };
};

/** One row of an ERD table card - a top-level dataset field (nested subFields aren't broken into their own rows) */
export interface ErdFieldDatum {
  name: string;
  dataType: string;
  isKey: boolean;
  isForeign: boolean;
}

export interface ErdNodeData {
  id: string;
  label: string;
  description: string;
  category: string;
  color: string;
  fields: ErdFieldDatum[];
}

export interface ErdEdgeData {
  id: string;
  source: string;
  target: string;
  /** Top-level field name in `source` to anchor the connector at (its row) */
  sourceField: string;
  /** Full dotted path to the actual (possibly nested) referencing field, for the tooltip */
  sourceFieldPath: string;
  /** Field name in `target` to anchor the connector at (its row) */
  targetField: string;
}

export interface ErdNode {
  data: ErdNodeData;
}

export interface ErdEdge {
  data: ErdEdgeData;
}

/** Strip the "sc:"/"cr:" schema.org/Croissant namespace prefix off a field's dataType, e.g. "sc:Text" -> "Text" */
const humanizeDataType = (field: CroissantField): string => {
  const base = field.dataType ? field.dataType.split(':')[1] ?? field.dataType : field.subField?.length ? 'Record' : '';
  return field.repeated ? `${base}[]` : base;
};

/** Normalize a RecordSet's `key` (a single field ref or a list of them) into a set of field @ids */
const keyFieldIds = (key?: { '@id': string } | Array<{ '@id': string }>): Set<string> => {
  if (!key) return new Set();
  const list = Array.isArray(key) ? key : [key];
  return new Set(list.map((k) => k['@id']));
};

/**
 * Transform the Downloads page's `recordSet` (Croissant schema) data into an
 * entity-relationship diagram: one table card per dataset (with a row per
 * top-level field, its type, and whether it's a primary/foreign key), and
 * one connector per foreign-key reference - anchored to the specific field
 * rows it runs between, rather than one merged edge per dataset pair (see
 * `transformRecordSetToGraph`, used by the force-directed network view).
 */
export const transformRecordSetToERD = (
  recordSets: CroissantRecordSet[] = []
): { nodes: ErdNode[]; edges: ErdEdge[] } => {
  const datasetIds = new Set(recordSets.map((recordSet) => recordSet['@id']));

  const nodes: ErdNode[] = recordSets.map((recordSet) => {
    const keyIds = keyFieldIds(recordSet.key);
    const category = classifyRecordSetType(recordSet['@id'], recordSet.description);
    const fields: ErdFieldDatum[] = (recordSet.field ?? []).map((field) => ({
      name: field.name,
      dataType: humanizeDataType(field),
      isKey: keyIds.has(field['@id']),
      isForeign: Boolean(field.references?.field?.['@id']),
    }));

    return {
      data: {
        id: recordSet['@id'],
        label: recordSet.name,
        description: stripCategoryTag(recordSet.description),
        category,
        color: getCategoryColor(category),
        fields,
      },
    };
  });

  const edges: ErdEdge[] = [];
  recordSets.forEach((recordSet) => {
    collectFieldReferences(recordSet.field).forEach((ref) => {
      const targetId = ref.targetDatasetId;
      if (targetId === recordSet['@id'] || !datasetIds.has(targetId)) return;

      edges.push({
        data: {
          id: `erd-edge-${edges.length}`,
          source: recordSet['@id'],
          target: targetId,
          sourceField: ref.sourceField.split('.')[0],
          sourceFieldPath: ref.sourceField,
          targetField: ref.targetField,
        },
      });
    });
  });

  return { nodes, edges };
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
  transformRecordSetToERD,
  toCytoscapeElements,
  mergeGraphs,
  filterGraphByNodeType,
};

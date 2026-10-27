/**
 * Transform the Downloads page's Croissant RecordSet metadata into the
 * node/edge structure the network canvas renders.
 */

import { enrichNodesWithClassification } from './nodeClassifier';

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

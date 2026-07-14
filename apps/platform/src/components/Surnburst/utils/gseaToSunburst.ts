/**
 * Utility functions to transform GSEA results into ZoomableSunburst-compatible format
 */

export interface GseaResult {
  ID: string;
  Pathway: string;
  ES: number;
  NES: number;
  FDR: number;
  "p-value": number;
  "Sidak's p-value"?: number;
  "Pathway size": number;
  "Number of input genes": number;
  "Leading edge genes": Array<string>;
  Link?: string;
  "Parent pathway"?: string;
  "Pathway genes"?: Array<string>;
}

export interface DataNode {
  name: string;
  children?: DataNode[];
  value?: number;
  NES?: number; // Normalized Enrichment Score for coloring
  data?: GseaResult | null; // Full GSEA result data
  id?: string; // Pathway ID
}

/**
 * Transforms a flat array of GSEA results into a hierarchical structure for ZoomableSunburst.
 * Creates a tree with optional parent pathway grouping and individual pathways as leaves.
 * Preserves NES values for coloring and full GSEA data for interactivity.
 *
 * @param results - Array of GSEA analysis results
 * @param valueField - Which field to use for arc sizing (default: 'NES' for Normalized Enrichment Score)
 * @returns Hierarchical DataNode structure compatible with ZoomableSunburst
 */
export function gseaToSunburst(
  results: GseaResult[],
  valueField: keyof GseaResult = "NES"
): DataNode {
  if (!results || results.length === 0) {
    return { name: "GSEA Pathways", children: [] };
  }

  // Build maps for hierarchy detection
  const pathwayMap = new Map<string, GseaResult>();
  const childrenMap = new Map<string, string[]>();
  const rootPathways: GseaResult[] = [];
  const secondLevelPathways: GseaResult[] = [];
  const processedIds = new Set<string>();

  // First pass: create pathway map and collect children
  results.forEach((pathway) => {
    const id = pathway.ID || "";
    if (id) {
      pathwayMap.set(id, pathway);
    }

    const parentPathway = pathway["Parent pathway"] || "";
    if (parentPathway) {
      const parents = parentPathway.split(",").map((p) => p.trim());
      parents.forEach((parent) => {
        if (!childrenMap.has(parent)) {
          childrenMap.set(parent, []);
        }
        childrenMap.get(parent)!.push(id);
      });
    } else {
      // This is a root pathway (no parent)
      rootPathways.push(pathway);
    }
  });

  // Determine effective root pathways
  let topLevelPathways = rootPathways;
  
  // If no root pathways, find pathways whose parents are not in the dataset
  if (rootPathways.length === 0) {
    results.forEach((pathway) => {
      const id = pathway.ID || "";
      if (processedIds.has(id)) return;

      const parentPathway = pathway["Parent pathway"] || "";
      if (parentPathway) {
        const parents = parentPathway.split(",").map((p) => p.trim());
        const hasUnknownParent = parents.some((parent) => !pathwayMap.has(parent));

        if (hasUnknownParent) {
          secondLevelPathways.push(pathway);
          processedIds.add(id);
        }
      }
    });

    // If still no second-level pathways, use all as fallback
    if (secondLevelPathways.length === 0) {
      topLevelPathways = results;
    } else {
      topLevelPathways = secondLevelPathways;
    }
  }

  // Recursively build children hierarchy
  const buildChildren = (parentId: string): DataNode[] => {
    const childIds = childrenMap.get(parentId) || [];
    return childIds
      .filter((id) => !processedIds.has(id))
      .map((childId) => {
        processedIds.add(childId);
        const pathway = pathwayMap.get(childId);
        if (!pathway) return null;

        const nes = pathway.NES || 0;
        const childrenNodes = buildChildren(childId);
        
        // For leaf nodes, use 1 as value
        // For parent nodes, value will be added to children's sum (remainder mode)
        const isLeaf = childrenNodes.length === 0;
        const value = isLeaf ? 1 : 0;

        return {
          id: childId,
          name: pathway.Pathway || childId,
          NES: nes,
          value,
          data: pathway,
          children: childrenNodes.length > 0 ? childrenNodes : undefined,
        };
      })
      .filter(Boolean) as DataNode[];
  };

  // Build root node with children from top-level pathways
  const rootChildren: DataNode[] = topLevelPathways.map((pathway) => {
    const id = pathway.ID || "";
    processedIds.add(id);

    const nes = pathway.NES || 0;
    const childrenNodes = buildChildren(id);
    
    // For leaf nodes, use 1 as value
    // For parent nodes, value will be added to children's sum (remainder mode)
    const isLeaf = childrenNodes.length === 0;
    const value = isLeaf ? 1 : 0;

    return {
      id,
      name: pathway.Pathway || id,
      NES: nes,
      value,
      data: pathway,
      children: childrenNodes.length > 0 ? childrenNodes : undefined,
    };
  });

  return {
    name: "GSEA Pathways",
    value: 0,
    children: rootChildren,
  };
}

/**
 * Alternative transformation that creates a hierarchy based on statistical significance.
 * Groups pathways by FDR threshold categories, preserving NES and full data.
 *
 * @param results - Array of GSEA analysis results
 * @param valueField - Which field to use for arc sizing (default: 'NES')
 * @returns Hierarchical DataNode structure grouped by significance
 */
export function gseaToSunburstBySignificance(
  results: GseaResult[],
  valueField: keyof GseaResult = "NES"
): DataNode {
  if (!results || results.length === 0) {
    return { name: "GSEA Pathways", children: [] };
  }

  const significanceGroups = new Map<string, DataNode>();

  results.forEach((result) => {
    let group = "Not Significant";
    if (result.FDR < 0.001) {
      group = "Highly Significant (FDR < 0.001)";
    } else if (result.FDR < 0.01) {
      group = "Very Significant (FDR < 0.01)";
    } else if (result.FDR < 0.05) {
      group = "Significant (FDR < 0.05)";
    }

    if (!significanceGroups.has(group)) {
      significanceGroups.set(group, {
        name: group,
        children: [],
      });
    }

    const nes = result.NES || 0;
    const groupNode = significanceGroups.get(group)!;
    if (!groupNode.children) {
      groupNode.children = [];
    }
    groupNode.children.push({
      id: result.ID,
      name: result.Pathway,
      NES: nes,
      value: 1, // Leaf nodes use constant value of 1
      data: result,
    });
  });

  return {
    name: "GSEA Pathways",
    children: Array.from(significanceGroups.values()),
  };
}

/**
 * Filters GSEA results before transformation.
 *
 * @param results - Array of GSEA analysis results
 * @param options - Filter options
 * @returns Filtered array of GSEA results
 */
export function filterGseaResults(
  results: GseaResult[],
  options: {
    maxFDR?: number;
    minAbsES?: number;
    pathwayNameFilter?: string;
  }
): GseaResult[] {
  return results.filter((result) => {
    if (options.maxFDR !== undefined && result.FDR > options.maxFDR) {
      return false;
    }
    if (options.minAbsES !== undefined && Math.abs(result.ES) < options.minAbsES) {
      return false;
    }
    if (
      options.pathwayNameFilter &&
      !result.Pathway.toLowerCase().includes(options.pathwayNameFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

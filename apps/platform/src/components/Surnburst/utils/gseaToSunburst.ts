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
}

/**
 * Transforms a flat array of GSEA results into a hierarchical structure for ZoomableSunburst.
 * Creates a tree with optional parent pathway grouping and individual pathways as leaves.
 *
 * @param results - Array of GSEA analysis results
 * @param valueField - Which field to use for arc sizing (default: 'NES' for Normalized Enrichment Score)
 * @param groupByParent - Whether to group pathways by their parent pathway (default: true)
 * @returns Hierarchical DataNode structure compatible with ZoomableSunburst
 */
export function gseaToSunburst(
  results: GseaResult[],
  valueField: keyof GseaResult = "NES",
  groupByParent: boolean = true
): DataNode {
  if (!results || results.length === 0) {
    return { name: "GSEA Pathways", children: [] };
  }

  if (!groupByParent) {
    // Flat structure: root with all pathways as direct children
    return {
      name: "GSEA Pathways",
      children: results.map((result) => ({
        name: result.Pathway,
        value: Math.abs(Number(result[valueField]) || 0),
      })),
    };
  }

  // Hierarchical structure: group by parent pathway
  const pathwayMap = new Map<string, DataNode>();
  const parentMap = new Map<string, DataNode>();

  // First pass: create all pathway nodes
  results.forEach((result) => {
    const pathwayNode: DataNode = {
      name: result.Pathway,
      value: Math.abs(Number(result[valueField]) || 0),
    };
    pathwayMap.set(result.ID, pathwayNode);
  });

  // Second pass: organize by parent pathway
  results.forEach((result) => {
    const parentName = result["Parent pathway"] || "Ungrouped";

    if (!parentMap.has(parentName)) {
      parentMap.set(parentName, {
        name: parentName,
        children: [],
      });
    }

    const parentNode = parentMap.get(parentName)!;
    if (!parentNode.children) {
      parentNode.children = [];
    }
    parentNode.children.push(pathwayMap.get(result.ID)!);
  });

  // Build root with all parent nodes as children
  return {
    name: "GSEA Pathways",
    children: Array.from(parentMap.values()),
  };
}

/**
 * Alternative transformation that creates a hierarchy based on statistical significance.
 * Groups pathways by FDR threshold categories.
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

    const groupNode = significanceGroups.get(group)!;
    if (!groupNode.children) {
      groupNode.children = [];
    }
    groupNode.children.push({
      name: result.Pathway,
      value: Math.abs(Number(result[valueField]) || 0),
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

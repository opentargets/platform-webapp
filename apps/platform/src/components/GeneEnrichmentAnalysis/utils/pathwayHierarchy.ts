import type { GseaResult } from "../api/gseaApi";

export interface HierarchyNode {
  id: string;
  name: string;
  value: number;
  data: GseaResult | null;
  children: HierarchyNode[];
}

export interface HierarchyData {
  pathwayMap: Map<string, GseaResult>;
  childrenMap: Map<string, string[]>;
  rootPathways: GseaResult[];
  secondLevelPathways: GseaResult[];
}

/**
 * Builds a pathway hierarchy with fallback logic for when no root pathways exist.
 */
export function buildPathwayHierarchy(pathways: GseaResult[]): HierarchyData {
  const pathwayMap = new Map<string, GseaResult>();
  const childrenMap = new Map<string, string[]>();
  const rootPathways: GseaResult[] = [];
  const secondLevelPathways: GseaResult[] = [];
  const processedIds = new Set<string>();

  // Create pathway map and collect children
  pathways.forEach((pathway) => {
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
      // This is a root pathway
      rootPathways.push(pathway);
    }
  });

  // If we have root pathways, return them
  if (rootPathways.length > 0) {
    return { pathwayMap, childrenMap, rootPathways, secondLevelPathways: [] };
  }

  // If no root pathways, find pathways whose parents are not in the dataset
  pathways.forEach((pathway) => {
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

  // If still no second-level pathways found, use all pathways as fallback
  if (secondLevelPathways.length === 0) {
    secondLevelPathways.push(...pathways);
  }

  return { pathwayMap, childrenMap, rootPathways, secondLevelPathways };
}

/**
 * Gets the effective root pathways for display purposes.
 */
export function getEffectiveRootPathways(pathways: GseaResult[]): GseaResult[] {
  const { rootPathways, secondLevelPathways } = buildPathwayHierarchy(pathways);
  return rootPathways.length > 0 ? rootPathways : secondLevelPathways;
}

/**
 * Builds a hierarchical structure for D3 sunburst/treemap
 */
export function buildHierarchyForD3(pathways: GseaResult[]): HierarchyNode {
  const { pathwayMap, childrenMap, rootPathways, secondLevelPathways } =
    buildPathwayHierarchy(pathways);

  const topLevelPathways = rootPathways.length > 0 ? rootPathways : secondLevelPathways;
  const processedIds = new Set<string>();

  const buildChildren = (parentId: string): HierarchyNode[] => {
    const childIds = childrenMap.get(parentId) || [];
    return childIds
      .filter((id) => !processedIds.has(id))
      .map((childId) => {
        processedIds.add(childId);
        const pathway = pathwayMap.get(childId);
        if (!pathway) return null;

        const pValue = pathway["p-value"] || 1;
        const significance = 1 / (pValue || 1);
        const value = Math.max(1, Math.log(significance) * 5);

        return {
          id: childId,
          name: pathway.Pathway || childId,
          value,
          data: pathway,
          children: buildChildren(childId),
        };
      })
      .filter(Boolean) as HierarchyNode[];
  };

  // Build root node with children
  const rootChildren = topLevelPathways.map((pathway) => {
    const id = pathway.ID || "";
    processedIds.add(id);

    const pValue = pathway["p-value"] || 1;
    const significance = 1 / (pValue || 1);
    const value = Math.max(1, Math.log(significance) * 5);

    return {
      id,
      name: pathway.Pathway || id,
      value,
      data: pathway,
      children: buildChildren(id),
    };
  });

  return {
    id: "root",
    name: "All Pathways",
    value: 0,
    data: null,
    children: rootChildren,
  };
}

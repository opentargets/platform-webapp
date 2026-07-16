import type { ElementDefinition } from "cytoscape";
import type { GseaResult } from "../../../api/gseaApi";
import { getGeneList } from "./index";
import { Gene } from "../../../types";

export interface GeneNodeMetadata {
  gene: string;
  pathwayCount: number;
  bestFDR: number;
  pathways: string[];
}

export interface PathwayNodeMetadata {
  pathway: string;
  nes: number;
  es: number;
  fdr: number;
  pValue: number;
  pathwaySize: number;
  inputGenes: number;
  geneCount: number;
}




/**
 * Calculates node size based on pathway size value
 */
export function calculateNodeSize(
  value: number,
  pathwayCount?: number
): number {
  return Math.min(80, Math.max(30, Math.sqrt(value) * (pathwayCount ? 20 : 5)));
}




/**
 * Filters and sorts genes by pathway count
 */
export function filterAndSortGenes(
  geneToPathways: Map<string, Array<{ pathway: string; fdr: number; nes: number }>>
): string[] {
  return Array.from(geneToPathways.entries())
    .filter(([_, pathways]) => pathways.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 500)
    .map(([gene]) => gene);
}




/**
 * Creates a pathway node element for Cytoscape
 * Color is set to neutral default and overridden by NES-based coloring in useElementComputation
 */
export function createPathwayNode(
  result: Record<string, unknown>,
  geneList: string[]
): ElementDefinition {
  const fdr = result.FDR as number;
  const nodeSize = calculateNodeSize(
    result["Pathway size"] as number,
    geneList.length
  );

  const nodeId = (result.ID as string) || (result.Pathway as string);
  const nodePathway = result.Pathway as string;
  const defaultColor = "#e0e0e0"; // Neutral grey - will be overridden by NES coloring

  return {
    data: {
      id: nodeId,
      label: nodePathway,
      pathway: nodePathway,
      link: result.Link as string | undefined,
      nes: result.NES,
      es: result.ES,
      fdr: fdr,
      pValue: result["p-value"],
      pathwaySize: result["Pathway size"],
      inputGenes: result["Number of input genes"],
      geneCount: geneList.length,
      leadingGenes: result["Leading edge genes"],
      pathwayGenes: result["Pathway genes"],
      color: defaultColor,
      borderColor: defaultColor,
      size: nodeSize,
      displayLabel: nodePathway.length > 25 ? `${nodePathway.substring(0, 22)}...` : nodePathway,
    },
  };
}

/**
 * Builds pathway view nodes
 */
export function buildPathwayViewNodes(
  displayResults: Array<Record<string, unknown>> | GseaResult[],
  genes?: Gene[]
): {
  nodes: ElementDefinition[];
  stats: { totalPathways: number; edges: number; totalGenes: number; significantCount: number };
} {
  const geneToPathways = new Map<string, string[]>();

  for (const r of displayResults) {
    const geneList_ = getGeneList(r as GseaResult);
    for (const gene of geneList_) {
      if (!geneToPathways.has(gene)) {
        geneToPathways.set(gene, []);
      }
      const pathways = geneToPathways.get(gene);
      if (pathways) {
        pathways.push(r.Pathway as string);
      }
    }
  }

  const nodes: ElementDefinition[] = [];
  for (const r of displayResults) {
    const geneList_ = getGeneList(r as GseaResult);
    nodes.push(
      createPathwayNode(r as Record<string, unknown>, geneList_)
    );
  }

  return {
    nodes,
    stats: {
      totalPathways: nodes.length,
      edges: 0,
      totalGenes: geneToPathways.size,
      significantCount: displayResults.filter((r) => (r.FDR as number) < 0.05).length,
    },
  };
}

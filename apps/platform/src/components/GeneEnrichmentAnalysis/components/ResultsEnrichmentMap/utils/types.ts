import type { GseaResult } from "../../../api/gseaApi";
import type { Gene } from "../../../types";

export interface ResultsEnrichmentMapProps {
  results: GseaResult[];
  genes?: Gene[];
  diseaseId?: string; // Optional disease ID for AOTF links
}

export interface ComputedStats {
  totalGenes?: number;
  totalPathways?: number;
  displayedPathways?: number;
  edges: number;
  significantCount?: number;
  droppedNodes?: number;
}

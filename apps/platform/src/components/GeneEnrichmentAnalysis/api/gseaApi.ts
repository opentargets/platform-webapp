import { PATHWAYS_API_BASE_URL } from "../config";
import type { AnalysisDirection, Gene } from "../types";

const GSEA_API_BASE_URL = `${PATHWAYS_API_BASE_URL}/api/gsea`;

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
  "Leading edge genes": string; // comma-separated string
  Link?: string;
  "Parent pathway"?: string;
}

export interface InputOverlap {
  library: string;
  used_count: number;
  total_input: number;
  used_percent: number;
}

export interface GseaAnalyzeResponse {
  results: GseaResult[];
  input_overlap: InputOverlap;
}

export interface GseaAnalyzeParams {
  genes: Gene[];
  library: string;
  analysisDirection?: AnalysisDirection;
}

/**
 * Run GSEA analysis with the provided genes and library.
 */
export async function analyzeGsea({
  genes,
  library,
  analysisDirection = "one_sided_positive",
}: GseaAnalyzeParams): Promise<GseaAnalyzeResponse> {
  const url = new URL(`${GSEA_API_BASE_URL}/analyze/json`);
  url.searchParams.set("gmt_name", library);
  url.searchParams.set("analysis_direction", analysisDirection);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ genes }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GSEA analysis failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch available GSEA libraries.
 */
export async function fetchLibraries(): Promise<string[]> {
  const response = await fetch(`${GSEA_API_BASE_URL}/libraries`);

  if (!response.ok) {
    throw new Error(`Failed to fetch libraries: ${response.status}`);
  }

  return response.json();
}

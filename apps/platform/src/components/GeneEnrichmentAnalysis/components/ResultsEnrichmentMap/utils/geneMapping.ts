import { gql } from "@apollo/client";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";

/**
 * Query to map gene symbols to target IDs using the mapIds endpoint
 */
const MAP_IDS_QUERY = gql`
  query MapIdsToTargets($queryTerms: [String!]!) {
    mapIds(queryTerms: $queryTerms, entityNames: "target") {
      mappings {
        hits {
          id
        }
        term
      }
    }
  }
`;

/**
 * Build a mapping from gene symbols to target IDs
 * Fetches all gene IDs in a single batch query
 */
export async function buildGeneToTargetIdMapping(
  client: ApolloClient<NormalizedCacheObject>,
  geneSymbols: string[]
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  const uniqueSymbols = Array.from(new Set(geneSymbols)); // Remove duplicates

  if (uniqueSymbols.length === 0) {
    return mapping;
  }

  try {
    const result = await client.query({
      query: MAP_IDS_QUERY,
      variables: { queryTerms: uniqueSymbols },
    });

    const mappings = result.data?.mapIds?.mappings || [];
    if (mappings.length > 0) {
      console.log(`[GENE_MAPPING] Fetched ${mappings.length} mappings`);
    }
    mappings.forEach((mapping_item: any) => {
      const term = mapping_item.term;
      if (mapping_item.hits && mapping_item.hits.length > 0) {
        const targetId = mapping_item.hits[0].id;
        mapping.set(term, targetId);
      }
    });

    console.log(
      `[GENE_MAPPING] Successfully mapped ${mapping.size}/${uniqueSymbols.length} genes to target IDs`
    );
  } catch (err) {
    console.warn("[GENE_MAPPING] Error fetching target IDs:", err);
  }

  return mapping;
}

/**
 * Get target URL for a gene symbol using the mapping
 * Falls back to symbol-based URL if target ID not found
 */
export function getGeneTargetUrl(
  geneSymbol: string,
  mapping: Map<string, string>
): string {
  const targetId = mapping.get(geneSymbol);
  if (targetId) {
    return `/target/${targetId}`;
  }
  // Fallback: try direct URL with symbol (may not work, but better than nothing)
  return `/target/${geneSymbol}`;
}

/**
 * Build AOTF (All Targets For) link with pinned target IDs
 * @param diseaseId - The disease EFO ID (e.g., "EFO_0000676")
 * @param targetIds - Array of Ensembl target IDs to pin
 * @returns URL string for the disease associations page with pinned targets
 */
export function buildAOTFLink(diseaseId: string, targetIds: string[]): string {
  if (!diseaseId || targetIds.length === 0) {
    return `/disease/${diseaseId}/associations`;
  }
  const pinnedQuery = targetIds.join(",");
  return `/disease/${diseaseId}/associations?pinned=${encodeURIComponent(pinnedQuery)}`;
}

/**
 * Get target IDs from gene-to-target mapping
 * @param genes - Array of gene symbols
 * @param mapping - Map from gene symbols to target IDs
 * @returns Array of target IDs in order, excluding unmapped genes
 */
export function getTargetIdsFromMapping(
  genes: string[],
  mapping: Map<string, string>
): string[] {
  return genes
    .map((gene) => mapping.get(gene))
    .filter((id): id is string => Boolean(id));
}

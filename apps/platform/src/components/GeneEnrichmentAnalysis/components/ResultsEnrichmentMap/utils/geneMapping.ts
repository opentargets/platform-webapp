import { gql } from "@apollo/client";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import type { Gene } from "../../../types";

/**
 * Query to map gene symbols to target IDs using the mapIds endpoint
 */
const MAP_IDS_QUERY = gql`
  query MapIdsToTargets($queryTerms: [String!]!) {
    mapIds(queryTerms: $queryTerms, entityNames: [target]) {
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
 * Seed a symbol -> target ID mapping from genes that already carry an Ensembl ID
 * (the AOTF path keeps `target.id` on every gene it sends to GSEA).
 */
export function mappingFromGenes(genes: Gene[] = []): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const gene of genes) {
    if (gene.id && gene.symbol) mapping.set(gene.symbol, gene.id);
  }
  return mapping;
}

/**
 * `mapIds` resolves every term against the search index and the API rejects
 * responses over ~100MB ("entity content is too long"); large Reactome/GO
 * pathways (2,000+ genes) hit that limit in a single call, so terms are sent
 * in chunks with a bounded number of requests in flight.
 */
const MAP_IDS_CHUNK_SIZE = 100;
const MAP_IDS_CONCURRENCY = 4;

type MapIdsMapping = { term: string; hits?: Array<{ id: string }> };

async function fetchMapIdsChunk(
  client: ApolloClient<NormalizedCacheObject>,
  queryTerms: string[]
): Promise<MapIdsMapping[]> {
  const result = await client.query({
    query: MAP_IDS_QUERY,
    variables: { queryTerms },
  });
  return result.data?.mapIds?.mappings || [];
}

/**
 * Build a mapping from gene symbols to target IDs.
 * Symbols already present in `known` are not re-queried; the rest are resolved
 * through chunked `mapIds` calls. A failed chunk is logged and skipped so the
 * other chunks still populate the mapping.
 */
export async function buildGeneToTargetIdMapping(
  client: ApolloClient<NormalizedCacheObject>,
  geneSymbols: string[],
  known: Map<string, string> = new Map()
): Promise<Map<string, string>> {
  const mapping = new Map(known);
  const unresolved = Array.from(new Set(geneSymbols)).filter(
    symbol => symbol && !mapping.has(symbol)
  );

  if (unresolved.length === 0) {
    return mapping;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < unresolved.length; i += MAP_IDS_CHUNK_SIZE) {
    chunks.push(unresolved.slice(i, i + MAP_IDS_CHUNK_SIZE));
  }

  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      try {
        const mappings = await fetchMapIdsChunk(client, chunk);
        for (const { term, hits } of mappings) {
          if (hits && hits.length > 0) {
            mapping.set(term, hits[0].id);
          }
        }
      } catch (err) {
        console.warn(`[GENE_MAPPING] Error fetching target IDs for ${chunk.length} symbols:`, err);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAP_IDS_CONCURRENCY, chunks.length) }, () => worker())
  );

  return mapping;
}

/**
 * Get the target page URL for a gene symbol.
 * The route is `/target/:ensgId`, so a symbol with no Ensembl ID has no valid
 * page and `null` is returned instead of a broken link.
 */
export function getGeneTargetUrl(
  geneSymbol: string,
  mapping: Map<string, string>
): string | null {
  const targetId = mapping.get(geneSymbol);
  return targetId ? `/target/${targetId}` : null;
}

/**
 * Build the disease associations (AOTF) link with pinned targets.
 * Matches the route `/disease/:efoId/associations` and the `pinned` URL param
 * the associations page reads as a comma-separated list of Ensembl IDs.
 * @returns the URL, or `null` when there is no disease to link to
 */
export function buildAOTFLink(diseaseId: string | undefined, targetIds: string[]): string | null {
  if (!diseaseId || diseaseId === "standalone") return null;
  const base = `/disease/${diseaseId}/associations`;
  if (targetIds.length === 0) return base;
  const params = new URLSearchParams({ pinned: targetIds.join(",") });
  return `${base}?${params.toString()}`;
}

/**
 * Get target IDs from gene-to-target mapping
 * @param genes - Array of gene symbols
 * @param mapping - Map from gene symbols to target IDs
 * @returns Array of unique target IDs in order, excluding unmapped genes
 */
export function getTargetIdsFromMapping(
  genes: string[],
  mapping: Map<string, string>
): string[] {
  const ids = genes
    .map(gene => mapping.get(gene))
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

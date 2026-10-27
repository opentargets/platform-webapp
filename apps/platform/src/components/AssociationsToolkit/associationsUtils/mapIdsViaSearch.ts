import { type ApolloClient, gql } from "@apollo/client";

export type MappedHit = { id: string; name: string; entity: string };
export type TermMapping = { term: string; hits: MappedHit[] };
export type MappingResults = { total: number; mappings: TermMapping[] };

const TERMS_PER_REQUEST = 25;
const HITS_PER_TERM = 5;

/**
 * Replacement for the `mapIds` query, which the API no longer exposes: every
 * free-text term is resolved with the `search` query (one alias per term, a
 * few terms per request) and the hits are returned in the former `mapIds`
 * shape.
 */
type SearchAliases = Record<string, { hits: MappedHit[] } | null | undefined>;

export async function mapIdsViaSearch(
  client: ApolloClient<object>,
  queryTerms: string[],
  entityNames: string[] | null = null,
  hitsPerTerm = HITS_PER_TERM
): Promise<MappingResults> {
  const terms = Array.from(new Set(queryTerms.map((term) => term.trim()).filter(Boolean)));
  const mappings: TermMapping[] = [];

  for (let start = 0; start < terms.length; start += TERMS_PER_REQUEST) {
    const chunk = terms.slice(start, start + TERMS_PER_REQUEST);
    const variableDefinitions = chunk.map((_, i) => `$q${i}: String!`).join(", ");
    const fields = chunk
      .map(
        (_, i) => `
        t${i}: search(queryString: $q${i}, entityNames: $entityNames, page: { index: 0, size: $size }) {
          hits {
            id
            name
            entity
          }
        }`
      )
      .join("\n");
    const query = gql`
      query MapIdsViaSearch($entityNames: [String!], $size: Int!, ${variableDefinitions}) {
        ${fields}
      }
    `;
    const variables: Record<string, unknown> = { entityNames, size: hitsPerTerm };
    chunk.forEach((term, i) => {
      variables[`q${i}`] = term;
    });
    const { data } = await client.query<SearchAliases>({ query, variables });
    chunk.forEach((term, i) => {
      mappings.push({ term, hits: data?.[`t${i}`]?.hits ?? [] });
    });
  }

  return { total: mappings.filter(({ hits }) => hits.length > 0).length, mappings };
}

import type { ApolloClient, DocumentNode, NormalizedCacheObject } from "@apollo/client";
import { europePmcBiblioSearchPOSTQuery } from "@ot/utils";
import type {
  LiteratureEntityData,
  LiteratureStateType,
  PublicationType,
  SelectedEntityType,
} from "./types";

/** label of a similar entity: targets have a symbol, diseases and drugs a name */
export function similarEntityLabel(object: { name: string } | { approvedSymbol: string }): string {
  return "name" in object ? object.name : object.approvedSymbol;
}

/**
 * Literature state derived from one page of a bibliography response: the
 * similar entities, the publication ids of that page, the total and the
 * earliest publication year.
 */
export function literatureStateFromResponse(
  data: LiteratureEntityData | null | undefined,
  page = 0
): Partial<LiteratureStateType> {
  return {
    entities: data?.similarEntities?.rows ?? [],
    litsIds: data?.literatureOcurrences?.rows?.map(({ pmid, pmcid }) => pmid || pmcid || "") ?? [],
    litsCount: data?.literatureOcurrences?.count ?? 0,
    earliestPubYear: data?.literatureOcurrences?.stats?.earliestPubDate ?? 0,
    page,
  };
}

export async function literaturesEuropePMCQuery({
  literaturesIds,
}: {
  literaturesIds: string[];
}): Promise<PublicationType[]> {
  if (literaturesIds.length === 0) return [];
  const { baseUrl, requestOptions } = europePmcBiblioSearchPOSTQuery(literaturesIds);
  const response = await fetch(baseUrl, requestOptions).then((response) => response.json());
  if (response.error) throw response.error;
  return response.resultList?.result;
}

type fetchSimilarEntitiesParam = {
  id?: string;
  threshold?: number;
  size?: number;
  query: DocumentNode | null;
  page?: number;
  pageSize?: number;
  category: string[];
  entities?: SelectedEntityType[];
  startYear?: number | null;
  startMonth?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  client: ApolloClient<NormalizedCacheObject>;
};

export const fetchSimilarEntities = ({
  id = "",
  threshold = 0.5,
  size = 15,
  query,
  page = 0,
  pageSize = 5,
  category = [],
  entities = [],
  startYear = null,
  startMonth = null,
  endYear = null,
  endMonth = null,
  client,
}: fetchSimilarEntitiesParam) => {
  if (!query) throw new Error("fetchSimilarEntities: no bibliography query");
  const entityNames = category.length === 0 ? null : category;
  const ids = entities.map((c) => c.object.id);
  return client.query<Record<string, LiteratureEntityData | null>>({
    query,
    variables: {
      index: page,
      pageSize,
      id,
      ids,
      startYear,
      startMonth,
      endYear,
      endMonth,
      threshold,
      size,
      entityNames,
    },
  });
};

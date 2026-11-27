import { getConfig } from "@ot/config";
import { format } from "d3-format";

const config = getConfig();

interface ProteinId {
  source: string;
  id: string;
}

export const safeToString = (x: unknown): string => {
  switch (typeof x) {
    case "object":
      return "object";
    case "function":
      return "function";
    case undefined:
    case null:
      return "";
    default:
      return `${x}`;
  }
};

export const identifiersOrgLink = (prefix: string, accession: string, resource?: string): string =>
  `https://identifiers.org/${resource ? `${resource}/` : ""}${prefix}:${accession}`;

export const literatureUrl = (id: string): string =>
  id.startsWith("PMC") ? identifiersOrgLink("pmc", id) : identifiersOrgLink("pubmed", id);

export const sentenceCase = (str: string | null | undefined): string | null | undefined =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ").toLocaleLowerCase() : str;

export const formatComma = format(",");

export function getUniprotIds(proteinIds: ProteinId[]): string[] {
  return proteinIds
    .filter((proteinId) => proteinId.source === "uniprot_swissprot")
    .map((proteinId) => proteinId.id);
}

const makePmidLink = (themeColor: string) => {
  const linkStyles = `color: ${themeColor}; font-size: inherit; text-decoration: none;`;
  return (match: string) => {
    const id = match.substring(7);
    return `PubMed:<a style="${linkStyles}" href="https://europepmc.org/abstract/med/${id}" target="_blank">${id}</a>`;
  };
};

export function clearDescriptionCodes(
  descriptions: string[] | null | undefined,
  themeColor: string
): string[] {
  if (!descriptions) return [];
  return descriptions.map((desc) => {
    const codeStart = desc.indexOf("{");
    const parsedDesc = desc.slice(0, codeStart);
    return parsedDesc.replace(/Pubmed:\d+/gi, makePmidLink(themeColor));
  });
}

interface GraphQLParams {
  query: string;
  operationName?: string | null;
  variables?: Record<string, unknown>;
}

// GraphiQL can send an operationName left over from the previous document when the
// editor text is swapped and run in quick succession; drop it if the query doesn't define it.
function hasOperation(query: string, operationName: string): boolean {
  const escaped = operationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(query|mutation|subscription)\\s+${escaped}\\b`).test(query);
}

export async function fetcher(graphQLParams: GraphQLParams): Promise<unknown> {
  const { operationName, ...rest } = graphQLParams;
  const params =
    operationName && !hasOperation(graphQLParams.query, operationName) ? rest : graphQLParams;
  const data = await fetch(config.urlApi, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  return data.json();
}

export function getSortedAncestries({ arr }) {
  if (!arr || arr.length < 1) return [];
  const ldPopulationStructure = [...arr];
  return ldPopulationStructure.sort((a, b) => b.relativeSampleSize - a.relativeSampleSize);
}

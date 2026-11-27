import { identifiersOrgLink } from "./global";

const uniprotUrl = (accession: string): string => `http://uniprot.org/uniprot/${accession}`;

// Interactor ids that are not UniProt accessions, and where each one should link to.
const INTERACTOR_LINKS: Array<[RegExp, (id: string, match: RegExpMatchArray) => string]> = [
  // RNAcentral, optionally with a taxon suffix, e.g. URS000075DAEC_9606 (IntAct, SIGNOR)
  [/^URS[0-9A-F]{10}(_\d+)?$/, (id) => identifiersOrgLink("rnacentral", id)],
  // Reactome entity, e.g. R-HSA-8945699 (Reactome)
  [/^R-[A-Z]{3}-\d+$/, (id) => identifiersOrgLink("reactome", id)],
  // Ensembl protein, e.g. ENSP00000336783 (STRING). STRING data on the Platform is human only,
  // and some of these ids are no longer in Ensembl, so link to the STRING page.
  [/^ENSP\d+$/, (id) => `https://string-db.org/network/9606.${id}`],
  // Ensembl transcript, e.g. ENST00000215832 (IntAct)
  [/^ENST\d+$/, (id) => identifiersOrgLink("ensembl", id)],
  // IntAct interactor, e.g. EBI-11709120 (IntAct)
  [/^EBI-\d+$/, (id) => `https://www.ebi.ac.uk/intact/search?query=${id}`],
  // UniProt chain, e.g. P26663-PRO_0000037536 (IntAct): link to the parent entry
  [/^(.+)-PRO_\d+$/, (_id, match) => uniprotUrl(match[1])],
  // DrugBank, e.g. DB00002 (SIGNOR)
  [/^DB\d{5}$/, (id) => identifiersOrgLink("drugbank", id)],
  // ChEBI, e.g. CHEBI:61151 (IntAct)
  [/^CHEBI:(\d+)$/, (_id, match) => identifiersOrgLink("CHEBI", match[1])],
];

/**
 * External link for an interactor that is not a Platform target.
 * Interactors are mostly UniProt accessions; other identifier types link to their own resource.
 */
export function getInteractorUrl(id: string): string {
  for (const [pattern, toUrl] of INTERACTOR_LINKS) {
    const match = id.match(pattern);
    if (match) return toUrl(id, match);
  }
  return uniprotUrl(id);
}

export enum InteractorsSource {
  INTACT = "intact",
  REACTOME = "reactome",
  SIGNOR = "signor",
  STRING = "string",
}

export const INTERACTORS_SOURCES = {
  INTACT: InteractorsSource.INTACT,
  REACTOME: InteractorsSource.REACTOME,
  SIGNOR: InteractorsSource.SIGNOR,
  STRING: InteractorsSource.STRING,
};

export const INTERACTORS_SOURCE_THRESHOLD = {
  [INTERACTORS_SOURCES.INTACT]: 0.42,
  [INTERACTORS_SOURCES.STRING]: 0.75,
  [INTERACTORS_SOURCES.SIGNOR]: null,
  [INTERACTORS_SOURCES.REACTOME]: null,
};

interface TargetRowInteractorsRequest {
  data?: {
    target?: {
      interactions?: {
        rows?: Array<{
          targetB?: {
            id: string;
          };
        }>;
      };
    };
  };
}

export function getInteractorIds(targetRowInteractorsRequest: TargetRowInteractorsRequest) {
  if (!targetRowInteractorsRequest?.data?.target?.interactions?.rows) {
    return [];
  }

  const interactorsIds = [
    ...new Set(
      targetRowInteractorsRequest.data.target.interactions.rows
        .map((int) => int.targetB?.id)
        .filter((id) => id !== null && id !== undefined)
    ),
  ];

  return interactorsIds;
}

import { identifiersOrgLink } from "./global";

// RNAcentral URS ids, optionally with a taxon suffix, e.g. URS000075DAEC_9606
const RNACENTRAL_ID = /^URS[0-9A-F]{10}(_\d+)?$/;

/**
 * External link for an interactor that is not a Platform target.
 * Interactors are UniProt accessions, except non-coding RNAs, which are RNAcentral ids.
 */
export function getInteractorUrl(id: string): string {
  if (RNACENTRAL_ID.test(id)) return identifiersOrgLink("rnacentral", id);
  return `http://uniprot.org/uniprot/${id}`;
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

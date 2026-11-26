/**
 * Search terms the search tests type, and what each must find.
 *
 * Only what identifies an entity is fixed here (its id, symbol or name, the paper of a
 * study). Counts and rankings change with every data release and are asserted as
 * invariants in the specs.
 */

export type SearchEntity = "target" | "disease" | "drug" | "variant" | "study";

/** The order the app lists the entity filters in, on the results page and in the dialog. */
export const SEARCH_ENTITIES: readonly SearchEntity[] = [
  "target",
  "variant",
  "study",
  "disease",
  "drug",
];

/** Route of an entity's page as the search UI links to it. */
export function entityRoute(entity: SearchEntity, id: string): string {
  if (entity === "target" || entity === "disease") return `/${entity}/${id}/associations`;
  return `/${entity}/${id}`;
}

/** What a link to any entity of a type must look like. */
export const ENTITY_ROUTE_PATTERN: Record<SearchEntity, RegExp> = {
  target: /^\/target\/ENSG\d{11}\/associations$/,
  disease: /^\/disease\/[A-Za-z]+_\d+\/associations$/,
  drug: /^\/drug\/CHEMBL\d+$/,
  variant: /^\/variant\/[\w.-]+$/,
  study: /^\/study\/[\w.-]+$/,
};

/** What an entity id must look like. */
export const ENTITY_ID_PATTERN: Record<SearchEntity, RegExp> = {
  target: /^ENSG\d{11}$/,
  disease: /^[A-Za-z]+_\d+$/,
  drug: /^CHEMBL\d+$/,
  variant: /^(?:[1-9]|1\d|2[0-2]|X|Y|MT)_\d+_[A-Za-z]+_[A-Za-z]+$/,
  study: /^[\w.-]+$/,
};

export const SEARCH = {
  /** A term whose top hit is a target. */
  target: {
    term: "BRAF",
    id: "ENSG00000157764",
    symbol: "BRAF",
    name: "B-Raf proto-oncogene, serine/threonine kinase",
    biotype: "protein_coding",
    uniprotAccession: "P15056",
  },
  /** A term whose top hit is a disease, with results of every type but variant. */
  disease: {
    term: "asthma",
    id: "MONDO_0004979",
    name: "asthma",
    descriptionStart: "A bronchial disease that is characterized by chronic inflammation",
    therapeuticArea: { id: "OTAR_0000010", name: "respiratory or thoracic disease" },
  },
  /** A term whose top hit is a drug. */
  drug: {
    term: "aspirin",
    id: "CHEMBL25",
    name: "ASPIRIN",
    descriptionStart: "Small molecule drug with a maximum clinical stage of Approval",
    drugType: "Small molecule",
    maximumClinicalStage: "Approval",
  },
  /** An rsID whose top hit is a variant. */
  variant: {
    term: "rs7412",
    id: "19_44908822_C_T",
    rsId: "rs7412",
    descriptionStart: "Missense variant overlapping with APOE",
    location: "chr19:44908822",
    referenceAllele: "C",
    alternateAllele: "T",
    mostSevereConsequence: "missense variant",
  },
  /** A study id: finds exactly that study and the disease it is about. */
  study: {
    term: "GCST90399686",
    id: "GCST90399686",
    trait: "Asthma",
    publication: "Zhou W et al. Cell Genom (2022)",
    diseaseId: "MONDO_0004979",
  },
  /** A target whose molQTL studies name the gene and tissue they affect. */
  molQtlGene: { term: "BRCA2", symbol: "BRCA2" },
  /** Matches nothing. */
  noMatch: "zzzqqqxxnotathing",
  /** Well-formed variant ids and rsIDs that are not in the Platform. */
  unknownVariants: ["1_12345_A_T", "chr1:12345:A-T", "rs99999999999"],
} as const;

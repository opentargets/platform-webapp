/**
 * What the target profile tests know about each target they open, beyond its sections
 * (those are in fixtures/expectedSections.ts). Only facts that identify the entity are
 * kept here; everything else is asserted as an invariant.
 */
export type TargetFacts = {
  symbol: string;
  /** Reviewed (Swiss-Prot) UniProt accession, when the target has a protein product. */
  uniprotId?: string;
};

const TARGET_FACTS: Record<string, TargetFacts> = {
  ENSG00000157764: { symbol: "BRAF", uniprotId: "P15056" },
  ENSG00000139618: { symbol: "BRCA2", uniprotId: "P51587" },
  ENSG00000146648: { symbol: "EGFR", uniprotId: "P00533" },
  ENSG00000171014: { symbol: "OR4D5", uniprotId: "Q8NGN0" },
  ENSG00000251562: { symbol: "MALAT1" },
  ENSG00000228630: { symbol: "HOTAIR" },
};

/**
 * Edge-case targets of the profile sections, recorded against data release 26.12.
 * Each one is listed in fixtures/expectedSections.ts.
 */
export const EDGE_TARGETS = {
  /**
   * OR4D5: an olfactory receptor with very little data. One pathway, one subcellular
   * location source, an AlphaFold prediction and no experimental structure, String
   * interactions only, and a pLoF constraint row without values.
   */
  sparse: "ENSG00000171014",
  /**
   * HOTAIR: a lncRNA. No protein and no annotations, so none of subcellular location,
   * Gene Ontology, genetic constraint, molecular structure, interactions or pathways.
   */
  nonCoding: "ENSG00000228630",
  /**
   * MALAT1: a lncRNA whose only annotations are electronically inferred Gene Ontology
   * terms, all of them biological processes.
   */
  singleAspectGeneOntology: "ENSG00000251562",
  /**
   * EGFR: a membrane protein with locations on organelle membranes and an
   * isoform-specific location, and with a lot of data in every table.
   */
  membraneProtein: "ENSG00000146648",
} as const;

/** The facts for a target. Throws for a target the tests have not been told about. */
export function targetFacts(ensemblId: string): TargetFacts {
  const facts = TARGET_FACTS[ensemblId];
  if (!facts) {
    throw new Error(
      `POM/objects/widgets/Target/targetFacts.ts has no entry for "${ensemblId}". Record its symbol (and UniProt accession) before testing it.`
    );
  }
  return facts;
}

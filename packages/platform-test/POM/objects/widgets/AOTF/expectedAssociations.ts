/**
 * What the associations-on-the-fly table must show for the test diseases.
 *
 * Like fixtures/expectedSections.ts, this is what lets a test tell "broken" from "empty":
 * the table drops a score cell when the API returns no score, and it drops it just the
 * same when the query lost a field. For the genes below, the listed data sources have to
 * have a score and no other data source may.
 *
 * When a test fails on this file, open the page. If the cell is there for a human, the
 * test is wrong. If it is gone, check `disease.associatedTargets` in the API: an error
 * is a bug, a changed score list means the data release changed and this file needs
 * updating.
 *
 * Recorded against data release 26.12.
 */

export type ExpectedGene = {
  /** Ensembl gene id of the row */
  id: string;
  /** Data source columns that carry a score for this gene and this disease */
  dataSources: readonly string[];
};

export type ExpectedDiseaseAssociations = {
  name: string;
  genes: Record<string, ExpectedGene>;
};

export const EXPECTED_ASSOCIATIONS: Record<string, ExpectedDiseaseAssociations> = {
  MONDO_0005068: {
    name: "myocardial infarction",
    genes: {
      IL6: { id: "ENSG00000136244", dataSources: ["europepmc"] },
      ADRB1: { id: "ENSG00000043591", dataSources: ["clinical_precedence", "europepmc"] },
      APOE: { id: "ENSG00000130203", dataSources: ["gwas_credible_sets", "europepmc"] },
    },
  },
};

export function expectedAssociationsFor(diseaseId: string): ExpectedDiseaseAssociations {
  const expected = EXPECTED_ASSOCIATIONS[diseaseId];
  if (!expected) {
    throw new Error(
      `POM/objects/widgets/AOTF/expectedAssociations.ts has no entry for disease "${diseaseId}". Record which data sources its test genes have before testing it, so a missing score fails the test.`
    );
  }
  return expected;
}

export function expectedGene(diseaseId: string, symbol: string): ExpectedGene {
  const gene = expectedAssociationsFor(diseaseId).genes[symbol];
  if (!gene) {
    throw new Error(
      `POM/objects/widgets/AOTF/expectedAssociations.ts has no gene "${symbol}" for disease "${diseaseId}".`
    );
  }
  return gene;
}

/**
 * A disease with evidence for each data source, so every evidence widget is opened from
 * the table at least once. Myocardial infarction (the primary test disease) covers seven
 * sources; breast cancer covers most of the rest; Alzheimer disease has the two neither
 * of them has. Sorting the table by the data source puts a row with that evidence first.
 */
export const DISEASE_WITH_EVIDENCE: Record<string, { id: string; name: string }> = {
  clinical_precedence: { id: "MONDO_0005068", name: "myocardial infarction" },
  gwas_credible_sets: { id: "MONDO_0005068", name: "myocardial infarction" },
  gene_burden: { id: "MONDO_0005068", name: "myocardial infarction" },
  eva: { id: "MONDO_0005068", name: "myocardial infarction" },
  genomics_england: { id: "MONDO_0007254", name: "breast cancer" },
  gene2phenotype: { id: "MONDO_0007254", name: "breast cancer" },
  uniprot_literature: { id: "MONDO_0005068", name: "myocardial infarction" },
  uniprot_variants: { id: "MONDO_0007254", name: "breast cancer" },
  orphanet: { id: "MONDO_0007254", name: "breast cancer" },
  clingen: { id: "MONDO_0007254", name: "breast cancer" },
  cancer_gene_census: { id: "MONDO_0007254", name: "breast cancer" },
  intogen: { id: "MONDO_0007254", name: "breast cancer" },
  eva_somatic: { id: "MONDO_0005068", name: "myocardial infarction" },
  cancer_biomarkers: { id: "MONDO_0007254", name: "breast cancer" },
  crispr_screen: { id: "MONDO_0004975", name: "Alzheimer disease" },
  crispr: { id: "MONDO_0007254", name: "breast cancer" },
  reactome: { id: "MONDO_0007254", name: "breast cancer" },
  europepmc: { id: "MONDO_0005068", name: "myocardial infarction" },
  expression_atlas: { id: "MONDO_0004975", name: "Alzheimer disease" },
  impc: { id: "MONDO_0007254", name: "breast cancer" },
};

/**
 * Data sources with no evidence at all for myocardial infarction: no row has a score in
 * these columns, however the table is sorted.
 */
export const DATA_SOURCES_WITHOUT_EVIDENCE: Record<string, readonly string[]> = {
  MONDO_0005068: [
    "genomics_england",
    "gene2phenotype",
    "uniprot_variants",
    "orphanet",
    "clingen",
    "cancer_gene_census",
    "intogen",
    "cancer_biomarkers",
    "crispr_screen",
    "crispr",
    "reactome",
    "expression_atlas",
    "impc",
  ],
};

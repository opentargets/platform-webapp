/**
 * What the associations table of the test target must show, so a test can tell "broken"
 * from "empty": a score cell is dropped when the API returns no score, and just the same
 * when the query lost a field. Recorded against data release 26.12, for BRAF
 * (ENSG00000157764). When a test fails on this file, open the page and check
 * `target.associatedDiseases` in the API: an error is a bug, a changed score list means
 * the release changed and this file needs updating.
 */
export type ExpectedDisease = {
  id: string;
  name: string;
  /** Data source columns with a score for BRAF and this disease. A cell in any other is a bug. */
  dataSources: readonly string[];
};

export const BRAF_DISEASES = {
  melanoma: {
    id: "MONDO_0005105",
    name: "melanoma",
    dataSources: [
      "clinical_precedence",
      "eva",
      "cancer_gene_census",
      "intogen",
      "eva_somatic",
      "crispr",
      "europepmc",
    ],
  },
  noonan: {
    id: "MONDO_0018997",
    name: "Noonan syndrome",
    dataSources: [
      "genomics_england",
      "eva",
      "gene2phenotype",
      "uniprot_variants",
      "uniprot_literature",
      "orphanet",
      "clingen",
      "reactome",
      "europepmc",
    ],
  },
  colorectalCancer: {
    id: "MONDO_0005575",
    name: "colorectal cancer",
    dataSources: ["clinical_precedence", "eva", "uniprot_variants", "uniprot_literature", "europepmc"],
  },
} as const satisfies Record<string, ExpectedDisease>;

/** A target whose only associations are measurements: excluding them leaves two. */
export const TARGET_WITH_FEW_ASSOCIATIONS = {
  id: "ENSG00000186092",
  symbol: "OR4F5",
  /** Associations with measurements included. */
  totalWithMeasurements: 9,
  /** Associations with measurements excluded (the default). */
  total: 2,
} as const;

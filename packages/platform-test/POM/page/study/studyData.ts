/**
 * Facts about the GWAS studies the study specs open. Only what identifies a study or what
 * its page must show by construction (disease, source, cohorts). Everything that changes
 * with a data release (counts, p-values, sample sizes) is asserted as an invariant.
 * Each id is listed in fixtures/expectedSections.ts. Recorded against data release 26.12.
 */
export type GwasStudyFacts = {
  id: string;
  /** The "Reported trait" shown in the header. */
  traitFromSource: string;
  diseases: { id: string; name: string }[];
  /** Label and href of the "Source" link in the page header. */
  source: { label: string; href: string };
};

export const MYOCARDIAL_INFARCTION = { id: "MONDO_0005068", name: "myocardial infarction" };

export const GWAS_STUDIES = {
  /** The primary GWAS study: MVP, harmonised summary statistics with QC values, 76 credible sets. */
  primary: {
    id: "GCST90475211",
    traitFromSource: "Heart attack",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90475211" },
  },
  /** No harmonised summary statistics, no credible sets, three LD populations. */
  noSumstatsNoCredibleSets: {
    id: "GCST90667795",
    traitFromSource: "ICD10 I21: Acute myocardial infarction",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90667795" },
  },
  /** FinnGen: no publication, summary statistics without QC values. */
  finngen: {
    id: "FINNGEN_R12_I9_MI_STRICT",
    traitFromSource: "Myocardial infarction, strict",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "FinnGen", href: "https://r12.finngen.fi/pheno/I9_MI_STRICT" },
  },
  /** nCases and nControls are 0: the app hides both fields. */
  noCases: {
    id: "GCST90668060",
    traitFromSource: "Myocardial infraction (ADO phenotyping)",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90668060" },
  },
  /** Four LD populations. */
  multiAncestry: {
    id: "GCST90480130",
    traitFromSource: "Myocardial infarction (PheCode 411.2)",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90480130" },
  },
  /** Has the analysis flag wgsGWAS. */
  withAnalysisFlag: {
    id: "GCST90473536",
    traitFromSource: "ICD10 I21: Acute myocardial infarction",
    diseases: [MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90473536" },
  },
  /** Linked to two diseases. */
  twoDiseases: {
    id: "GCST90479550",
    traitFromSource: "Takes medication for heart attack?",
    diseases: [{ id: "EFO_0007010", name: "drug use measurement" }, MYOCARDIAL_INFARCTION],
    source: { label: "GWAS Catalog", href: "https://www.ebi.ac.uk/gwas/studies/GCST90479550" },
  },
} satisfies Record<string, GwasStudyFacts>;

/** Display labels of the harmonised summary statistics QC values (packages/ui SummaryStatsTable). */
export const SUMSTAT_LABELS = [
  "Total variants",
  "Significant variants",
  "Mean beta",
  "GC lambda",
  "Mean diff P-Z",
  "SD diff P-Z",
  "SNP heritability",
  "SNP heritability SE",
  "LDSC intercept",
  "LDSC intercept SE",
  "Mean chi-squared",
  "GC lambda (LDSC)",
] as const;

/** A study id that no study has. */
export const UNKNOWN_STUDY_ID = "GCST00000000000";

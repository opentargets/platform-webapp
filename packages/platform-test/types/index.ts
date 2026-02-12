/**
 * Test configuration interface
 * Defines the structure of test data used across E2E tests
 */

export interface TestConfig {
  drug: {
    /** Drug with comprehensive data across all sections */
    primary: string;
    alternatives?: {
      withWarnings: string;
      withAdverseEvents: string;
    };
  };
  variant: {
    /** Variant with GWAS and general data */
    primary: string;
    /** Variant with molecular structure data */
    withMolecularStructure: string;
    /** Variant with pharmacogenomics data */
    withPharmacogenomics: string;
    /** Variant with QTL data */
    withQTL?: string;
    /** Variant with EVA/ClinVar data */
    withEVA?: string;
  };
  target?: {
    primary?: string;
    alternatives?: string[];
    aotfDiseases?: string[];
  };
  disease: {
    primary: string;
    name?: string;
    alternatives?: string[];
    aotfGenes?: string[];
  };
  study: {
    gwas: {
      primary: string;
      alternatives?: string[];
    };
    qtl?: {
      primary?: string;
      alternatives?: string[];
    };
  };
  credibleSet?: {
    primary?: string;
    withGWASColoc?: string;
    withQTLColoc?: string;
  };
} /**
 * CSV row as array of strings (using indices instead of header names for resilience)
 */
export type CSVRow = string[];

/**
 * Column indices for the Google Sheet CSV
 * Using indices instead of header names makes parsing resilient to column name changes
 * Update these indices if column order changes in the sheet
 */
export const CSV_COLUMNS = {
  TESTING_SCENARIO: 0,
  DRUG_PAGE_PRIMARY: 1,
  VARIANT_PRIMARY: 2,
  VARIANT_WITH_PHARMACOGENETICS: 3,
  VARIANT_WITH_QTL: 4,
  TARGET_PRIMARY: 5,
  TARGET_INCOMPLETE: 6,
  TARGET_AOTF_DISEASES: 7,
  DISEASE_PRIMARY: 8,
  DISEASE_NAME: 9,
  DISEASE_ALTERNATIVES: 10,
  DISEASE_AOTF_GENES: 11,
  STUDY_GWAS: 12,
  STUDY_QTL: 13,
  CREDIBLE_SET: 14,
  CREDIBLE_SET_GWAS_COLOC: 15,
  CREDIBLE_SET_QTL_COLOC: 16,
} as const;

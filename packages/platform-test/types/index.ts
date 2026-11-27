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
    /** Target with pharmacogenetics data */
    withPharmacogenomics?: string;
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
 * CSV row structure from Google Sheet
 */

export interface CSVRow {
  "Testing Scenario": string;
  drug_page_primary: string;
  variant_primary: string;
  variant_with_pharmacogenetics: string;
  variant_with_qtl: string;
  target_primary: string;
  target_incomplete: string;
  target_aotf_diseases: string;
  disease_primary: string;
  disease_name: string;
  disease_alternatives: string;
  disease_aotf_genes: string;
  study_gwas: string;
  study_qtl: string;
  credible_set: string;
  credible_set_GWAS_coloc: string;
  credible_set_QTL_coloc: string;
}

import type { CSVRow, TestConfig } from "../types";
import { parseCsvStringToArray } from "../utils/parseCsvStringToArray";

/**
 * Convert a CSV row to TestConfig structure
 */

export function csvRowToTestConfig(row: CSVRow): TestConfig {
  return {
    drug: {
      primary: row.drug_page_primary,
      alternatives: {
        withWarnings: row.drug_page_primary,
        withAdverseEvents: row.drug_page_primary,
      },
    },
    variant: {
      primary: row.variant_primary,
      withMolecularStructure: row.variant_primary,
      withPharmacogenomics: row.variant_with_pharmacogenetics,
      withQTL: row.variant_with_qtl || undefined,
      withEVA: row.variant_primary || undefined,
    },
    target: {
      primary: row.target_primary || undefined,
      alternatives: parseCsvStringToArray(row.target_incomplete),
      aotfDiseases: parseCsvStringToArray(row.target_aotf_diseases),
    },
    disease: {
      primary: row.disease_primary,
      name: row.disease_name || undefined,
      alternatives: parseCsvStringToArray(row.disease_alternatives),
      aotfGenes: parseCsvStringToArray(row.disease_aotf_genes),
    },
    study: {
      gwas: {
        primary: row.study_gwas,
        alternatives: [],
      },
      qtl: row.study_qtl
        ? {
            primary: row.study_qtl,
            alternatives: [],
          }
        : undefined,
    },
    credibleSet: {
      primary: row.credible_set || undefined,
      withGWASColoc: row.credible_set_GWAS_coloc || undefined,
      withQTLColoc: row.credible_set_QTL_coloc || undefined,
    },
  };
}

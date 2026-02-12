import type { CSVRow, TestConfig } from "../types";
import { CSV_COLUMNS } from "../types";
import { parseCsvStringToArray } from "../utils/parseCsvStringToArray";

/**
 * Convert a CSV row (array of strings) to TestConfig structure
 * Uses column indices for resilience against header name changes
 */
export function csvRowToTestConfig(row: CSVRow): TestConfig {
  const col = CSV_COLUMNS;

  return {
    drug: {
      primary: row[col.DRUG_PAGE_PRIMARY] || "",
      alternatives: {
        withWarnings: row[col.DRUG_PAGE_PRIMARY] || "",
        withAdverseEvents: row[col.DRUG_PAGE_PRIMARY] || "",
      },
    },
    variant: {
      primary: row[col.VARIANT_PRIMARY] || "",
      withMolecularStructure: row[col.VARIANT_PRIMARY] || "",
      withPharmacogenomics: row[col.VARIANT_WITH_PHARMACOGENETICS] || "",
      withQTL: row[col.VARIANT_WITH_QTL] || undefined,
      withEVA: row[col.VARIANT_PRIMARY] || undefined,
    },
    target: {
      primary: row[col.TARGET_PRIMARY] || undefined,
      alternatives: parseCsvStringToArray(row[col.TARGET_INCOMPLETE] || ""),
      aotfDiseases: parseCsvStringToArray(row[col.TARGET_AOTF_DISEASES] || ""),
    },
    disease: {
      primary: row[col.DISEASE_PRIMARY] || "",
      name: row[col.DISEASE_NAME] || undefined,
      alternatives: parseCsvStringToArray(row[col.DISEASE_ALTERNATIVES] || ""),
      aotfGenes: parseCsvStringToArray(row[col.DISEASE_AOTF_GENES] || ""),
    },
    study: {
      gwas: {
        primary: row[col.STUDY_GWAS] || "",
        alternatives: [],
      },
      qtl: row[col.STUDY_QTL]
        ? {
            primary: row[col.STUDY_QTL],
            alternatives: [],
          }
        : undefined,
    },
    credibleSet: {
      primary: row[col.CREDIBLE_SET] || undefined,
      withGWASColoc: row[col.CREDIBLE_SET_GWAS_COLOC] || undefined,
      withQTLColoc: row[col.CREDIBLE_SET_QTL_COLOC] || undefined,
    },
  };
}

import type { TestConfig } from "../types";

/**
 * Merge fetched config with default config, filling in empty values from default
 */
export function mergeWithDefaults(fetched: TestConfig, defaults: TestConfig): TestConfig {
  return {
    drug: {
      primary: fetched.drug.primary || defaults.drug.primary,
      alternatives: {
        withWarnings:
          fetched.drug.alternatives?.withWarnings || defaults.drug.alternatives?.withWarnings || "",
        withAdverseEvents:
          fetched.drug.alternatives?.withAdverseEvents ||
          defaults.drug.alternatives?.withAdverseEvents ||
          "",
      },
    },
    variant: {
      primary: fetched.variant.primary || defaults.variant.primary,
      withMolecularStructure:
        fetched.variant.withMolecularStructure || defaults.variant.withMolecularStructure,
      withPharmacogenomics:
        fetched.variant.withPharmacogenomics || defaults.variant.withPharmacogenomics,
      withQTL: fetched.variant.withQTL || defaults.variant.withQTL,
      withEVA: fetched.variant.withEVA || defaults.variant.withEVA,
    },
    target: {
      primary: fetched.target?.primary || defaults.target?.primary,
      alternatives: fetched.target?.alternatives?.length
        ? fetched.target.alternatives
        : defaults.target?.alternatives,
      aotfDiseases: fetched.target?.aotfDiseases?.length
        ? fetched.target.aotfDiseases
        : defaults.target?.aotfDiseases,
    },
    disease: {
      primary: fetched.disease.primary || defaults.disease.primary,
      name: fetched.disease.name || defaults.disease.name,
      alternatives: fetched.disease.alternatives?.length
        ? fetched.disease.alternatives
        : defaults.disease.alternatives,
      aotfGenes: fetched.disease.aotfGenes?.length
        ? fetched.disease.aotfGenes
        : defaults.disease.aotfGenes,
    },
    study: {
      gwas: {
        primary: fetched.study.gwas.primary || defaults.study.gwas.primary,
        alternatives: fetched.study.gwas.alternatives?.length
          ? fetched.study.gwas.alternatives
          : defaults.study.gwas.alternatives,
      },
      qtl:
        fetched.study.qtl?.primary || defaults.study.qtl
          ? {
              primary: fetched.study.qtl?.primary || defaults.study.qtl?.primary,
              alternatives: fetched.study.qtl?.alternatives?.length
                ? fetched.study.qtl.alternatives
                : defaults.study.qtl?.alternatives,
            }
          : undefined,
    },
    credibleSet: {
      primary: fetched.credibleSet?.primary || defaults.credibleSet?.primary,
      withGWASColoc: fetched.credibleSet?.withGWASColoc || defaults.credibleSet?.withGWASColoc,
      withQTLColoc: fetched.credibleSet?.withQTLColoc || defaults.credibleSet?.withQTLColoc,
    },
  };
}

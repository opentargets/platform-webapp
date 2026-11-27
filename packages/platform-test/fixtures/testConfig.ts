import type { TestConfig } from "../types";
import { fetchConfigFromSheet } from "../utils/fetchConfigFromSheet";
import { mergeWithDefaults } from "../utils/mergeWithDefaults";

/**
 * Default test configuration. Mirrors the `testing_scenario_1` row of the
 * test config sheet, so a run is reproducible from the code alone.
 */
function getDefaultConfig(): TestConfig {
  return {
    drug: {
      primary: "CHEMBL1201585", // TRASTUZUMAB - has comprehensive data
      alternatives: {
        withWarnings: "CHEMBL3353410",
        withAdverseEvents: "CHEMBL3353410",
      },
    },
    variant: {
      primary: "1_154453788_C_T", // Intron variant overlapping with IL6R.
      withMolecularStructure: "19_44908822_C_T", // Missense variant overlapping with APOE, causing amino-acid change: R176C with moderate impact.
      withPharmacogenomics: "7_95308134_T_C", // PON1 variant
      withQTL: "1_154453788_C_T",
      withEVA: "19_44908822_C_T",
    },
    target: {
      primary: "ENSG00000157764", // BRAF
      alternatives: ["ENSG00000139618"], // BRCA2
      withPharmacogenomics: "ENSG00000100197", // CYP2D6
    },
    disease: {
      primary: "MONDO_0005068", // Myocardial infarction
      name: "myocardial infarction",
      alternatives: ["EFO_0000305", "MONDO_0007254"], // Breast carcinoma, Alzheimer disease
      aotfGenes: ["IL6", "ADRB1", "APOE"], // Genes with evidence for testing AOTF table
    },
    study: {
      gwas: {
        primary: "GCST90475211", // Example credible set study
        alternatives: [],
      },
      qtl: {
        primary: "UKB_PPP_EUR_LPA_P08519_OID30747_v1", // eQTL study
        alternatives: [],
      },
    },
    credibleSet: {
      primary: "1aac7a781b1395adad7daa04e5d13970",
      withGWASColoc: "8990f5e6515a5e24a3534da8ab339a92",
      withQTLColoc: "1aac7a781b1395adad7daa04e5d13970",
    },
  };
}

/**
 * Cached sheet configuration, fetched once per worker
 */
let cachedConfig: TestConfig | null = null;

const DEFAULT_SCENARIO = "testing_scenario_1";

/**
 * Get test configuration.
 * Uses the committed defaults unless TEST_CONFIG_URL points to a test config
 * sheet (CSV export), in which case the TEST_SCENARIO row is merged on top.
 * @returns Test configuration object
 */
export async function getTestConfig(): Promise<TestConfig> {
  const configUrl = process.env.TEST_CONFIG_URL;
  const defaults = getDefaultConfig();

  if (!configUrl) return defaults;
  if (cachedConfig) return cachedConfig;

  const scenarioName = process.env.TEST_SCENARIO || DEFAULT_SCENARIO;
  console.log(`Fetching test config from: ${configUrl}`);
  console.log(`Using scenario: ${scenarioName}`);
  const fetchedConfig = await fetchConfigFromSheet(configUrl, scenarioName);
  if (!fetchedConfig) {
    throw new Error(`Scenario "${scenarioName}" could not be loaded from ${configUrl}`);
  }
  // Merge fetched config with defaults to fill any empty cells
  cachedConfig = mergeWithDefaults(fetchedConfig, defaults);
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetTestConfig(): void {
  cachedConfig = null;
}

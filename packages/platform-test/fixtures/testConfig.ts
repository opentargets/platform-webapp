import type { TestConfig } from "../types";
import { fetchConfigFromSheet } from "../utils/fetchConfigFromSheet";
import { mergeWithDefaults } from "../utils/mergeWithDefaults";

/**
 * Default test configuration (fallback)
 */
function getDefaultConfig(): TestConfig {
  return {
    drug: {
      primary: "CHEMBL3353410", // TRASTUZUMAB - has comprehensive data
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
    },
    disease: {
      primary: "EFO_0000612", // Myocardial infarction
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
      withQTLColoc: "5f4e2f4f4e2f4e2f4e2f4e2f4e2f4e2f",
    },
  };
}

/**
 * Cached test configuration
 */
let cachedConfig: TestConfig | null = null;

/**
 * Default configuration constants
 */
const DEFAULT_CONFIG_URL =
  "https://docs.google.com/spreadsheets/d/1oWYlb_o0AZBYOFUCd8k5-whZpKLpicZ-UyyNkLUbUk8/export?format=csv";
const DEFAULT_SCENARIO = "testing_scenario_1";

/**
 * Get test configuration (always fetches fresh)
 * Reads from environment variables TEST_CONFIG_URL and TEST_SCENARIO if available,
 * otherwise uses hardcoded defaults.
 * @returns Test configuration object
 */
export async function getTestConfig(): Promise<TestConfig> {
  // Always reset to fetch fresh config for every run
  cachedConfig = null;

  const configUrl = process.env.TEST_CONFIG_URL || DEFAULT_CONFIG_URL;
  const scenarioName = process.env.TEST_SCENARIO || DEFAULT_SCENARIO;
  const defaults = getDefaultConfig();

  if (configUrl) {
    console.log(`Fetching test config from: ${configUrl}`);
    console.log(`Using scenario: ${scenarioName}`);
    const fetchedConfig = await fetchConfigFromSheet(configUrl, scenarioName);
    if (fetchedConfig) {
      // Merge fetched config with defaults to fill any empty cells
      cachedConfig = mergeWithDefaults(fetchedConfig, defaults);
      return cachedConfig;
    }
    console.log("Falling back to default configuration");
  }

  cachedConfig = defaults;
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetTestConfig(): void {
  cachedConfig = null;
}

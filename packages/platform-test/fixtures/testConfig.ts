import type { TestConfig } from "../types";
import { fetchConfigFromSheet } from "../utils/fetchConfigFromSheet";
import { mergeWithDefaults } from "../utils/mergeWithDefaults";

/**
 * Test data checked in with the tests.
 *
 * These IDs are the default for every run, so a run is reproducible from the commit
 * alone. `fixtures/expectedSections.ts` records what each of them must render.
 */
export function getDefaultConfig(): TestConfig {
  return {
    drug: {
      primary: "CHEMBL1201585", // TRASTUZUMAB
      alternatives: {
        withWarnings: "CHEMBL1201585",
        withAdverseEvents: "CHEMBL1201585",
        smallMolecule: "CHEMBL1464", // WARFARIN
        withParentMolecule: "CHEMBL1200879", // WARFARIN SODIUM
        withManyWarnings: "CHEMBL122", // ROFECOXIB
        withMultipleMechanisms: "CHEMBL941", // IMATINIB
        withNonHumanTarget: "CHEMBL1082", // AMOXICILLIN
        sparse: "CHEMBL5314605", // ZANZALINTINIB FUMARATE
      },
    },
    variant: {
      primary: "1_154453788_C_T", // Intron variant overlapping with IL6R
      withMolecularStructure: "19_44908822_C_T", // APOE missense variant (R176C)
      withPharmacogenomics: "7_95308134_T_C", // PON1 variant
      withQTL: "1_154453788_C_T",
      withEVA: "19_44908822_C_T",
    },
    target: {
      primary: "ENSG00000157764", // BRAF
      alternatives: ["ENSG00000139618"], // BRCA2
      withSafetyLiabilities: "ENSG00000169252", // ADRB2: 26 safety liabilities of every kind
      withChemicalProbes: "ENSG00000141867", // BRD4: 13 chemical probes (controls, low quality)
      withSpecificExpression: "ENSG00000163631", // ALB: high expression specificity (liver)
      withoutDrugsSafetyOrProbes: "ENSG00000163631", // ALB: no drugs, safety or chemical probes
      withPharmacogenomics: "ENSG00000165841", // CYP2C19: 367 pharmacogenetics rows, no cancer hallmarks
      withManyCancerHallmarks: "ENSG00000146648", // EGFR: more than one page of cancer hallmarks
      nonCoding: "ENSG00000251562", // MALAT1: lncRNA, no protein, description, hallmarks, mouse phenotypes or homologues
      withoutLiteratureOrQtl: "ENSG00000243485", // MIR1302-2HG: no bibliography, no credible sets, no synonyms
      coreEssential: "ENSG00000166851", // PLK1: DepMap core essential gene
      withFewPublications: "ENSG00000171014", // OR4D5: two pages of literature, earliest publication year known
      withDirectTargetPharmacogenomics: "ENSG00000146648", // EGFR: pharmacogenetics rows where the gene is the direct drug target
      aotfDiseases: ["myocardial infarction", "cancer"],
    },
    disease: {
      primary: "MONDO_0005068", // myocardial infarction
      name: "myocardial infarction",
      alternatives: ["MONDO_0007254"], // breast cancer
      aotfGenes: ["IL6", "ADRB1", "APOE"],
    },
    evidence: {
      primary: { ensgId: "ENSG00000157764", efoId: "MONDO_0005105" }, // BRAF, melanoma
      withGeneticEvidence: { ensgId: "ENSG00000160712", efoId: "MONDO_0005068" }, // IL6R, myocardial infarction
      withoutEvidence: { ensgId: "ENSG00000243485", efoId: "MONDO_0005105" }, // MIR1302-2HG, melanoma
    },
    study: {
      gwas: {
        primary: "GCST90475211",
        alternatives: [],
      },
      qtl: {
        primary: "UKB_PPP_EUR_LPA_P08519_OID30747_v1",
        // eQTL (GTEx v10, tibial nerve, PCSK9): one credible set, a condition and a PubMed id
        alternatives: ["qts000015_qtd000286_gtex_v10_ge_nerve_tibial_ensg00000169174"],
      },
    },
    credibleSet: {
      // GWAS credible set of GCST90475211 with L2G, GWAS coloc, molQTL coloc and E2G data
      primary: "a3ea67115f6db323b2eae6c1bf6cda7e",
      withGWASColoc: "a3ea67115f6db323b2eae6c1bf6cda7e",
      withQTLColoc: "a3ea67115f6db323b2eae6c1bf6cda7e",
      // pQTL credible set of UKB_PPP_EUR_LPA_P08519_OID30747_v1 (no L2G, no molQTL coloc)
      qtl: "5848564f6c070538c3bfe980357d4785",
    },
  };
}

const DEFAULT_SCENARIO = "testing_scenario_1";
const FETCH_ATTEMPTS = 3;

/** Name of the environment variable global setup uses to hand the config to workers. */
export const RESOLVED_CONFIG_ENV = "OT_E2E_RESOLVED_TEST_CONFIG";

/**
 * Resolve the test data for this run. Called once, from global setup.
 *
 * With `TEST_CONFIG_URL` set, the scenario named by `TEST_SCENARIO` is read from that
 * sheet and empty cells are filled from the defaults. A sheet that was asked for and
 * cannot be read fails the run: running different data than requested would make the
 * results meaningless.
 */
export async function resolveTestConfig(): Promise<TestConfig> {
  const defaults = getDefaultConfig();
  const configUrl = process.env.TEST_CONFIG_URL;
  if (!configUrl) return defaults;

  const scenarioName = process.env.TEST_SCENARIO || DEFAULT_SCENARIO;
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const fetched = await fetchConfigFromSheet(configUrl, scenarioName);
      return mergeWithDefaults(fetched, defaults);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error(
    `Could not read test scenario "${scenarioName}" from TEST_CONFIG_URL after ${FETCH_ATTEMPTS} attempts: ${String(lastError)}`
  );
}

/** The config resolved by global setup, as seen from a worker. */
export function getTestConfig(): TestConfig {
  const serialized = process.env[RESOLVED_CONFIG_ENV];
  if (!serialized) {
    throw new Error(
      `${RESOLVED_CONFIG_ENV} is not set: global setup did not run. Run the tests through playwright.config.ts.`
    );
  }
  return JSON.parse(serialized) as TestConfig;
}

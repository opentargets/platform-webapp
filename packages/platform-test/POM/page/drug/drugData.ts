import { getDefaultConfig } from "../../../fixtures/testConfig";
import type { TestConfig } from "../../../types";

/**
 * What identifies each drug the drug-page tests open. Only facts that belong to the
 * entity itself (its name, type, identifiers, relatives) are recorded here; anything
 * that moves with a data release is asserted as an invariant in the specs instead.
 * Recorded against data release 26.12.
 */
export type DrugFacts = {
  name: string;
  moleculeType: string;
  /** Label of `maximumClinicalStage`, as the header shows it */
  maxStage: string;
  /** External links the header shows besides ChEMBL: label -> id */
  crossReferences: Record<string, string>;
  parent?: { id: string; name: string };
  children?: { id: string; name: string }[];
  /** ChEMBL serves a structure image for small molecules, not for biologics */
  hasStructure: boolean;
};

const DRUG_FACTS: Record<string, DrugFacts> = {
  CHEMBL1201585: {
    name: "TRASTUZUMAB",
    moleculeType: "Antibody",
    maxStage: "Approval",
    crossReferences: {},
    hasStructure: false,
  },
  CHEMBL1464: {
    name: "WARFARIN",
    moleculeType: "Small molecule",
    maxStage: "Approval",
    crossReferences: { DrugBank: "DB00682" },
    children: [
      { id: "CHEMBL1200772", name: "WARFARIN POTASSIUM" },
      { id: "CHEMBL1200879", name: "WARFARIN SODIUM" },
    ],
    hasStructure: true,
  },
  CHEMBL1200879: {
    name: "WARFARIN SODIUM",
    moleculeType: "Small molecule",
    maxStage: "Approval",
    crossReferences: {},
    parent: { id: "CHEMBL1464", name: "WARFARIN" },
    hasStructure: true,
  },
  CHEMBL122: {
    name: "ROFECOXIB",
    moleculeType: "Small molecule",
    maxStage: "Approval",
    crossReferences: { DrugBank: "DB00533" },
    hasStructure: true,
  },
  CHEMBL941: {
    name: "IMATINIB",
    moleculeType: "Small molecule",
    maxStage: "Approval",
    crossReferences: { DrugBank: "DB00619", "Probes & Drugs": "PD001319" },
    children: [{ id: "CHEMBL1642", name: "IMATINIB MESYLATE" }],
    hasStructure: true,
  },
  CHEMBL1082: {
    name: "AMOXICILLIN",
    moleculeType: "Small molecule",
    maxStage: "Approval",
    crossReferences: { DrugBank: "DB01060" },
    hasStructure: true,
  },
  CHEMBL5314605: {
    name: "ZANZALINTINIB FUMARATE",
    moleculeType: "Small molecule",
    maxStage: "Unknown",
    crossReferences: {},
    parent: { id: "CHEMBL5314428", name: "ZANZALINTINIB" },
    hasStructure: true,
  },
};

/** The recorded facts of a drug. Throws for a drug nothing was recorded for. */
export function drugFacts(chemblId: string): DrugFacts {
  const facts = DRUG_FACTS[chemblId];
  if (!facts) {
    throw new Error(
      `POM/page/drug/drugData.ts has no entry for "${chemblId}". Record the drug's name, type and identifiers before testing it.`
    );
  }
  return facts;
}

export type DrugIds = {
  /** Antibody with every section */
  primary: string;
  smallMolecule: string;
  withParentMolecule: string;
  withManyWarnings: string;
  withMultipleMechanisms: string;
  withNonHumanTarget: string;
  sparse: string;
};

/**
 * The drugs under test. Roles a config sheet does not carry fall back to the IDs
 * checked in with the tests, so a run never silently loses a scenario.
 */
export function drugIds(testConfig: TestConfig): DrugIds {
  const fallback = getDefaultConfig().drug.alternatives;
  const configured = testConfig.drug.alternatives;
  const pick = (role: Exclude<keyof DrugIds, "primary">): string => {
    const id = configured?.[role] || fallback?.[role];
    if (!id) throw new Error(`fixtures/testConfig.ts has no drug for the "${role}" scenario`);
    return id;
  };
  return {
    primary: testConfig.drug.primary,
    smallMolecule: pick("smallMolecule"),
    withParentMolecule: pick("withParentMolecule"),
    withManyWarnings: pick("withManyWarnings"),
    withMultipleMechanisms: pick("withMultipleMechanisms"),
    withNonHumanTarget: pick("withNonHumanTarget"),
    sparse: pick("sparse"),
  };
}

/** Labels of the clinical stages, in the order the app ranks them. */
export const CLINICAL_STAGE_LABELS = [
  "Unknown",
  "Preclinical",
  "IND",
  "Early phase I",
  "Phase I",
  "Phase I/II",
  "Phase II",
  "Phase II/III",
  "Phase III",
  "Preapproval",
  "Approval",
  "Phase IV",
  "Withdrawal",
] as const;

/** The test-id suffix the stage filter gives each stage, in the same order. */
export const CLINICAL_STAGE_KEYS = [
  "unknown",
  "preclinical",
  "ind",
  "early-phase-1",
  "phase-1",
  "phase-1-2",
  "phase-2",
  "phase-2-3",
  "phase-3",
  "preapproval",
  "approval",
  "phase-4",
  "withdrawal",
] as const;

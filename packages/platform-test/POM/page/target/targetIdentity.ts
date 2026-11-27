import type { TestConfig } from "../../../types";

/**
 * What identifies each target the shell tests open. Only facts that name the entity are
 * kept here (symbol, approved name, reviewed UniProt accessions, chromosome); everything
 * else on the page is asserted as an invariant. Recorded against data release 26.12.
 */
export type TargetIdentity = {
  symbol: string;
  name: string;
  /** Reviewed (Swiss-Prot) accessions: the only ones the header links to. */
  uniprotIds: readonly string[];
  chromosome: string;
  /** RNAcentral ids of a non-coding target: the header links the first one. */
  rnacentralIds?: readonly string[];
};

const TARGET_IDENTITIES: Record<string, TargetIdentity> = {
  ENSG00000157764: {
    symbol: "BRAF",
    name: "B-Raf proto-oncogene, serine/threonine kinase",
    uniprotIds: ["P15056"],
    chromosome: "7",
  },
  ENSG00000139618: {
    symbol: "BRCA2",
    name: "BRCA2 DNA repair associated",
    uniprotIds: ["P51587"],
    chromosome: "13",
  },
  ENSG00000165841: {
    symbol: "CYP2C19",
    name: "cytochrome P450 family 2 subfamily C member 19",
    uniprotIds: ["P33261"],
    chromosome: "10",
  },
  ENSG00000146648: {
    symbol: "EGFR",
    name: "epidermal growth factor receptor",
    uniprotIds: ["P00533"],
    chromosome: "7",
  },
  ENSG00000166851: {
    symbol: "PLK1",
    name: "polo like kinase 1",
    uniprotIds: ["P53350"],
    chromosome: "16",
  },
  ENSG00000171014: {
    symbol: "OR4D5",
    name: "olfactory receptor family 4 subfamily D member 5",
    uniprotIds: ["Q8NGN0"],
    chromosome: "11",
  },
  ENSG00000251562: {
    symbol: "MALAT1",
    name: "metastasis associated lung adenocarcinoma transcript 1",
    uniprotIds: [],
    rnacentralIds: ["URS0002A146E4_9606"],
    chromosome: "11",
  },
  ENSG00000243485: {
    symbol: "MIR1302-2HG",
    name: "MIR1302-2 host gene",
    uniprotIds: [],
    chromosome: "1",
  },
};

/** The identity of a target. Throws for a target the tests have not been told about. */
export function targetIdentity(ensgId: string): TargetIdentity {
  const identity = TARGET_IDENTITIES[ensgId];
  if (!identity) {
    throw new Error(
      `POM/page/target/targetIdentity.ts has no entry for "${ensgId}". Record its symbol, approved name, reviewed UniProt accessions and chromosome before testing it.`
    );
  }
  return identity;
}

type TargetConfig = NonNullable<TestConfig["target"]>;
type TargetKey = {
  [Key in keyof TargetConfig]-?: NonNullable<TargetConfig[Key]> extends string ? Key : never;
}[keyof TargetConfig];

/**
 * The id of one of the test targets in fixtures/testConfig.ts. Throws when the resolved
 * config does not define it, so a test never silently runs against the wrong entity.
 */
export function requireTarget(testConfig: TestConfig, key: TargetKey): string {
  const id = testConfig.target?.[key];
  if (!id) {
    throw new Error(
      `testConfig.target.${key} is not set. The target tests need it: add it to fixtures/testConfig.ts (and keep it when merging a sheet scenario).`
    );
  }
  return id;
}

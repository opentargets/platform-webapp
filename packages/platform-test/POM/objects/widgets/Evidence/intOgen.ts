import type { Locator, Page } from "@playwright/test";
import { SomaticEvidenceSection } from "./somaticEvidenceSection";

export const INTOGEN_HEADERS = [
  "Disease/phenotype",
  "Mutated / Total samples",
  /^Combined p-value/,
  /^Cancer driver methods/,
  "Cohort Information",
] as const;
export const INTOGEN_COLUMN = {
  disease: 0,
  samples: 1,
  pValue: 2,
  methods: 3,
  cohort: 4,
} as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/IntOgen). */
export const INTOGEN_OPERATION = "IntOgenQuery";

export type IntOgenRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string;
  target: { approvedSymbol: string };
  mutatedSamples: {
    numberSamplesTested: number;
    numberMutatedSamples: number;
    functionalConsequence: { id: string; label: string };
  }[];
  resourceScore: number;
  significantDriverMethods: string[] | null;
  cohortId: string;
  cohortShortName: string | null;
  cohortDescription: string | null;
};

/** Evidence page > IntOGen (section id "intogen"). */
export class IntOgenSection extends SomaticEvidenceSection {
  static readonly id = "intogen";

  constructor(page: Page) {
    super(page, IntOgenSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.disease).getByRole("link");
  }

  sampleItems(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.samples).getByRole("listitem");
  }

  /** The driver method chips of a row. */
  methodChips(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.methods).locator("[data-testid^='chip-item-']");
  }

  cohortLink(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.cohort).getByRole("link");
  }

  /** A column header's help icon, which carries a tooltip. */
  headerHelp(name: RegExp): Locator {
    return this.table.header(name).locator("sup");
  }
}

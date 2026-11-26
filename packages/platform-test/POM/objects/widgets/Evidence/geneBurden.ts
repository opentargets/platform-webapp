import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "../shared/sectionDataControls";

/** Columns of the evidence page gene burden table, in order. */
export const EVIDENCE_GENE_BURDEN_HEADERS = [
  "Disease/phenotype",
  "Cohort/Project",
  "Ancestry",
  "Model",
  "Allelic Requirement",
  "Cases with QV",
  "Cases",
  "Sample size",
  "Odds Ratio (CI 95%)",
  "Beta (CI 95%)",
  "Direction of Effect?",
  "p-value",
  "Literature",
] as const;

export const EVIDENCE_GENE_BURDEN_COLUMN = {
  disease: 0,
  cohort: 1,
  ancestry: 2,
  model: 3,
  allelicRequirement: 4,
  casesWithQv: 5,
  cases: 6,
  sampleSize: 7,
  oddsRatio: 8,
  beta: 9,
  direction: 10,
  pValue: 11,
  literature: 12,
} as const;

export type EvidenceGeneBurdenColumn = keyof typeof EVIDENCE_GENE_BURDEN_COLUMN;

/** GraphQL operation behind the section (packages/sections/src/evidence/GeneBurden). */
export const EVIDENCE_GENE_BURDEN_OPERATION = "GeneBurdenQuery";
export const EVIDENCE_GENE_BURDEN_PAGE_SIZE = 10;

export type EvidenceGeneBurdenRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  target: { id: string; approvedSymbol: string };
  urls: { url: string }[] | null;
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  allelicRequirements: string[] | null;
  ancestry: string | null;
  ancestryId: string | null;
  cohortId: string | null;
  projectId: string | null;
  statisticalMethod: string | null;
  statisticalMethodOverview: string | null;
  studyCases: number | null;
  studyCasesWithQualifyingVariants: number | null;
  studySampleSize: number | null;
  oddsRatio: number | null;
  oddsRatioConfidenceIntervalLower: number | null;
  oddsRatioConfidenceIntervalUpper: number | null;
  beta: number | null;
  betaConfidenceIntervalLower: number | null;
  betaConfidenceIntervalUpper: number | null;
  pValueMantissa: number;
  pValueExponent: number;
  literature: string[] | null;
};
export type EvidenceGeneBurdenData = {
  disease: { id: string; geneBurdenSummary: { count: number; rows: EvidenceGeneBurdenRow[] } };
};

/**
 * Evidence page > Gene Burden (section id "gene-burden"): a server-paginated table of gene
 * burden test results for the target and the disease. No search box, no sorting.
 */
export class EvidenceGeneBurdenSection {
  static readonly id = "gene-burden";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, EvidenceGeneBurdenSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-gene-burden-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  cell(row: number, column: EvidenceGeneBurdenColumn): Locator {
    return this.table.cell(row, EVIDENCE_GENE_BURDEN_COLUMN[column]);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, "disease").getByRole("link");
  }

  cohortLink(row: number): Locator {
    return this.cell(row, "cohort").getByRole("link");
  }

  ancestryLink(row: number): Locator {
    return this.cell(row, "ancestry").getByRole("link");
  }

  /** The "?" help icon of a cell that carries a tooltip. */
  helpIcon(row: number, column: EvidenceGeneBurdenColumn): Locator {
    return this.cell(row, column).locator("sup");
  }

  directionIcons(row: number): Locator {
    return this.cell(row, "direction").locator("svg");
  }

  literatureTrigger(row: number): Locator {
    return this.cell(row, "literature").getByTestId("publications-drawer-trigger");
  }
}

import { expect, type Locator, type Page } from "@playwright/test";
import { GeneticEvidenceSection } from "./geneticEvidenceSection";

/** Columns of the Orphanet table, in order. "Direction of Effect" carries a help icon. */
export const ORPHANET_HEADERS = [
  "Disease/phenotype",
  "Reported protein",
  "Functional consequence",
  "Direction of Effect?",
  "Allele origin",
  "Confidence",
  "Literature",
] as const;
export const ORPHANET_COLUMN = {
  disease: 0,
  protein: 1,
  consequence: 2,
  direction: 3,
  alleleOrigin: 4,
  confidence: 5,
  literature: 6,
} as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/Orphanet). */
export const ORPHANET_OPERATION = "OrphanetQuery";
export const ORPHANET_LIST = "orphanetSummary";

export type OrphanetRow = {
  target: { id: string; approvedSymbol: string };
  disease: { id: string; name: string };
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  diseaseFromSource: string | null;
  diseaseFromSourceId: string | null;
  diseaseFromSourceMappedId: string | null;
  targetFromSource: string | null;
  targetFromSourceId: string | null;
  alleleOrigins: string[];
  confidence: string | null;
  literature: string[] | null;
  variantFunctionalConsequence: { id: string; label: string } | null;
};

/** Evidence page > Orphanet (section id "orphanet"). */
export class OrphanetSection extends GeneticEvidenceSection {
  static readonly id = "orphanet";

  constructor(page: Page) {
    super(page, OrphanetSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, ORPHANET_COLUMN.disease).getByRole("link");
  }

  proteinLink(row: number): Locator {
    return this.cell(row, ORPHANET_COLUMN.protein).getByRole("link");
  }

  consequenceLink(row: number): Locator {
    return this.cell(row, ORPHANET_COLUMN.consequence).getByRole("link");
  }

  directionIcons(row: number): Locator {
    return this.cell(row, ORPHANET_COLUMN.direction).locator("svg");
  }

  async openDirection(row: number): Promise<Locator> {
    await this.page.mouse.move(0, 0);
    await expect(this.tooltip, "an earlier tooltip should close").toHaveCount(0);
    await this.directionIcons(row).first().hover();
    await expect(this.tooltip).toBeVisible();
    return this.tooltip;
  }

  get directionHeaderHelp(): Locator {
    return this.table.headers.nth(ORPHANET_COLUMN.direction).locator("sup");
  }
}

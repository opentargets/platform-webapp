import type { Locator, Page } from "@playwright/test";
import { VariantCredibleSetsTable } from "./variantCredibleSetsTable";

export const GWAS_HEADERS = [
  "Credible set",
  "Lead variant",
  "Reported trait",
  "Disease/phenotype",
  "Study",
  "P-value",
  "Beta?",
  "Posterior probability?",
  "Fine-mapping method",
  "Fine-mapping confidence?",
  "Top L2G?",
  "L2G score?",
  "Credible set size",
] as const;

/** Variant page: GWAS Credible Sets section (credible sets of GWAS studies). */
export class GWASCredibleSetsSection extends VariantCredibleSetsTable {
  static readonly id = "gwas_credible_sets";

  constructor(page: Page) {
    super(page, GWASCredibleSetsSection.id, {
      credibleSet: 0,
      leadVariant: 1,
      trait: 2,
      disease: 3,
      study: 4,
      pValue: 5,
      beta: 6,
      posteriorProbability: 7,
      method: 8,
      confidence: 9,
      topL2G: 10,
      l2gScore: 11,
      size: 12,
    });
  }

  /** The clickable L2G score of a row (opens the popover). */
  l2gTrigger(rowIndex: number): Locator {
    return this.cell(rowIndex, "l2gScore").getByTestId("l2g-score-trigger");
  }

  /** The popover with the locus-to-gene features of the credible set. */
  get l2gPopover(): Locator {
    return this.page.getByTestId("l2g-popover");
  }
}

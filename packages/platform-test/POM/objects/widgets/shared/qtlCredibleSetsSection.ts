import type { Page } from "@playwright/test";
import { VariantCredibleSetsTable } from "./variantCredibleSetsTable";

export const QTL_HEADERS = [
  "Credible set",
  "Lead variant",
  "Study",
  "Type",
  "Affected gene",
  "Affected tissue/cell",
  "Condition",
  "P-value",
  "Beta",
  "Posterior probability",
  "Fine-mapping confidence",
  "Fine-mapping method",
  "Credible set size",
] as const;

/** Variant page: QTL Credible Sets section (credible sets of molecular QTL studies). */
export class QTLCredibleSetsSection extends VariantCredibleSetsTable {
  static readonly id = "qtl_credible_sets";

  constructor(page: Page) {
    super(page, QTLCredibleSetsSection.id, {
      credibleSet: 0,
      leadVariant: 1,
      study: 2,
      type: 3,
      gene: 4,
      tissue: 5,
      condition: 6,
      pValue: 7,
      beta: 8,
      posteriorProbability: 9,
      confidence: 10,
      method: 11,
      size: 12,
    });
  }

}

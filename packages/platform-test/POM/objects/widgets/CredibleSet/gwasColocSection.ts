import type { Locator, Page } from "@playwright/test";
import { OffsetPaginatedSection } from "./offsetPaginatedSection";

/** The "GWAS Colocalisation" section of the credible set page. */
export class GWASColocSection extends OffsetPaginatedSection {
  static readonly id = "gwas-coloc";
  static readonly operation = "GWASColocQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Credible set",
    "Study",
    "Reported trait",
    "First author",
    "Lead Variant",
    "P-Value",
    "Colocalising Variants (n)",
    "Directionality?",
    "H3?",
    "H4?",
    "CLPP?",
  ];
  static readonly column = {
    credibleSet: 0,
    study: 1,
    trait: 2,
    author: 3,
    leadVariant: 4,
    pValue: 5,
    variants: 6,
    directionality: 7,
    h3: 8,
    h4: 9,
    clpp: 10,
  } as const;

  constructor(page: Page) {
    super(page, GWASColocSection.id);
  }

  /** The "View" link of a row to the other credible set. */
  credibleSetLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.credibleSet);
  }

  studyLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.study);
  }

  leadVariantLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.leadVariant);
  }

  /** The cell of a row that shows Same / Opposite / Inconclusive. */
  directionality(rowIndex: number): Locator {
    return this.cell(rowIndex, GWASColocSection.column.directionality);
  }
}

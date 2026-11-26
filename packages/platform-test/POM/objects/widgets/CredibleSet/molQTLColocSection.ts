import type { Locator, Page } from "@playwright/test";
import { OffsetPaginatedSection } from "./offsetPaginatedSection";

/** The "MolQTL Colocalisation" section of the credible set page. */
export class MolQTLColocSection extends OffsetPaginatedSection {
  static readonly id = "molqtl-coloc";
  static readonly operation = "MolQTLColocQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Credible set",
    "Study",
    "Type",
    "Affected gene",
    "Affected tissue/cell",
    "Condition",
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
    type: 2,
    gene: 3,
    tissue: 4,
    condition: 5,
    leadVariant: 6,
    pValue: 7,
    variants: 8,
    directionality: 9,
    h3: 10,
    h4: 11,
    clpp: 12,
  } as const;
  /** The study types the query asks for: every molecular QTL type, no GWAS. */
  static readonly studyTypes = ["scsqtl", "sceqtl", "scpqtl", "sctuqtl", "sqtl", "eqtl", "pqtl", "tuqtl"];

  constructor(page: Page) {
    super(page, MolQTLColocSection.id);
  }

  credibleSetLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.credibleSet);
  }

  studyLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.study);
  }

  leadVariantLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.leadVariant);
  }

  directionality(rowIndex: number): Locator {
    return this.cell(rowIndex, MolQTLColocSection.column.directionality);
  }
}

import type { Locator, Page } from "@playwright/test";
import { OffsetPaginatedSection } from "./offsetPaginatedSection";

/** The "Enhancer-to-gene predictions" section of the credible set page (ENCODE rE2G). */
export class CredibleSetEnhancerToGenePredictionsSection extends OffsetPaginatedSection {
  static readonly id = "enhancer-to-gene-predictions";
  static readonly operation = "CredibleSetEnhancerToGenePredictionsQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Gene",
    "Affected tissue/cell",
    "Interval type",
    "Study",
    "Distance from start site (bp)",
    "Interval size (bp)",
    "Interval range",
    "Score?",
  ];
  static readonly column = {
    gene: 0,
    tissue: 1,
    intervalType: 2,
    study: 3,
    distance: 4,
    size: 5,
    range: 6,
    score: 7,
  } as const;

  constructor(page: Page) {
    super(page, CredibleSetEnhancerToGenePredictionsSection.id);
  }

  geneLink(rowIndex: number): Locator {
    return this.link(rowIndex, CredibleSetEnhancerToGenePredictionsSection.column.gene);
  }

  /** The external link to the biosample ontology term. */
  tissueLink(rowIndex: number): Locator {
    return this.link(rowIndex, CredibleSetEnhancerToGenePredictionsSection.column.tissue);
  }

  /** The external link to the ENCODE experiment. */
  studyLink(rowIndex: number): Locator {
    return this.link(rowIndex, CredibleSetEnhancerToGenePredictionsSection.column.study);
  }
}

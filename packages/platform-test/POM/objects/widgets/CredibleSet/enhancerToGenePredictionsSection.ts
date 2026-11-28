import type { Locator, Page } from "@playwright/test";
import { ServerTableSection, type SortableColumn } from "./serverTableSection";

/** The "Enhancer-to-gene predictions" section of the credible set page (ENCODE rE2G). */
export class CredibleSetEnhancerToGenePredictionsSection extends ServerTableSection {
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
  static readonly searchPlaceholder = "Search all columns...";
  /** What the search box asks the server to look in: the fields of the first column. */
  static readonly searchFields = [
    "BIOSAMPLE_ID",
    "BIOSAMPLE_NAME",
    "INTERVAL_TYPE",
    "STUDY_ID",
    "TARGET_APPROVED_SYMBOL",
  ];
  /** The sort the table opens with. */
  static readonly defaultSort = { key: "SCORE", direction: "DESCENDING" } as const;
  /**
   * The columns the server can sort, with the sort key each one sends. Every prediction of the
   * test credible sets has the same interval type (all genic or all intergenic), so that
   * column cannot show its order: its kind is "unreadable".
   */
  static readonly sortable: readonly SortableColumn[] = [
    { header: "Interval type", key: "INTERVAL_TYPE", column: 2, kind: "unreadable" },
    { header: "Distance from start site (bp)", key: "DISTANCE_TO_TSS", column: 4, kind: "number" },
    { header: "Interval size (bp)", key: "INTERVAL_SIZE", column: 5, kind: "number" },
    { header: "Score", key: "SCORE", column: 7, kind: "number" },
  ];
  /** The columns with no sort field: their titles are not controls. */
  static readonly notSortable = ["Gene", "Affected tissue/cell", "Study", "Interval range"];

  constructor(page: Page) {
    super(
      page,
      CredibleSetEnhancerToGenePredictionsSection.id,
      CredibleSetEnhancerToGenePredictionsSection.operation
    );
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

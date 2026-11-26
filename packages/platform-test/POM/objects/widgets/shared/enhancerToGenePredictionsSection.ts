import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Columns of the enhancer-to-gene table, in order. */
export const E2G_HEADERS = [
  "Gene",
  "Affected tissue/cell",
  "Interval type",
  "Study",
  "Distance from start site (bp)",
  "Interval size (bp)",
  "Interval range",
  "Score?",
] as const;

export const E2G_COLUMN = {
  gene: 0,
  biosample: 1,
  intervalType: 2,
  study: 3,
  distance: 4,
  size: 5,
  range: 6,
  score: 7,
} as const;

/** GraphQL operation behind the section (packages/sections/src/variant/EnhancerToGenePredictions). */
export const E2G_OPERATION = "VariantEnhancerToGenePredictionsQuery";
export const E2G_PAGE_SIZE = 10;

/**
 * Variant page > Enhancer-to-gene predictions: a server-side table (pagination, search
 * across gene, biosample, interval type and study, sort by interval type, distance, size
 * and score).
 */
export class EnhancerToGenePredictionsSection {
  static readonly id = "enhancer-to-gene-predictions";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, EnhancerToGenePredictionsSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-enhancer-to-gene-predictions-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  geneLink(row: number): Locator {
    return this.table.cell(row, E2G_COLUMN.gene).getByRole("link");
  }

  /** The biosample cell's ontology link (absent when the row has no biosample). */
  biosampleLink(row: number): Locator {
    return this.table.cell(row, E2G_COLUMN.biosample).getByRole("link");
  }

  studyLink(row: number): Locator {
    return this.table.cell(row, E2G_COLUMN.study).getByRole("link");
  }

  /** The title of a column header: clicking it sorts the column. A help icon may follow the text. */
  sortLabel(header: string): Locator {
    return this.table.headers
      .filter({ hasText: header })
      .getByText(new RegExp(`^${header.replace(/[()]/g, "\\$&")}\\??$`));
  }

  /** The arrow of an unsorted, sortable column (shown on hover) and of the sorted one. */
  sortArrows(header: string): Locator {
    return this.table.headers.filter({ hasText: header }).locator("svg[data-icon^='arrow-']");
  }

  /** Numbers of one column on the current page, parsed from their formatted text. */
  async numbers(column: keyof typeof E2G_COLUMN): Promise<number[]> {
    const texts = await this.table.columnTexts(E2G_COLUMN[column]);
    return texts.map((text) => Number(text.replace(/,/g, "")));
  }
}

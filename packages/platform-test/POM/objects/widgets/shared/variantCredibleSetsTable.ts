import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

/**
 * Variant page, the two credible-set sections ("GWAS Credible Sets" and "QTL Credible
 * Sets"). Both are a server-side table (OtTableServer): server-side search over every
 * column's `searchFields`, server-side sort on the columns that have a `sortField`.
 */
export abstract class VariantCredibleSetsTable {
  readonly section: Locator;
  readonly table: OtTable;

  constructor(
    readonly page: Page,
    readonly sectionId: string,
    /** Column index of each column, by name. */
    protected readonly columns: Record<string, number>
  ) {
    this.section = sectionLocator(page, sectionId);
    this.table = new OtTable(this.section);
  }

  get title(): Locator {
    return this.section.getByTestId(`${sectionTestId(this.sectionId)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The cell of a named column, in a row of the current page. */
  cell(rowIndex: number, column: string): Locator {
    return this.table.cell(rowIndex, this.columns[column]);
  }

  /** Every cell of a named column on the current page, trimmed. */
  async columnTexts(column: string): Promise<string[]> {
    return this.table.columnTexts(this.columns[column]);
  }

  /** The link in a cell (the first one when the cell holds several). */
  link(rowIndex: number, column: string): Locator {
    return this.cell(rowIndex, column).getByRole("link").first();
  }

  /** The "View" link of a row, to its credible set page. */
  viewLink(rowIndex: number): Locator {
    return this.cell(rowIndex, "credibleSet").getByRole("link", { name: "View" });
  }

  /** Click a column title to sort by it (titles with a "?" help icon are not an exact text). */
  async sortBy(column: string): Promise<void> {
    await this.table.header(column).getByText(column).first().click();
  }

  /** Wait for the first page of rows to be rendered. */
  async expectLoaded(): Promise<void> {
    await this.table.expectLoaded();
    await expect(this.table.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
  }
}

/** "6.48×10 -62" (a rendered p-value) as log10, so p-values compare across exponents. */
export function pValueLog10(text: string): number {
  const match = text.replace(/\s+/g, " ").match(/^(\d+(?:\.\d+)?)×10 ?(-?\d+)$/);
  if (!match) throw new Error(`"${text}" is not a rendered p-value like 6.48×10 -62`);
  return Math.log10(Number(match[1])) + Number(match[2]);
}

/** The numbers of a column, skipping the "N/A" cells. */
export function numbersOf(texts: readonly string[]): number[] {
  return texts.filter((text) => text !== "N/A").map(Number);
}

export type Direction = "ascending" | "descending" | "constant" | "unordered";

/** Whether the values are sorted, and which way. */
export function directionOf(values: readonly number[]): Direction {
  const pairs = values.slice(1).map((value, index) => [values[index], value]);
  const up = pairs.every(([a, b]) => a <= b);
  const down = pairs.every(([a, b]) => a >= b);
  if (up && down) return "constant";
  if (up) return "ascending";
  if (down) return "descending";
  return "unordered";
}

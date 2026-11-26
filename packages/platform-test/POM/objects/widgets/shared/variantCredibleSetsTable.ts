import { expect, type Locator, type Page } from "@playwright/test";
import { OtTable } from "../../../../utils/table";
import { sectionLocator, sectionTestId } from "../../../../utils/sections";

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

  /** Click a header's title and assert the sort arrow moved there. */
  async sortBy(name: string): Promise<void> {
    await this.table.clickHeader(name);
  }

  /** Wait for the first page of rows to be rendered. */
  async expectLoaded(): Promise<void> {
    await this.table.expectLoaded();
    await expect(this.table.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
  }
}

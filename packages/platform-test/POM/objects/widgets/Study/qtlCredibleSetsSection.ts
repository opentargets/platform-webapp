import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

export const QTL_COLUMNS = [
  "Credible set",
  "Lead variant",
  "P-value",
  "Beta",
  "Fine-mapping method",
  "Fine-mapping confidence",
  "Credible set size",
] as const;

/**
 * The "molQTL Credible Sets" section of a molQTL study page. It is an offset-paginated
 * table (no search, no sorting): page size, first / previous / next, column picker, export
 * and API query.
 */
export class QTLCredibleSetsSection {
  static readonly id = "qtl-credible-sets";

  readonly root: Locator;
  /** Export, API query and column picker, shared with every other table. */
  readonly controls: OtTable;

  constructor(readonly page: Page) {
    this.root = sectionLocator(page, QTLCredibleSetsSection.id);
    this.controls = new OtTable(this.root);
  }

  /** Assert the section is rendered, finished loading and the table shows rows. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, QTLCredibleSetsSection.id);
    await expect(this.rows.first().locator("td").first()).not.toBeEmpty();
    await expect(this.pageSizeSelect).toBeEnabled();
  }

  get title(): Locator {
    return this.root.getByTestId("section-qtl-credible-sets-header");
  }

  get description(): Locator {
    return this.root.getByTestId("section-description");
  }

  get table(): Locator {
    return this.root.locator("table");
  }

  get headers(): Locator {
    return this.table.locator("thead th");
  }

  get rows(): Locator {
    return this.table.locator("tbody tr");
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.row(rowIndex).locator("td").nth(columnIndex);
  }

  /** "View" link of a row, to the credible set page. */
  credibleSetLink(rowIndex: number): Locator {
    return this.row(rowIndex).locator("a[href^='/credible-set/']");
  }

  /** Lead variant link of a row, to the variant page. */
  variantLink(rowIndex: number): Locator {
    return this.row(rowIndex).locator("a[href^='/variant/']");
  }

  /** Text of every cell of a row, whitespace collapsed ("3.91 ×10 -7" style numbers). */
  async rowText(rowIndex: number): Promise<string[]> {
    const cells = await this.row(rowIndex).locator("td").allInnerTexts();
    return cells.map((text) => text.replace(/\s+/g, " ").trim());
  }

  async columnTexts(columnIndex: number): Promise<string[]> {
    const texts = await this.rows.locator(`td:nth-child(${columnIndex + 1})`).allInnerTexts();
    return texts.map((text) => text.replace(/\s+/g, " ").trim());
  }

  async allRowTexts(): Promise<string[]> {
    return (await this.rows.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  }

  // ---- paging ----

  get pageSizeSelect(): Locator {
    return this.root.getByLabel("Rows per page:");
  }

  get position(): Locator {
    return this.root.getByText(/^\d+ - \d+ of \d+$/);
  }

  get firstPageButton(): Locator {
    return this.root.getByRole("button", { name: "first page" });
  }

  get previousPageButton(): Locator {
    return this.root.getByRole("button", { name: "previous page" });
  }

  get nextPageButton(): Locator {
    return this.root.getByRole("button", { name: "next page" });
  }

  /** The total the footer reports. */
  async total(): Promise<number> {
    await expect(this.position).toHaveText(/^\d+ - \d+ of \d+$/);
    return Number((await this.position.innerText()).split(" of ")[1]);
  }

  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.position).toHaveText(`${start} - ${end} of ${total}`);
  }

  /** Assert which paging buttons are usable. The table has no "last page" button. */
  async expectPaging(state: { back: boolean; forward: boolean }): Promise<void> {
    for (const button of [this.firstPageButton, this.previousPageButton]) {
      if (state.back) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
    }
    if (state.forward) await expect(this.nextPageButton).toBeEnabled();
    else await expect(this.nextPageButton).toBeDisabled();
  }

  /** Go to the next page and wait for the footer to show the new range. */
  async goNext(start: number, end: number, total: number): Promise<void> {
    await this.nextPageButton.click();
    await this.expectPosition(start, end, total);
    await expect(this.pageSizeSelect).toBeEnabled();
  }

  async setPageSize(size: 10 | 25 | 100): Promise<void> {
    await this.pageSizeSelect.selectOption(String(size));
    await expect(this.pageSizeSelect).toHaveValue(String(size));
    await expect(this.pageSizeSelect).toBeEnabled();
  }

  // ---- header tooltips ----

  /** Hover a column header and return the tooltip it shows. */
  async hoverHeader(name: RegExp): Promise<Locator> {
    await this.headers.filter({ hasText: name }).hover();
    return this.page.getByRole("tooltip");
  }
}

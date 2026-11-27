import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

/**
 * Building blocks for the page objects of the target profile sections.
 *
 * Everything here returns a Locator or asserts. Nothing reports "not there" as a value,
 * so a broken section can only fail the test that touches it.
 */

/** A profile section: the card with a title, a description and a body. */
export class ProfileSection {
  readonly section: Locator;

  constructor(
    readonly page: Page,
    readonly sectionId: string
  ) {
    this.section = sectionLocator(page, sectionId);
  }

  get title(): Locator {
    return this.section.getByTestId(`${sectionTestId(this.sectionId)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** A link in the section description, by its exact text. */
  descriptionLink(name: string): Locator {
    return this.description.getByRole("link", { name, exact: true });
  }

  /** Scroll to the section and assert it rendered its content (not a loader, error or placeholder). */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, this.sectionId);
  }

  /** The MUI tooltip currently open on the page (tooltips render outside the section). */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }
}

export type DownloadedFile = { filename: string; text: string };

/**
 * The controls around a table built with OtTable or OtTableServer: search box, column
 * picker, export menu, API query drawer, page size and pagination. `scope` is the
 * smallest element holding one table and its controls.
 */
export class TableControls {
  readonly table: OtTable;

  constructor(
    readonly page: Page,
    readonly scope: Locator
  ) {
    this.table = new OtTable(scope);
  }

  get rows(): Locator {
    return this.table.rows;
  }

  get headers(): Locator {
    return this.table.headers;
  }

  get searchInput(): Locator {
    return this.scope.getByTestId("table-search-input");
  }

  get pageSizeSelect(): Locator {
    return this.scope.getByRole("combobox");
  }

  /** "1 - 10 of 16": the range of rows on this page and the total after filtering. */
  get pagePosition(): Locator {
    return this.scope.getByText(/^\d+ - \d+ of \d+$/);
  }

  get firstPageButton(): Locator {
    return this.scope.getByTestId("pagination-first-button");
  }

  get previousPageButton(): Locator {
    return this.scope.getByTestId("pagination-previous-button");
  }

  get nextPageButton(): Locator {
    return this.scope.getByTestId("pagination-next-button");
  }

  get lastPageButton(): Locator {
    return this.scope.getByTestId("pagination-last-button");
  }

  get columnsButton(): Locator {
    return this.scope.getByRole("button", { name: "Columns", exact: true });
  }

  /** The checkbox list the Columns button opens (rendered in a popper outside the scope). */
  get columnVisibilityList(): Locator {
    return this.page.getByRole("list", { name: "column-visibility-list" });
  }

  get exportButton(): Locator {
    return this.scope.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  get apiQueryButton(): Locator {
    return this.scope.getByRole("button", { name: "API query", exact: true });
  }

  /** The API query drawer (rendered outside the scope). */
  get apiQueryDrawer(): Locator {
    return this.page
      .getByRole("presentation")
      .filter({ hasText: "Press the Play button to explore the GraphQL API query" });
  }

  /** Assert the table has finished loading and shows at least one row of content. */
  async expectLoaded(): Promise<void> {
    await this.table.expectLoaded();
  }

  async expectHeaders(expected: readonly (string | RegExp)[]): Promise<void> {
    await expect(this.headers, "the table should have exactly these columns").toHaveText([
      ...expected,
    ]);
  }

  /** Assert the footer reads "<start> - <end> of <total>". */
  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.pagePosition).toHaveText(`${start} - ${end} of ${total}`);
  }

  /** The total row count the footer reports. Fails if the footer is missing or malformed. */
  async total(): Promise<number> {
    await expect(this.pagePosition).toHaveText(/^\d+ - \d+ of \d+$/);
    const text = await this.pagePosition.innerText();
    return Number(text.trim().split(" of ")[1]);
  }

  /** Assert pagination is at the first page (and, with `alsoLast`, that there is no further page). */
  async expectFirstPage(alsoLast = false): Promise<void> {
    await expect(this.firstPageButton).toBeDisabled();
    await expect(this.previousPageButton).toBeDisabled();
    if (alsoLast) {
      await expect(this.nextPageButton).toBeDisabled();
      await expect(this.lastPageButton).toBeDisabled();
    } else {
      await expect(this.nextPageButton).toBeEnabled();
      await expect(this.lastPageButton).toBeEnabled();
    }
  }

  async expectLastPage(): Promise<void> {
    await expect(this.firstPageButton).toBeEnabled();
    await expect(this.previousPageButton).toBeEnabled();
    await expect(this.nextPageButton).toBeDisabled();
    await expect(this.lastPageButton).toBeDisabled();
  }

  /** Type a search term. The table filters after a debounce: assert on rows afterwards. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await expect(this.searchInput).toHaveValue(term);
  }

  async setPageSize(size: number): Promise<void> {
    await this.pageSizeSelect.selectOption(String(size));
    await expect(this.pageSizeSelect).toHaveValue(String(size));
  }

  /** The trimmed text of every row on the current page. */
  async rowTexts(): Promise<string[]> {
    return (await this.rows.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  }

  /**
   * Wait until the rows differ from `previous`. A server-side table updates its footer
   * as soon as a page is requested and its rows only when the page arrives, so the
   * footer alone does not say the new rows are in.
   */
  async expectRowsChangedFrom(previous: readonly string[]): Promise<void> {
    await expect
      .poll(async () => this.rowTexts(), { message: "the table should show different rows" })
      .not.toEqual(previous);
  }

  /** Wait until the rows are exactly `expected` (see expectRowsChangedFrom). */
  async expectRowTexts(expected: readonly string[]): Promise<void> {
    await expect
      .poll(async () => this.rowTexts(), { message: "the table should show these rows" })
      .toEqual(expected);
  }

  /** Open the Columns popper and return its list of checkboxes. */
  async openColumnPicker(): Promise<Locator> {
    await this.columnsButton.click();
    await expect(this.columnVisibilityList).toBeVisible();
    return this.columnVisibilityList;
  }

  /** Close the Columns popper by clicking away from it, as a user would. */
  async closeColumnPicker(clickAwayTarget: Locator): Promise<void> {
    await clickAwayTarget.click();
    await expect(this.columnVisibilityList).toBeHidden();
  }

  /** Open the Export menu, check what it offers and download one format. */
  async download(format: "Json" | "TSV"): Promise<DownloadedFile> {
    await this.exportButton.click();
    const menu = this.page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    await expect(menu).toContainText("Column settings and filters will not affect export");
    const downloadPromise = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await downloadPromise;
    const text = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu should close after a download").toBeHidden();
    return { filename: download.suggestedFilename(), text };
  }

  /**
   * Open the API query drawer, assert it explains itself, links to the documentation and
   * shows the section's GraphQL operation, then close it.
   */
  async expectApiQuery(operationName: string): Promise<void> {
    await this.apiQueryButton.click();
    const drawer = this.apiQueryDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(drawer.getByRole("link", { name: "Community" })).toHaveAttribute(
      "href",
      "https://community.opentargets.org"
    );
    await expect(
      drawer,
      `the playground should be loaded with the ${operationName} operation`
    ).toContainText(operationName);
    // The drawer covers the right 80% of the viewport; the backdrop is what is left.
    await this.page.mouse.click(20, 300);
    await expect(drawer).toBeHidden();
  }
}

/**
 * The legacy table component (DataTable), still used for the interaction evidence
 * tables. It has no test ids of its own, so `scope` must hold exactly one of them.
 */
export class LegacyTable {
  constructor(
    readonly page: Page,
    readonly scope: Locator
  ) {}

  get root(): Locator {
    return this.scope.getByRole("table");
  }

  get headers(): Locator {
    return this.root.locator("thead th");
  }

  /** Data rows. The component pads the last page with one empty filler row, excluded here. */
  get rows(): Locator {
    return this.root.locator("tbody tr").filter({ hasNot: this.page.locator("td[colspan]") });
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.rows.nth(rowIndex).locator("td").nth(columnIndex);
  }

  get searchInput(): Locator {
    return this.scope.getByPlaceholder("Search", { exact: true });
  }

  /** "1–10 of 60". Only rendered when the table has more rows than its smallest page size. */
  get pagePosition(): Locator {
    return this.scope.getByText(/^\d+–\d+ of \d+$/);
  }

  get pageSizeSelect(): Locator {
    return this.scope.getByRole("combobox", { name: "Rows per page select dropdown" });
  }

  get firstPageButton(): Locator {
    return this.scope.getByTestId("pagination-first-button");
  }

  get previousPageButton(): Locator {
    return this.scope.getByTestId("pagination-previous-button");
  }

  get nextPageButton(): Locator {
    return this.scope.getByTestId("pagination-next-button");
  }

  get lastPageButton(): Locator {
    return this.scope.getByTestId("pagination-last-button");
  }

  get exportButton(): Locator {
    return this.scope.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  async expectHeaders(expected: readonly (string | RegExp)[]): Promise<void> {
    await expect(this.headers, "the table should have exactly these columns").toHaveText([
      ...expected,
    ]);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await expect(this.searchInput).toHaveValue(term);
  }

  async download(format: "Json" | "TSV"): Promise<DownloadedFile> {
    await this.exportButton.click();
    const menu = this.page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    const downloadPromise = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await downloadPromise;
    const text = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu should close after a download").toBeHidden();
    return { filename: download.suggestedFilename(), text };
  }
}

/** Parse a TSV export into its header and data lines. */
export function parseTsv(text: string): { header: string[]; rows: string[][] } {
  const [headerLine, ...lines] = text.split("\n");
  return {
    header: headerLine.split("\t"),
    rows: lines.filter((line) => line.length > 0).map((line) => line.split("\t")),
  };
}

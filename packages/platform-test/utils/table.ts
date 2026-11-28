import { readFile } from "node:fs/promises";
import { expect, type Locator } from "@playwright/test";

/**
 * Strict helper for the shared table component (OtTable, OtTableServer, OtTableSSP).
 *
 * Every method either returns a Locator (so callers use web-first assertions that
 * retry) or asserts. Nothing reads a value once and returns a default when the table
 * is missing or still loading.
 */
export class OtTable {
  readonly root: Locator;
  /** The element holding the table and its controls (search, columns, export, pagination). */
  readonly scope: Locator;

  /**
   * @param scope a section (or any ancestor) containing the table
   * @param index which table inside the scope, when it has more than one
   */
  constructor(scope: Locator, index = 0) {
    this.scope = scope;
    this.root = scope.getByTestId("ot-table").nth(index);
  }

  get rows(): Locator {
    return this.root.locator("tbody tr");
  }

  get headers(): Locator {
    return this.root.locator("thead th");
  }

  get searchInput(): Locator {
    return this.scope.getByTestId("table-search-input");
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

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.row(rowIndex).locator("td").nth(columnIndex);
  }

  /** The header cell whose text matches `name`. */
  header(name: string | RegExp): Locator {
    return this.headers.filter({ hasText: name });
  }

  /** Assert the table is rendered, is not loading and has at least `min` data rows. */
  async expectLoaded(min = 1): Promise<void> {
    await expect(this.root, "the table should be rendered").toBeVisible();
    await expect(
      this.root.locator(".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root"),
      "the table should finish loading"
    ).toHaveCount(0);
    if (min > 0) {
      await expect
        .poll(async () => this.rows.count(), {
          message: `the table should have at least ${min} row(s)`,
        })
        .toBeGreaterThanOrEqual(min);
      await expect(this.row(0), "the first row should have content").not.toBeEmpty();
    }
  }

  /** The trimmed text of every cell in one column, for the rows on the current page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    const texts = await this.rows.locator(`td:nth-child(${columnIndex + 1})`).allInnerTexts();
    return texts.map((text) => text.trim());
  }

  /** The trimmed text of every header cell. */
  async headerTexts(): Promise<string[]> {
    return (await this.headers.allInnerTexts()).map((text) => text.trim());
  }

  /**
   * Type into the table's search box and wait until the rows have changed or settled on
   * a result for that term. Returns nothing: assert on `rows` afterwards.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await expect(this.searchInput).toHaveValue(term);
    await expect(
      this.root.locator(".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root"),
      "the table should finish loading the search result"
    ).toHaveCount(0);
  }

  async clearSearch(): Promise<void> {
    await this.search("");
  }

  // ---- controls around the table (all live in `scope`, outside the <table>) ----

  /** "1 - 10 of 132": the range on this page and the total after search. */
  get pagePosition(): Locator {
    return this.scope.getByText(/^\d+ - \d+ of \d+$/);
  }

  get pageSizeSelect(): Locator {
    return this.scope.getByRole("combobox");
  }

  get columnsButton(): Locator {
    return this.scope.getByRole("button", { name: "Columns", exact: true });
  }

  /** The checkbox list the Columns button opens (rendered in a popper outside the scope). */
  get columnVisibilityList(): Locator {
    return this.scope.page().getByRole("list", { name: "column-visibility-list" });
  }

  get exportButton(): Locator {
    return this.scope.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  get apiQueryButton(): Locator {
    return this.scope.getByRole("button", { name: "API query", exact: true });
  }

  /** The API query drawer (rendered outside the scope). */
  get apiQueryDrawer(): Locator {
    return this.scope.page().getByTestId("api-playground-drawer");
  }

  /** The text of each cell in one column, on this page, with whitespace collapsed. */
  async rowTexts(): Promise<string[]> {
    return (await this.rows.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  }

  /** Assert the footer reads "<start> - <end> of <total>". */
  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.pagePosition).toHaveText(`${start} - ${end} of ${total}`);
  }

  /** The total the footer reports. Fails if the footer is missing or malformed. */
  async total(): Promise<number> {
    await expect(this.pagePosition).toHaveText(/^\d+ - \d+ of \d+$/);
    return Number((await this.pagePosition.innerText()).trim().split(" of ")[1]);
  }

  /** Assert the table has exactly these columns, in this order. */
  async expectHeaders(expected: readonly (string | RegExp)[]): Promise<void> {
    await expect(this.headers, "the table should have exactly these columns").toHaveText([
      ...expected,
    ]);
  }

  /** Assert the pagination buttons say the table is on its first page. */
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

  /** Assert the pagination buttons say the table is on its last page (and not its only page). */
  async expectLastPage(): Promise<void> {
    await expect(this.firstPageButton).toBeEnabled();
    await expect(this.previousPageButton).toBeEnabled();
    await expect(this.nextPageButton).toBeDisabled();
    await expect(this.lastPageButton).toBeDisabled();
  }

  /** Assert the rows are exactly `expected` (polls: a server-side page arrives after the footer). */
  async expectRowTexts(expected: readonly string[]): Promise<void> {
    await expect
      .poll(async () => this.rowTexts(), { message: "the table should show these rows" })
      .toEqual(expected);
  }

  /** Assert the rows differ from `previous` (polls, see expectRowTexts). */
  async expectRowsChangedFrom(previous: readonly string[]): Promise<void> {
    await expect
      .poll(async () => this.rowTexts(), { message: "the table should show different rows" })
      .not.toEqual(previous);
  }

  /** Choose a page size and assert the select shows it. */
  async setPageSize(size: number): Promise<void> {
    await this.pageSizeSelect.selectOption(String(size));
    await expect(this.pageSizeSelect).toHaveValue(String(size));
  }

  /** Click a sortable column's title. */
  async clickHeader(name: string | RegExp): Promise<void> {
    await this.header(name)
      .getByText(name, { exact: typeof name === "string" })
      .first()
      .click();
  }

  /** Open the Columns popper and return its checkbox list. */
  async openColumnPicker(): Promise<Locator> {
    await this.columnsButton.click();
    await expect(this.columnVisibilityList).toBeVisible();
    return this.columnVisibilityList;
  }

  /** Close the Columns popper by clicking outside it, as a user would. */
  async closeColumnPicker(clickAwayTarget: Locator): Promise<void> {
    await clickAwayTarget.click();
    await expect(this.columnVisibilityList).toBeHidden();
  }

  /** Open the Export menu, check what it offers and download one format. */
  async download(format: "Json" | "TSV"): Promise<{ filename: string; text: string }> {
    const page = this.scope.page();
    await this.exportButton.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    await expect(menu).toContainText("Column settings and filters will not affect export");
    const downloadPromise = page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await downloadPromise;
    const text = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu should close after a download").toBeHidden();
    return { filename: download.suggestedFilename(), text };
  }

  /** Open the API query drawer, assert it holds the operation, then close it with its button. */
  async expectApiQuery(operationName: string): Promise<void> {
    await this.apiQueryButton.click();
    const drawer = this.apiQueryDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(
      drawer,
      `the playground should be loaded with the ${operationName} operation`
    ).toContainText(operationName);
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }
}

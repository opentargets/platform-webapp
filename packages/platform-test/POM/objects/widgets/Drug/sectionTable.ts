import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";

const LOADING = ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root";
const POSITION = /^(\d+) - (\d+) of (\d+)$/;

/**
 * A table (OtTable or OtTableServer) together with the controls the component renders
 * around it: search box, column picker, export, API query, page size and pagination.
 * The controls are siblings of the <table>, so they are looked up in `scope`, the
 * smallest test-id'd ancestor of the whole component.
 *
 * Every member is a Locator or an action that asserts its own effect.
 */
export class SectionTable {
  readonly page: Page;

  /**
   * @param scope the section (or other ancestor) that contains the table and its controls
   * @param index which table of the scope, in document order, when it holds several
   */
  constructor(
    readonly scope: Locator,
    private readonly index = 0
  ) {
    this.page = scope.page();
  }

  get table(): Locator {
    return this.scope.getByTestId("ot-table").nth(this.index);
  }

  get rows(): Locator {
    return this.table.locator("tbody tr");
  }

  get headers(): Locator {
    return this.table.locator("thead th");
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.row(rowIndex).locator("td").nth(columnIndex);
  }

  get searchInput(): Locator {
    return this.scope.getByTestId("table-search-input").nth(this.index);
  }

  /** The "1 - 10 of 53" text of the pagination footer. */
  get position(): Locator {
    return this.scope.getByText(POSITION).nth(this.index);
  }

  get firstPageButton(): Locator {
    return this.scope.getByTestId("pagination-first-button").nth(this.index);
  }

  get previousPageButton(): Locator {
    return this.scope.getByTestId("pagination-previous-button").nth(this.index);
  }

  get nextPageButton(): Locator {
    return this.scope.getByTestId("pagination-next-button").nth(this.index);
  }

  get lastPageButton(): Locator {
    return this.scope.getByTestId("pagination-last-button").nth(this.index);
  }

  get pageSizeSelect(): Locator {
    return this.scope.getByRole("combobox").nth(this.index);
  }

  get columnsButton(): Locator {
    return this.scope.getByRole("button", { name: "Columns" }).nth(this.index);
  }

  get exportButton(): Locator {
    return this.scope
      .getByTestId("data-downloader")
      .nth(this.index)
      .getByRole("button", { name: "Export" });
  }

  get apiQueryButton(): Locator {
    return this.scope.getByRole("button", { name: "API query" }).nth(this.index);
  }

  /** The list of column checkboxes the "Columns" button opens. */
  get columnList(): Locator {
    return this.page.getByRole("list", { name: "column-visibility-list" });
  }

  get apiDrawer(): Locator {
    return this.page.getByTestId("api-playground-drawer");
  }

  /** Assert the table has stopped loading and shows exactly `rowCount` data rows. */
  async expectRows(rowCount: number): Promise<void> {
    await expect(this.table, "the table should be rendered").toBeVisible();
    await expect(this.rows, `the table should show ${rowCount} row(s)`).toHaveCount(rowCount);
    await this.expectSettled();
  }

  /** Assert nothing in the table or its footer is still loading. */
  async expectSettled(): Promise<void> {
    await expect(this.scope.locator(LOADING), "the table should finish loading").toHaveCount(0);
  }

  async expectHeaders(expected: readonly (string | RegExp)[]): Promise<void> {
    await expect(this.headers, "the table should have exactly these columns").toHaveText([
      ...expected,
    ]);
  }

  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.position, "the pagination footer should show the current range").toHaveText(
      `${start} - ${end} of ${total}`
    );
  }

  /** The total number of rows, read from the pagination footer once it shows a range. */
  async total(): Promise<number> {
    await expect(this.position).toHaveText(POSITION);
    const match = POSITION.exec((await this.position.innerText()).trim());
    if (!match) throw new Error("the pagination footer changed while it was being read");
    return Number(match[3]);
  }

  /** Assert which pagination buttons are enabled for a table at this position. */
  async expectPaginationState(position: "only" | "first" | "middle" | "last"): Promise<void> {
    const backEnabled = position === "middle" || position === "last";
    const forwardEnabled = position === "middle" || position === "first";
    for (const button of [this.firstPageButton, this.previousPageButton]) {
      await (backEnabled ? expect(button).toBeEnabled() : expect(button).toBeDisabled());
    }
    for (const button of [this.nextPageButton, this.lastPageButton]) {
      await (forwardEnabled ? expect(button).toBeEnabled() : expect(button).toBeDisabled());
    }
  }

  /** The trimmed text of one column for the rows on the current page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    const texts = await this.rows.locator(`td:nth-child(${columnIndex + 1})`).allInnerTexts();
    return texts.map((text) => text.replace(/\s+/g, " ").trim());
  }

  /**
   * Type a term into the search box and wait until the table has answered it: the
   * footer total has moved away from `totalBefore` and loading has finished.
   */
  async search(term: string, totalBefore: number): Promise<void> {
    await this.searchInput.fill(term);
    await expect(this.searchInput).toHaveValue(term);
    await expect(
      this.position,
      `searching "${term}" should change the number of rows`
    ).not.toHaveText(new RegExp(` of ${totalBefore}$`));
    await this.expectSettled();
  }

  /** Empty the search box and wait for the table to show `total` rows again. */
  async clearSearch(total: number): Promise<void> {
    await this.searchInput.fill("");
    await expect(this.position, "clearing the search should restore every row").toHaveText(
      new RegExp(` of ${total}$`)
    );
    await this.expectSettled();
  }

  /** Download the table through the Export menu and return the file name and content. */
  async export(format: "Json" | "TSV"): Promise<{ filename: string; content: string }> {
    await this.exportButton.click();
    const menu = this.page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    await expect(menu).toContainText("Column settings and filters will not affect export");
    const downloadPromise = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format }).click();
    const download = await downloadPromise;
    const content = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu should close after a format is chosen").toBeHidden();
    return { filename: download.suggestedFilename(), content };
  }

  /** Export as JSON and return the parsed rows. */
  async exportJson(): Promise<{ filename: string; rows: Record<string, unknown>[] }> {
    const { filename, content } = await this.export("Json");
    return { filename, rows: JSON.parse(content) as Record<string, unknown>[] };
  }

  /** Export as TSV and return the header cells and the data lines. */
  async exportTsv(): Promise<{ filename: string; header: string[]; lines: string[] }> {
    const { filename, content } = await this.export("TSV");
    const [header, ...lines] = content.split("\n");
    return { filename, header: header.split("\t"), lines };
  }

  /**
   * Open the API query drawer, assert it shows the GraphQL operation behind the table
   * with its variables, and close it again.
   */
  async expectApiQuery(operationName: string, variable: string): Promise<void> {
    await this.apiQueryButton.click();
    const drawer = this.apiDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(
      "Press the Play button to explore the GraphQL API query used to populate this table."
    );
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(drawer, "the editor should hold the query of this table").toContainText(
      operationName
    );
    await expect(drawer, "the editor should hold the variables of this table").toContainText(
      variable
    );
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }

  /** Open the column picker and return the checkbox of one column. */
  async openColumnPicker(): Promise<Locator> {
    await this.columnsButton.click();
    await expect(this.columnList).toBeVisible();
    return this.columnList;
  }
}

/** Close a right-hand drawer with its close button and assert it is gone. */
export async function closeDrawer(drawer: Locator): Promise<void> {
  await drawer.getByTestId("drawer-close").click();
  await expect(drawer, "the drawer should close").toBeHidden();
}

/**
 * Assert a link leaves the app for the given URL. The app renders external links as
 * plain anchors, so the `href` must be the full absolute URL.
 */
export async function expectExternalLink(link: Locator, href: string | RegExp): Promise<void> {
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", href);
}

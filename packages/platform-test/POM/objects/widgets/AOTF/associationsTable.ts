import { expect, type Locator, type Page } from "@playwright/test";
import { EvidencePanel } from "../../components/EvidenceSection/evidenceSection";
import { aggregationTestId } from "./columns";

/**
 * The associations-on-the-fly view (apps/platform/src/components/AssociationsToolkit).
 *
 * Getters return Locators, to be asserted with web-first assertions. Methods either
 * perform one user action and assert its immediate, visible effect, or assert a state
 * (`expect…`). Nothing here sleeps, swallows an error or returns a default when the page
 * is not in the expected state.
 *
 * The table is built from divs, not a <table>. It has up to three bodies, each with its
 * own rows: "pinning" (pinned rows), "uploaded" (rows from an uploaded list) and "core"
 * (the paginated list). A fourth, "interactors", is nested under a row.
 */

export type TableBody = "core" | "pinning" | "uploaded" | "interactors";

/** First paint of the lazy route chunk plus the first associations query. */
export const TABLE_LOAD_TIMEOUT = 45_000;

/** The name search goes through a slower code path in the API (4 to 5 seconds). */
export const SEARCH_TIMEOUT = 45_000;

export type AssociationsUrlState = Partial<{
  table: "associations" | "prioritisations";
  sort: string;
  page: string;
  pageSize: string;
  q: string;
  facets: string;
  pinned: string;
  uploaded: string;
  weights: string;
  focus: string;
}>;

export class AssociationsTable {
  readonly root: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId("associations-table");
  }

  // ───────────────────────────── navigation ─────────────────────────────

  /** Path of the associations view of a disease, with the given URL state. */
  static diseasePath(diseaseId: string, state: AssociationsUrlState = {}): string {
    const params = new URLSearchParams(state as Record<string, string>).toString();
    return `/disease/${diseaseId}/associations${params ? `?${params}` : ""}`;
  }

  /** Open the associations view of a disease and wait until its first rows are shown. */
  async gotoDisease(diseaseId: string, state: AssociationsUrlState = {}): Promise<void> {
    await this.page.goto(AssociationsTable.diseasePath(diseaseId, state));
    await this.expectLoaded();
  }

  /** The current value of one URL search param (null when absent). */
  urlParam(name: keyof AssociationsUrlState): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  /** Assert a URL search param settles on a value. An absent or empty param is "". */
  async expectUrlParam(name: keyof AssociationsUrlState, value: string | RegExp): Promise<void> {
    const poll = expect.poll(() => this.urlParam(name) ?? "", {
      message: `URL param "${name}" should be ${value}`,
    });
    if (typeof value === "string") await poll.toBe(value);
    else await poll.toMatch(value);
  }

  // ───────────────────────────── header ─────────────────────────────

  get header(): Locator {
    return this.root.getByTestId("associations-table-header");
  }

  /** Every column label, in display order (name, score, then the data columns). */
  get headerLabels(): Locator {
    return this.header.locator("[data-testid^='table-header-']");
  }

  headerLabel(columnId: string): Locator {
    return this.header.getByTestId(`table-header-${columnId}`);
  }

  headerCell(columnId: string): Locator {
    return this.header.getByTestId(`header-cell-${columnId}`);
  }

  /** The icon shown in the header of the column the table is sorted by. */
  sortIndicator(columnId: string): Locator {
    return this.header.getByTestId(`sort-indicator-${columnId}`);
  }

  get sortIndicators(): Locator {
    return this.header.locator("[data-testid^='sort-indicator-']");
  }

  docsLink(columnId: string): Locator {
    return this.header.getByTestId(`docs-link-${columnId}`);
  }

  aggregationButton(aggregation: string): Locator {
    return this.header.getByTestId(aggregationTestId(aggregation));
  }

  get aggregationButtons(): Locator {
    return this.header.locator("[data-testid^='aggregation-button-']");
  }

  get nameFilter(): Locator {
    return this.header.getByTestId("name-filter-input");
  }

  // ───────────────────────────── rows and cells ─────────────────────────────

  rows(body: TableBody = "core"): Locator {
    return this.root.locator(`[data-testid^='table-row-${body}-']`);
  }

  row(index: number, body: TableBody = "core"): Locator {
    return this.root.getByTestId(`table-row-${body}-${index}`);
  }

  /** The row whose name (target symbol) is exactly `name`. */
  rowByName(name: string, body: TableBody = "core"): Locator {
    return this.rows(body).filter({
      has: this.page.getByTestId("name-cell").getByText(name, { exact: true }),
    });
  }

  /** The first row of a body with a value in `columnId`. */
  firstRowWithData(columnId: string, body: TableBody = "core"): Locator {
    return this.rows(body)
      .filter({ has: this.page.getByTestId(`score-cell-${columnId}`) })
      .first();
  }

  nameCells(body: TableBody = "core"): Locator {
    return this.rows(body).getByTestId("name-cell");
  }

  nameCell(row: Locator): Locator {
    return row.getByTestId("name-cell");
  }

  /** The clickable name of a row: opens its context menu. */
  nameText(row: Locator): Locator {
    return row.getByTestId("name-cell").locator("p");
  }

  /** The cell of a row in a column, when it has a value. */
  dataCell(row: Locator, columnId: string): Locator {
    return row.getByTestId(`score-cell-${columnId}`);
  }

  /** The cell of a row in a column, when it has no value. */
  emptyCell(row: Locator, columnId: string): Locator {
    return row.getByTestId(`empty-cell-${columnId}`);
  }

  /** Every cell with a value in a row, except the association score. */
  dataCells(row: Locator): Locator {
    return row.locator("[data-testid^='score-cell-']:not([data-testid='score-cell-score'])");
  }

  /** The cells with a value in one column, over the rows of a body. */
  columnCells(columnId: string, body: TableBody = "core"): Locator {
    return this.rows(body).getByTestId(`score-cell-${columnId}`);
  }

  get loadingIndicators(): Locator {
    return this.root.locator(".MuiSkeleton-root");
  }

  get noResults(): Locator {
    return this.root.getByTestId("associations-no-results");
  }

  /** The trimmed names of the rows of a body, in display order. */
  async rowNames(body: TableBody = "core"): Promise<string[]> {
    return (await this.nameCells(body).allInnerTexts()).map((text) => text.trim());
  }

  /** The symbol of one row, once it is rendered. */
  async rowName(row: Locator): Promise<string> {
    const name = this.nameText(row);
    await expect(name, "the row should show a name").not.toBeEmpty();
    return (await name.innerText()).trim();
  }

  /** The ids of the columns in which a row has a value (association score excluded). */
  async dataColumnIds(row: Locator): Promise<string[]> {
    await expect(this.nameCell(row), "the row should be rendered").toBeVisible();
    return this.dataCells(row).evaluateAll((cells) =>
      cells.map((cell) => (cell.getAttribute("data-testid") ?? "").replace("score-cell-", ""))
    );
  }

  /** The values shown in one column (from `data-score`, two decimals), in row order. */
  async columnScores(columnId: string, body: TableBody = "core"): Promise<number[]> {
    const raw = await this.columnCells(columnId, body).evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute("data-score") ?? "")
    );
    return raw.map((value) => Number.parseFloat(value));
  }

  /**
   * Assert the table has finished loading and shows at least `min` rows with a name.
   * While a query is in flight every cell is a skeleton, so this cannot pass on rows
   * that are still placeholders.
   */
  async expectLoaded(min = 1, body: TableBody = "core"): Promise<void> {
    await expect(this.root, "the associations table should be rendered").toBeVisible({
      timeout: TABLE_LOAD_TIMEOUT,
    });
    await expect(
      this.nameCells(body).first(),
      `the "${body}" rows should load. If they never do, the associations query failed or returned no rows.`
    ).toBeVisible({ timeout: TABLE_LOAD_TIMEOUT });
    await expect(this.loadingIndicators, "the table should finish loading").toHaveCount(0, {
      timeout: TABLE_LOAD_TIMEOUT,
    });
    await expect
      .poll(() => this.nameCells(body).count(), {
        message: `the "${body}" body should have at least ${min} row(s)`,
      })
      .toBeGreaterThanOrEqual(min);
  }

  /**
   * Assert the rows were replaced by a different, fully loaded set. Use after an action
   * that re-queries (page change, filter, sort): it does not pass on the old rows, nor
   * while the new ones are skeletons.
   */
  async expectRowsToDifferFrom(previous: readonly string[], body: TableBody = "core"): Promise<void> {
    await expect
      .poll(
        async () => {
          if ((await this.loadingIndicators.count()) > 0) return "still loading";
          const names = await this.rowNames(body);
          if (names.length === 0) return "no rows";
          return names.join(",") === previous.join(",") ? "same rows as before" : "new rows";
        },
        { message: "the table should show a new set of rows", timeout: SEARCH_TIMEOUT }
      )
      .toBe("new rows");
  }

  /** Assert the rows settle on exactly these names, in this order. */
  async expectRowNames(expected: readonly string[], body: TableBody = "core"): Promise<void> {
    await expect
      .poll(
        async () => {
          if ((await this.loadingIndicators.count()) > 0) return ["still loading"];
          return this.rowNames(body);
        },
        { message: `the "${body}" rows should be ${expected.join(", ")}`, timeout: SEARCH_TIMEOUT }
      )
      .toEqual([...expected]);
  }

  /**
   * Assert every row has a value in `columnId` and the values do not increase down the
   * page: what the table looks like when it is sorted by that column.
   */
  async expectSortedBy(columnId: string): Promise<void> {
    await expect
      .poll(
        async () => {
          if ((await this.loadingIndicators.count()) > 0) return "still loading";
          const rowCount = await this.rows().count();
          if (rowCount === 0) return "no rows";
          const scores = await this.columnScores(columnId);
          if (scores.length !== rowCount)
            return `${rowCount - scores.length} of ${rowCount} rows have no ${columnId} score`;
          if (scores.some((score) => Number.isNaN(score))) return "a score is not a number";
          const unsorted = scores.findIndex((score, index) => index > 0 && score > scores[index - 1]);
          return unsorted === -1 ? "sorted" : `row ${unsorted} has a higher score than the row above`;
        },
        { message: `the rows should be sorted by ${columnId}, highest first`, timeout: SEARCH_TIMEOUT }
      )
      .toBe("sorted");
  }

  // ───────────────────────────── footer ─────────────────────────────

  get footer(): Locator {
    return this.root.getByTestId("pagination-container");
  }

  get legend(): Locator {
    return this.footer.locator("#legend");
  }

  /** The "No data" swatch next to the legend. */
  get legendNoDataCell(): Locator {
    return this.footer.getByTestId("empty-cell-legend");
  }

  get nextPageButton(): Locator {
    return this.footer.getByTestId("next-page-button");
  }

  get previousPageButton(): Locator {
    return this.footer.getByTestId("previous-page-button");
  }

  get pageSizeSelect(): Locator {
    return this.footer.getByTestId("page-size-selector").getByRole("combobox");
  }

  /** The "1–25 of 6005" label. */
  get displayedRows(): Locator {
    return this.footer.getByText(/^\d+–\d+ of \d+$/);
  }

  /** The range and total in the pagination label, e.g. { from: 1, to: 25, total: 6005 }. */
  async displayedRange(): Promise<{ from: number; to: number; total: number }> {
    const text = (await this.displayedRows.innerText()).trim();
    const match = /^(\d+)–(\d+) of (\d+)$/.exec(text);
    if (!match) throw new Error(`Unexpected pagination label "${text}"`);
    return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
  }

  /** The total number of associations, once the table has loaded. */
  async totalCount(): Promise<number> {
    await this.expectLoaded();
    return (await this.displayedRange()).total;
  }

  /**
   * Assert the total settles on a value below `ceiling` and above zero: what a filter
   * that narrows the list does. The total only changes when the new response arrives.
   */
  async expectTotalBelow(ceiling: number): Promise<number> {
    await expect
      .poll(async () => (await this.displayedRange()).total, {
        message: `the total should drop below ${ceiling}`,
        timeout: SEARCH_TIMEOUT,
      })
      .toBeLessThan(ceiling);
    await this.expectLoaded();
    const { total } = await this.displayedRange();
    expect(total, "the filtered list should not be empty").toBeGreaterThan(0);
    return total;
  }

  async expectTotal(total: number): Promise<void> {
    await expect
      .poll(async () => (await this.displayedRange()).total, {
        message: `the total should be ${total}`,
        timeout: SEARCH_TIMEOUT,
      })
      .toBe(total);
  }

  async goToNextPage(): Promise<void> {
    const before = await this.rowNames();
    await this.nextPageButton.click();
    await this.expectRowsToDifferFrom(before);
  }

  async goToPreviousPage(): Promise<void> {
    const before = await this.rowNames();
    await this.previousPageButton.click();
    await this.expectRowsToDifferFrom(before);
  }

  /** Pick a page size and wait for that many rows (or `expectedRows`, on a short page). */
  async selectPageSize(size: number, expectedRows: number = size): Promise<void> {
    await this.pageSizeSelect.click();
    await this.page.getByRole("option", { name: String(size), exact: true }).click();
    await expect(this.pageSizeSelect).toHaveText(String(size));
    await expect(this.nameCells(), `the page should show ${expectedRows} rows`).toHaveCount(
      expectedRows,
      { timeout: TABLE_LOAD_TIMEOUT }
    );
    await expect(this.loadingIndicators).toHaveCount(0);
  }

  // ───────────────────────────── toolbar ─────────────────────────────

  get facetsButton(): Locator {
    return this.page.getByTestId("facets-search-button");
  }

  get facetsPopover(): Locator {
    return this.page.getByTestId("facets-popover");
  }

  get facetSearchInput(): Locator {
    return this.facetsPopover.getByRole("combobox", { name: /^Search \w+ filter$/ });
  }

  get facetCategorySelect(): Locator {
    return this.facetsPopover.getByLabel("Facet filter").getByRole("combobox");
  }

  /** The suggestions of the facet search (rendered in a portal). */
  get facetOptions(): Locator {
    return this.page.getByRole("listbox").getByRole("option");
  }

  get columnOptionsButton(): Locator {
    return this.page.getByTestId("column-options-button");
  }

  get uploadButton(): Locator {
    return this.page.getByRole("button", { name: "Upload list of entities" });
  }

  get exportButton(): Locator {
    return this.page.getByTestId("export-button");
  }

  get exportMenu(): Locator {
    return this.page.getByTestId("export-popover");
  }

  get viewSwitch(): Locator {
    return this.page.getByTestId("display-mode-switch");
  }

  get associationsViewButton(): Locator {
    return this.page.getByTestId("associations-view-button");
  }

  get prioritisationViewButton(): Locator {
    return this.page.getByTestId("prioritisation-view-button");
  }

  async openFacets(): Promise<void> {
    await this.facetsButton.click();
    await expect(this.facetsPopover).toBeVisible();
    await expect(this.facetSearchInput).toBeVisible();
  }

  /** Close whatever popover, menu or dialog is open on top of the page. */
  async dismissOverlay(overlay: Locator): Promise<void> {
    await this.page.keyboard.press("Escape");
    await expect(overlay).toBeHidden();
  }

  async openExportMenu(): Promise<void> {
    await this.exportButton.click();
    await expect(this.exportMenu.getByRole("menuitem")).toHaveText(["Download data", "API query"]);
  }

  /** Open Export > Download data. Returns the dialog. */
  async openDownloadDialog(): Promise<Locator> {
    await this.openExportMenu();
    await this.exportMenu.getByRole("menuitem", { name: "Download data" }).click();
    const dialog = this.page.getByRole("dialog").filter({ hasText: "Download data as:" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Open Export > API query. Returns the drawer. */
  async openApiQuery(): Promise<Locator> {
    await this.openExportMenu();
    await this.exportMenu.getByRole("menuitem", { name: "API query" }).click();
    const drawer = this.page.getByRole("dialog").filter({ has: this.page.getByTestId("drawer-close") });
    await expect(drawer).toBeVisible();
    return drawer;
  }

  /** Open the "Upload targets" dialog. Returns it. */
  async openUploadDialog(): Promise<Locator> {
    await this.uploadButton.click();
    const dialog = this.page.getByRole("dialog").filter({ hasText: "Upload list of" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async switchToPrioritisation(): Promise<void> {
    await this.prioritisationViewButton.click();
    await expect(this.prioritisationViewButton).toHaveAttribute("aria-pressed", "true");
    await this.expectUrlParam("table", "prioritisations");
  }

  async switchToAssociations(): Promise<void> {
    await this.associationsViewButton.click();
    await expect(this.associationsViewButton).toHaveAttribute("aria-pressed", "true");
    await this.expectUrlParam("table", "associations");
  }

  /** Type into the name search. The table re-queries after a 300 ms debounce. */
  async searchByName(term: string): Promise<void> {
    await this.nameFilter.fill(term);
    await this.expectUrlParam("q", term);
  }

  // ───────────────────────────── active filters ─────────────────────────────

  get activeFilters(): Locator {
    return this.page.getByTestId("active-filters-panel");
  }

  /** `key` is "entity-search", "column-options", "sort", "pinned", "uploaded" or a facet id. */
  filterChip(key: string): Locator {
    return this.activeFilters.getByTestId(`active-filter-chip-${key}`);
  }

  get filterChips(): Locator {
    return this.activeFilters.locator("[data-testid^='active-filter-chip-']");
  }

  get clearAllFiltersButton(): Locator {
    return this.activeFilters.getByTestId("clear-all-filters-button");
  }

  /** Click the delete icon of a filter chip and wait for the chip to go. */
  async removeFilterChip(key: string): Promise<void> {
    const chip = this.filterChip(key);
    await chip.locator(".MuiChip-deleteIcon").click();
    await expect(chip).toHaveCount(0);
  }

  // ───────────────────────────── column options (weights) ─────────────────────────────

  get weightsPanel(): Locator {
    return this.root.getByTestId("weights-controls-container");
  }

  get closeWeightsButton(): Locator {
    return this.weightsPanel.getByTestId("close-weights-button");
  }

  weightSlider(columnId: string): Locator {
    return this.weightsPanel.getByTestId(`weight-slider-${columnId}`).getByRole("slider");
  }

  get weightSliders(): Locator {
    return this.weightsPanel.locator("[data-testid^='weight-slider-']");
  }

  requiredCheckbox(columnId: string): Locator {
    return this.weightsPanel.getByTestId(`required-checkbox-${columnId}`).getByRole("checkbox");
  }

  get requiredCheckboxes(): Locator {
    return this.weightsPanel.locator("[data-testid^='required-checkbox-']");
  }

  async openColumnOptions(): Promise<void> {
    await this.columnOptionsButton.click();
    await expect(this.weightsPanel).toBeVisible();
    await this.expectUrlParam("weights", "1");
  }

  // ───────────────────────────── row menu, pinning ─────────────────────────────

  /** The context menu of a row (rendered in a portal). */
  get rowMenu(): Locator {
    return this.page.getByRole("menu");
  }

  rowMenuItem(name: string | RegExp): Locator {
    return this.rowMenu.getByRole("menuitem", { name });
  }

  /** Click a row's name and wait for its menu, which is headed by that name. */
  async openRowMenu(row: Locator): Promise<string> {
    const name = await this.rowName(row);
    await this.nameText(row).click();
    await expect(this.rowMenu.getByRole("heading", { name, exact: true })).toBeVisible();
    return name;
  }

  /** Pin a row of the core body through its menu. Returns the row's name. */
  async pinRow(row: Locator): Promise<string> {
    const name = await this.openRowMenu(row);
    await this.rowMenu.getByRole("menuitem", { name: "Pin target", exact: true }).click();
    await expect(this.rowMenu).toBeHidden();
    await expect(
      this.rowByName(name, "pinning"),
      `${name} should appear in the pinned rows`
    ).toBeVisible({ timeout: TABLE_LOAD_TIMEOUT });
    return name;
  }

  /** The "Pinned (1 of 1)" / "Uploaded (…)" / "All (…)" bar above a body. */
  bodyIndicator(body: "core" | "pinning" | "uploaded"): Locator {
    return this.root.getByTestId(`section-${body}`);
  }

  deleteBodyButton(body: "pinning" | "uploaded"): Locator {
    return this.root.getByTestId(`delete-${body}-button`);
  }

  // ───────────────────────────── evidence / detail panels ─────────────────────────────

  /** Every detail panel currently open under a row. */
  get openPanels(): Locator {
    return this.root.locator("[data-testid^='evidence-section-']");
  }

  panel(panelKey: string): EvidencePanel {
    return new EvidencePanel(this.root, panelKey);
  }

  /**
   * Click a cell with a value and assert the panel it opens: the one for that column,
   * and only that one, showing the given widget fully loaded.
   */
  async openPanel(
    row: Locator,
    columnId: string,
    expected: { panelKey: string; sectionId: string }
  ): Promise<EvidencePanel> {
    const cell = this.dataCell(row, columnId);
    await expect(cell, `the row should have a value in "${columnId}"`).toBeVisible();
    await cell.click();
    const panel = this.panel(expected.panelKey);
    await panel.expectLoaded(expected.sectionId);
    await expect(this.openPanels, "only the clicked cell's panel should be open").toHaveCount(1);
    return panel;
  }

  // ───────────────────────────── interactors ─────────────────────────────

  /** The interactors block nested under the row of `targetId`. */
  interactors(targetId: string): Locator {
    return this.root.getByTestId(`interactors-table-${targetId}`);
  }
}

/** The "Score: 0.69" text a cell with a value carries as its accessible name and tooltip. */
export const SCORE_LABEL = /^Score: -?\d\.\d{2}$/;

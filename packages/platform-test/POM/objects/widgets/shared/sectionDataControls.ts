import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page, type Response } from "@playwright/test";

/**
 * Helpers for the controls most profile sections share: the export menu (DataDownloader),
 * the "API query" drawer (ApiPlaygroundDrawer), and the GraphQL response behind a section.
 *
 * Every helper asserts what it does. None of them returns a default when something is
 * missing.
 */

/** A parsed GraphQL response of one named operation. */
export type OperationResult<Data> = { data: Data; variables: Record<string, unknown> };

function operationNameOf(response: Response): string | null {
  const request = response.request();
  if (request.method() !== "POST") return null;
  const body = request.postData();
  if (!body?.includes('"query"')) return null;
  return (JSON.parse(body) as { operationName?: string }).operationName ?? null;
}

/**
 * Start waiting for the response of a GraphQL operation. Call it BEFORE the navigation or
 * click that issues the query, and await the result afterwards:
 *
 *   const response = waitForOperation<Data>(page, "TargetSafetyQuery");
 *   await page.goto(...);
 *   const { data } = await response;
 *
 * The test still has to assert the data is not empty: comparing the page with an empty
 * response proves nothing.
 */
export async function waitForOperation<Data>(
  page: Page,
  operationName: string
): Promise<OperationResult<Data>> {
  const response = await page.waitForResponse(
    (candidate) => operationNameOf(candidate) === operationName,
    { timeout: 60_000 }
  );
  expect(response.status(), `${operationName} should answer with HTTP 200`).toBe(200);
  const body = (await response.json()) as { data: Data; errors?: unknown[] };
  expect(body.errors, `${operationName} should not return GraphQL errors`).toBeUndefined();
  const variables = (JSON.parse(response.request().postData() ?? "{}").variables ?? {}) as Record<
    string,
    unknown
  >;
  return { data: body.data, variables };
}

/**
 * Answer Europe PMC searches with one deterministic publication per requested id.
 *
 * Europe PMC is a third-party service several widgets call from the browser (publication
 * drawers, the bibliography section). When it throttles or errors it answers without CORS
 * headers, which the browser reports as a console error on a page that is otherwise fine.
 * The specs of the sections tested here stub it so they depend only on the app and its own
 * API. Returns the ids each intercepted search asked for.
 */
export async function stubEuropePmc(page: Page): Promise<string[][]> {
  const searches: string[][] = [];
  const answer = (ids: string[]) =>
    JSON.stringify({
      hitCount: ids.length,
      resultList: {
        result: ids.map((id) => ({
          id,
          source: "MED",
          pmid: id,
          title: `Stubbed publication ${id}`,
          pubYear: "2017",
          authorList: { author: [{ fullName: "Tester A", lastName: "Tester", initials: "A" }] },
          journalInfo: { dateOfPublication: "2017", journal: { title: "Journal of Stubs" } },
          pageInfo: "1-2",
          abstractText: `Abstract of ${id}`,
          inEPMC: "N",
          inPMC: "N",
          isOpenAccess: "N",
        })),
      },
    });
  const idsOf = (query: string) =>
    query
      .split(" OR ")
      .map((part) => part.replace(/^ext_id:/, "").trim())
      .filter(Boolean);

  await page.route("https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST", async (route) => {
    const query = new URLSearchParams(route.request().postData() ?? "").get("query") ?? "";
    const ids = idsOf(query);
    searches.push(ids);
    await route.fulfill({ status: 200, contentType: "application/json", body: answer(ids) });
  });
  // The Europe PMC evidence section looks its page of publications up with a GET instead
  // (not counted in the returned searches, which are those of the POST).
  await page.route(
    /^https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search\?/,
    async (route) => {
      const query = new URL(route.request().url()).searchParams.get("query") ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: answer(idsOf(query)),
      });
    }
  );
  return searches;
}

export type DownloadedFile = { filename: string; text: string };

export class SectionDataControls {
  /**
   * @param scope the section, or the part of it that holds exactly the controls under test
   * @param index which export / API-query pair inside the scope, when it has several
   */
  constructor(
    private readonly page: Page,
    private readonly scope: Locator,
    private readonly index = 0
  ) {}

  get exportButton(): Locator {
    return this.scope.getByTestId("data-downloader").nth(this.index).getByRole("button");
  }

  get apiQueryButton(): Locator {
    return this.scope.getByRole("button", { name: "API query" }).nth(this.index);
  }

  /** The export menu, which is rendered in a portal outside the section. */
  get exportMenu(): Locator {
    return this.page.getByRole("menu");
  }

  get apiQueryDrawer(): Locator {
    return this.page.getByTestId("api-playground-drawer");
  }

  /** Open the export menu and assert it offers exactly JSON and TSV. */
  async openExportMenu(): Promise<Locator> {
    await this.exportButton.click();
    await expect(this.exportMenu).toBeVisible();
    await expect(this.exportMenu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    await expect(this.exportMenu).toContainText(
      "Column settings and filters will not affect export"
    );
    return this.exportMenu;
  }

  /** Download the data in one format and return the file name and its content. */
  async download(format: "Json" | "TSV"): Promise<DownloadedFile> {
    const menu = await this.openExportMenu();
    const downloadStarted = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format }).click();
    const download = await downloadStarted;
    await expect(this.exportMenu, "the export menu should close after a download").toBeHidden();
    const path = await download.path();
    return { filename: download.suggestedFilename(), text: await readFile(path, "utf8") };
  }

  /** Download as JSON and parse it. Fails if the file is not a JSON array. */
  async downloadJson(): Promise<{ filename: string; rows: Record<string, unknown>[] }> {
    const { filename, text } = await this.download("Json");
    const rows: unknown = JSON.parse(text);
    expect(Array.isArray(rows), "the JSON export should be an array of rows").toBe(true);
    return { filename, rows: rows as Record<string, unknown>[] };
  }

  /** Download as TSV and split it into a header and data lines. */
  async downloadTsv(): Promise<{ filename: string; header: string[]; lines: string[][] }> {
    const { filename, text } = await this.download("TSV");
    const [headerLine, ...dataLines] = text.split("\n");
    return {
      filename,
      header: headerLine.split("\t"),
      lines: dataLines.map((line) => line.split("\t")),
    };
  }

  /**
   * Open the API query drawer and assert it shows the playground loaded with the
   * section's own query and variables.
   */
  async openApiQuery(operationName: string, variableValue: string): Promise<Locator> {
    await this.apiQueryButton.click();
    const drawer = this.apiQueryDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("API query");
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
      `the playground should be loaded with the ${operationName} query`
    ).toContainText(operationName);
    await expect(
      drawer,
      "the playground should be loaded with the section's variables"
    ).toContainText(variableValue);
    return drawer;
  }

  async closeApiQuery(): Promise<void> {
    await this.apiQueryDrawer.getByTestId("drawer-close").click();
    await expect(this.apiQueryDrawer).toBeHidden();
  }
}

const TABLE_LOADING = ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root";

/**
 * A client-side OtTable together with the controls OtTable renders around the `<table>`
 * element (search box, column picker, rows-per-page select, pagination). `utils/table.ts`
 * scopes those controls to the `<table>` itself, where they are not; this class scopes
 * them to the block that holds exactly one table.
 */
export class SectionTable {
  readonly table: Locator;

  /** @param scope a section, or a part of one, that holds exactly one OtTable */
  constructor(readonly scope: Locator) {
    this.table = scope.getByTestId("ot-table");
  }

  get rows(): Locator {
    return this.table.locator("tbody tr");
  }

  get headers(): Locator {
    return this.table.locator("thead th");
  }

  get searchInput(): Locator {
    return this.scope.getByTestId("table-search-input");
  }

  get columnsButton(): Locator {
    return this.scope.getByRole("button", { name: "Columns" });
  }

  get pageSizeSelect(): Locator {
    return this.scope.getByRole("combobox");
  }

  /** The "1 - 10 of 26" position label. */
  get position(): Locator {
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

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.row(rowIndex).locator("td").nth(columnIndex);
  }

  /** The cells of one column on the current page. */
  column(columnIndex: number): Locator {
    return this.rows.locator(`td:nth-child(${columnIndex + 1})`);
  }

  /** The rows whose cell in `columnIndex` has exactly this text. */
  rowsWith(columnIndex: number, text: string | RegExp): Locator {
    return this.rows.filter({
      has: this.scope
        .page()
        .locator(`td:nth-child(${columnIndex + 1})`)
        .filter({ hasText: text }),
    });
  }

  /** Assert the table is rendered, has stopped loading and shows exactly `count` rows. */
  async expectRowCount(count: number): Promise<void> {
    await expect(this.table).toBeVisible();
    await expect(this.table.locator(TABLE_LOADING), "the table should finish loading").toHaveCount(
      0
    );
    await expect(this.rows).toHaveCount(count);
  }

  /** The trimmed text of every cell of one column on the current page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    return (await this.column(columnIndex).allInnerTexts()).map((text) => text.trim());
  }

  /** Type into the search box. The table filters after a debounce: assert on rows next. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await expect(this.searchInput).toHaveValue(term);
  }

  /** Assert the position label and which pagination buttons are usable. */
  async expectPosition(
    label: string,
    { canGoBack, canGoForward }: { canGoBack: boolean; canGoForward: boolean }
  ): Promise<void> {
    await expect(this.position).toHaveText(label);
    for (const button of [this.firstPageButton, this.previousPageButton]) {
      if (canGoBack) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
    }
    for (const button of [this.nextPageButton, this.lastPageButton]) {
      if (canGoForward) await expect(button).toBeEnabled();
      else await expect(button).toBeDisabled();
    }
  }

  /**
   * Open the column picker and return its list. The picker lives in a portal, so it is
   * looked up on the page.
   */
  async openColumnPicker(): Promise<Locator> {
    await this.columnsButton.click();
    const list = this.scope.page().getByRole("list", { name: "column-visibility-list" });
    await expect(list).toBeVisible();
    return list;
  }
}

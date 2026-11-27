import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

export type SortDirection = "ASCENDING" | "DESCENDING";
export type SortVariable = { key: string; direction: SortDirection };
export type SearchVariable = { text: string; fields: string[] };

/** The variables every OtTableServer section of the credible set page sends with its query. */
export type TableVariables = {
  credibleSetId: string;
  index: number;
  size: number;
  sort: SortVariable[];
  search?: SearchVariable;
};

/** How the values of a column are compared when checking that a sort was applied. */
export type SortKind = "text" | "number" | "pValue" | "unreadable";

/** A column the server can sort: its header, the sort key sent to the API and where it is. */
export type SortableColumn = {
  header: string;
  key: string;
  column: number;
  kind: SortKind;
};

const LOADING = ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root";

/** "1.50×10 -13" as a number. Fails for any other text. */
export function parsePValue(text: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*×\s*10\s*(-?\d+)$/.exec(text.replace(/\s+/g, " ").trim());
  if (!match) throw new Error(`"${text}" is not a p-value in scientific notation`);
  return Number(match[1]) * 10 ** Number(match[2]);
}

/** "13,612" or "-0.0630" as a number. Fails for any other text. */
export function parseNumber(text: string): number {
  const cleaned = text.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(cleaned)) throw new Error(`"${text}" is not a number`);
  return Number(cleaned);
}

/** The values of a column as comparable items, or an empty array for a column that cannot be read. */
export function comparable(texts: readonly string[], kind: SortKind): (number | string)[] {
  switch (kind) {
    case "pValue":
      return texts.map(parsePValue);
    case "number":
      return texts.map(parseNumber);
    case "text":
      return texts.map((text) =>
        text
          .replace(/\s+/g, " ")
          .replace(/ lead$/, "")
          .trim()
      );
    case "unreadable":
      return [];
  }
}

/** Whether `values` run in `direction`; equal neighbours are allowed (the server breaks ties). */
export function isOrdered(values: readonly (number | string)[], direction: SortDirection): boolean {
  return values.every((value, index) => {
    if (index === 0) return true;
    const previous = values[index - 1];
    return direction === "ASCENDING" ? previous <= value : previous >= value;
  });
}

export function opposite(direction: SortDirection): SortDirection {
  return direction === "ASCENDING" ? "DESCENDING" : "ASCENDING";
}

/**
 * A credible set page section built on OtTableServer: the table pages, sorts and searches on
 * the server, so every one of those is a new query whose variables the tests can read.
 */
export class ServerTableSection {
  readonly section: Locator;
  readonly table: OtTable;

  constructor(
    readonly page: Page,
    sectionId: string,
    readonly operation: string
  ) {
    this.section = sectionLocator(page, sectionId);
    this.table = new OtTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get headers(): Locator {
    return this.table.headers;
  }

  get rows(): Locator {
    return this.table.rows;
  }

  row(index: number): Locator {
    return this.table.row(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.table.cell(rowIndex, columnIndex);
  }

  /** The link in a cell. */
  link(rowIndex: number, columnIndex: number): Locator {
    return this.cell(rowIndex, columnIndex).getByRole("link");
  }

  /** The text of each cell in one column on this page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    return this.table.columnTexts(columnIndex);
  }

  /** Assert nothing in the table or its footer is loading. */
  async expectSettled(): Promise<void> {
    await expect(this.section.locator(LOADING), "the table should finish loading").toHaveCount(0);
  }

  /** The total the footer reports. */
  async total(): Promise<number> {
    return this.table.total();
  }

  /** Assert the footer reads "<start> - <end> of <total>". */
  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await this.table.expectPosition(start, end, total);
  }

  /**
   * Run `action` and return the variables of the first query of this section's operation that
   * it sends and that satisfies `matches`. A query the Apollo cache can answer is not sent, so
   * only use this for a state the page has not been in yet.
   */
  async requestDuring(
    action: () => Promise<void>,
    matches: (variables: TableVariables) => boolean = () => true
  ): Promise<TableVariables> {
    const sent = this.page.waitForRequest((request) => {
      const body = request.postData() ?? "";
      if (request.method() !== "POST" || !body.includes(this.operation)) return false;
      const parsed = JSON.parse(body) as { operationName?: string; variables?: TableVariables };
      return (
        parsed.operationName === this.operation && !!parsed.variables && matches(parsed.variables)
      );
    });
    await action();
    return ((await sent).postDataJSON() as { variables: TableVariables }).variables;
  }

  /**
   * Type a term into the search box and return the variables of the query for the first page
   * of the matches. From a later page the table first asks for that same page of the new
   * search, and only then goes back to the first page, so that query is waited for.
   */
  async search(term: string): Promise<TableVariables> {
    const variables = await this.requestDuring(
      () => this.table.searchInput.fill(term),
      (candidate) => candidate.search?.text === term && candidate.index === 0
    );
    await expect(this.table.searchInput).toHaveValue(term);
    return variables;
  }

  /** Empty the search box and wait for the table to show the unfiltered rows again. */
  async clearSearch(): Promise<void> {
    await this.table.searchInput.fill("");
    await expect(this.table.searchInput).toHaveValue("");
  }

  /**
   * Click a column title and return the sort the page sends to the server. `key` is the sort
   * key the click must produce, or null for the click that clears the sort.
   */
  async clickSort(header: string, key: string | null): Promise<SortVariable[]> {
    // a header with a help icon reads "H4?", so match on how the title starts
    const title = new RegExp(`^${header.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&")}`);
    const variables = await this.requestDuring(
      () => this.table.clickHeader(title),
      (candidate) => (key === null ? candidate.sort.length === 0 : candidate.sort[0]?.key === key)
    );
    return variables.sort;
  }

  /** The arrow icons of a header: a sortable column has one, others have none. */
  sortIcon(header: string | RegExp): Locator {
    return this.table.header(header).locator("svg[data-icon^='arrow']");
  }

  /** The column values on this page, ready to compare. */
  async comparableColumn(columnIndex: number, kind: SortKind): Promise<(number | string)[]> {
    return comparable(await this.columnTexts(columnIndex), kind);
  }

  /**
   * Assert the rows on this page run in `direction` in a column. Polls: the sorted page
   * arrives after the footer.
   */
  async expectColumnOrdered(
    columnIndex: number,
    kind: SortKind,
    direction: SortDirection
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          const values = await this.comparableColumn(columnIndex, kind);
          return values.length > 0 && isOrdered(values, direction);
        },
        { message: `the column should run ${direction.toLowerCase()}` }
      )
      .toBe(true);
  }

  /**
   * Click the next / previous / first / last page button and return the variables of the
   * query it sends.
   */
  async pageTo(button: Locator, index: number): Promise<TableVariables> {
    return this.requestDuring(
      () => button.click(),
      (candidate) => candidate.index === index
    );
  }

  /** Change the page size and return the variables of the query it sends. */
  async resize(size: number): Promise<TableVariables> {
    return this.requestDuring(
      () => this.table.setPageSize(size),
      (candidate) => candidate.size === size
    );
  }

  /**
   * Open the API query drawer, check it holds this table's query and the variables of the
   * state the table is in (each of `variableText` must appear), and close it.
   */
  async expectApiQuery(variableText: readonly string[] = []): Promise<void> {
    // The playground downloads the API schema when it opens; its editor validates the query
    // against that schema, so wait for it before closing the drawer.
    const schema = this.page.waitForResponse(
      (response) => response.request().postData()?.includes("IntrospectionQuery") ?? false
    );
    await this.table.apiQueryButton.click();
    await schema;
    const drawer = this.table.apiQueryDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(
      drawer,
      `the playground should hold the ${this.operation} operation`
    ).toContainText(this.operation);
    for (const text of variableText) {
      await expect(drawer, `the playground variables should hold ${text}`).toContainText(text);
    }
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }
}

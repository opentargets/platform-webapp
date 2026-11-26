import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

/**
 * A credible set page section built on OtTableOffsetPagination: a server-paginated table
 * with Columns, Export and API query controls, and first / previous / next page buttons
 * (there is no search box, no sorting and no last-page button on this component).
 */
export class OffsetPaginatedSection {
  readonly section: Locator;
  readonly table: OtTable;

  constructor(
    readonly page: Page,
    sectionId: string
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

  get firstPageButton(): Locator {
    return this.section.getByRole("button", { name: "first page" });
  }

  get previousPageButton(): Locator {
    return this.section.getByRole("button", { name: "previous page" });
  }

  get nextPageButton(): Locator {
    return this.section.getByRole("button", { name: "next page" });
  }

  /** Assert nothing in the table or its footer is loading. */
  async expectSettled(): Promise<void> {
    await expect(
      this.section.locator(".MuiSkeleton-root, .MuiCircularProgress-root"),
      "the table should finish loading"
    ).toHaveCount(0);
  }

  /** Assert the footer reads "<start> - <end> of <total>". */
  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.table.pagePosition).toHaveText(`${start} - ${end} of ${total}`);
  }

  /** The total the footer reports. */
  async total(): Promise<number> {
    return this.table.total();
  }

  /** On the first page of several: first and previous are off, next is on. */
  async expectOnFirstOfSeveralPages(): Promise<void> {
    await expect(this.firstPageButton).toBeDisabled();
    await expect(this.previousPageButton).toBeDisabled();
    await expect(this.nextPageButton).toBeEnabled();
  }

  /** On the last of several pages: first and previous are on, next is off. */
  async expectOnLastPage(): Promise<void> {
    await expect(this.firstPageButton).toBeEnabled();
    await expect(this.previousPageButton).toBeEnabled();
    await expect(this.nextPageButton).toBeDisabled();
  }

  /** The text of each cell in one column on this page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    return this.table.columnTexts(columnIndex);
  }

  /** The href of the link in a cell. */
  link(rowIndex: number, columnIndex: number): Locator {
    return this.cell(rowIndex, columnIndex).getByRole("link");
  }

  /**
   * Click a pagination button and return the variables of the request the table sends:
   * this section pages on the server, so each click is a new query.
   */
  async clickAndGetPageRequest(button: Locator, operation: string): Promise<{ index: number; size: number }> {
    const request = this.page.waitForRequest(
      (candidate) => candidate.method() === "POST" && (candidate.postData() ?? "").includes(operation)
    );
    await button.click();
    const body = JSON.parse((await request).postData() ?? "{}");
    return body.variables.page as { index: number; size: number };
  }

  /** Open the API query drawer, check it holds this table's query, and close it. */
  async expectApiQuery(operation: string): Promise<void> {
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
    await expect(drawer, `the playground should hold the ${operation} operation`).toContainText(operation);
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }
}

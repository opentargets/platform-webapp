import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";

const POSITION = /^(\d+) - (\d+) of (\d+)$/;

/** The "Variants" section of the credible set page: the fine-mapped locus table. */
export class CredibleSetVariantsSection {
  static readonly id = "variants";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Variant",
    "P-value",
    "Beta?",
    "Standard error?",
    "LD (r²)?",
    "Posterior Probability?",
    "log(BF)?",
    "Predicted consequence?",
  ];
  /** Column positions in the table. */
  static readonly column = {
    variant: 0,
    pValue: 1,
    beta: 2,
    standardError: 3,
    ld: 4,
    posterior: 5,
    logBf: 6,
    consequence: 7,
  } as const;

  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, CredibleSetVariantsSection.id);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get table(): Locator {
    return this.section.getByTestId("ot-table");
  }

  get headers(): Locator {
    return this.table.locator("thead th");
  }

  get rows(): Locator {
    return this.table.locator("tbody tr");
  }

  row(rowIndex: number): Locator {
    return this.rows.nth(rowIndex);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.rows.nth(rowIndex).locator("td").nth(columnIndex);
  }

  /** The variant link of a row. */
  variantLink(rowIndex: number): Locator {
    return this.cell(rowIndex, CredibleSetVariantsSection.column.variant).getByRole("link");
  }

  /** The "lead" chip, which only the lead variant's row carries. */
  get leadChips(): Locator {
    return this.rows.getByText("lead", { exact: true });
  }

  /** The ontology link of a row's predicted consequence. */
  consequenceLink(rowIndex: number): Locator {
    return this.cell(rowIndex, CredibleSetVariantsSection.column.consequence).getByRole("link");
  }

  /** The trimmed text of one column for the rows on this page. */
  async columnTexts(columnIndex: number): Promise<string[]> {
    const texts = await this.rows.locator(`td:nth-child(${columnIndex + 1})`).allInnerTexts();
    return texts.map((text) => text.replace(/\s+/g, " ").trim());
  }

  async rowTexts(): Promise<string[]> {
    return (await this.rows.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  }

  // ---- controls ----

  get pagePosition(): Locator {
    return this.section.getByText(POSITION);
  }

  get pageSizeSelect(): Locator {
    return this.section.getByRole("combobox");
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

  get columnsButton(): Locator {
    return this.section.getByRole("button", { name: "Columns", exact: true });
  }

  get columnList(): Locator {
    return this.page.getByRole("list", { name: "column-visibility-list" });
  }

  get exportButton(): Locator {
    return this.section.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  get apiQueryButton(): Locator {
    return this.section.getByRole("button", { name: "API query", exact: true });
  }

  /** Assert nothing in the table or its footer is loading. */
  async expectSettled(): Promise<void> {
    await expect(
      this.section.locator(".MuiSkeleton-root, .MuiCircularProgress-root"),
      "the table should finish loading"
    ).toHaveCount(0);
  }

  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.pagePosition).toHaveText(`${start} - ${end} of ${total}`);
  }

  /** The total the footer reports. */
  async total(): Promise<number> {
    await expect(this.pagePosition).toHaveText(POSITION);
    return Number((await this.pagePosition.innerText()).trim().split(" of ")[1]);
  }

  async setPageSize(size: number): Promise<void> {
    await this.pageSizeSelect.selectOption(String(size));
    await expect(this.pageSizeSelect).toHaveValue(String(size));
  }

  /** Download through the Export menu in one format and return what was saved. */
  async export(format: "Json" | "TSV"): Promise<{ filename: string; content: string }> {
    await this.exportButton.click();
    const menu = this.page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    await expect(menu).toContainText("Column settings and filters will not affect export");
    const downloadPromise = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await downloadPromise;
    const content = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu closes after a format is chosen").toBeHidden();
    return { filename: download.suggestedFilename(), content };
  }

  /** Open the API query drawer, check it holds this table's query, and close it. */
  async expectApiQuery(): Promise<void> {
    // The playground downloads the API schema when it opens; its editor validates the query
    // against that schema, so wait for it before closing the drawer.
    const schema = this.page.waitForResponse(
      (response) => response.request().postData()?.includes("IntrospectionQuery") ?? false
    );
    await this.apiQueryButton.click();
    await schema;
    const drawer = this.page.getByTestId("api-playground-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(drawer).toContainText("VariantsQuery");
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }
}

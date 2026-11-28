import type { Page } from "@playwright/test";
import { expect, test } from "../../fixtures";
import { stubEuropePmc } from "../../POM/objects/widgets/shared/sectionDataControls";
import type { TestConfig } from "../../types";
import { expectSectionLoaded } from "../../utils/sections";
import { OtTable } from "../../utils/table";

/**
 * Contract of the shared table component, tested on the sections that use it:
 *
 *  - OtTable (client-side: all rows are in the page, search and sort run in the browser)
 *    on the BRAF Gene Ontology and Molecular structure sections.
 *  - OtTableServer (rows come page by page from the API, with server-side search and sort)
 *    on the pharmacogenetics section of warfarin.
 *
 * No section turns on column filters (enableColumnFilter), so there is nothing to test there.
 */

const PAGE_SIZE = 10;
const NO_MATCH = "xyzzyqq";

const GO_SECTION = "geneontology";
const GO_COLUMNS = ["Category", "GO term", "Gene product", "Evidence code", "Source"];

const STRUCTURE_SECTION = "molecularstructure";

const PGX_SECTION = "pharmacogenetics";
const PGX_COLUMNS = [
  "Gene",
  "rsID",
  "Star Allele",
  "Genotype ID?",
  "Variant Consequence",
  "Drug Response Phenotype",
  "Drug Response Category",
  "Directionality",
  "Direct Drug Target",
  "Confidence Level?",
  "Source",
  "Literature",
];
const PGX_LEVEL_COLUMN = 9;
/** PharmGKB clinical annotation levels, strongest first. */
const LEVEL_RANK = ["1A", "1B", "2A", "2B", "3", "4"];

/** BRAF: its profile has the Gene Ontology and Molecular structure sections. */
function targetId(config: TestConfig): string {
  const id = config.target?.primary;
  if (!id) throw new Error("the test config has no primary target");
  return id;
}

/** Warfarin: hundreds of pharmacogenetic records at every confidence level. */
function drugId(config: TestConfig): string {
  const id = config.drug?.alternatives?.smallMolecule;
  if (!id) throw new Error("the test config has no small molecule drug");
  return id;
}

const lastPageStart = (total: number, size: number): number =>
  Math.floor((total - 1) / size) * size + 1;

/** "Level 2A" -> rank of "2A". */
function levelRank(cell: string): number {
  const level = cell.replace(/^Level\s+/, "");
  const rank = LEVEL_RANK.indexOf(level);
  expect(rank, `"${cell}" should be a PharmGKB confidence level`).toBeGreaterThanOrEqual(0);
  return rank;
}

function expectMonotonic(values: readonly number[], direction: "asc" | "desc"): void {
  const sorted = [...values].sort((a, b) => (direction === "asc" ? a - b : b - a));
  expect(values, `values should be ordered ${direction}ending`).toEqual(sorted);
}

test.describe("Table component: client-side (OtTable)", () => {
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  async function openGeneOntology(page: Page, ensemblId: string): Promise<OtTable> {
    await page.goto(`/target/${ensemblId}`);
    const section = await expectSectionLoaded(page, GO_SECTION);
    const table = new OtTable(section);
    await table.expectLoaded(PAGE_SIZE);
    return table;
  }

  async function openStructures(page: Page, ensemblId: string): Promise<OtTable> {
    await page.goto(`/target/${ensemblId}`);
    const section = await expectSectionLoaded(page, STRUCTURE_SECTION);
    const table = new OtTable(section);
    await table.expectLoaded(PAGE_SIZE);
    return table;
  }

  test("renders its columns, a full first page, the footer and the page size choices", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));

    await table.expectHeaders(GO_COLUMNS);
    const total = await table.total();
    expect(total, "BRAF has several pages of annotations").toBeGreaterThan(2 * PAGE_SIZE);
    await table.expectPosition(1, PAGE_SIZE, total);
    await expect(table.rows).toHaveCount(PAGE_SIZE);
    await table.expectFirstPage();

    await test.step("every row has a value in every column", async () => {
      for (let column = 0; column < GO_COLUMNS.length; column++) {
        for (const text of await table.columnTexts(column)) {
          expect(text, `column ${GO_COLUMNS[column]}`).not.toBe("");
        }
      }
    });

    await test.step("the page size select offers 5, 10, 25 and 100 and starts on 10", async () => {
      await expect(table.pageSizeSelect.locator("option")).toHaveText(["5", "10", "25", "100"]);
      await expect(table.pageSizeSelect).toHaveValue(String(PAGE_SIZE));
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(table.searchInput).toHaveAttribute("placeholder", "Search all columns...");
      await expect(table.columnsButton).toBeVisible();
      await expect(table.exportButton).toBeVisible();
      await expect(table.apiQueryButton).toBeVisible();
    });
  });

  test("search keeps only the matching rows and clearing it restores the table", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();
    const firstPage = await table.rowTexts();

    await table.searchInput.pressSequentially("Cellular Component");
    await expect(table.searchInput).toHaveValue("Cellular Component");

    await expect(table.pagePosition, "the footer should count only the matches").not.toHaveText(
      new RegExp(` of ${total}$`)
    );
    const matches = await table.total();
    expect(matches).toBeGreaterThan(0);
    expect(matches).toBeLessThan(total);
    await table.expectPosition(1, Math.min(PAGE_SIZE, matches), matches);
    for (const category of await table.columnTexts(0)) {
      expect(category).toBe("Cellular Component");
    }

    await test.step("the search is case-insensitive", async () => {
      await table.search("cellular component");
      await table.expectPosition(1, Math.min(PAGE_SIZE, matches), matches);
      for (const category of await table.columnTexts(0)) {
        expect(category).toBe("Cellular Component");
      }
    });

    await test.step("clearing the search restores every row", async () => {
      await table.clearSearch();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(firstPage);
    });
  });

  test("search starts again from the first page", async ({ page, testConfig }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    await table.nextPageButton.click();
    await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, await table.total());

    await table.search("Biological Process");
    await expect(table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
    for (const category of await table.columnTexts(0)) {
      expect(category).toBe("Biological Process");
    }
  });

  test("a search with no match leaves no rows, a zero footer and disabled pagination", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();
    const firstPage = await table.rowTexts();

    await table.search(NO_MATCH);
    await expect(table.rows).toHaveCount(0);
    await expect(table.pagePosition).toHaveText("1 - 0 of 0");
    await table.expectHeaders(GO_COLUMNS);
    await table.expectFirstPage(true);

    await table.clearSearch();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(firstPage);
  });

  test("pagination moves between pages and disables the buttons at both ends", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();
    const lastStart = lastPageStart(total, PAGE_SIZE);
    const first = await table.rowTexts();
    await table.expectFirstPage();

    await table.nextPageButton.click();
    await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await table.expectRowsChangedFrom(first);
    const second = await table.rowTexts();
    expect(second).toHaveLength(PAGE_SIZE);
    for (const row of second) expect(first).not.toContain(row);
    await expect(table.firstPageButton).toBeEnabled();
    await expect(table.previousPageButton).toBeEnabled();

    await table.previousPageButton.click();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(first);
    await table.expectFirstPage();

    await table.lastPageButton.click();
    await table.expectPosition(lastStart, total, total);
    await table.expectLastPage();
    await expect(table.rows).toHaveCount(total - lastStart + 1);

    await table.firstPageButton.click();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(first);
    await table.expectFirstPage();
  });

  test("the page size select changes how many rows a page shows", async ({ page, testConfig }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();

    for (const size of [5, 25, 100]) {
      await table.setPageSize(size);
      const shown = Math.min(size, total);
      await expect(table.rows).toHaveCount(shown);
      await table.expectPosition(1, shown, total);
    }
    await table.expectFirstPage(total <= 100);

    await table.setPageSize(5);
    await expect(table.rows).toHaveCount(5);
    await table.lastPageButton.click();
    const lastStart = lastPageStart(total, 5);
    await table.expectPosition(lastStart, total, total);
    await expect(table.rows).toHaveCount(total - lastStart + 1);
  });

  test("the column picker hides and shows columns, and keeps the last one", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();
    const picker = await table.openColumnPicker();
    const boxes = picker.getByRole("checkbox");

    await test.step("lists every column, all checked, and locks the one that cannot be hidden", async () => {
      await expect(boxes).toHaveCount(GO_COLUMNS.length);
      for (const name of GO_COLUMNS) {
        await expect(picker.getByRole("checkbox", { name })).toBeChecked();
      }
      await expect(picker.getByRole("checkbox", { name: "GO term" })).toBeDisabled();
      await expect(picker.getByRole("checkbox", { name: "Source" })).toBeEnabled();
    });

    await test.step("unchecking a column removes its header and its cells", async () => {
      await picker.getByRole("checkbox", { name: "Source" }).uncheck();
      await table.expectHeaders(GO_COLUMNS.filter((name) => name !== "Source"));
      await expect(table.row(0).locator("td")).toHaveCount(GO_COLUMNS.length - 1);
    });

    await test.step("the choice survives paging and searching", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await table.expectHeaders(GO_COLUMNS.filter((name) => name !== "Source"));
      await table.search("Cellular Component");
      await expect(table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
      await table.expectHeaders(GO_COLUMNS.filter((name) => name !== "Source"));
      await table.clearSearch();
    });

    let reopened = picker;
    await test.step("checking it again brings the column back", async () => {
      // clicking the table closed the picker, as clicking away does
      reopened = await table.openColumnPicker();
      await reopened.getByRole("checkbox", { name: "Source" }).check();
      await table.expectHeaders(GO_COLUMNS);
      await expect(table.row(0).locator("td")).toHaveCount(GO_COLUMNS.length);
    });

    await test.step("with one column left it cannot be hidden", async () => {
      for (const name of ["Category", "Gene product", "Evidence code", "Source"]) {
        await reopened.getByRole("checkbox", { name }).uncheck();
      }
      await table.expectHeaders(["GO term"]);
      await expect(reopened.getByRole("checkbox", { name: "GO term" })).toBeDisabled();
    });

    await table.closeColumnPicker(table.scope.getByTestId("section-description"));
  });

  test("export downloads every row as JSON and as TSV, whatever the search", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const total = await table.total();

    await test.step("JSON holds all rows with the exported column names", async () => {
      const file = await table.download("Json");
      expect(file.filename).toBe(`${targetId(testConfig)}-gene-ontology-target.json`);
      const rows = JSON.parse(file.text) as Record<string, string>[];
      expect(rows).toHaveLength(total);
      expect(rows.map((row) => row.category)).toContain("Cellular Component");
    });

    await test.step("TSV has a header line and a line per row", async () => {
      const file = await table.download("TSV");
      expect(file.filename).toBe(`${targetId(testConfig)}-gene-ontology-target.tsv`);
      const lines = file.text.split("\n");
      expect(lines).toHaveLength(total + 1);
    });

    await test.step("a search does not narrow the export", async () => {
      await table.search("Cellular Component");
      await expect(table.pagePosition).not.toHaveText(new RegExp(` of ${total}$`));
      const file = await table.download("Json");
      expect(JSON.parse(file.text)).toHaveLength(total);
    });
  });

  test("the exported rows have one column per table column, with the values the table shows", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    const rows = JSON.parse((await table.download("Json")).text) as Record<string, string>[];
    expect(Object.keys(rows[0])).toEqual([
      "category",
      "goTerm",
      "geneProduct",
      "evidenceCode",
      "source",
    ]);
    expect(rows[0].category).not.toBe("");
    expect(rows[0].geneProduct, "the gene product is a UniProt accession").toMatch(
      /^[A-Z0-9]{6,10}$/
    );

    const tsv = (await table.download("TSV")).text.split("\n");
    expect(tsv[0]).toBe(["category", "goTerm", "geneProduct", "evidenceCode", "source"].join("\t"));
  });

  test("the API query drawer opens with the section's query and closes", async ({
    page,
    testConfig,
  }) => {
    const table = await openGeneOntology(page, targetId(testConfig));
    await table.expectApiQuery("TargetGeneOntologyQuery");
    await table.expectLoaded();
  });

  test("clicking a sortable header sorts every page and the second click reverses it", async ({
    page,
    testConfig,
  }) => {
    const table = await openStructures(page, targetId(testConfig));
    await table.expectHeaders(["ID", "Method", "Resolution", "Chain", "Positions", "Source"]);
    await table.setPageSize(100);
    const total = await table.total();
    expect(total, "BRAF has structures and predictions").toBeGreaterThan(PAGE_SIZE);

    const methods = async () => table.columnTexts(1);
    const sortedBy = (direction: "asc" | "desc", values: string[]) =>
      [...values].sort(
        (a, b) =>
          a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }) *
          (direction === "asc" ? 1 : -1)
      );

    await table.clickHeader("Method");
    await expect(
      table.header("Method").locator("svg[data-icon='arrow-up']:not(.sortableColumn)")
    ).toHaveCount(1);
    const ascending = await methods();
    expect(ascending, "ascending by method").toEqual(sortedBy("asc", ascending));

    await table.clickHeader("Method");
    await expect(table.header("Method").locator("svg[data-icon='arrow-down']")).toHaveCount(1);
    const descending = await methods();
    expect(descending, "descending by method").toEqual(sortedBy("desc", descending));
    expect(new Set(ascending).size, "the structures use several methods").toBeGreaterThan(1);
    expect(ascending[0], "the sort reorders the whole dataset").not.toBe(descending[0]);
    expect(ascending.at(-1)).not.toBe(ascending[0]);

    await test.step("the order continues across pages", async () => {
      await table.setPageSize(PAGE_SIZE);
      const firstPageRows = await table.rowTexts();
      const firstPage = await methods();
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await table.expectRowsChangedFrom(firstPageRows);
      const secondPage = await methods();
      expect(
        [...firstPage, ...secondPage],
        "the second page continues the ascending order"
      ).toEqual(sortedBy("asc", [...firstPage, ...secondPage]));
    });
  });

  test("a numeric column sorts by value and a column without sorting has no sort control", async ({
    page,
    testConfig,
  }) => {
    const table = await openStructures(page, targetId(testConfig));
    await table.setPageSize(100);
    const resolutions = async (): Promise<number[]> =>
      (await table.columnTexts(2))
        .filter((text) => /^\d+(\.\d+)?\s/.test(text))
        .map((text) => Number.parseFloat(text));

    await expect(table.header("Chain").locator("svg")).toHaveCount(0);
    await expect(table.header("Resolution").locator("svg.sortableColumn")).toHaveCount(1);

    await table.clickHeader("Resolution");
    const first = await resolutions();
    expect(first.length, "most structures have a resolution").toBeGreaterThan(5);
    const firstDirection = first[0] <= first.at(-1)! ? "asc" : "desc";
    expectMonotonic(first, firstDirection);

    await table.clickHeader("Resolution");
    const second = await resolutions();
    expectMonotonic(second, firstDirection === "asc" ? "desc" : "asc");
    expect(second[0], "the other end of the dataset is on top").not.toBe(first[0]);
  });
});

test.describe("Table component: server-side (OtTableServer)", () => {
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  async function openPharmacogenetics(page: Page, chemblId: string): Promise<OtTable> {
    await page.goto(`/drug/${chemblId}`);
    const section = await expectSectionLoaded(page, PGX_SECTION);
    const table = new OtTable(section);
    await table.expectLoaded(PAGE_SIZE);
    return table;
  }

  const levels = async (table: OtTable): Promise<number[]> =>
    (await table.columnTexts(PGX_LEVEL_COLUMN)).map(levelRank);

  test("renders its columns, a full first page ordered by confidence, and the footer", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));

    await table.expectHeaders(PGX_COLUMNS);
    const total = await table.total();
    expect(total, "warfarin has many pharmacogenetic records").toBeGreaterThan(5 * PAGE_SIZE);
    await table.expectPosition(1, PAGE_SIZE, total);
    await expect(table.rows).toHaveCount(PAGE_SIZE);
    await table.expectFirstPage();

    await test.step("the default order is by confidence level, strongest first", async () => {
      expectMonotonic(await levels(table), "asc");
    });

    await test.step("the page size select offers 10, 25 and 100 and starts on 10", async () => {
      await expect(table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await expect(table.pageSizeSelect).toHaveValue(String(PAGE_SIZE));
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(table.searchInput).toHaveAttribute("placeholder", "Search all columns...");
      await expect(table.columnsButton).toBeVisible();
      await expect(table.exportButton).toBeVisible();
      await expect(table.apiQueryButton).toBeVisible();
    });
  });

  test("search asks the server and keeps only the matching rows, clearing restores them", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    const firstPage = await table.rowTexts();

    await table.searchInput.pressSequentially("efficacy");
    await expect(table.searchInput).toHaveValue("efficacy");
    await expect(table.pagePosition).not.toHaveText(new RegExp(` of ${total}$`));
    const matches = await table.total();
    expect(matches).toBeGreaterThan(PAGE_SIZE);
    expect(matches).toBeLessThan(total);
    await table.expectPosition(1, PAGE_SIZE, matches);

    await expect(table.rows).toHaveCount(PAGE_SIZE);
    for (const row of await table.rowTexts()) expect(row).toContain("efficacy");

    await test.step("later pages hold matches too", async () => {
      await table.lastPageButton.click();
      const lastStart = lastPageStart(matches, PAGE_SIZE);
      await table.expectPosition(lastStart, matches, matches);
      await expect(table.rows).toHaveCount(matches - lastStart + 1);
      await table.expectRowsChangedFrom(firstPage);
      for (const row of await table.rowTexts()) expect(row).toContain("efficacy");
    });

    await test.step("a new search starts again from the first page", async () => {
      await table.search("toxicity");
      await expect(table.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
      await expect(table.pagePosition).not.toHaveText(new RegExp(` of ${matches}$`));
      for (const row of await table.rowTexts()) expect(row).toContain("toxicity");
    });

    await test.step("clearing the search restores every row", async () => {
      await table.clearSearch();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(firstPage);
    });
  });

  test("a search with no match leaves no rows, a zero footer and disabled pagination", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    const firstPage = await table.rowTexts();

    await table.search(NO_MATCH);
    await expect(table.pagePosition).toHaveText("1 - 0 of 0");
    await expect(table.rows).toHaveCount(0);
    await table.expectHeaders(PGX_COLUMNS);
    await table.expectFirstPage(true);

    await table.clearSearch();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(firstPage);
  });

  test("sorting by confidence level reorders the whole dataset, reverses, then clears", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    const ascendingRows = await table.rowTexts();
    const ascendingLevels = await levels(table);
    const strongest = ascendingLevels[0];

    await table.clickHeader(/Confidence Level/);
    await table.expectRowsChangedFrom(ascendingRows);
    await expect(
      table.header(/Confidence Level/).locator("svg[data-icon='arrow-down']")
    ).toHaveCount(1);
    await table.expectPosition(1, PAGE_SIZE, total);
    const descendingLevels = await levels(table);
    expectMonotonic(descendingLevels, "desc");
    expect(descendingLevels[0], "descending starts with the weakest level").toBeGreaterThan(
      strongest
    );

    await test.step("the last page of the descending order holds the strongest level", async () => {
      await table.lastPageButton.click();
      await table.expectPosition(lastPageStart(total, PAGE_SIZE), total, total);
      // the position label moves before the new page's rows arrive, so wait for the rows
      await expect.poll(async () => (await levels(table)).at(-1)).toBe(strongest);
      expectMonotonic(await levels(table), "desc");
    });

    await test.step("a third click clears the sort and goes back to the first page", async () => {
      await table.clickHeader(/Confidence Level/);
      await expect(table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
      await expect(table.header(/Confidence Level/).locator("svg.sortableColumn")).toHaveCount(1);
    });

    await test.step("a fourth click sorts ascending again, from the first page", async () => {
      await table.clickHeader(/Confidence Level/);
      await expect(
        table.header(/Confidence Level/).locator("svg[data-icon='arrow-up']:not(.sortableColumn)")
      ).toHaveCount(1);
      await expect.poll(async () => levels(table)).toEqual(ascendingLevels);
      await expect(table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
    });

    await test.step("columns without a sort field have no sort control", async () => {
      await expect(table.header("Gene").locator("svg")).toHaveCount(0);
    });
  });

  test("search and sort work together", async ({ page, testConfig }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    await table.search("efficacy");
    await expect(table.pagePosition).not.toHaveText(new RegExp(` of ${total}$`));
    const matches = await table.total();
    const before = await table.rowTexts();

    await table.clickHeader(/Confidence Level/);
    await table.expectRowsChangedFrom(before);
    await table.expectPosition(1, PAGE_SIZE, matches);
    expectMonotonic(await levels(table), "desc");
    for (const row of await table.rowTexts()) expect(row).toContain("efficacy");
  });

  test("pagination fetches other pages and disables the buttons at both ends", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    const lastStart = lastPageStart(total, PAGE_SIZE);
    const first = await table.rowTexts();
    await table.expectFirstPage();

    await table.nextPageButton.click();
    await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await table.expectRowsChangedFrom(first);
    const second = await table.rowTexts();
    expect(second).toHaveLength(PAGE_SIZE);
    await expect(table.firstPageButton).toBeEnabled();
    await expect(table.previousPageButton).toBeEnabled();
    expect(await levels(table), "the order continues on page 2").toEqual(
      [...(await levels(table))].sort((a, b) => a - b)
    );

    await table.previousPageButton.click();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(first);
    await table.expectFirstPage();

    await table.lastPageButton.click();
    await table.expectPosition(lastStart, total, total);
    await table.expectRowsChangedFrom(first);
    await table.expectLastPage();
    await expect(table.rows).toHaveCount(total - lastStart + 1);

    await table.firstPageButton.click();
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectRowTexts(first);
    await table.expectFirstPage();
  });

  test("the page size select changes how many rows a page shows", async ({ page, testConfig }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();

    for (const size of [25, 100]) {
      await table.setPageSize(size);
      await table.expectPosition(1, Math.min(size, total), total);
      await expect(table.rows).toHaveCount(Math.min(size, total));
      await table.expectFirstPage();
    }

    await table.lastPageButton.click();
    const lastStart = lastPageStart(total, 100);
    await table.expectPosition(lastStart, total, total);
    await expect(table.rows).toHaveCount(total - lastStart + 1);
    await table.expectLastPage();
  });

  test("the column picker hides and shows columns and keeps them hidden across pages", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const total = await table.total();
    const picker = await table.openColumnPicker();
    const names = PGX_COLUMNS.map((name) => name.replace("?", ""));

    await expect(picker.getByRole("checkbox")).toHaveCount(PGX_COLUMNS.length);
    for (const name of names) {
      await expect(picker.getByRole("checkbox", { name, exact: true })).toBeChecked();
    }
    await expect(picker.getByRole("checkbox", { name: "rsID" })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Literature" }).uncheck();
    await table.expectHeaders(PGX_COLUMNS.filter((name) => name !== "Literature"));
    await expect(table.row(0).locator("td")).toHaveCount(PGX_COLUMNS.length - 1);

    await table.nextPageButton.click();
    await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await table.expectHeaders(PGX_COLUMNS.filter((name) => name !== "Literature"));

    // the click on the pager closed the picker, as clicking away does
    const reopened = await table.openColumnPicker();
    await reopened.getByRole("checkbox", { name: "Literature" }).check();
    await table.expectHeaders(PGX_COLUMNS);
    await table.closeColumnPicker(table.scope.getByTestId("section-description"));
  });

  test("export downloads the whole dataset, not just the page", async ({ page, testConfig }) => {
    const chemblId = drugId(testConfig);
    const table = await openPharmacogenetics(page, chemblId);
    const total = await table.total();

    await test.step("JSON holds all rows", async () => {
      const file = await table.download("Json");
      expect(file.filename).toBe(`${chemblId}-pharmacogenomics.json`);
      const rows = JSON.parse(file.text) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      expect(Object.keys(rows[0])).toContain("gene");
      expect(Object.keys(rows[0])).toContain("rsId");
    });

    await test.step("TSV has a header line and a line per row", async () => {
      const file = await table.download("TSV");
      expect(file.filename).toBe(`${chemblId}-pharmacogenomics.tsv`);
      const lines = file.text.split("\n");
      expect(lines[0].split("\t")).toEqual(expect.arrayContaining(["gene", "rsId"]));
      expect(lines, "a line per row, plus the header").toHaveLength(total + 1);
    });

    await test.step("with a search active the export holds the rows matching it", async () => {
      await table.search("efficacy");
      await expect(table.pagePosition).not.toHaveText(new RegExp(` of ${total}$`));
      const matches = await table.total();
      const file = await table.download("Json");
      expect(JSON.parse(file.text)).toHaveLength(matches);
    });
  });

  test("the exported rows carry the values the table shows", async ({ page, testConfig }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    const rows = JSON.parse((await table.download("Json")).text) as Record<string, unknown>[];
    for (const key of ["gene", "rsId", "drugResponsePhenotype", "drugResponseCategory"]) {
      expect(
        rows.filter((row) => row[key]),
        `some exported rows should have a ${key}`
      ).not.toHaveLength(0);
    }
  });

  test("the API query drawer opens with the section's query and closes", async ({
    page,
    testConfig,
  }) => {
    const table = await openPharmacogenetics(page, drugId(testConfig));
    await table.expectApiQuery("DrugPharmacogenomicsQuery");
    await table.expectLoaded();
  });
});

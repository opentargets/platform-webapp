import { expect, test } from "../../../fixtures";
import {
  AssociationsTable,
  SCORE_LABEL,
} from "../../../POM/objects/widgets/AOTF/associationsTable";
import {
  aggregationTestId,
  DATA_SOURCE_AGGREGATIONS,
  DATA_SOURCE_COLUMNS,
} from "../../../POM/objects/widgets/AOTF/columns";
import {
  DATA_SOURCES_WITHOUT_EVIDENCE,
  expectedAssociationsFor,
} from "../../../POM/objects/widgets/AOTF/expectedAssociations";

const DOCS = "https://platform-docs.opentargets.org/evidence#";
const SYMBOL = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * The associations table in its default view (target-disease association): columns,
 * rows, score cells, legend, sorting, pagination, page size and the name search.
 */
test.describe("Disease associations: table", () => {
  test.describe("columns", () => {
    test("shows Target, Association Score and every data source column, in order", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);

      await expect(aotf.headerLabels).toHaveText([
        "Target",
        "Association Score",
        ...DATA_SOURCE_COLUMNS.map((column) => column.label),
      ]);
      const ids = await aotf.headerLabels.evaluateAll((labels) =>
        labels.map((label) =>
          (label.getAttribute("data-testid") ?? "").replace("table-header-", "")
        )
      );
      expect(ids).toEqual(["name", "score", ...DATA_SOURCE_COLUMNS.map((column) => column.id)]);
    });

    test("each data source header links to its documentation in a new tab", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);

      for (const column of DATA_SOURCE_COLUMNS) {
        const link = aotf.docsLink(column.id);
        await expect(link, `${column.label} docs link`).toHaveAttribute(
          "href",
          `${DOCS}${column.docsAnchor}`
        );
        await expect(link, `${column.label} docs link`).toHaveAttribute("target", "_blank");
        await expect(link, `${column.label} docs link`).toHaveAttribute("rel", /noreferrer/);
      }
      await expect(aotf.docsLink("name"), "the name column has no docs link").toHaveCount(0);
      await expect(aotf.docsLink("score"), "the score column has no docs link").toHaveCount(0);
    });

    test("groups the data sources under an aggregation bar that names each group on hover", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);

      const testIds = await aotf.aggregationButtons.evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("data-testid"))
      );
      expect(testIds).toEqual(DATA_SOURCE_AGGREGATIONS.map(aggregationTestId));

      for (const aggregation of ["Genetic association", "Literature"]) {
        await aotf.aggregationButton(aggregation).hover();
        await expect(page.getByRole("tooltip", { name: aggregation, exact: true })).toBeVisible();
      }

      // Hovering a column header highlights (names) the group the column belongs to.
      await aotf.headerLabel("impc").hover();
      await expect(page.getByRole("tooltip", { name: "Animal model", exact: true })).toBeVisible();
    });
  });

  test.describe("rows", () => {
    test("lists 25 targets by descending association score, each with scores in its data source cells", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      await expect(aotf.rows()).toHaveCount(25);

      await test.step("names are target symbols and are not repeated", async () => {
        const names = await aotf.rowNames();
        expect(names).toHaveLength(25);
        for (const name of names)
          expect(name, "a row name should be a gene symbol").toMatch(SYMBOL);
        expect(new Set(names).size, "a target should be listed once").toBe(25);
      });

      await test.step("every row has an association score between 0 and 1, highest first", async () => {
        await expect(aotf.columnCells("score")).toHaveCount(25);
        await aotf.expectSortedBy("score");
        const scores = await aotf.columnScores("score");
        for (const score of scores) {
          expect(score).toBeGreaterThan(0);
          expect(score).toBeLessThanOrEqual(1);
        }
        const labels = await aotf
          .columnCells("score")
          .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("aria-label") ?? ""));
        for (const label of labels) expect(label).toMatch(SCORE_LABEL);
        await expect(aotf.sortIndicators, "only the sorted column shows the sort icon").toHaveCount(
          1
        );
        await expect(aotf.sortIndicator("score")).toBeVisible();
      });

      await test.step("every row has one cell per data source and a score in at least one", async () => {
        const perRow = await aotf.rows().evaluateAll((rows) =>
          rows.map((row) => ({
            withScore: [
              ...row.querySelectorAll(
                "[data-testid^='score-cell-']:not([data-testid='score-cell-score'])"
              ),
            ].map((cell) => ({
              column: (cell.getAttribute("data-testid") ?? "").replace("score-cell-", ""),
              score: cell.getAttribute("data-score"),
              label: cell.getAttribute("aria-label"),
            })),
            empty: [...row.querySelectorAll("[data-testid^='empty-cell-']")].map((cell) =>
              (cell.getAttribute("data-testid") ?? "").replace("empty-cell-", "")
            ),
          }))
        );
        const columnIds = DATA_SOURCE_COLUMNS.map((column) => column.id);
        for (const [index, row] of perRow.entries()) {
          expect(
            row.withScore.length,
            `row ${index} should have a score in at least one data source`
          ).toBeGreaterThan(0);
          expect(
            [...row.withScore.map((cell) => cell.column), ...row.empty].sort(),
            `row ${index} should have exactly one cell per data source column`
          ).toEqual([...columnIds].sort());
          for (const cell of row.withScore) {
            expect(cell.score, `row ${index} ${cell.column} score`).toMatch(/^\d\.\d{2}$/);
            const value = Number(cell.score);
            expect(value, `row ${index} ${cell.column} score`).toBeGreaterThanOrEqual(0);
            expect(value, `row ${index} ${cell.column} score`).toBeLessThanOrEqual(1);
            expect(cell.label).toBe(`Score: ${cell.score}`);
          }
        }
      });
    });

    test("the recorded genes have a score in exactly their recorded data sources", async ({
      page,
      testConfig,
    }) => {
      const diseaseId = testConfig.disease.primary;
      const genes = expectedAssociationsFor(diseaseId).genes;
      const symbols = testConfig.disease.aotfGenes ?? [];
      expect(symbols.length, "the test config should name genes to check").toBeGreaterThan(0);

      // Pinning by id shows exactly these targets, wherever they rank in the full list.
      const aotf = new AssociationsTable(page);
      await page.goto(
        AssociationsTable.diseasePath(diseaseId, {
          pinned: symbols.map((symbol) => genes[symbol].id).join(","),
        })
      );
      await aotf.expectLoaded(symbols.length, "pinning");
      await expect(aotf.rows("pinning")).toHaveCount(symbols.length);

      for (const symbol of symbols) {
        const row = aotf.rowByName(symbol, "pinning");
        await expect(row, `${symbol} should be listed`).toHaveCount(1);
        expect(
          (await aotf.dataColumnIds(row)).sort(),
          `${symbol} should have scores in the data sources recorded in expectedAssociations.ts`
        ).toEqual([...genes[symbol].dataSources].sort());
        await expect(aotf.dataCell(row, "score")).toHaveAttribute("aria-label", SCORE_LABEL);
        await expect(row.locator("[data-testid^='empty-cell-']")).toHaveCount(
          DATA_SOURCE_COLUMNS.length - genes[symbol].dataSources.length
        );
      }
    });

    test("a data source with no evidence for the disease has no score in any row, even when sorted by it", async ({
      page,
      testConfig,
    }) => {
      const diseaseId = testConfig.disease.primary;
      const withoutEvidence = DATA_SOURCES_WITHOUT_EVIDENCE[diseaseId];
      expect(
        withoutEvidence,
        `expectedAssociations.ts should list them for ${diseaseId}`
      ).toBeTruthy();
      const columnId = withoutEvidence[withoutEvidence.length - 1];

      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(diseaseId, { sort: `${columnId}:desc` });
      await expect(aotf.sortIndicator(columnId)).toBeVisible();
      await expect(aotf.rows()).toHaveCount(25);
      await expect(aotf.columnCells("score")).toHaveCount(25);
      for (const id of withoutEvidence) {
        await expect(aotf.columnCells(id), `no target should have ${id} evidence`).toHaveCount(0);
        await expect(aotf.rows().getByTestId(`empty-cell-${id}`)).toHaveCount(25);
      }
    });

    test("hovering a cell shows its score, or No data", async ({ page, testConfig }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const row = aotf.row(0);

      const scoreCell = aotf.dataCell(row, "score");
      const label = await scoreCell.getAttribute("aria-label");
      expect(label).toMatch(SCORE_LABEL);
      await scoreCell.hover();
      await expect(page.getByRole("tooltip", { name: label as string, exact: true })).toBeVisible();

      const dataCell = aotf.dataCells(row).first();
      const dataLabel = await dataCell.getAttribute("aria-label");
      expect(dataLabel).toMatch(SCORE_LABEL);
      await dataCell.hover();
      await expect(
        page.getByRole("tooltip", { name: dataLabel as string, exact: true })
      ).toBeVisible();

      await row.locator("[data-testid^='empty-cell-']").first().hover();
      await expect(page.getByRole("tooltip", { name: "No data", exact: true })).toBeVisible();
    });

    test("the footer explains the colours: an association score scale and a No data swatch", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);

      await expect(aotf.legend.locator("svg")).toHaveCount(1);
      await expect(aotf.legend).toContainText("Association score");
      // Nine colour bins between 0 and 1.
      await expect(aotf.legend.locator("svg rect")).toHaveCount(9);
      await expect(aotf.legend).toContainText("0.1");
      await expect(aotf.legend).toContainText("0.9");
      await expect(aotf.footer.getByText("No data", { exact: true })).toBeVisible();
      await expect(aotf.legendNoDataCell).toBeVisible();
      await expect(aotf.footer).toContainText("Associations per page");
    });
  });

  test.describe("sorting", () => {
    test("clicking a data source header sorts by it, and clicking it again restores the default order", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const defaultOrder = await aotf.rowNames();
      const total = (await aotf.displayedRange()).total;

      await aotf.headerLabel("europepmc").click();
      await expect(aotf.sortIndicator("europepmc")).toBeVisible();
      await expect(aotf.sortIndicators).toHaveCount(1);
      await aotf.expectUrlParam("sort", "europepmc:desc");
      await aotf.expectSortedBy("europepmc");
      await expect(aotf.rows()).toHaveCount(25);
      expect(await aotf.rowNames(), "sorting should reorder the rows").not.toEqual(defaultOrder);
      expect((await aotf.displayedRange()).total, "sorting does not filter").toBe(total);
      await expect(aotf.filterChip("sort")).toHaveText("Europe PMC");

      await aotf.headerLabel("europepmc").click();
      await expect(aotf.sortIndicator("score")).toBeVisible();
      await expect(aotf.sortIndicators).toHaveCount(1);
      await aotf.expectUrlParam("sort", "");
      await aotf.expectRowNames(defaultOrder);
      await expect(aotf.filterChip("sort")).toHaveCount(0);
    });

    test("sorting by another data source replaces the sort, and the sort chip removes it", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { sort: "europepmc:desc" });
      await expect(aotf.sortIndicator("europepmc")).toBeVisible();
      await aotf.expectSortedBy("europepmc");

      await aotf.headerLabel("gwas_credible_sets").click();
      await aotf.expectUrlParam("sort", "gwas_credible_sets:desc");
      await expect(aotf.sortIndicator("gwas_credible_sets")).toBeVisible();
      await expect(aotf.sortIndicators).toHaveCount(1);
      await aotf.expectSortedBy("gwas_credible_sets");
      await expect(aotf.filterChip("sort")).toHaveText("GWAS associations");

      await aotf.removeFilterChip("sort");
      await aotf.expectUrlParam("sort", "");
      await expect(aotf.sortIndicator("score")).toBeVisible();
      await aotf.expectSortedBy("score");
    });

    test("sorting from a later page returns to the first page", async ({ page, testConfig }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { page: "2" });
      expect((await aotf.displayedRange()).from).toBe(51);

      await aotf.headerLabel("clinical_precedence").click();
      await aotf.expectUrlParam("sort", "clinical_precedence:desc");
      await aotf.expectUrlParam("page", "");
      await aotf.expectSortedBy("clinical_precedence");
      expect((await aotf.displayedRange()).from).toBe(1);
    });

    test("the Target header is not sortable, and the Association Score header sorts by score again", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { sort: "europepmc:desc" });
      await aotf.expectSortedBy("europepmc");
      const sorted = await aotf.rowNames();

      await aotf.headerLabel("name").click();
      await aotf.headerLabel("score").click();
      // Had the name header been sortable, the first click would have replaced the sort
      // and the URL would not end up on the score.
      await aotf.expectUrlParam("sort", "score:desc");
      await expect(aotf.sortIndicator("score")).toBeVisible();
      await expect(aotf.sortIndicators).toHaveCount(1);
      await aotf.expectSortedBy("score");
      expect(await aotf.rowNames()).not.toEqual(sorted);
      await expect(aotf.filterChip("sort"), "sorting by score is the default: no chip").toHaveCount(
        0
      );
    });
  });

  test.describe("pagination", () => {
    test("next and previous move through pages of different targets", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const total = (await aotf.displayedRange()).total;
      const firstPage = await aotf.rowNames();
      await expect(aotf.previousPageButton, "there is no page before the first").toBeDisabled();
      await expect(aotf.nextPageButton).toBeEnabled();

      await aotf.goToNextPage();
      await aotf.expectUrlParam("page", "1");
      await expect(aotf.displayedRows).toHaveText(`26–50 of ${total}`);
      await expect(aotf.rows()).toHaveCount(25);
      const secondPage = await aotf.rowNames();
      expect(
        secondPage.filter((name) => firstPage.includes(name)),
        "the second page should not repeat targets of the first"
      ).toEqual([]);
      await expect(aotf.previousPageButton).toBeEnabled();

      await aotf.goToNextPage();
      await aotf.expectUrlParam("page", "2");
      await expect(aotf.displayedRows).toHaveText(`51–75 of ${total}`);

      await aotf.goToPreviousPage();
      await aotf.expectUrlParam("page", "1");
      await aotf.expectRowNames(secondPage);

      await aotf.goToPreviousPage();
      await aotf.expectUrlParam("page", "");
      await aotf.expectRowNames(firstPage);
      await expect(aotf.previousPageButton).toBeDisabled();
    });

    test("the last page shows the remaining targets and disables next", async ({
      page,
      testConfig,
    }) => {
      const diseaseId = testConfig.disease.primary;
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(diseaseId);
      const total = (await aotf.displayedRange()).total;
      const lastPage = Math.ceil(total / 25) - 1;
      const remaining = total - lastPage * 25;

      await aotf.gotoDisease(diseaseId, { page: String(lastPage) });
      await expect(aotf.displayedRows).toHaveText(`${lastPage * 25 + 1}–${total} of ${total}`);
      await expect(aotf.rows()).toHaveCount(remaining);
      await expect(aotf.nextPageButton, "there is no page after the last").toBeDisabled();
      await expect(aotf.previousPageButton).toBeEnabled();
      await aotf.expectSortedBy("score");
    });

    test("a page beyond the last one shows the empty state, not stale rows", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      // The disease has targets, so the empty state below comes from the page, not from the data.
      await aotf.gotoDisease(testConfig.disease.primary);
      await page.goto(AssociationsTable.diseasePath(testConfig.disease.primary, { page: "99999" }));

      await expect(aotf.noResults).toBeVisible({ timeout: 45_000 });
      await expect(aotf.noResults.getByRole("heading")).toHaveText("No results found");
      await expect(aotf.rows()).toHaveCount(0);
      await expect(aotf.loadingIndicators).toHaveCount(0);
      await expect(aotf.nextPageButton).toBeDisabled();
    });

    test("offers page sizes 10, 25, 50, 200 and 500, and resizing keeps the order", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const total = (await aotf.displayedRange()).total;
      const twentyFive = await aotf.rowNames();
      await expect(aotf.pageSizeSelect).toHaveText("25");

      await aotf.pageSizeSelect.click();
      await expect(page.getByRole("listbox").getByRole("option")).toHaveText([
        "10",
        "25",
        "50",
        "200",
        "500",
      ]);
      await page.getByRole("option", { name: "10", exact: true }).click();
      await expect(aotf.rows()).toHaveCount(10);
      await aotf.expectUrlParam("pageSize", "10");
      await expect(aotf.displayedRows).toHaveText(`1–10 of ${total}`);
      await aotf.expectRowNames(twentyFive.slice(0, 10));

      await aotf.selectPageSize(50);
      await aotf.expectUrlParam("pageSize", "50");
      await expect(aotf.displayedRows).toHaveText(`1–50 of ${total}`);
      const fifty = await aotf.rowNames();
      expect(fifty.slice(0, 25), "a larger page starts with the same targets").toEqual(twentyFive);
      expect(new Set(fifty).size).toBe(50);
      await aotf.expectSortedBy("score");

      await aotf.selectPageSize(25);
      await aotf.expectUrlParam("pageSize", "");
      await aotf.expectRowNames(twentyFive);
    });

    test("a page size and page in the URL are applied on load", async ({ page, testConfig }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { pageSize: "10", page: "3" });
      await expect(aotf.rows()).toHaveCount(10);
      await expect(aotf.pageSizeSelect).toHaveText("10");
      const { from, to } = await aotf.displayedRange();
      expect([from, to]).toEqual([31, 40]);
      await expect(aotf.previousPageButton).toBeEnabled();
      await expect(aotf.nextPageButton).toBeEnabled();
    });
  });

  test.describe("name search", () => {
    test("typing a symbol prefix leaves only matching targets, and the chip clears the search", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const total = (await aotf.displayedRange()).total;
      const unfiltered = await aotf.rowNames();

      await aotf.searchByName("ADRB");
      const matches = await aotf.expectTotalBelow(26);
      await expect(aotf.rows()).toHaveCount(matches);
      const names = await aotf.rowNames();
      for (const name of names) expect(name, "every row should match the search").toContain("ADRB");
      expect(names).toContain("ADRB1");
      await expect(aotf.displayedRows).toHaveText(`1–${matches} of ${matches}`);
      await expect(aotf.nextPageButton).toBeDisabled();
      await expect(aotf.previousPageButton).toBeDisabled();
      await aotf.expectSortedBy("score");
      await expect(aotf.filterChip("entity-search")).toHaveText('"ADRB"');

      await aotf.removeFilterChip("entity-search");
      await expect(aotf.nameFilter).toHaveValue("");
      await aotf.expectUrlParam("q", "");
      await aotf.expectTotal(total);
      await aotf.expectRowNames(unfiltered);
    });

    test("a term that matches nothing shows the empty state, and clearing the box restores the list", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary);
      const total = (await aotf.displayedRange()).total;

      await aotf.searchByName("zzzznotagene");
      await expect(aotf.noResults).toBeVisible({ timeout: 45_000 });
      await expect(aotf.noResults.getByRole("heading")).toHaveText("No results found");
      await expect(aotf.noResults).toContainText("Try adjust your search or filter");
      await expect(aotf.rows()).toHaveCount(0);
      await expect(aotf.displayedRows).toHaveText("0–0 of 0");
      await expect(aotf.nextPageButton).toBeDisabled();
      await expect(aotf.filterChip("entity-search")).toHaveText('"zzzznotagene"');
      // The header and its search box stay, so the search can be changed.
      await expect(aotf.headerLabel("name")).toBeVisible();

      await aotf.nameFilter.fill("");
      await aotf.expectUrlParam("q", "");
      await aotf.expectTotal(total);
      await aotf.expectLoaded(25);
      await expect(aotf.noResults).toHaveCount(0);
      await expect(aotf.filterChip("entity-search")).toHaveCount(0);
    });

    test("a search in the URL fills the box and matches symbols and approved names", async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      // "adrenoceptor beta" is in approved names only: no symbol contains it.
      await aotf.gotoDisease(testConfig.disease.primary, { q: "adrenoceptor beta" });
      await expect(aotf.nameFilter).toHaveValue("adrenoceptor beta");
      await expect(aotf.filterChip("entity-search")).toHaveText('"adrenoceptor beta"');
      const names = await aotf.rowNames();
      expect(names, "ADRB1 is 'adrenoceptor beta 1'").toContain("ADRB1");
      for (const name of names)
        expect(name, "matches are the beta adrenoceptors").toMatch(/^ADRB\d$/);
      const { from, to, total } = await aotf.displayedRange();
      expect([from, to, total]).toEqual([1, names.length, names.length]);
    });

    test("searching from a later page returns to the first page", async ({ page, testConfig }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { page: "1" });
      await aotf.searchByName("APOE");
      await aotf.expectUrlParam("page", "");
      await aotf.expectTotalBelow(26);
      expect(await aotf.rowNames()).toContain("APOE");
    });
  });
});

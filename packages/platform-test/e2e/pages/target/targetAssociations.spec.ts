import { readFileSync } from "node:fs";
import type { Download, Locator, Request } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { SCORE_LABEL } from "../../../POM/objects/widgets/AOTF/associationsTable";
import {
  aggregationTestId,
  DATA_SOURCE_AGGREGATIONS,
  DATA_SOURCE_COLUMNS,
  dataSourceColumn,
} from "../../../POM/objects/widgets/AOTF/columns";
import {
  BRAF_DISEASES,
  TARGET_WITH_FEW_ASSOCIATIONS,
} from "../../../POM/objects/widgets/AOTFTarget/expectedDiseases";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { associationTargets, TargetAssociations } from "../../../POM/objects/widgets/AOTFTarget/targetAssociations";

const DOCS = "https://platform-docs.opentargets.org/evidence#";
const DISEASE_ID = /^(MONDO|EFO|OTAR|HP|Orphanet|OBA|GO|NCIT|DOID|MP)_\w+$/;

/** The text of a downloaded file. */
async function downloadedText(download: Download): Promise<string> {
  return readFileSync(await download.path(), "utf8");
}

async function clickAndDownload(aotf: TargetAssociations, button: Locator): Promise<Download> {
  const [download] = await Promise.all([aotf.page.waitForEvent("download"), button.click()]);
  return download;
}

/** Whether a request is an evidence query for this target and this disease. */
function isEvidenceRequestFor(request: Request, ensgId: string, efoId: string): boolean {
  if (request.method() !== "POST") return false;
  const data = request.postData() ?? "";
  return data.includes(ensgId) && data.includes(efoId) && !data.includes("AssociationsQuery");
}

/**
 * The associations view of a target (/target/:id/associations): a row per associated
 * disease, a column per data source.
 */
test.describe("Target associations: table", () => {
  test(
    "lists the diseases of the target by descending score, with a page header and tabs @smoke",
    async ({ page, testConfig }) => {
      const targetId = associationTargets(testConfig).primary;
      const aotf = new TargetAssociations(page);
      await aotf.gotoTarget(targetId);

      await test.step("page header and tabs", async () => {
        await expect(aotf.pageTitle).toHaveText("BRAF");
        await expect(page).toHaveTitle("Diseases associated with BRAF | Open Targets Platform");
        await expect(aotf.associationsTab).toHaveAttribute("aria-selected", "true");
        await expect(aotf.profileTab).toHaveAttribute("aria-selected", "false");
        await expect(aotf.associationsTab).toHaveAttribute("href", `/target/${targetId}/associations`);
        await expect(aotf.profileTab).toHaveAttribute("href", `/target/${targetId}`);
      });

      await test.step("25 distinct diseases, highest score first", async () => {
        await expect(aotf.rows()).toHaveCount(25);
        const names = await aotf.rowNames();
        for (const name of names) expect(name.length, "a row should name its disease").toBeGreaterThan(2);
        expect(new Set(names).size, "a disease should be listed once").toBe(25);
        await aotf.expectSortedBy("score");
        const scores = await aotf.columnScores("score");
        for (const score of scores) {
          expect(score).toBeGreaterThan(0);
          expect(score).toBeLessThanOrEqual(1);
        }
        expect(names, "melanoma is one of the strongest BRAF associations").toContain("melanoma");
      });

      await test.step("the footer counts the associations", async () => {
        const { from, to, total } = await aotf.displayedRange();
        expect([from, to]).toEqual([1, 25]);
        expect(total, "BRAF has more than one page of diseases").toBeGreaterThan(100);
        await expect(aotf.pageSizeSelect).toHaveText("25");
      });
    }
  );

  test("shows Disease, Association Score and every data source column, in order", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);

    await expect(aotf.headerLabels).toHaveText([
      "Disease",
      "Association Score",
      ...DATA_SOURCE_COLUMNS.map((column) => column.label),
    ]);
    const ids = await aotf.headerLabels.evaluateAll((labels) =>
      labels.map((label) => (label.getAttribute("data-testid") ?? "").replace("table-header-", ""))
    );
    expect(ids).toEqual(["name", "score", ...DATA_SOURCE_COLUMNS.map((column) => column.id)]);
    await expect(aotf.nameFilter).toHaveAttribute("placeholder", "Search disease");
  });

  test("this view has no prioritisation switch: only the association view", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);

    await expect(aotf.associationsViewButton).toHaveAttribute("aria-pressed", "true");
    await expect(aotf.associationsViewButton).toHaveText("Target-disease association");
    await expect(aotf.prioritisationViewButton).toHaveCount(0);
  });

  test("each data source header links to its documentation in a new tab, grouped under an aggregation bar", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);

    for (const column of DATA_SOURCE_COLUMNS) {
      const link = aotf.docsLink(column.id);
      await expect(link, `${column.label} docs link`).toHaveAttribute("href", `${DOCS}${column.docsAnchor}`);
      await expect(link, `${column.label} docs link`).toHaveAttribute("target", "_blank");
      await expect(link, `${column.label} docs link`).toHaveAttribute("rel", /noreferrer/);
    }
    await expect(aotf.docsLink("name")).toHaveCount(0);
    await expect(aotf.docsLink("score")).toHaveCount(0);

    const testIds = await aotf.aggregationButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-testid"))
    );
    expect(testIds).toEqual(DATA_SOURCE_AGGREGATIONS.map(aggregationTestId));
    await aotf.aggregationButton("Somatic mutations").hover();
    await expect(page.getByRole("tooltip", { name: "Somatic mutations", exact: true })).toBeVisible();
  });

  test("score cells hold a two decimal score, and the recorded diseases have scores in exactly their recorded data sources", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { pageSize: "50" });
    await expect(aotf.rows()).toHaveCount(50);

    await test.step("every row has a score and one cell per data source", async () => {
      const columnIds = DATA_SOURCE_COLUMNS.map((column) => column.id);
      const perRow = await aotf.rows().evaluateAll((rows) =>
        rows.map((row) => ({
          scored: [
            ...row.querySelectorAll("[data-testid^='score-cell-']:not([data-testid='score-cell-score'])"),
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
      for (const [index, row] of perRow.entries()) {
        expect(row.scored.length, `row ${index} should have a score in some data source`).toBeGreaterThan(0);
        expect(
          [...row.scored.map((cell) => cell.column), ...row.empty].sort(),
          `row ${index} should have exactly one cell per data source`
        ).toEqual([...columnIds].sort());
        for (const cell of row.scored) {
          expect(cell.score, `row ${index} ${cell.column}`).toMatch(/^\d\.\d{2}$/);
          expect(cell.label).toMatch(SCORE_LABEL);
          expect(Number(cell.score)).toBeLessThanOrEqual(1);
        }
      }
    });

    await test.step("recorded diseases", async () => {
      for (const disease of Object.values(BRAF_DISEASES)) {
        const row = aotf.rowByName(disease.name);
        await expect(row, `${disease.name} should be listed for BRAF`).toHaveCount(1);
        expect((await aotf.dataColumnIds(row)).sort(), `${disease.name} data sources`).toEqual(
          [...disease.dataSources].sort()
        );
      }
    });
  });

  test("hovering a cell shows its score, or No data, and the footer explains the colours", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const row = aotf.row(0);

    const scoreCell = aotf.dataCell(row, "score");
    const label = await scoreCell.getAttribute("aria-label");
    expect(label).toMatch(SCORE_LABEL);
    await scoreCell.hover();
    await expect(page.getByRole("tooltip", { name: label as string, exact: true })).toBeVisible();

    await row.locator("[data-testid^='empty-cell-']").first().hover();
    await expect(page.getByRole("tooltip", { name: "No data", exact: true })).toBeVisible();

    await expect(aotf.legend).toContainText("Association score");
    await expect(aotf.legend.locator("svg rect")).toHaveCount(9);
    await expect(aotf.legendNoDataCell).toBeVisible();
    await expect(aotf.footer).toContainText("Associations per page");
  });
});

test.describe("Target associations: sorting", () => {
  test("clicking a data source header sorts by it, and clicking it again restores the default order", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const defaultOrder = await aotf.rowNames();
    const { total } = await aotf.displayedRange();

    await aotf.headerLabel("clinical_precedence").click();
    await expect(aotf.sortIndicator("clinical_precedence")).toBeVisible();
    await expect(aotf.sortIndicators).toHaveCount(1);
    await aotf.expectUrlParam("sort", "clinical_precedence:desc");
    await aotf.expectSortedBy("clinical_precedence");
    expect(await aotf.rowNames(), "sorting should reorder the rows").not.toEqual(defaultOrder);
    expect((await aotf.displayedRange()).total, "sorting does not filter").toBe(total);
    await expect(aotf.filterChip("sort")).toHaveText("Clinical Precedence");

    await aotf.headerLabel("clinical_precedence").click();
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await aotf.expectUrlParam("sort", "");
    await aotf.expectRowNames(defaultOrder);
    await expect(aotf.filterChip("sort")).toHaveCount(0);
  });

  test("sorting by another data source replaces the sort, and the sort chip removes it", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { sort: "europepmc:desc" });
    await expect(aotf.sortIndicator("europepmc")).toBeVisible();
    await aotf.expectSortedBy("europepmc");

    await aotf.headerLabel("intogen").click();
    await aotf.expectUrlParam("sort", "intogen:desc");
    await expect(aotf.sortIndicator("intogen")).toBeVisible();
    await expect(aotf.sortIndicators).toHaveCount(1);
    await aotf.expectSortedBy("intogen");
    await expect(aotf.filterChip("sort")).toHaveText("IntOGen");

    await aotf.removeFilterChip("sort");
    await aotf.expectUrlParam("sort", "");
    await aotf.expectSortedBy("score");
  });

  test("sorting from a later page returns to the first page, and the Disease header is not sortable", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { page: "2" });
    expect((await aotf.displayedRange()).from).toBe(51);

    await aotf.headerLabel("name").click();
    await aotf.expectUrlParam("sort", "");
    expect((await aotf.displayedRange()).from, "the name header does not sort").toBe(51);

    await aotf.headerLabel("eva").click();
    await aotf.expectUrlParam("sort", "eva:desc");
    await aotf.expectUrlParam("page", "");
    await aotf.expectSortedBy("eva");
    expect((await aotf.displayedRange()).from).toBe(1);
  });
});

test.describe("Target associations: pagination", () => {
  test("next and previous move through pages of different diseases", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
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
      "the second page should not repeat diseases of the first"
    ).toEqual([]);
    await aotf.expectSortedBy("score");
    await expect(aotf.previousPageButton).toBeEnabled();

    await aotf.goToPreviousPage();
    await aotf.expectUrlParam("page", "");
    await aotf.expectRowNames(firstPage);
    await expect(aotf.previousPageButton).toBeDisabled();
  });

  test("the last page shows the remaining diseases and disables next", async ({ page, testConfig }) => {
    const targetId = associationTargets(testConfig).primary;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId);
    const { total } = await aotf.displayedRange();
    const lastPage = Math.ceil(total / 25) - 1;
    const remaining = total - lastPage * 25;

    await aotf.gotoTarget(targetId, { page: String(lastPage) });
    await expect(aotf.displayedRows).toHaveText(`${lastPage * 25 + 1}–${total} of ${total}`);
    await expect(aotf.rows()).toHaveCount(remaining);
    await expect(aotf.nextPageButton, "there is no page after the last").toBeDisabled();
    await expect(aotf.previousPageButton).toBeEnabled();
  });

  test("a page beyond the last one shows the empty state, not stale rows", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await page.goto(TargetAssociations.targetPath(associationTargets(testConfig).primary, { page: "99999" }));

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
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
    const twentyFive = await aotf.rowNames();

    await aotf.pageSizeSelect.click();
    await expect(page.getByRole("listbox").getByRole("option")).toHaveText(["10", "25", "50", "200", "500"]);
    await page.getByRole("option", { name: "10", exact: true }).click();
    await expect(aotf.rows()).toHaveCount(10);
    await aotf.expectUrlParam("pageSize", "10");
    await expect(aotf.displayedRows).toHaveText(`1–10 of ${total}`);
    await aotf.expectRowNames(twentyFive.slice(0, 10));

    await aotf.selectPageSize(50);
    await expect(aotf.displayedRows).toHaveText(`1–50 of ${total}`);
    const fifty = await aotf.rowNames();
    expect(fifty.slice(0, 25), "a larger page starts with the same diseases").toEqual(twentyFive);
    expect(new Set(fifty).size).toBe(50);
    await aotf.expectSortedBy("score");

    await aotf.selectPageSize(25);
    await aotf.expectUrlParam("pageSize", "");
    await aotf.expectRowNames(twentyFive);
  });

  test("a page size and page in the URL are applied on load", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { pageSize: "10", page: "3" });
    await expect(aotf.rows()).toHaveCount(10);
    await expect(aotf.pageSizeSelect).toHaveText("10");
    const { from, to } = await aotf.displayedRange();
    expect([from, to]).toEqual([31, 40]);
    await expect(aotf.previousPageButton).toBeEnabled();
    await expect(aotf.nextPageButton).toBeEnabled();
  });

  test("a target with few associations has one short page and nothing to page to", async ({ page }) => {
    const { id, total } = TARGET_WITH_FEW_ASSOCIATIONS;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(id);

    await expect(aotf.rows()).toHaveCount(total);
    await expect(aotf.displayedRows).toHaveText(`1–${total} of ${total}`);
    await expect(aotf.nextPageButton).toBeDisabled();
    await expect(aotf.previousPageButton).toBeDisabled();
    await aotf.expectSortedBy("score");
    expect(await aotf.rowNames()).toEqual(["retinitis pigmentosa", "melanoma"]);
  });
});

test.describe("Target associations: name search", () => {
  test("typing a disease name leaves only matching diseases, and the chip clears the search", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
    const unfiltered = await aotf.rowNames();

    await aotf.searchByName("melanoma");
    const matches = await aotf.expectTotalBelow(total);
    const names = await aotf.rowNames();
    expect(names.length).toBe(Math.min(matches, 25));
    for (const name of names) expect(name.toLowerCase(), "every row should match the search").toContain("melanoma");
    expect(names).toContain("melanoma");
    await expect(aotf.displayedRows).toHaveText(new RegExp(`^1–${names.length} of ${matches}$`));
    await aotf.expectSortedBy("score");
    await expect(aotf.filterChip("entity-search")).toHaveText('"melanoma"');

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
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();

    await aotf.searchByName("zzzznotadisease");
    await expect(aotf.noResults).toBeVisible({ timeout: 45_000 });
    await expect(aotf.noResults.getByRole("heading")).toHaveText("No results found");
    await expect(aotf.rows()).toHaveCount(0);
    await expect(aotf.displayedRows).toHaveText("0–0 of 0");
    await expect(aotf.nextPageButton).toBeDisabled();
    await expect(aotf.filterChip("entity-search")).toHaveText('"zzzznotadisease"');
    await expect(aotf.headerLabel("name"), "the search box stays so it can be changed").toBeVisible();

    await aotf.nameFilter.fill("");
    await aotf.expectUrlParam("q", "");
    await aotf.expectTotal(total);
    await aotf.expectLoaded(25);
    await expect(aotf.noResults).toHaveCount(0);
  });

  test("a search in the URL fills the box and survives a reload, and a new search returns to page one", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { q: "noonan" });
    await expect(aotf.nameFilter).toHaveValue("noonan");
    for (const name of await aotf.rowNames()) expect(name.toLowerCase()).toContain("noonan");

    await page.reload();
    await aotf.expectLoaded();
    await expect(aotf.nameFilter).toHaveValue("noonan");
    expect(await aotf.rowNames()).toContain("Noonan syndrome");

    await aotf.gotoTarget(associationTargets(testConfig).primary, { page: "1" });
    await aotf.searchByName("lung");
    await aotf.expectUrlParam("page", "");
    await aotf.expectTotalBelow(1000);
    expect(await aotf.rowNames()).toContain("lung cancer");
  });
});

test.describe("Target associations: filters", () => {
  test("measurements are excluded by default, and the switch brings them back", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total: without } = await aotf.displayedRange();
    await expect(aotf.excludeMeasurementsChip).toBeVisible();

    await aotf.openFacets();
    await expect(aotf.facetsPopover.getByText("Exclude measurements")).toBeVisible();
    await expect(aotf.excludeMeasurementsSwitch).toBeChecked();
    await aotf.excludeMeasurementsSwitch.uncheck();
    await expect(aotf.excludeMeasurementsChip).toHaveCount(0);
    await aotf.dismissOverlay(aotf.facetsPopover);
    await expect
      .poll(async () => (await aotf.displayedRange()).total, { timeout: 45_000 })
      .toBeGreaterThan(without);

    await aotf.openFacets();
    await aotf.excludeMeasurementsSwitch.check();
    await aotf.dismissOverlay(aotf.facetsPopover);
    await aotf.expectTotal(without);
    await expect(aotf.excludeMeasurementsChip).toBeVisible();
  });

  test("the chip restores measurements, and a target of measurements only shows its two diseases", async ({
    page,
  }) => {
    const { id, total, totalWithMeasurements } = TARGET_WITH_FEW_ASSOCIATIONS;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(id);
    await expect(aotf.rows()).toHaveCount(total);

    await aotf.excludeMeasurementsChip.locator(".MuiChip-deleteIcon").click();
    await expect(aotf.excludeMeasurementsChip).toHaveCount(0);
    await expect(aotf.rows()).toHaveCount(totalWithMeasurements);
    await expect(aotf.displayedRows).toHaveText(`1–${totalWithMeasurements} of ${totalWithMeasurements}`);
  });

  test("the filter popover lists the disease facet categories, and picking a facet filters the table", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
    const unfiltered = await aotf.rowNames();
    await aotf.openFacets();

    await test.step("categories", async () => {
      await aotf.facetCategorySelect.click();
      const options = await page.getByRole("listbox").getByRole("option").allInnerTexts();
      expect(options).toEqual(["All Categories", "Disease", "Therapeutic Area"]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
    });

    await test.step("a disease facet narrows the list", async () => {
      await aotf.facetSearchInput.fill("cancer");
      await expect(aotf.facetOptions.first()).toBeVisible();
      for (const suggestion of await aotf.facetOptions.allInnerTexts()) {
        expect(suggestion.toLowerCase(), "a suggestion should match the search").toContain("cancer");
        expect(suggestion).toMatch(/\bin (Disease|Therapeutic Area)$/);
      }
      await aotf.facetOptions.filter({ hasText: /^cancer\s*in Disease$/ }).click();
      await aotf.expectUrlParam("facets", /^[\w-]+~cancer~Disease$/);
      await aotf.expectTotalBelow(total);
      await aotf.expectRowsToDifferFrom(unfiltered);
      await aotf.expectSortedBy("score");
      await expect(aotf.filterChips.filter({ hasText: "cancer" })).toBeVisible();
    });

    await test.step("the facet chip restores the full list", async () => {
      await aotf.dismissOverlay(aotf.facetsPopover);
      await aotf.removeFilterChip(aotf.urlParam("facets")?.split("~")[0] as string);
      await aotf.expectUrlParam("facets", "");
      await aotf.expectTotal(total);
      await aotf.expectRowNames(unfiltered);
    });

    await test.step("reset all clears the facet and the measurement exclusion", async () => {
      await aotf.openFacets();
      await aotf.facetSearchInput.fill("cancer");
      await aotf.facetOptions.filter({ hasText: /^cancer\s*in Disease$/ }).click();
      await aotf.expectTotalBelow(total);
      await aotf.dismissOverlay(aotf.facetsPopover);
      await aotf.clearAllFiltersButton.click();
      await aotf.expectUrlParam("facets", "");
      await expect(aotf.excludeMeasurementsChip).toHaveCount(0);
      await expect
        .poll(async () => (await aotf.displayedRange()).total, { timeout: 45_000 })
        .toBeGreaterThan(total);
    });
  });

  test("a facet in the URL is applied on load and survives a reload", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
    await aotf.openFacets();
    await aotf.facetSearchInput.fill("cancer");
    await aotf.facetOptions.filter({ hasText: /^cancer\s*in Disease$/ }).click();
    await aotf.expectUrlParam("facets", /^[\w-]+~cancer~Disease$/);
    const facets = aotf.urlParam("facets") as string;
    const filtered = await aotf.expectTotalBelow(total);

    await page.goto(TargetAssociations.targetPath(associationTargets(testConfig).primary, { facets }));
    await aotf.expectLoaded();
    await aotf.expectTotal(filtered);
    await expect(aotf.filterChips.filter({ hasText: "cancer" })).toBeVisible();
  });

  test("Column options open a weight slider and an Include checkbox per data source, and requiring one keeps only diseases with evidence from it", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();

    await aotf.openColumnOptions();
    await expect(aotf.weightSliders).toHaveCount(DATA_SOURCE_COLUMNS.length);
    await expect(aotf.requiredCheckboxes).toHaveCount(DATA_SOURCE_COLUMNS.length);
    for (const column of DATA_SOURCE_COLUMNS) {
      await expect(aotf.weightSlider(column.id), `${column.label} weight`).toHaveValue(String(column.weight));
      await expect(aotf.requiredCheckbox(column.id)).not.toBeChecked();
    }

    await aotf.requiredCheckbox("gwas_credible_sets").check();
    await aotf.expectTotalBelow(total);
    await aotf.expectSortedBy("gwas_credible_sets");
    await expect(aotf.filterChip("column-options")).toBeVisible();

    await aotf.removeFilterChip("column-options");
    await aotf.expectTotal(total);
    await expect(aotf.requiredCheckbox("gwas_credible_sets")).not.toBeChecked();
  });
});

test.describe("Target associations: evidence widgets", () => {
  test.describe.configure({ timeout: 240_000 });

  // The Europe PMC widget asks a third-party service that throttles: stub it, so these
  // tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test(
    "clicking a data cell opens the evidence of that disease and data source, and clicking again closes it",
    { tag: "@smoke" },
    async ({ page, testConfig }) => {
      const targetId = associationTargets(testConfig).primary;
      const disease = BRAF_DISEASES.melanoma;
      const aotf = new TargetAssociations(page);
      await aotf.gotoTarget(targetId, { q: disease.name });
      const row = aotf.rowByName(disease.name);
      await expect(row).toHaveCount(1);
      const column = dataSourceColumn("clinical_precedence");

      const request = page.waitForRequest((candidate) =>
        isEvidenceRequestFor(candidate, targetId, disease.id)
      );
      const panel = await aotf.openPanel(row, column.id, {
        panelKey: column.id,
        sectionId: column.sectionId,
      });
      await request;
      await expect(panel.title(column.sectionId)).toContainText(column.sectionName);

      await aotf.dataCell(row, column.id).click();
      await panel.expectClosed();
    }
  );

  for (const key of ["melanoma", "noonan"] as const) {
    test(`${BRAF_DISEASES[key].name}: every data cell opens the widget of its data source`, async ({
      page,
      testConfig,
    }) => {
      const disease = BRAF_DISEASES[key];
      const aotf = new TargetAssociations(page);
      await aotf.gotoTarget(associationTargets(testConfig).primary, { q: disease.name });
      const row = aotf.rowByName(disease.name);
      await expect(row).toHaveCount(1);

      const columnIds = await aotf.dataColumnIds(row);
      expect(columnIds.sort()).toEqual([...disease.dataSources].sort());

      for (const columnId of columnIds) {
        await test.step(`${columnId} opens and closes`, async () => {
          const column = dataSourceColumn(columnId);
          const panel = await aotf.openPanel(row, column.id, {
            panelKey: column.id,
            sectionId: column.sectionId,
          });
          await expect(panel.title(column.sectionId)).toContainText(column.sectionName);
          await aotf.dataCell(row, column.id).click();
          await panel.expectClosed();
        });
      }
    });
  }

  test("clicking another cell replaces the open widget, a cell without a value opens nothing, and the open widget survives a reload", async ({
    page,
    testConfig,
  }) => {
    const disease = BRAF_DISEASES.melanoma;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { q: disease.name });
    const row = aotf.rowByName(disease.name);
    await expect(row).toHaveCount(1);
    const first = dataSourceColumn("clinical_precedence");
    const second = dataSourceColumn("eva");

    const firstPanel = await aotf.openPanel(row, first.id, {
      panelKey: first.id,
      sectionId: first.sectionId,
    });
    await aotf.expectUrlParam("focus", new RegExp(`^core\\|[\\w]+\\|${first.id}\\+${first.id}$`));
    await aotf.openPanel(row, second.id, { panelKey: second.id, sectionId: second.sectionId });
    await firstPanel.expectClosed();

    await page.reload();
    await aotf.expectLoaded();
    await aotf.panel(second.id).expectLoaded(second.sectionId);
    await expect(aotf.openPanels).toHaveCount(1);

    await aotf.emptyCell(row, "gene_burden").click();
    await expect(aotf.openPanels, "an empty cell does not change the open widget").toHaveCount(1);
  });
});

test.describe("Target associations: row menu", () => {
  test("clicking a disease's name opens a menu for that disease", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const row = aotf.row(2);

    const name = await aotf.openRowMenu(row);
    await expect(aotf.rowMenu.getByRole("menuitem")).toHaveText([
      "Pin disease",
      "Navigate to evidence",
      "Navigate to profile",
      "Navigate to associations",
    ]);
    await aotf.dismissOverlay(aotf.rowMenu);

    await row.hover();
    await row.getByTestId("context-menu-2").click();
    await expect(aotf.rowMenu.getByRole("heading", { name, exact: true })).toBeVisible();
    await aotf.dismissOverlay(aotf.rowMenu);

    await aotf.nameText(row).click({ button: "right" });
    await expect(aotf.rowMenu.getByRole("heading", { name, exact: true })).toBeVisible();
    await aotf.dismissOverlay(aotf.rowMenu);
    await expect(aotf.openPanels, "the menu alone opens no panel").toHaveCount(0);
  });

  test("Navigate to profile opens the disease page, and back returns to the same table", async ({
    page,
    testConfig,
  }) => {
    const targetId = associationTargets(testConfig).primary;
    const disease = BRAF_DISEASES.melanoma;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId, { q: disease.name });

    await aotf.openRowMenu(aotf.rowByName(disease.name));
    await aotf.rowMenuItem("Navigate to profile").click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(disease.name);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/target/${targetId}/associations\\?q=melanoma`));
    await aotf.expectLoaded();
    await expect(aotf.nameFilter).toHaveValue(disease.name);
  });

  test("Navigate to associations opens the targets associated with that disease", async ({
    page,
    testConfig,
  }) => {
    const disease = BRAF_DISEASES.melanoma;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { q: disease.name });

    await aotf.openRowMenu(aotf.rowByName(disease.name));
    await aotf.rowMenuItem("Navigate to associations").click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}/associations$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(disease.name);
    await aotf.expectLoaded(25);
    await expect(aotf.headerLabel("name")).toHaveText("Target");
    await expect(aotf.nameFilter).toHaveAttribute("placeholder", "Search target");
    await expect(aotf.rowByName("BRAF")).toHaveCount(1);
  });

  test("Navigate to evidence opens the evidence page of this target and that disease", async ({
    page,
    testConfig,
  }) => {
    const targetId = associationTargets(testConfig).primary;
    const disease = BRAF_DISEASES.melanoma;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId, { q: disease.name });

    await aotf.openRowMenu(aotf.rowByName(disease.name));
    await aotf.rowMenuItem("Navigate to evidence").click();
    await expect(page).toHaveURL(new RegExp(`/evidence/${targetId}/${disease.id}$`));
    const header = page.getByTestId("profile-page-header-block");
    await expect(header).toContainText("BRAF");
    await expect(header).toContainText(disease.name);
    await expect(aotf.root).toHaveCount(0);
  });

  test("the first disease links resolve to real disease ids", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const name = await aotf.openRowMenu(aotf.row(0));
    await aotf.rowMenuItem("Navigate to profile").click();
    await expect(page).toHaveURL(/\/disease\/[\w]+$/);
    const id = new URL(page.url()).pathname.split("/").pop() as string;
    expect(id).toMatch(DISEASE_ID);
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(name);
  });
});

test.describe("Target associations: pinning", () => {
  test("pinning diseases lists them above the table and records them in the URL", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const { total } = await aotf.displayedRange();
    const coreNames = await aotf.rowNames();
    await expect(aotf.bodyIndicator("core")).toHaveCount(0);

    const first = await aotf.pinDisease(aotf.row(1));
    expect(first).toBe(coreNames[1]);
    await aotf.expectLoaded(1, "pinning");
    await expect(aotf.rows("pinning")).toHaveCount(1);
    await aotf.expectUrlParam("pinned", DISEASE_ID);
    await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (1 of 1)");
    await expect(aotf.bodyIndicator("core")).toHaveText(`All (${total})`);
    await expect(aotf.filterChip("pinned")).toHaveText("Pinned");
    expect(await aotf.rowNames(), "pinning does not remove the row from the list").toEqual(coreNames);

    await test.step("a pinned row's menu unpins it", async () => {
      await aotf.openRowMenu(aotf.rowByName(first, "pinning"));
      await expect(aotf.rowMenu.getByRole("menuitem", { name: "Pin disease", exact: true })).toHaveCount(0);
      await aotf.rowMenuItem("Unpin disease").click();
      await expect(aotf.rows("pinning")).toHaveCount(0);
      await expect(aotf.bodyIndicator("pinning")).toHaveCount(0);
      await aotf.expectUrlParam("pinned", "");
      await expect(aotf.filterChip("pinned")).toHaveCount(0);
    });
  });

  test("a pinned disease in the URL is restored on load, wherever it ranks, and survives a reload", async ({
    page,
    testConfig,
  }) => {
    const disease = BRAF_DISEASES.noonan;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { pinned: disease.id, page: "3" });
    await aotf.expectLoaded(1, "pinning");
    await expect(aotf.rowByName(disease.name, "pinning")).toHaveCount(1);
    await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (1 of 1)");
    expect((await aotf.displayedRange()).from).toBe(76);

    await page.reload();
    await aotf.expectLoaded(1, "pinning");
    await expect(aotf.rowByName(disease.name, "pinning")).toHaveCount(1);
    await aotf.expectUrlParam("pinned", disease.id);

    await aotf.filterChip("pinned").locator(".MuiChip-deleteIcon").click();
    await expect(aotf.rows("pinning")).toHaveCount(0);
    await aotf.expectUrlParam("pinned", "");
  });
});

test.describe("Target associations: export", () => {
  test("the download dialog names the export and offers JSON and TSV", async ({ page, testConfig }) => {
    const targetId = associationTargets(testConfig).primary;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId);
    const dialog = await aotf.openDownloadDialog();

    await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
      `Export: OT-${targetId}-associated-diseases data`
    );
    await expect(dialog).toContainText("will export the entire association table");
    await expect(dialog.getByRole("button", { name: "JSON", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "TSV", exact: true })).toBeEnabled();

    const toggle = dialog.getByRole("button", { name: "Advanced export options:" });
    await toggle.click();
    await expect(dialog.getByRole("combobox", { name: "Select associations data type" })).toHaveText(
      "Clinical, Genetic association, Somatic mutations, Affected pathway, Literature, RNA expression, Animal model"
    );
    await expect(
      dialog.getByRole("combobox", { name: "Select prioritisation data type" }),
      "prioritisation data belongs to the disease view"
    ).toHaveCount(0);
    await expect(dialog.getByRole("checkbox", { name: "Only pinned rows" }), "nothing is pinned").toBeDisabled();
    await aotf.dismissOverlay(dialog);
  });

  test("TSV and JSON downloads of the pinned diseases hold those diseases with every data source", async ({
    page,
    testConfig,
  }) => {
    const targetId = associationTargets(testConfig).primary;
    const melanoma = BRAF_DISEASES.melanoma;
    const noonan = BRAF_DISEASES.noonan;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId, { pinned: `${melanoma.id},${noonan.id}` });
    await aotf.expectLoaded(2, "pinning");
    const melanomaScore = await aotf
      .dataCell(aotf.rowByName(melanoma.name, "pinning"), "score")
      .getAttribute("data-score");

    const dialog = await aotf.openDownloadDialog();
    await dialog.getByRole("button", { name: "Advanced export options:" }).click();
    const onlyPinned = dialog.getByRole("checkbox", { name: "Only pinned rows" });
    await expect(onlyPinned).toBeEnabled();
    await onlyPinned.check();
    const fileName = new RegExp(`^OT-${targetId}-associated-diseases-.+-v\\d+_\\d+\\.`);

    await test.step("TSV", async () => {
      const download = await clickAndDownload(aotf, dialog.getByRole("button", { name: "TSV", exact: true }));
      expect(download.suggestedFilename()).toMatch(fileName);
      expect(download.suggestedFilename()).toMatch(/\.tsv$/);
      const [headerLine, ...lines] = (await downloadedText(download)).split("\n").filter((line) => line.length > 0);
      const header = headerLine.split("\t");
      expect(header.slice(0, 3)).toEqual(["disease", "globalScore", "isPinned"]);
      expect(lines).toHaveLength(2);
      const rows = lines.map((line) => {
        const cells = line.split("\t");
        expect(cells, "one cell per column").toHaveLength(header.length);
        return Object.fromEntries(header.map((key, index) => [key, cells[index]]));
      });
      expect(rows.map((row) => row.disease).sort()).toEqual([melanoma.name, noonan.name].sort());
      const exported = rows.find((row) => row.disease === melanoma.name);
      expect(exported?.isPinned).toBe("true");
      expect(Number(exported?.globalScore).toFixed(2), "the score matches the table").toBe(melanomaScore);
      expect(Number(exported?.clinicalPrecedence), "melanoma has clinical precedence").toBeGreaterThan(0);
      expect(exported?.gwasCredibleSets, "melanoma has no GWAS evidence").toBe("No data");
    });

    await test.step("JSON", async () => {
      const download = await clickAndDownload(aotf, dialog.getByRole("button", { name: "JSON", exact: true }));
      expect(download.suggestedFilename()).toMatch(fileName);
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      const records = JSON.parse(await downloadedText(download)) as Record<string, unknown>[];
      expect(records.map((record) => record.disease).sort()).toEqual([melanoma.name, noonan.name].sort());
      for (const record of records) {
        expect(record.isPinned).toBe(true);
        expect(typeof record.globalScore).toBe("number");
      }
    });
  });

  test("API query opens the playground with the table's query and its current variables", async ({
    page,
    testConfig,
  }) => {
    const targetId = associationTargets(testConfig).primary;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId, { sort: "europepmc:desc", page: "1", pageSize: "10" });
    const drawer = await aotf.openApiQuery();

    await expect(drawer).toContainText("API query");
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    const editor = drawer.getByTestId("graphiql-container");
    await expect(editor).toBeVisible({ timeout: 45_000 });
    await expect(editor).toContainText("query TargetAssociationsQuery(");
    await expect(editor).toContainText("associatedDiseases(");
    await expect(editor).toContainText(`"id": "${targetId}"`);
    await expect(editor).toContainText('"index": 1');
    await expect(editor).toContainText('"size": 10');
    await expect(editor).toContainText('"key": "europepmc"');
    await expect(editor).toContainText('"direction": "DESCENDING"');

    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
    await expect(aotf.rows()).toHaveCount(10);
  });

  test("the upload dialog asks for a list of diseases", async ({ page, testConfig }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const dialog = await aotf.openUploadDialog();
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText("Upload list of diseases");
    await aotf.dismissOverlay(dialog);
  });
});

test.describe("Target associations: navigation and URL state", () => {
  test("the Profile tab leads to the profile page, and Associated diseases back to the table", async ({
    page,
    testConfig,
  }) => {
    const targetId = associationTargets(testConfig).primary;
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(targetId);

    await aotf.profileTab.click();
    await expect(page).toHaveURL(new RegExp(`/target/${targetId}$`));
    await expect(aotf.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("section-drugs"), "the profile page shows its sections").toBeVisible({
      timeout: 45_000,
    });
    await expect(aotf.root).toHaveCount(0);
    await expect(page).toHaveTitle("BRAF profile page | Open Targets Platform");

    await aotf.associationsTab.click();
    await expect(page).toHaveURL(new RegExp(`/target/${targetId}/associations$`));
    await aotf.expectLoaded(25);
    await expect(aotf.associationsTab).toHaveAttribute("aria-selected", "true");
  });

  test("sort, page size, page and search live in the URL: reload restores them and back and forward walk through them", async ({
    page,
    testConfig,
  }) => {
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary);
    const defaultOrder = await aotf.rowNames();

    // Rows tied on a data source score come back in no fixed order, so the sorted views
    // are checked by their sort order and position, not by the names of their rows.
    await aotf.headerLabel("europepmc").click();
    await aotf.expectUrlParam("sort", "europepmc:desc");
    await aotf.expectSortedBy("europepmc");
    await aotf.goToNextPage();
    await aotf.expectUrlParam("page", "1");

    await page.reload();
    await aotf.expectLoaded();
    await aotf.expectUrlParam("sort", "europepmc:desc");
    await expect(aotf.sortIndicator("europepmc")).toBeVisible();
    await expect(aotf.displayedRows).toHaveText(/^26–50 of \d+$/);
    await aotf.expectSortedBy("europepmc");

    await page.goBack();
    await aotf.expectUrlParam("page", "");
    await expect(aotf.displayedRows).toHaveText(/^1–25 of \d+$/);
    await aotf.expectSortedBy("europepmc");

    await page.goBack();
    await aotf.expectUrlParam("sort", "");
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await aotf.expectRowNames(defaultOrder);

    await page.goForward();
    await aotf.expectUrlParam("sort", "europepmc:desc");
    await expect(aotf.sortIndicator("europepmc")).toBeVisible();
    await aotf.expectSortedBy("europepmc");
  });

  test("another target opens its own table, without the search and sort of the first", async ({
    page,
    testConfig,
  }) => {
    const { other } = associationTargets(testConfig);
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(associationTargets(testConfig).primary, { sort: "europepmc:desc", q: "cancer" });
    await expect(aotf.nameFilter).toHaveValue("cancer");

    await aotf.gotoTarget(other);
    await expect(aotf.pageTitle).toHaveText("BRCA2");
    await expect(aotf.nameFilter).toHaveValue("");
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await expect(aotf.rows()).toHaveCount(25);
  });
});

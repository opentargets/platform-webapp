import { expect, test } from "../../../fixtures";
import {
  GWAS_CS_COLUMNS,
  GwasCredibleSetsSection,
  type GwasCredibleSetRow,
} from "../../../POM/objects/widgets/Study/gwasCredibleSetsSection";
import { GwasStudyPage } from "../../../POM/page/study/gwasStudy";
import { GWAS_STUDIES } from "../../../POM/page/study/studyData";
import { expectSectionLoaded } from "../../../utils/sections";

const PAGE_SIZE = 10;
const HEADERS = [
  "Credible set",
  "Lead variant",
  "P-value",
  "Beta",
  "Fine-mapping method",
  "Fine-mapping confidence",
  "Top L2G",
  "L2G score",
  "Credible set size",
];
const METHODS = ["PICS", "SuSiE", "SuSiE-inf"];

async function open(page: import("@playwright/test").Page, studyId: string) {
  const studyPage = new GwasStudyPage(page);
  const section = new GwasCredibleSetsSection(page);
  await studyPage.goto(studyId);
  await expectSectionLoaded(page, GwasCredibleSetsSection.id);
  await section.table.expectLoaded();
  return { studyPage, section };
}

const ascending = (values: number[]) => [...values].sort((a, b) => a - b);

test.describe("Study page: GWAS credible sets", () => {
  test("shows title, description and the columns of the credible sets table", async ({
    page,
    testConfig,
  }) => {
    const { studyPage, section } = await open(page, testConfig.study.gwas.primary);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("GWAS Credible Sets");
      await expect(section.description).toHaveText(
        `95% GWAS credible sets associated with study ${testConfig.study.gwas.primary}. Source Open Targets`
      );
      await expect(section.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/study#gwas-molqtl-credible-sets"
      );
      await expect(studyPage.summaryCard("gwas_credible_sets")).toContainText("GWAS Credible Sets");
    });

    await test.step("columns", async () => {
      await expect(section.table.headers).toHaveText(HEADERS.map((header) => new RegExp(`^${header}\\??$`)));
    });

    await test.step("the table has a search box, a column picker, an export menu and an API query", async () => {
      await expect(section.table.searchInput).toHaveAttribute("placeholder", "Search all columns...");
      await expect(section.table.columnsButton).toBeVisible();
      await expect(section.table.exportButton).toBeVisible();
      await expect(section.table.apiQueryButton).toBeVisible();
    });
  });

  test("lists the first page of credible sets, strongest p-value first, in the right formats", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    const total = await section.table.total();
    expect(total, "this study has several pages of credible sets").toBeGreaterThan(2 * PAGE_SIZE);
    await section.table.expectPosition(1, PAGE_SIZE, total);
    await section.table.expectFirstPage();

    const rows = await section.readRows();
    expect(rows).toHaveLength(PAGE_SIZE);

    await test.step("every row links to its credible set, its lead variant and has numbers where numbers belong", async () => {
      for (const row of rows) {
        expect(row.credibleSetHref).toMatch(/^\/credible-set\/[0-9a-f]{32}$/);
        expect(row.leadVariantHref).toMatch(/^\/variant\/[\dXYMT]+_\d+_[ACGT]+_[ACGT]+$/);
        expect(row.leadVariantHref).toBe(`/variant/${row.leadVariant}`);
        expect(row.pValue, `p-value of ${row.leadVariant}`).toBeGreaterThan(0);
        expect(row.pValue).toBeLessThan(1);
        expect(Number.isFinite(row.beta)).toBe(true);
        expect(METHODS).toContain(row.method);
        expect(row.size).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(row.size)).toBe(true);
        expect(row.l2gScore).toBeGreaterThan(0);
        expect(row.l2gScore).toBeLessThanOrEqual(1);
        expect(row.topL2G).toMatch(/^[A-Za-z0-9-]+$/);
        expect(row.topL2GHref).toMatch(/^\/target\/ENSG\d{11}$/);
      }
      expect(new Set(rows.map((row) => row.credibleSetHref)).size, "no credible set twice").toBe(
        PAGE_SIZE
      );
    });

    await test.step("the p-values are written as mantissa x 10 to an exponent", async () => {
      const cells = await section.table.columnTexts(GWAS_CS_COLUMNS.pValue);
      for (const cell of cells) expect(cell.replace(/\s+/g, "")).toMatch(/^\d\.\d{2}×10-\d+$/);
    });

    await test.step("sorted by p-value, smallest first", async () => {
      const pValues = rows.map((row) => row.pValue);
      expect(pValues).toEqual(ascending(pValues));
    });

    await test.step("every row has a confidence rating", async () => {
      for (let index = 0; index < PAGE_SIZE; index++) {
        await expect(section.table.cell(index, GWAS_CS_COLUMNS.confidence).locator("svg").first()).toBeVisible();
      }
    });
  });

  test("the first row's credible set and lead variant match the API for the primary study", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const first = (await section.readRows())[0];
    // The strongest signal in this study: the 9p21 locus.
    expect(first.leadVariant).toBe("9_22093300_A_T");
    expect(first.topL2G).toBe("CDKN2B");
  });

  test("hovering the confidence stars and the lead variant explains them", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);

    await section.table.cell(0, GWAS_CS_COLUMNS.confidence).locator("svg").first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      /^(SuSiE fine-mapped credible set with (in|out-of)-sample LD|PICS fine-mapped credible set (extracted from summary statistics|based on reported top hit)|Unknown confidence)$/
    );
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toBeHidden();

    await section.leadVariantLink(0).hover();
    await expect(page.getByRole("tooltip")).toContainText("Most severe consequence:");
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("column headers with a help icon explain themselves", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);

    await section.table.header("Beta").locator("sup").hover();
    await expect(page.getByRole("tooltip")).toHaveText("Beta with respect to the ALT allele");
    await page.mouse.move(0, 0);

    await section.table.header("Fine-mapping confidence").locator("sup").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Fine-mapping confidence based on the suitability of the linkage-disequilibrium");
    await expect(tooltip.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
    );
  });

  test("pages forward to the last page and back to the first", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    const lastPageRows = total % PAGE_SIZE || PAGE_SIZE;
    const lastStart = total - lastPageRows + 1;
    const firstPage = await section.table.rowTexts();

    await test.step("next shows different rows", async () => {
      await section.table.nextPageButton.click();
      await section.table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await section.table.expectRowsChangedFrom(firstPage);
      const second = await section.table.rowTexts();
      expect(second).toHaveLength(PAGE_SIZE);
      for (const row of second) expect(firstPage).not.toContain(row);
      await expect(section.table.firstPageButton).toBeEnabled();
      await expect(section.table.previousPageButton).toBeEnabled();
    });

    await test.step("the last page has the remainder and disables forward buttons", async () => {
      await section.table.lastPageButton.click();
      await section.table.expectPosition(lastStart, total, total);
      await expect(section.table.rows).toHaveCount(lastPageRows);
      await section.table.expectLastPage();
    });

    await test.step("previous goes back one page", async () => {
      await section.table.previousPageButton.click();
      await section.table.expectPosition(lastStart - PAGE_SIZE, lastStart - 1, total);
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    });

    await test.step("first returns to the original rows", async () => {
      await section.table.firstPageButton.click();
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await section.table.expectRowTexts(firstPage);
      await section.table.expectFirstPage();
    });
  });

  test("a larger page size shows more rows and a page that fits them all disables paging", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    expect(total).toBeLessThanOrEqual(100);

    await section.table.setPageSize(25);
    await section.table.expectPosition(1, 25, total);
    await expect(section.table.rows).toHaveCount(25);

    await section.table.setPageSize(100);
    await section.table.expectPosition(1, total, total);
    await expect(section.table.rows).toHaveCount(total);
    await section.table.expectFirstPage(true);
    const ids = (await section.readRows()).map((row) => row.credibleSetHref);
    expect(new Set(ids).size, "every credible set once").toBe(total);
  });

  test("sorting by p-value reverses, and sorting by beta and size reorders the rows", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const byDefault = await section.table.rowTexts();

    await test.step("p-value: clicking the sorted column puts the weakest signal first", async () => {
      await section.table.clickHeader("P-value");
      await section.table.expectRowsChangedFrom(byDefault);
      await expect
        .poll(async () => {
          const pValues = (await section.readRows()).map((row) => row.pValue);
          return pValues.every((value, index) => index === 0 || pValues[index - 1] >= value);
        }, { message: "p-values should now be descending" })
        .toBe(true);
    });

    await test.step("beta ascending, then descending", async () => {
      await section.table.clickHeader("Beta");
      await expect
        .poll(async () => {
          const betas = (await section.readRows()).map((row) => row.beta);
          return betas.every((value, index) => index === 0 || betas[index - 1] <= value);
        }, { message: "betas should be ascending" })
        .toBe(true);
      const smallest = (await section.readRows())[0].beta;
      expect(smallest, "the most negative effect comes first").toBeLessThan(0);

      await section.table.clickHeader("Beta");
      await expect
        .poll(async () => {
          const betas = (await section.readRows()).map((row) => row.beta);
          return betas.every((value, index) => index === 0 || betas[index - 1] >= value);
        }, { message: "betas should be descending" })
        .toBe(true);
      expect((await section.readRows())[0].beta).toBeGreaterThan(smallest);
    });

    await test.step("credible set size", async () => {
      await section.table.clickHeader("Credible set size");
      await expect
        .poll(async () => {
          const sizes = (await section.readRows()).map((row) => row.size);
          return sizes.every((value, index) => index === 0 || sizes[index - 1] <= value);
        }, { message: "sizes should be ascending" })
        .toBe(true);
    });

    await test.step("top L2G gene is sorted alphabetically", async () => {
      await section.table.clickHeader("Top L2G");
      await expect
        .poll(async () => {
          const genes = (await section.readRows()).map((row) => row.topL2G.toLowerCase());
          return genes.every((value, index) => index === 0 || genes[index - 1] <= value);
        }, { message: "genes should be alphabetical" })
        .toBe(true);
    });

    await test.step("a sorted table pages from the start of the sorted order", async () => {
      await expect(section.table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
    });
  });

  test("search narrows the rows to those matching a gene, a variant or a method, and a miss shows no rows", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    const firstPage = await section.table.rowTexts();

    await test.step("by top L2G gene", async () => {
      await section.table.search("LPA");
      await expect
        .poll(async () => (await section.readRows()).map((row) => row.topL2G), {
          message: "every row left should have LPA as its top gene",
        })
        .toSatisfy((genes: string[]) => genes.length > 0 && genes.every((gene) => gene.includes("LPA")));
      const matching = await section.table.total();
      expect(matching).toBeLessThan(total);
      expect(matching).toBeGreaterThanOrEqual(3);
      await section.table.expectPosition(1, Math.min(PAGE_SIZE, matching), matching);
    });

    await test.step("by lead variant id", async () => {
      await section.table.search("6_160589086_A_G");
      await expect(section.table.rows).toHaveCount(1);
      expect((await section.readRows())[0].leadVariant).toBe("6_160589086_A_G");
      await section.table.expectPosition(1, 1, 1);
    });

    await test.step("by fine-mapping method", async () => {
      await section.table.search("SUSIE_INF");
      await expect
        .poll(async () => section.table.total(), { message: "the method is searchable" })
        .toBeGreaterThan(0);
    });

    await test.step("no match", async () => {
      await section.table.search("zzz-no-such-credible-set");
      await expect(section.table.rows).toHaveCount(0);
      await expect(section.table.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores the table", async () => {
      await section.table.clearSearch();
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await section.table.expectRowTexts(firstPage);
    });
  });

  test("a search from a later page starts again on the first page", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    await section.table.nextPageButton.click();
    await section.table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);

    await section.table.search("LPA");
    const matching = await section.table.total();
    await section.table.expectPosition(1, Math.min(PAGE_SIZE, matching), matching);
    await expect(section.table.rows.first()).toContainText("LPA");
  });

  test("the column picker hides columns, but not the credible set or lead variant", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const picker = await section.table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(HEADERS.length);
    await expect(picker.getByRole("checkbox", { name: "Credible set", exact: true })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Lead variant" })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Beta" }).uncheck();
    await picker.getByRole("checkbox", { name: "L2G score" }).uncheck();
    await expect(section.table.headers).toHaveText(
      HEADERS.filter((header) => header !== "Beta" && header !== "L2G score").map(
        (header) => new RegExp(`^${header}\\??$`)
      )
    );

    await picker.getByRole("checkbox", { name: "Beta" }).check();
    await picker.getByRole("checkbox", { name: "L2G score" }).check();
    await expect(section.table.headers).toHaveCount(HEADERS.length);
    await section.table.closeColumnPicker(section.title);
  });

  test("exports every credible set as JSON and TSV and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const { section } = await open(page, study);
    const total = await section.table.total();

    await test.step("JSON has one entry per credible set, across pages", async () => {
      const { filename, text } = await section.table.download("Json");
      expect(filename).toBe(`${study}-gwas-credible-sets-studies.json`);
      const rows = JSON.parse(text) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toHaveLength(HEADERS.length);
        expect(String(row.leadVariant)).toMatch(/^[\dXYMT]+_\d+_[ACGT]+_[ACGT]+$/);
      }
    });

    await test.step("TSV has a header and one line per credible set", async () => {
      const { filename, text } = await section.table.download("TSV");
      expect(filename).toBe(`${study}-gwas-credible-sets-studies.tsv`);
      const lines = text.trim().split("\n");
      expect(lines[0].split("\t")).toHaveLength(HEADERS.length);
      expect(lines).toHaveLength(total + 1);
    });

    await section.table.expectApiQuery("StudyCredibleSetsQuery");
  });

  test("the credible set link opens that credible set's page, and back returns", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const { section } = await open(page, study);
    const href = await section.credibleSetLink(0).getAttribute("href");
    expect(href).toMatch(/^\/credible-set\/[0-9a-f]{32}$/);

    await section.credibleSetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(
      href?.replace("/credible-set/", "") ?? ""
    );

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/study/${study}$`));
    await expectSectionLoaded(page, GwasCredibleSetsSection.id);
    await section.table.expectLoaded();
  });

  test("the lead variant link opens the variant page", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const variantId = (await section.readRows())[0].leadVariant;

    await section.leadVariantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(variantId);
  });

  test("the top L2G gene link opens the target page", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const gene = (await section.readRows())[0].topL2G;

    await section.topL2GLink(0).click();
    await expect(page).toHaveURL(/\/target\/ENSG\d{11}$/);
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(gene);
  });

  test("a FinnGen study with many credible sets pages through all of them", async ({ page }) => {
    const { section } = await open(page, GWAS_STUDIES.finngen.id);
    const total = await section.table.total();
    expect(total).toBeGreaterThan(5 * PAGE_SIZE);
    await section.table.lastPageButton.click();
    const lastRows = total % PAGE_SIZE || PAGE_SIZE;
    await section.table.expectPosition(total - lastRows + 1, total, total);
    await expect(section.table.rows).toHaveCount(lastRows);
    await section.table.expectLastPage();
    const rows: GwasCredibleSetRow[] = await section.readRows();
    for (const row of rows) expect(row.credibleSetHref).toMatch(/^\/credible-set\/[0-9a-f]{32}$/);
  });
});

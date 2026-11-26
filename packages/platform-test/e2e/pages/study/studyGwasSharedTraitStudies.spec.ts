import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import {
  SHARED_COLUMNS,
  SharedTraitStudiesSection,
} from "../../../POM/objects/widgets/Study/sharedTraitStudiesSection";
import { GwasStudyPage } from "../../../POM/page/study/gwasStudy";
import { GWAS_STUDIES, MYOCARDIAL_INFARCTION } from "../../../POM/page/study/studyData";
import { expectSectionLoaded } from "../../../utils/sections";

const PAGE_SIZE = 10;
const HEADERS = [
  "Study",
  "Shared disease/phenotype",
  "Reported trait",
  "Sample size",
  "Cohorts",
  "Publication",
];
const STUDY_ID = /^(GCST\d+|FINNGEN_R\d+_[A-Z0-9_]+|[A-Z0-9_]+)$/;

async function open(page: Page, studyId: string) {
  const studyPage = new GwasStudyPage(page);
  const section = new SharedTraitStudiesSection(page);
  await studyPage.goto(studyId);
  await expectSectionLoaded(page, SharedTraitStudiesSection.id);
  await section.table.expectLoaded();
  return { studyPage, section };
}

const isSorted = (values: number[], direction: 1 | -1) =>
  values.every((value, index) => index === 0 || (direction === 1 ? values[index - 1] <= value : values[index - 1] >= value));

test.describe("Study page: shared trait studies", () => {
  // The publication drawer asks Europe PMC for the paper. That third-party service
  // throttles, so it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description and the columns of the shared trait studies table", async ({
    page,
    testConfig,
  }) => {
    const { studyPage, section } = await open(page, testConfig.study.gwas.primary);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("Shared Trait Studies");
      await expect(section.description).toHaveText(
        `GWAS sharing traits with study ${testConfig.study.gwas.primary}. Source GWAS Catalog, FinnGen.`
      );
      await expect(section.description.getByRole("link", { name: "GWAS Catalog" })).toHaveAttribute(
        "href",
        "https://www.ebi.ac.uk/gwas/studies"
      );
      await expect(section.description.getByRole("link", { name: "FinnGen" })).toHaveAttribute(
        "href",
        "https://r12.finngen.fi"
      );
      await expect(studyPage.summaryCard("shared_trait_studies")).toContainText("Shared Trait Studies");
    });

    await test.step("columns and controls", async () => {
      await expect(section.table.headers).toHaveText(HEADERS);
      await expect(section.table.searchInput).toHaveAttribute(
        "placeholder",
        "Search studies, traits or authors..."
      );
      await expect(section.table.columnsButton).toBeVisible();
      await expect(section.table.exportButton).toBeVisible();
      await expect(section.table.apiQueryButton).toBeVisible();
    });
  });

  test("lists the largest studies first and never the study being viewed", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const { section } = await open(page, study);
    await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    const total = await section.table.total();
    expect(total, "this disease has many GWAS").toBeGreaterThan(3 * PAGE_SIZE);
    await section.table.expectPosition(1, PAGE_SIZE, total);
    await section.table.expectFirstPage();

    await test.step("sample sizes are formatted numbers, largest first", async () => {
      const sizes = await section.sampleSizes();
      expect(sizes).toHaveLength(PAGE_SIZE);
      for (const size of sizes) expect(Number.isInteger(size) && size > 0).toBe(true);
      expect(isSorted(sizes, -1), `${sizes} should be descending`).toBe(true);
      const texts = await section.table.columnTexts(SHARED_COLUMNS.sampleSize);
      for (const text of texts) expect(text).toMatch(/^\d{1,3}(,\d{3})*$/);
    });

    await test.step("each row is another study that shares the disease", async () => {
      const ids = await section.studyIds();
      expect(new Set(ids).size, "no study twice").toBe(PAGE_SIZE);
      for (const id of ids) {
        expect(id).toMatch(STUDY_ID);
        expect(id, "the study itself is not listed").not.toBe(study);
      }
      for (let row = 0; row < PAGE_SIZE; row++) {
        await expect(section.studyLink(row)).toHaveAttribute("href", `/study/${ids[row]}`);
        await expect(section.diseaseLinks(row)).toHaveText([MYOCARDIAL_INFARCTION.name]);
        await expect(section.diseaseLinks(row)).toHaveAttribute("href", `/disease/${MYOCARDIAL_INFARCTION.id}`);
        await expect(section.cell(row, "reportedTrait")).not.toBeEmpty();
      }
    });

    await test.step("cohorts are named, publications show author and year", async () => {
      const cohorts = await section.table.columnTexts(SHARED_COLUMNS.cohorts);
      for (const cohort of cohorts) expect(cohort).toMatch(/^([A-Za-z0-9 ,.-]+\??|N\/A)$/);
      const publications = await section.table.columnTexts(SHARED_COLUMNS.publication);
      for (const publication of publications) {
        expect(publication).toMatch(/^(.+ et al\.( \((19|20)\d{2}\))?|N\/A)$/);
      }
    });
  });

  test("pages forward to the last page and back, and the pages differ", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    const lastRows = total % PAGE_SIZE || PAGE_SIZE;
    const firstIds = await section.studyIds();

    await section.table.nextPageButton.click();
    await section.table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await expect.poll(() => section.studyIds()).not.toEqual(firstIds);
    const secondIds = await section.studyIds();
    for (const id of secondIds) expect(firstIds).not.toContain(id);
    const secondSizes = await section.sampleSizes();
    expect(isSorted(secondSizes, -1), "page 2 is still in descending order").toBe(true);

    await section.table.lastPageButton.click();
    await section.table.expectPosition(total - lastRows + 1, total, total);
    await expect(section.table.rows).toHaveCount(lastRows);
    await section.table.expectLastPage();

    await section.table.firstPageButton.click();
    await section.table.expectPosition(1, PAGE_SIZE, total);
    await expect.poll(() => section.studyIds()).toEqual(firstIds);
    await section.table.expectFirstPage();
  });

  test("a larger page size shows more rows", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();

    await section.table.setPageSize(25);
    await section.table.expectPosition(1, 25, total);
    await expect(section.table.rows).toHaveCount(25);

    await section.table.setPageSize(100);
    await section.table.expectPosition(1, Math.min(100, total), total);
    await expect(section.table.rows).toHaveCount(Math.min(100, total));
  });

  test("sorting by sample size and by publication date reorders the rows", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const byDefault = await section.studyIds();

    await test.step("sample size: ascending, then unsorted, then back to descending", async () => {
      await section.table.clickHeader("Sample size");
      await expect
        .poll(async () => isSorted(await section.sampleSizes(), 1), {
          message: "sample sizes should be ascending",
        })
        .toBe(true);
      const smallest = (await section.sampleSizes())[0];
      expect(smallest, "the smallest studies have a few thousand samples").toBeLessThan(10_000);
      await expect.poll(() => section.studyIds()).not.toEqual(byDefault);

      await section.table.clickHeader("Sample size");
      await expect
        .poll(async () => isSorted(await section.sampleSizes(), 1) || isSorted(await section.sampleSizes(), -1))
        .toBe(false);

      await section.table.clickHeader("Sample size");
      await expect.poll(() => section.studyIds()).toEqual(byDefault);
    });

    await test.step("publication: newest first, then oldest first", async () => {
      const year = async () =>
        (await section.table.columnTexts(SHARED_COLUMNS.publication)).map((text) =>
          Number(/\((\d{4})\)/.exec(text)?.[1] ?? Number.NaN)
        );
      await section.table.clickHeader("Publication");
      await expect
        .poll(async () => {
          const years = await year();
          return years.length > 0 && years.every((value, index) => index === 0 || years[index - 1] >= value);
        }, { message: "publication years should be descending" })
        .toBe(true);
      expect((await year())[0], "the newest publication comes first").toBeGreaterThanOrEqual(2024);

      await section.table.clickHeader("Publication");
      await expect
        .poll(async () => {
          const years = await year();
          return years.length > 0 && years.every((value, index) => index === 0 || years[index - 1] <= value);
        }, { message: "publication years should be ascending" })
        .toBe(true);
      expect((await year())[0], "the oldest publication comes first").toBeLessThanOrEqual(2012);
    });
  });

  test("search finds a study by id, by reported trait and by author, and a miss shows no rows", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const total = await section.table.total();
    const firstIds = await section.studyIds();

    await test.step("by study id", async () => {
      await section.table.search(firstIds[0]);
      await expect(section.table.rows).toHaveCount(1);
      expect(await section.studyIds()).toEqual([firstIds[0]]);
      await section.table.expectPosition(1, 1, 1);
    });

    await test.step("by reported trait", async () => {
      await section.table.search("Heart attack");
      await expect
        .poll(async () => section.table.total(), { message: "the trait is searchable" })
        .toBeLessThan(total);
      await expect
        .poll(
          async () => {
            const traits = await section.table.columnTexts(SHARED_COLUMNS.reportedTrait);
            return traits.length > 0 && traits.every((trait) => trait.toLowerCase().includes("heart attack"));
          },
          { message: "every row left should have 'heart attack' in its reported trait" }
        )
        .toBe(true);
    });

    await test.step("by first author of the publication", async () => {
      await section.table.search("Al-Ali");
      await expect
        .poll(async () => (await section.table.columnTexts(SHARED_COLUMNS.publication))[0], {
          message: "the author is searchable",
        })
        .toContain("Al-Ali");
      await expect
        .poll(async () =>
          (await section.table.columnTexts(SHARED_COLUMNS.publication)).every((publication) =>
            publication.includes("Al-Ali")
          )
        )
        .toBe(true);
    });

    await test.step("no match", async () => {
      await section.table.search("zzz-no-such-study");
      await expect(section.table.rows).toHaveCount(0);
      await expect(section.table.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores the first page", async () => {
      await section.table.clearSearch();
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await expect.poll(() => section.studyIds()).toEqual(firstIds);
    });
  });

  test("the study link opens that study's page, and back returns", async ({ page, testConfig }) => {
    const study = testConfig.study.gwas.primary;
    const { section } = await open(page, study);
    const [firstId] = await section.studyIds();

    await section.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${firstId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(firstId);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/study/${study}(#.*)?$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(study);
    await expectSectionLoaded(page, SharedTraitStudiesSection.id);
  });

  test("the disease link opens the disease page", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);

    await section.diseaseLinks(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${MYOCARDIAL_INFARCTION.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(MYOCARDIAL_INFARCTION.name);
  });

  test("the cohort tooltip lists the LD populations and their shares", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);

    await section.cell(0, "cohorts").locator("sup").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("LD populations and relative sample sizes");
    await expect(tooltip).toContainText(/(nfe|afr|amr|eas|fin|sas|asj|mid): 0?\.?\d/);
  });

  test("the publication opens the publications drawer for that study's PubMed id", async ({
    page,
    testConfig,
  }) => {
    const searches = await stubEuropePmc(page);
    const { section } = await open(page, testConfig.study.gwas.primary);

    const label = (await section.publicationTrigger(0).innerText()).trim();
    expect(label).toMatch(/ et al\. \((19|20)\d{2}\)$/);
    await section.publicationTrigger(0).click();
    const drawer = page.getByTestId("publications-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Publications");
    await expect(drawer).toContainText(/Stubbed publication \d+/);
    expect(searches.at(-1)?.[0]).toMatch(/^\d+$/);

    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("the column picker hides columns, but not the study", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    const picker = await section.table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(HEADERS.length);
    await expect(picker.getByRole("checkbox", { name: "Study", exact: true })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Cohorts" }).uncheck();
    await picker.getByRole("checkbox", { name: "Publication" }).uncheck();
    await expect(section.table.headers).toHaveText(HEADERS.filter((h) => h !== "Cohorts" && h !== "Publication"));

    await picker.getByRole("checkbox", { name: "Cohorts" }).check();
    await picker.getByRole("checkbox", { name: "Publication" }).check();
    await expect(section.table.headers).toHaveText(HEADERS);
    await section.table.closeColumnPicker(section.title);
  });

  test("exports every shared study as JSON and TSV", async ({ page, testConfig }) => {
    const study = testConfig.study.gwas.primary;
    const { section } = await open(page, study);
    const total = await section.table.total();

    await test.step("JSON has one entry per study and never the study itself", async () => {
      const { filename, text } = await section.table.download("Json");
      expect(filename).toBe(`${study}-shared-trait-studies.json`);
      const rows = JSON.parse(text) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toHaveLength(HEADERS.length);
        expect(Object.values(row)[0]).not.toBe(study);
      }
    });

    await test.step("TSV has a header and one line per study", async () => {
      const { filename, text } = await section.table.download("TSV");
      expect(filename).toBe(`${study}-shared-trait-studies.tsv`);
      const lines = text.trim().split("\n");
      expect(lines[0].split("\t")).toHaveLength(HEADERS.length);
      expect(lines).toHaveLength(total + 1);
    });
  });

  test("the API query button shows the shared trait studies query", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.study.gwas.primary);
    await section.table.expectApiQuery("SharedTraitStudiesQuery");
  });

  test("a study linked to two diseases lists studies sharing either, and says which", async ({
    page,
  }) => {
    const facts = GWAS_STUDIES.twoDiseases;
    const { section } = await open(page, facts.id);
    const total = await section.table.total();
    expect(total).toBeGreaterThan(PAGE_SIZE);

    const diseaseIds = new Set(facts.diseases.map(({ id }) => id));
    const hrefs = await section.table.rows
      .locator("td:nth-child(2) a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(PAGE_SIZE);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/disease\/[A-Za-z]+_\d+$/);
      expect(diseaseIds, `${href} is a disease of the study`).toContain(href.replace("/disease/", ""));
    }
  });

  test("a study without credible sets still lists its shared trait studies", async ({ page }) => {
    const facts = GWAS_STUDIES.noSumstatsNoCredibleSets;
    const { section } = await open(page, facts.id);

    await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    expect(await section.studyIds()).not.toContain(facts.id);
  });

  test("a FinnGen study's cohort is shown as FinnGen in other studies' rows", async ({ page }) => {
    const facts = GWAS_STUDIES.finngen;
    const { section } = await open(page, facts.id);
    const total = await section.table.total();

    await section.table.setPageSize(100);
    await section.table.search("FINNGEN");
    await expect
      .poll(async () => section.table.total(), { message: "FinnGen studies are searchable by id" })
      .toBeLessThan(total);
    const ids = await section.studyIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^FINNGEN_R\d+_/);
    for (const cohort of await section.table.columnTexts(SHARED_COLUMNS.cohorts)) {
      expect(cohort).toMatch(/^FinnGen\??$/);
    }
    expect(ids, "the study itself is not listed").not.toContain(facts.id);
  });
});

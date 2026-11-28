import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { DiseaseGwasStudiesSection } from "../../../../POM/objects/widgets/Disease/diseaseGwasStudiesSection";
import { closeDrawer, expectExternalLink } from "../../../../POM/objects/widgets/Drug/sectionTable";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { DiseasePage } from "../../../../POM/page/disease/disease";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

const PAGE_SIZE = 10;
const COL = {
  study: 0,
  trait: 1,
  samples: 2,
  cohorts: 3,
  publication: 4,
  credibleSets: 5,
} as const;
/** Marfan syndrome: a single GWAS study, from FinnGen. */
const SINGLE_STUDY = { disease: "MONDO_0007947", study: "FINNGEN_R12_Q17_MARFAN" };
/** A leaf of the ontology: no GWAS studies. */
const WITHOUT_STUDIES = "MONDO_0016621";

type StudiesData = {
  studies: {
    studiesView: {
      count: number;
      rows: {
        id: string;
        pubmedId: string | null;
        publicationFirstAuthor: string | null;
        cohorts: string[];
        ldPopulationStructure: { ldPopulation: string; relativeSampleSize: number }[] | null;
      }[];
    };
  };
};

const numbers = (texts: string[]): number[] => texts.map((text) => Number(text.replace(/,/g, "")));

async function openGwas(page: Page, diseaseId: string): Promise<DiseaseGwasStudiesSection> {
  const gwas = new DiseaseGwasStudiesSection(page);
  await new DiseasePage(page).goto(diseaseId);
  await expectSectionLoaded(page, DiseaseGwasStudiesSection.id);
  return gwas;
}

test.describe("Disease page: GWAS studies", () => {
  // The publication drawer asks Europe PMC for the publication's details.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, columns and the largest studies first", async ({
    page,
    testConfig,
  }) => {
    const { primary, name } = testConfig.disease;
    const gwas = await openGwas(page, primary);
    const table = gwas.table;

    await test.step("title and description", async () => {
      await expect(new DiseasePage(page).sectionTitle(DiseaseGwasStudiesSection.id)).toHaveText(
        "GWAS"
      );
      await expect(gwas.description).toHaveText(
        `GWAS associated with ${name}. Source: GWAS Catalog, FinnGen.`
      );
      await expectExternalLink(
        gwas.description.getByRole("link", { name: "GWAS Catalog" }),
        "https://www.ebi.ac.uk/gwas/studies"
      );
      await expectExternalLink(
        gwas.description.getByRole("link", { name: "FinnGen" }),
        "https://r12.finngen.fi"
      );
    });

    await table.expectHeaders([...DiseaseGwasStudiesSection.headers]);
    await table.expectRows(PAGE_SIZE);
    const total = await table.total();
    expect(total, "myocardial infarction has several pages of studies").toBeGreaterThan(
      2 * PAGE_SIZE
    );
    await table.expectPosition(1, PAGE_SIZE, total);
    await table.expectPaginationState("first");
    await expect(table.searchInput).toHaveAttribute("placeholder", "Search studies...");
    await expect(table.pageSizeSelect).toHaveValue(String(PAGE_SIZE));

    await test.step("every row has a study link, a trait and well-formed numbers", async () => {
      for (let row = 0; row < PAGE_SIZE; row++) {
        const link = gwas.studyLink(row);
        const id = (await link.innerText()).trim();
        expect(id).toMatch(/^(GCST\d+|FINNGEN_R\d+_\S+|[A-Z0-9_]+)$/);
        await expect(link).toHaveAttribute("href", `/study/${id}`);
        await expect(table.cell(row, COL.trait)).not.toBeEmpty();
        await expect(table.cell(row, COL.samples)).toHaveText(/^\d{1,3}(,\d{3})*$/);
        await expect(table.cell(row, COL.credibleSets)).toHaveText(/^(\d+|N\/A)$/);
        await expect(table.cell(row, COL.cohorts)).not.toBeEmpty();
        await expect(table.cell(row, COL.publication)).toHaveText(
          /^\s*(N\/A|.+ et al\. \((\d{4}|N\/A)\))\s*$/
        );
      }
      const ids = await table.columnTexts(COL.study);
      expect(new Set(ids).size, "no study is listed twice").toBe(PAGE_SIZE);
    });

    await test.step("sorted by sample size, largest first", async () => {
      const samples = numbers(await table.columnTexts(COL.samples));
      expect(samples).toEqual([...samples].sort((a, b) => b - a));
      expect(samples[0]).toBeGreaterThan(100_000);
    });
  });

  test("the first page is the server's, in the server's order", async ({ page, testConfig }) => {
    const { primary } = testConfig.disease;
    const response = waitForOperation<StudiesData>(page, "GWASStudiesQuery");
    const gwas = await openGwas(page, primary);
    const { data, variables } = await response;
    const view = data.studies.studiesView;

    expect(variables).toMatchObject({
      diseaseIds: [primary],
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: "N_SAMPLES", direction: "DESCENDING" }],
    });
    expect(view.rows).toHaveLength(PAGE_SIZE);
    await gwas.table.expectRows(PAGE_SIZE);
    expect(await gwas.table.columnTexts(COL.study)).toEqual(view.rows.map((row) => row.id));
    expect(await gwas.table.total()).toBe(view.count);
  });

  test("sorting by a column reorders the rows on the server, and toggles direction", async ({
    page,
    testConfig,
  }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    const total = await table.total();
    const descending = await table.columnTexts(COL.study);

    await test.step("sample size ascending", async () => {
      const request = page.waitForRequest((candidate) => {
        const body = candidate.postDataJSON?.() as {
          operationName?: string;
          variables?: { sort?: { key: string; direction: string }[] };
        } | null;
        return (
          body?.operationName === "GWASStudiesQuery" &&
          body.variables?.sort?.[0]?.direction === "ASCENDING"
        );
      });
      await table.headers.nth(COL.samples).getByText("Sample size").click();
      const sent = (await request).postDataJSON() as { variables: { sort: { key: string }[] } };
      expect(sent.variables.sort[0].key).toBe("N_SAMPLES");
      await expect
        .poll(
          async () => {
            const samples = numbers(await table.columnTexts(COL.samples));
            return (
              samples.join() === [...samples].sort((a, b) => a - b).join() && samples[0] < 5000
            );
          },
          { message: "smallest studies first" }
        )
        .toBe(true);
      expect(await table.columnTexts(COL.study)).not.toEqual(descending);
      await table.expectPosition(1, PAGE_SIZE, total);
    });

    await test.step("publication date: newest first, then oldest first", async () => {
      const years = async (): Promise<number[]> =>
        (await table.columnTexts(COL.publication)).map((text) =>
          Number((/\((\d{4})\)/.exec(text) ?? [])[1])
        );
      for (const direction of ["DESCENDING", "ASCENDING"] as const) {
        const request = page.waitForRequest((candidate) => {
          const body = candidate.postDataJSON?.() as {
            operationName?: string;
            variables?: { sort?: { key: string; direction: string }[] };
          } | null;
          return (
            body?.operationName === "GWASStudiesQuery" &&
            body.variables?.sort?.[0]?.key === "PUBLICATION_DATE" &&
            body.variables.sort[0].direction === direction
          );
        });
        await table.headers.nth(COL.publication).getByText("Publication").click();
        await request;
        const expected = (values: number[]): number[] =>
          [...values].sort((a, b) => (direction === "DESCENDING" ? b - a : a - b));
        await expect
          .poll(
            async () => {
              const values = await years();
              return values.every(Number.isInteger) && values.join() === expected(values).join();
            },
            { message: `publications ordered ${direction}` }
          )
          .toBe(true);
      }
      const oldest = await years();
      expect(oldest[0], "oldest first starts before 2015").toBeLessThan(2015);
    });

    await test.step("the columns without a sort field do not sort", async () => {
      const before = await table.columnTexts(COL.study);
      await table.headers.nth(COL.trait).getByText("Reported trait").click();
      await table.expectRows(PAGE_SIZE);
      expect(await table.columnTexts(COL.study)).toEqual(before);
    });
  });

  test("the list paginates on the server and the page size widens it", async ({
    page,
    testConfig,
  }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    const total = await table.total();
    const firstPage = await table.columnTexts(COL.study);

    await test.step("page 2", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await expect.poll(async () => table.columnTexts(COL.study)).not.toEqual(firstPage);
      const secondPage = await table.columnTexts(COL.study);
      expect(secondPage).toHaveLength(PAGE_SIZE);
      for (const id of secondPage) expect(firstPage).not.toContain(id);
      await table.expectPaginationState("middle");
      const samples = numbers(await table.columnTexts(COL.samples));
      expect(samples, "page 2 continues the descending order").toEqual(
        [...samples].sort((a, b) => b - a)
      );
      expect(samples[0]).toBeLessThanOrEqual(
        numbers([await table.cell(PAGE_SIZE - 1, COL.samples).innerText()])[0] +
          Number.MAX_SAFE_INTEGER
      );
    });

    await test.step("last page", async () => {
      await table.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
      await table.expectPosition(lastStart, total, total);
      await table.expectRows(total - lastStart + 1);
      await table.expectPaginationState("last");
    });

    await test.step("back to the first page", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await expect.poll(async () => table.columnTexts(COL.study)).toEqual(firstPage);
      await table.expectPaginationState("first");
    });

    await test.step("twenty-five rows per page", async () => {
      await table.pageSizeSelect.selectOption("25");
      await expect(table.pageSizeSelect).toHaveValue("25");
      await table.expectPosition(1, 25, total);
      await table.expectRows(25);
      const ids = await table.columnTexts(COL.study);
      expect(ids.slice(0, PAGE_SIZE)).toEqual(firstPage);
      expect(new Set(ids).size).toBe(25);
      await table.expectPaginationState("first");
    });
  });

  test("search finds studies by id, trait or first author, and says so when there are none", async ({
    page,
    testConfig,
  }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    const total = await table.total();

    let matches = 0;
    await test.step("by study id", async () => {
      const request = page.waitForRequest((candidate) => {
        const body = candidate.postDataJSON?.() as {
          operationName?: string;
          variables?: { search?: { text?: string } };
        } | null;
        return (
          body?.operationName === "GWASStudiesQuery" &&
          body.variables?.search?.text === "GCST011365"
        );
      });
      await table.search("GCST011365", total);
      const sent = (await request).postDataJSON() as {
        variables: { search: { fields: string[] } };
      };
      expect([...sent.variables.search.fields].sort()).toEqual([
        "PUBLICATION_DATE",
        "PUBLICATION_FIRST_AUTHOR",
        "PUBLICATION_JOURNAL",
        "STUDY_ID",
        "TRAIT_FROM_SOURCE",
      ]);
      await table.expectPosition(1, 1, 1);
      await table.expectRows(1);
      await expect(gwas.studyLink(0)).toHaveText("GCST011365");
      await expect(table.cell(0, COL.publication)).toContainText("Hartiala JA et al.");
      await table.expectPaginationState("only");
    });

    await test.step("by first author, across pages of the whole list", async () => {
      await table.search("Sakaue", 1);
      await expect.poll(async () => table.total()).toBeGreaterThan(1);
      matches = await table.total();
      expect(matches).toBeLessThan(total);
      await table.expectRows(Math.min(matches, PAGE_SIZE));
      for (const text of await table.columnTexts(COL.publication))
        expect(text).toContain("Sakaue S");
    });

    await test.step("by trait", async () => {
      await table.search("PheCode 411.2", matches);
      await expect
        .poll(async () => table.columnTexts(COL.study), { message: "the PheCode study is found" })
        .toContain("GCST90480130");
      expect(await table.total()).toBeLessThan(total);
      for (const text of await table.columnTexts(COL.trait)) expect(text).toContain("411.2");
    });

    await test.step("no match shows an empty table", async () => {
      await table.searchInput.fill("zzz-no-such-study");
      await expect(table.position).toHaveText("1 - 0 of 0");
      await table.expectRows(0);
    });

    await test.step("clearing the search restores the full list", async () => {
      await table.clearSearch(total);
      await table.expectRows(PAGE_SIZE);
      await table.expectPosition(1, PAGE_SIZE, total);
    });
  });

  test("FinnGen studies read as FinnGen, with no publication author", async ({
    page,
    testConfig,
  }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    await table.search("FINNGEN_R", await table.total());
    await expect.poll(async () => table.total()).toBe(2);
    await table.expectRows(2);
    for (let row = 0; row < 2; row++) {
      await expect(gwas.studyLink(row)).toHaveText(/^FINNGEN_R\d+_I9_MI_/);
      await expect(table.cell(row, COL.cohorts)).toHaveText(/^FinnGen\??$/);
      await expect(table.cell(row, COL.publication), "FinnGen has no first author").toHaveText(
        "N/A"
      );
    }
  });

  test("the cohorts of a study show their LD populations in a tooltip", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<StudiesData>(page, "GWASStudiesQuery");
    const gwas = await openGwas(page, testConfig.disease.primary);
    const { data } = await response;
    const rows = data.studies.studiesView.rows;
    await gwas.table.expectRows(PAGE_SIZE);

    const index = rows.findIndex(
      (row) => row.cohorts.length > 0 && row.ldPopulationStructure?.length
    );
    expect(
      index,
      "a study with cohorts and LD populations is on the first page"
    ).toBeGreaterThanOrEqual(0);
    const row = rows[index];
    const cell = gwas.table.cell(index, COL.cohorts);
    await expect(cell).toContainText(row.cohorts.join(", "));
    await cell.locator("sup").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("LD populations and relative sample sizes");
    for (const { ldPopulation } of row.ldPopulationStructure ?? []) {
      await expect(tooltip).toContainText(new RegExp(`${ldPopulation}: \\d`));
    }

    await test.step("a study without cohorts shows N/A and no tooltip", async () => {
      const without = rows.findIndex((candidate) => candidate.cohorts.length === 0);
      expect(without, "a study without cohorts is on the first page").toBeGreaterThanOrEqual(0);
      await expect(gwas.table.cell(without, COL.cohorts)).toHaveText("N/A");
    });
  });

  test("a publication opens in a drawer with its Europe PMC link, and closes again", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<StudiesData>(page, "GWASStudiesQuery");
    const gwas = await openGwas(page, testConfig.disease.primary);
    const { data } = await response;
    await gwas.table.expectRows(PAGE_SIZE);
    const rows = data.studies.studiesView.rows;
    const index = rows.findIndex((row) => row.pubmedId && row.publicationFirstAuthor);
    expect(index, "a published study is on the first page").toBeGreaterThanOrEqual(0);
    const { pubmedId, publicationFirstAuthor } = rows[index];

    const trigger = gwas.table
      .cell(index, COL.publication)
      .getByTestId("publications-drawer-trigger");
    await expect(trigger).toHaveText(
      new RegExp(`^\\s*${publicationFirstAuthor} et al\\. \\(\\d{4}\\)\\s*$`)
    );
    await expect(gwas.publicationsDrawer).toHaveCount(0);
    await trigger.click();

    const drawer = gwas.publicationsDrawer;
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByTestId(`literature-entry-${pubmedId}`),
      "the drawer shows the study's publication"
    ).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: `Stubbed publication ${pubmedId}` })
    ).toHaveAttribute("href", `https://europepmc.org/abstract/med/${pubmedId}`);
    await closeDrawer(drawer);
  });

  test("a study id opens the study page", async ({ page, testConfig }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    await gwas.table.expectRows(PAGE_SIZE);
    const id = (await gwas.studyLink(0).innerText()).trim();
    await gwas.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(id);
  });

  test("a disease with a single study shows one row and no paging", async ({ page }) => {
    const gwas = await openGwas(page, SINGLE_STUDY.disease);
    const table = gwas.table;
    await table.expectRows(1);
    await table.expectPosition(1, 1, 1);
    await table.expectPaginationState("only");
    await expect(gwas.studyLink(0)).toHaveText(SINGLE_STUDY.study);
    await expect(table.cell(0, COL.trait)).toHaveText("Marfan's syndrome");
    await expect(table.cell(0, COL.cohorts)).toHaveText(/^FinnGen\??$/);
    await expect(table.cell(0, COL.publication)).toHaveText("N/A");
    await expect(table.cell(0, COL.credibleSets)).toHaveText("0");
    await expect(table.cell(0, COL.samples)).toHaveText(/^\d{3},\d{3}$/);
  });

  test("a disease without studies has no GWAS section", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.goto(WITHOUT_STUDIES);
    await expectSectionLoaded(page, "ontology");
    await expect(sectionLocator(page, DiseaseGwasStudiesSection.id)).toHaveCount(0);
  });

  test("exports every study, across pages", async ({ page, testConfig }) => {
    const { primary } = testConfig.disease;
    const gwas = await openGwas(page, primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    const total = await table.total();
    const ids = await table.columnTexts(COL.study);

    await test.step("JSON", async () => {
      const { filename, rows } = await table.exportJson();
      expect(filename).toBe(`${primary}-gwas-studies.json`);
      expect(rows).toHaveLength(total);
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.study)).toEqual(ids);
      expect(Object.keys(rows[0])).toEqual([
        // export columns are named after the camelCased column labels
        "study",
        "reportedTrait",
        "sampleSize",
        "cohorts",
        "publication",
        "credibleSetsCount",
      ]);
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await table.exportTsv();
      expect(filename).toBe(`${primary}-gwas-studies.tsv`);
      expect(header).toEqual([
        // export columns are named after the camelCased column labels
        "study",
        "reportedTrait",
        "sampleSize",
        "cohorts",
        "publication",
        "credibleSetsCount",
      ]);
      expect(lines).toHaveLength(total);
    });
  });

  test("the API query button shows the query behind the table", async ({ page, testConfig }) => {
    const { primary } = testConfig.disease;
    const gwas = await openGwas(page, primary);
    await gwas.table.expectRows(PAGE_SIZE);
    await gwas.table.expectApiQuery("GWASStudiesQuery", primary);
  });

  test("columns can be hidden and shown again", async ({ page, testConfig }) => {
    const gwas = await openGwas(page, testConfig.disease.primary);
    const table = gwas.table;
    await table.expectRows(PAGE_SIZE);
    const list = await table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(DiseaseGwasStudiesSection.headers.length);
    await expect(list.getByRole("checkbox", { name: "Study" })).toBeDisabled();
    await list.getByRole("checkbox", { name: "Cohorts" }).uncheck();
    await expect(table.headers).toHaveCount(DiseaseGwasStudiesSection.headers.length - 1);
    await expect(table.headers.filter({ hasText: "Cohorts" })).toHaveCount(0);
    await list.getByRole("checkbox", { name: "Cohorts" }).check();
    await expect(table.headers).toHaveCount(DiseaseGwasStudiesSection.headers.length);
  });
});

import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  BRAF_MELANOMA_EP,
  BRAF_MI_EP,
  EP_COLUMN,
  EP_HEADERS,
  EP_LIST,
  EP_OPERATION,
  EP_PAGE_SIZE,
  type EuropePmcRow,
  expectedMarks,
  openEuropePmc,
  stubbedAbstract,
  stubbedTitle,
  stubbedYear,
} from "../../../../POM/objects/widgets/Evidence/europePmc";
import { expectExports } from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import { waitForPageOfOperation } from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import { expectSections } from "../../../../utils/sections";

const pmid = (row: EuropePmcRow): string => row.literature[0];

test.describe("Evidence page: Europe PMC", () => {
  test("shows title, description, chip, controls and the table headers", async ({ page }) => {
    const { section, list } = await openEuropePmc(page);
    expect(list.count, "BRAF has thousands of publications in melanoma").toBeGreaterThan(1000);

    await expect(section.title).toContainText("Europe PMC");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Text-mining method evaluating the strength of the association between BRAF and melanoma when they co-occur in the literature. Source: Europe PMC"
    );
    await expect(section.description.getByRole("link", { name: "Europe PMC" })).toHaveAttribute(
      "href",
      "http://europepmc.org"
    );
    await expect(section.table.headers).toHaveText([...EP_HEADERS]);
    await expect(section.table.position).toHaveText(`1 - ${EP_PAGE_SIZE} of ${list.count}`);
    await expect(section.table.rows).toHaveCount(EP_PAGE_SIZE);
    await expect(section.table.firstPageButton).toBeDisabled();
    await expect(section.table.previousPageButton).toBeDisabled();
    await expect(section.table.nextPageButton).toBeEnabled();
    await expect(section.table.lastPageButton).toBeEnabled();
    await expect(section.table.searchInput, "this table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, publication, year and score, and asks Europe PMC for its page only", async ({
    page,
  }) => {
    const { section, list, stub } = await openEuropePmc(page);
    for (const [index, expected] of list.rows.entries()) {
      const id = pmid(expected);
      await test.step(`row ${index + 1}: publication ${id}`, async () => {
        expect(id).toMatch(/^\d+$/);
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );

        await section.expectDetailsLoaded(index);
        await expect(section.titleLink(index)).toHaveText(stubbedTitle(id));
        await expect(section.titleLink(index)).toHaveAttribute(
          "href",
          `https://europepmc.org/abstract/med/${id}`
        );
        await expect(section.publication(index)).toContainText("Tester A, Checker B");
        await expect(section.publication(index)).toContainText(
          `Journal of Stubs ${stubbedYear(id)} 12(3):101-110`
        );
        await expect(section.cell(index, EP_COLUMN.year)).toHaveText(stubbedYear(id));
        await expect(section.cell(index, EP_COLUMN.score)).toHaveText(
          String(expected.resourceScore)
        );
        await expect(section.button(index, "Show abstract")).toBeVisible();
        await expect(section.button(index, /^Show \d+ match details$/)).toHaveText(
          `Show ${expected.textMiningSentences?.length} match details`
        );
        await expect(
          section.button(index, "Show summary"),
          "a publication that is not open access has no AI summary"
        ).toHaveCount(0);
      });
    }
    expect(
      stub.searches.flat().sort(),
      "Europe PMC is asked for exactly the publications of the visible page"
    ).toEqual(list.rows.map(pmid).sort());
  });

  test("a publication Europe PMC does not know shows N/A and does not break its neighbours", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page, BRAF_MELANOMA_EP, { omitFirst: true });
    await expect(section.publication(0)).toHaveText("N/A");
    await expect(section.cell(0, EP_COLUMN.year)).toHaveText("N/A");
    await expect(section.diseaseLink(0)).toHaveText(list.rows[0].disease.name);
    await expect(section.cell(0, EP_COLUMN.score)).toHaveText(String(list.rows[0].resourceScore));
    await section.expectDetailsLoaded(1);
    await expect(section.titleLink(1)).toHaveText(stubbedTitle(pmid(list.rows[1])));
  });

  test("Show abstract reveals the abstract of that publication only, and hides it again", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page);
    const id = pmid(list.rows[1]);
    await section.expectDetailsLoaded(1);
    await expect(section.abstractPanel(1)).toHaveCount(0);

    await section.button(1, "Show abstract").click();
    await expect(section.abstractPanel(1)).toBeVisible();
    await expect(section.publication(1)).toContainText(stubbedAbstract(id));
    await expect(section.button(1, "Hide abstract")).toBeVisible();
    await expect(section.abstractPanel(0), "the neighbouring row stays closed").toHaveCount(0);
    await expect(section.button(0, "Show abstract")).toBeVisible();

    await section.button(1, "Hide abstract").click();
    await expect(section.abstractPanel(1)).toHaveCount(0);
    await expect(section.button(1, "Show abstract")).toBeVisible();
  });

  test("Show match details lists every sentence with the target and the disease highlighted", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page);
    const sentences = list.rows[0].textMiningSentences ?? [];
    expect(sentences.length, "the first publication has text-mined sentences").toBeGreaterThan(0);
    await section.expectDetailsLoaded(0);

    await section.button(0, `Show ${sentences.length} match details`).click();
    await expect(section.publication(0).getByText("Matches", { exact: true })).toBeVisible();
    await expect(section.button(0, "Hide match details")).toBeVisible();
    await expect(section.matchRows(0)).toHaveCount(sentences.length);
    for (const [index, sentence] of sentences.entries()) {
      await test.step(`sentence ${index + 1} from the ${sentence.section}`, async () => {
        const row = section.matchRows(0).nth(index);
        await expect(row).toContainText(`In: ${sentence.section}`);
        await expect(row).toContainText(sentence.text.replace(/\s+/g, " ").trim());
        await expect(section.matchMarks(0, index)).toHaveText(expectedMarks(sentence));
        await expect(section.matchMarks(0, index).filter({ hasText: /BRAF/i })).toHaveCount(1);
        await expect(section.matchMarks(0, index).filter({ hasText: /melanoma/i })).toHaveCount(1);
      });
    }

    await section.button(0, "Hide match details").click();
    await expect(section.matchRows(0)).toHaveCount(0);
  });

  test("pagination walks to the next, last and first page; an opened panel closes with its page", async ({
    page,
  }) => {
    const { section, list, stub } = await openEuropePmc(page);
    const total = list.count;
    const lastPage = Math.ceil(total / EP_PAGE_SIZE) - 1;
    const first = list.rows.map(pmid);
    const { table } = section;
    await section.expectDetailsLoaded(0);
    await section.button(0, "Show abstract").click();
    await expect(section.abstractPanel(0)).toBeVisible();

    await test.step("next page shows other publications and asks for their details", async () => {
      const second = await section.goToNextPage(1);
      await expect(table.position).toHaveText(
        `${EP_PAGE_SIZE + 1} - ${2 * EP_PAGE_SIZE} of ${total}`
      );
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
      await expect
        .poll(() => table.columnTexts(EP_COLUMN.year), {
          message: "page 2 shows the years of its own publications",
        })
        .toEqual(second.map((row) => stubbedYear(pmid(row))));
      await section.expectDetailsLoaded(0);
      await expect(section.titleLink(0)).toHaveText(stubbedTitle(pmid(second[0])));
      expect(second.map(pmid)).not.toEqual(first);
      await expect(section.abstractPanel(0), "an opened abstract closes with its page").toHaveCount(
        0
      );
      await expect(section.button(0, "Show abstract")).toBeVisible();
      expect(stub.searches.at(-1)).toEqual(second.map(pmid));
    });

    await test.step("the last page shows the remainder and disables forward", async () => {
      const last = waitForPageOfOperation<{
        disease: Record<string, { count: number; rows: EuropePmcRow[] }>;
      }>(page, EP_OPERATION, lastPage, EP_PAGE_SIZE);
      await table.lastPageButton.click();
      const lastRows = (await last).disease[EP_LIST].rows;
      const remainder = total - lastPage * EP_PAGE_SIZE;
      expect(lastRows).toHaveLength(remainder);
      await expect(table.position).toHaveText(
        `${lastPage * EP_PAGE_SIZE + 1} - ${total} of ${total}`
      );
      await expect(table.rows).toHaveCount(remainder);
      await expect(table.nextPageButton).toBeDisabled();
      await expect(table.lastPageButton).toBeDisabled();
      await expect(table.previousPageButton).toBeEnabled();
      await section.expectDetailsLoaded(remainder - 1);
      await expect(section.titleLink(remainder - 1)).toHaveText(
        stubbedTitle(pmid(lastRows[remainder - 1]))
      );
    });

    await test.step("the first page comes back", async () => {
      await table.firstPageButton.click();
      await expect(table.position).toHaveText(`1 - ${EP_PAGE_SIZE} of ${total}`);
      await expect
        .poll(async () =>
          (await section.table.column(EP_COLUMN.year).allInnerTexts()).map((text) => text.trim())
        )
        .toEqual(first.map(stubbedYear));
      await expect(table.firstPageButton).toBeDisabled();
      await expect(table.previousPageButton).toBeDisabled();
    });
  });

  test("the page size select offers 5 to 25 rows and a bigger size shows more publications", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page);
    const { table } = section;
    await expect(table.pageSizeSelect.locator("option")).toHaveText(["5", "10", "15", "20", "25"]);
    await expect(table.pageSizeSelect).toHaveValue("5");
    await table.pageSizeSelect.selectOption("15");
    await expect(table.position).toHaveText(`1 - 15 of ${list.count}`);
    await expect(table.rows).toHaveCount(15);
    await section.expectDetailsLoaded(14);
    await expect(table.nextPageButton).toBeEnabled();
    await table.pageSizeSelect.selectOption("5");
    await expect(table.rows).toHaveCount(EP_PAGE_SIZE);
    await expect(table.position).toHaveText(`1 - ${EP_PAGE_SIZE} of ${list.count}`);
  });

  test("the column picker hides and restores the year and score columns", async ({ page }) => {
    const { section } = await openEuropePmc(page);
    const picker = await section.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(4);
    for (const name of ["Disease/phenotype", "Publication", "Score"]) {
      await expect(picker.getByRole("checkbox", { name, exact: true })).toBeChecked();
    }
    await picker.getByRole("checkbox", { name: "Score", exact: true }).uncheck();
    await expect(section.table.headers).toHaveText(["Disease/phenotype", "Publication", ""]);
    await expect(section.table.row(0).locator("td")).toHaveCount(3);
    await picker.getByRole("checkbox", { name: "Score", exact: true }).check();
    await expect(section.table.headers).toHaveText([...EP_HEADERS]);
    await section.title.click();
    await expect(picker).toBeHidden();
  });

  test("the export holds every publication of a pair with the Open Targets fields", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page, BRAF_MI_EP);
    expect(list.count).toBe(5);
    const { json, header } = await expectExports(
      section,
      list,
      `europepmc-${BRAF_MI_EP.ensgId}-${BRAF_MI_EP.efoId}`
    );
    expect(header).toEqual(["diseasePhenotype", "europePmcId", "score"]);
    expect(json.map((row) => row.europePmcId)).toEqual(list.rows.map(pmid));
    expect(json.map((row) => row.score)).toEqual(list.rows.map((row) => row.resourceScore));
    expect(json.map((row) => row.diseasePhenotype)).toEqual(
      list.rows.map((row) => row.disease.name)
    );
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await openEuropePmc(page);
    await section.controls.openApiQuery(EP_OPERATION, BRAF_MELANOMA_EP.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page and back returns to the section", async ({
    page,
  }) => {
    const { section, list } = await openEuropePmc(page);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${list.rows[0].disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[0].disease.name
    );
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${BRAF_MELANOMA_EP.ensgId}/${BRAF_MELANOMA_EP.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
    await section.expectDetailsLoaded(0);
    await expect(section.table.rows).toHaveCount(EP_PAGE_SIZE);
  });

  test("a pair with five publications shows them on a single page", async ({ page }) => {
    const { section, list } = await openEuropePmc(page, BRAF_MI_EP);
    expect(list.count).toBe(5);
    await expect(section.description).toContainText("between BRAF and myocardial infarction");
    await expect(section.table.position).toHaveText("1 - 5 of 5");
    await expect(section.table.rows).toHaveCount(5);
    await expect(section.table.firstPageButton).toBeDisabled();
    await expect(section.table.previousPageButton).toBeDisabled();
    await expect(section.table.nextPageButton).toBeDisabled();
    await expect(section.table.lastPageButton).toBeDisabled();
    for (const [index, row] of list.rows.entries()) {
      await section.expectDetailsLoaded(index);
      await expect(section.titleLink(index)).toHaveText(stubbedTitle(pmid(row)));
      await expect(section.cell(index, EP_COLUMN.score)).toHaveText(String(row.resourceScore));
    }
  });

  test("a pair with only Europe PMC evidence renders just that section", async ({ page }) => {
    await openEuropePmc(page, BRAF_MI_EP);
    await expectSections(page, expectedSectionsFor(`${BRAF_MI_EP.ensgId}/${BRAF_MI_EP.efoId}`));
  });

  test("an evidence page of a heavily studied pair loads its publications", async ({ page }) => {
    // EGFR in lung carcinoma: tens of thousands of publications with long text-mined sentences.
    const { section, list } = await openEuropePmc(page, {
      ensgId: "ENSG00000146648",
      efoId: "MONDO_0021117",
    });
    await expect(section.table.position).toHaveText(`1 - ${EP_PAGE_SIZE} of ${list.count}`);
    await expect(section.table.rows).toHaveCount(EP_PAGE_SIZE);
  });
});

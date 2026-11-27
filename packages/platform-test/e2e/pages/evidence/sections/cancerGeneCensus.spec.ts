import { expect, test } from "../../../../fixtures";
import {
  CancerGeneCensusSection,
  CGC_COLUMN,
  CGC_HEADERS,
  CGC_OPERATION,
  type CgcRow,
} from "../../../../POM/objects/widgets/Evidence/cancerGeneCensus";
import {
  BRAF,
  type EvidenceList,
  formatPercent,
  gotoEvidence,
  MELANOMA,
  NO_SOMATIC_EVIDENCE,
  PAGE_SIZE,
  type RoleInCancer,
  waitForPageOfOperation,
} from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../../POM/objects/widgets/Target/publicationsDrawer";
import { expectSectionLoaded } from "../../../../utils/sections";

type Data = RoleInCancer & { disease: { cancerGeneCensusSummary: EvidenceList<CgcRow> } };

const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();
const percentOf = (sample: CgcRow["mutatedSamples"][number]) =>
  sample.numberSamplesWithMutationType / sample.numberSamplesTested;
/** The section lists a row's mutation types from the most to the least frequent. */
const byFrequency = (row: CgcRow) =>
  [...row.mutatedSamples].sort((a, b) => percentOf(b) - percentOf(a));

/** Open BRAF in melanoma and wait for the section together with its first page. */
async function open(page: import("@playwright/test").Page) {
  await stubEuropePmc(page);
  const response = waitForOperation<Data>(page, CGC_OPERATION);
  await gotoEvidence(page);
  const data = await response;
  const section = new CancerGeneCensusSection(page);
  await section.expectLoaded();
  return { section, data: data.data, list: data.data.disease.cancerGeneCensusSummary };
}

test.describe("Evidence page: Cancer Gene Census", () => {
  test("shows title, description, role in cancer and the table headers @smoke", async ({
    page,
  }) => {
    const { section, data, list } = await open(page);
    expect(list.count, "BRAF has several pages of Cancer Gene Census diseases").toBeGreaterThan(
      PAGE_SIZE
    );

    await test.step("title, data type and description", async () => {
      await expect(section.title).toHaveText(/^Cancer Gene Census/);
      await expect(section.chip("Somatic mutations")).toBeVisible();
      await expect(section.description).toHaveText(
        "Catalogue of somatic mutations that causally implicate BRAF in melanoma. Source: COSMIC"
      );
      await expect(section.description.getByRole("link", { name: "COSMIC" })).toHaveAttribute(
        "href",
        "https://cancer.sanger.ac.uk/census"
      );
    });

    await test.step("role in cancer chips link to Europe PMC", async () => {
      await section.expectRoleInCancer("BRAF", data);
    });

    await test.step("exact column headers, all with data", async () => {
      await section.table.expectHeaders(CGC_HEADERS);
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    });

    await test.step("the table has no search box, but has columns, export and API query controls", async () => {
      await expect(section.table.searchInput).toHaveCount(0);
      await expect(section.table.columnsButton).toBeVisible();
      await expect(section.table.exportButton).toBeVisible();
      await expect(section.table.apiQueryButton).toBeVisible();
    });
  });

  test("every row shows its disease, mutation types and sample counts from the API", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const { table } = section;
    await table.expectPosition(1, PAGE_SIZE, list.count);
    await table.expectFirstPage();

    for (const [index, expected] of list.rows.slice(0, PAGE_SIZE).entries()) {
      await test.step(`row ${index + 1}: ${expected.disease.name}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );

        const samples = byFrequency(expected);
        await expect(section.mutationLinks(index)).toHaveText(
          samples.map((sample) => sentence(sample.functionalConsequence.label))
        );
        for (const [i, sample] of samples.entries()) {
          await expect(section.mutationLinks(index).nth(i)).toHaveAttribute(
            "href",
            `https://identifiers.org/${sample.functionalConsequence.id}`
          );
        }

        await expect(section.sampleItems(index)).toHaveCount(samples.length);
        for (const [i, sample] of samples.entries()) {
          await expect(section.sampleItems(index).nth(i)).toHaveText(
            new RegExp(
              `^${formatPercent(sample.numberSamplesWithMutationType, sample.numberSamplesTested)}\\s*\\(${sample.numberSamplesWithMutationType}/${sample.numberSamplesTested}\\)$`
            )
          );
        }

        await expect(section.literatureTrigger(index, CGC_COLUMN.literature)).toHaveText(
          expected.literature.length === 1
            ? expected.literature[0]
            : `${expected.literature.length} publications`
        );
      });
    }
  });

  test("the first row is cutaneous melanoma, mutated in about half of 19,542 samples", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expect(section.diseaseLink(0)).toHaveText("cutaneous melanoma");
    await expect(section.diseaseLink(0)).toHaveAttribute("href", "/disease/MONDO_0005012");
    // Missense variants dominate BRAF's mutations in melanoma and are listed first.
    await expect(section.mutationLinks(0).first()).toHaveText("Missense variant");
    await expect(section.mutationLinks(0).first()).toHaveAttribute(
      "href",
      "https://identifiers.org/SO:0001583"
    );
    await expect(section.sampleItems(0).first()).toContainText("(9788/19542)");
  });

  test("pages through every disease, each page different, with the buttons disabled at the ends", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const { table } = section;
    const total = list.count;
    const lastPage = Math.ceil(total / PAGE_SIZE) - 1;
    expect(lastPage, "there are at least three pages").toBeGreaterThanOrEqual(2);

    const firstPage = await table.rowTexts();

    await test.step("next page shows the second slice of the API's rows", async () => {
      const response = waitForPageOfOperation<Data>(page, CGC_OPERATION, 1);
      await table.nextPageButton.click();
      const second = (await response).disease.cancerGeneCensusSummary;
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await expect(table.rows).toHaveCount(second.rows.length);
      await expect(section.diseaseLink(0)).toHaveText(second.rows[0].disease.name);
      await table.expectRowsChangedFrom(firstPage);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
      await expect(table.nextPageButton).toBeEnabled();
    });

    await test.step("last page holds the remainder and disables forward navigation", async () => {
      const response = waitForPageOfOperation<Data>(page, CGC_OPERATION, lastPage);
      await table.lastPageButton.click();
      const last = (await response).disease.cancerGeneCensusSummary;
      const remainder = total - lastPage * PAGE_SIZE;
      await table.expectPosition(lastPage * PAGE_SIZE + 1, total, total);
      await expect(table.rows).toHaveCount(remainder);
      await expect(section.diseaseLink(remainder - 1)).toHaveText(
        last.rows[remainder - 1].disease.name
      );
      await table.expectLastPage();
    });

    await test.step("previous page goes back one", async () => {
      await table.previousPageButton.click();
      await table.expectPosition((lastPage - 1) * PAGE_SIZE + 1, lastPage * PAGE_SIZE, total);
    });

    await test.step("first page returns to the original rows", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectFirstPage();
      await table.expectRowTexts(firstPage);
    });
  });

  test("a larger page size shows every disease on one page", async ({ page }) => {
    const { section, list } = await open(page);
    const { table } = section;
    await expect(table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    await expect(table.pageSizeSelect).toHaveValue("10");

    await table.setPageSize(25);
    await table.expectPosition(1, list.count, list.count);
    await expect(table.rows).toHaveCount(list.count);
    await table.expectFirstPage(true);

    await table.setPageSize(10);
    await table.expectPosition(1, PAGE_SIZE, list.count);
    await expect(table.rows).toHaveCount(PAGE_SIZE);
  });

  test("the column picker hides and restores columns, and locks the ones that cannot go", async ({
    page,
  }) => {
    const { section } = await open(page);
    const { table } = section;
    const picker = await table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(CGC_HEADERS.length);
    for (const name of CGC_HEADERS) {
      await expect(picker.getByRole("checkbox", { name })).toBeChecked();
    }
    await expect(picker.getByRole("checkbox", { name: "Disease/phenotype" })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Mutation type" })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Literature" })).toBeEnabled();

    await picker.getByRole("checkbox", { name: "Literature" }).uncheck();
    await table.expectHeaders(CGC_HEADERS.filter((name) => name !== "Literature"));
    await expect(table.row(0).locator("td")).toHaveCount(CGC_HEADERS.length - 1);
    await expect(section.table.root.getByTestId("publications-drawer-trigger")).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "Literature" }).check();
    await table.expectHeaders(CGC_HEADERS);
    await table.closeColumnPicker(section.title);
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section } = await open(page);
    await section.diseaseLink(1).click();
    await expect(page).toHaveURL(/\/disease\/MONDO_0000930$/);
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      "nodular malignant melanoma"
    );
  });

  test("the literature cell opens a drawer with the publications of that row", async ({ page }) => {
    const { section, list } = await open(page);
    const { literature } = list.rows[0];
    expect(literature.length, "the first row cites many publications").toBeGreaterThan(PAGE_SIZE);

    await expect(section.literatureTrigger(0, CGC_COLUMN.literature)).toHaveText(
      `${literature.length} publications`
    );
    await section.literatureTrigger(0, CGC_COLUMN.literature).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(PAGE_SIZE);
    for (const id of literature.slice(0, PAGE_SIZE)) {
      await expect(drawer.entry(id)).toBeVisible();
    }
    await expect(drawer.root.getByText(`1 - 10 of ${literature.length}`)).toBeVisible();
    await drawer.close();
  });

  test("a row with a single publication shows its id and opens the drawer for it", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => row.literature.length === 1);
    expect(index, "the first page holds a row with one publication").toBeGreaterThanOrEqual(0);
    const [id] = list.rows[index].literature;

    await expect(section.literatureTrigger(index, CGC_COLUMN.literature)).toHaveText(id);
    await section.literatureTrigger(index, CGC_COLUMN.literature).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(1);
    await expect(drawer.entry(id)).toBeVisible();
    await drawer.close();
  });

  test("the export offers JSON and TSV with every disease, not just the visible page", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const stem = `cancer-gene-census-${BRAF}-${MELANOMA}`;

    const json = await section.table.download("Json");
    expect(json.filename).toBe(`${stem}.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows, "the export holds every row, not the 10 on screen").toHaveLength(list.count);
    expect(rows.map((row) => row.diseasePhenotype)).toEqual(
      expect.arrayContaining(["cutaneous melanoma", "melanoma", "uveal melanoma"])
    );
    expect(Object.keys(rows[0]), "the export has one field per table column").toEqual([
      "diseasePhenotype",
      "mutationType",
      "mutatedTotalSamples",
      "literature",
    ]);

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe(`${stem}.tsv`);
    const lines = tsv.text.split("\n").filter((line) => line.length > 0);
    expect(lines, "a header line and one line per row").toHaveLength(list.count + 1);
  });

  test("the export carries the mutation types and sample counts shown in the table", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const json = await section.table.download("Json");
    const [first] = JSON.parse(json.text) as {
      mutationType: unknown;
      mutatedTotalSamples: unknown;
    }[];
    expect(
      first.mutationType,
      "cutaneous melanoma is mutated in several ways, so its exported mutation type is not empty"
    ).not.toBe("");
    expect(first.mutatedTotalSamples, "and so is its export of mutated / total samples").not.toBe(
      ""
    );
    expect(list.rows[0].mutatedSamples.length).toBeGreaterThan(0);
  });

  test("the API query drawer is loaded with the section's query and BRAF in melanoma", async ({
    page,
  }) => {
    const { section } = await open(page);
    await section.expectApiQuery(CGC_OPERATION, BRAF, MELANOMA);
  });

  test("an evidence page without Cancer Gene Census data has no such section", async ({ page }) => {
    await gotoEvidence(page, NO_SOMATIC_EVIDENCE.ensgId, NO_SOMATIC_EVIDENCE.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(new CancerGeneCensusSection(page).section).toHaveCount(0);
  });
});

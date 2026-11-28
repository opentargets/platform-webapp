import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  BIOMARKERS_COLUMN,
  BIOMARKERS_HEADERS,
  BIOMARKERS_LIST,
  BIOMARKERS_OPERATION,
  type BiomarkerRow,
  CancerBiomarkersSection,
  waitForBiomarkersRequest,
} from "../../../../POM/objects/widgets/Evidence/cancerBiomarkers";
import {
  type EvidenceViewsData,
  evidenceList,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  BRAF,
  gotoEvidence,
  MELANOMA,
  NO_SOMATIC_EVIDENCE,
  PAGE_SIZE,
  waitForPageOfOperation,
} from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../../POM/objects/widgets/Target/publicationsDrawer";
import { expectSectionLoaded } from "../../../../utils/sections";

type Data = EvidenceViewsData<BiomarkerRow>;

/** ERBB2 in breast adenocarcinoma: its biomarkers include gene expression, which BRAF's lack. */
const ERBB2 = "ENSG00000141736";
const BREAST_ADENOCARCINOMA = "MONDO_0004988";

const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();

async function open(page: Page, ensgId = BRAF, efoId = MELANOMA) {
  await stubEuropePmc(page);
  const response = waitForOperation<Data>(page, BIOMARKERS_OPERATION);
  await gotoEvidence(page, ensgId, efoId);
  const { data } = await response;
  const section = new CancerBiomarkersSection(page);
  await section.expectLoaded();
  return { section, list: evidenceList(data, BIOMARKERS_LIST) };
}

/** Open BRAF in melanoma and show every biomarker on one page; returns all the API rows. */
async function openWithEveryRow(page: Page) {
  const { section, list } = await open(page);
  const response = waitForPageOfOperation<Data>(page, BIOMARKERS_OPERATION, 0, 100);
  await section.table.setPageSize(100);
  const all = evidenceList(await response, BIOMARKERS_LIST);
  expect(all.rows, "one request returns every biomarker").toHaveLength(list.count);
  await expect(section.table.rows).toHaveCount(list.count);
  return { section, list, rows: all.rows };
}

test.describe("Evidence page: Cancer Biomarkers", () => {
  test("shows title, description and the table headers @smoke", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.count, "BRAF in melanoma has several pages of biomarkers").toBeGreaterThan(
      2 * PAGE_SIZE
    );

    await test.step("title, data type and description", async () => {
      await expect(section.title).toHaveText(/^Cancer Biomarkers/);
      await expect(section.chip("Somatic mutations")).toBeVisible();
      await expect(section.description).toHaveText(
        "Expert-curated genomic biomarkers of drug sensitivity, resistance, and toxicity for drugs targeting BRAF with an experimental or approved indication of melanoma. Source: Cancer Genome Interpreter."
      );
      await expect(
        section.description.getByRole("link", { name: "Cancer Genome Interpreter" })
      ).toHaveAttribute("href", "https://www.cancergenomeinterpreter.org/2018/biomarkers");
    });

    await test.step("exact column headers and no role in cancer line", async () => {
      await section.table.expectHeaders(BIOMARKERS_HEADERS);
      await expect(section.roleInCancerLabel).toHaveCount(0);
    });

    await test.step("first page, controls", async () => {
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
      await section.table.expectPosition(1, PAGE_SIZE, list.count);
      await section.table.expectFirstPage();
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("every biomarker shows its disease, biomarker, drug, source and literature from the API", async ({
    page,
  }) => {
    const { section, rows } = await openWithEveryRow(page);

    for (const [index, expected] of rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.biomarkerName} / ${expected.drugFromSource}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.diseaseName);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.diseaseId}`
        );

        await expect(section.biomarkerButton(index)).toHaveText(expected.biomarkerName);

        if (expected.drugId) {
          await expect(section.drugLink(index)).toHaveText(expected.drugName as string);
          await expect(section.drugLink(index)).toHaveAttribute("href", `/drug/${expected.drugId}`);
        } else {
          await expect(section.drugLink(index)).toHaveCount(0);
          await expect(section.table.cell(index, BIOMARKERS_COLUMN.drug)).toHaveText(
            expected.drugFromSource
          );
        }

        await expect(section.table.cell(index, BIOMARKERS_COLUMN.drugResponse)).toHaveText(
          expected.drugResponseId && expected.drugResponseName ? expected.drugResponseName : "N/A"
        );

        const source = section.table.cell(index, BIOMARKERS_COLUMN.source);
        if (expected.urls.length === 0) {
          await expect(source).toHaveText(expected.confidence);
        } else if (expected.urls.length === 1) {
          await expect(section.sourceLink(index)).toHaveText(expected.urls[0].niceName);
          await expect(section.sourceLink(index)).toHaveAttribute("href", expected.urls[0].url);
        } else {
          await expect(section.sourceDrawerButton(index)).toHaveText(expected.confidence);
        }

        const literature = section.table.cell(index, BIOMARKERS_COLUMN.literature);
        if (expected.literature.length === 0) {
          await expect(literature).toHaveText("N/A");
        } else if (expected.literature.length === 1) {
          await expect(literature).toHaveText(expected.literature[0]);
        } else {
          await expect(literature).toHaveText(`${expected.literature.length} publications`);
        }
      });
    }
  });

  test("the list holds biomarkers of BRAF-targeting drugs, vemurafenib among them", async ({
    page,
  }) => {
    const { section, rows } = await openWithEveryRow(page);
    const vemurafenib = rows.findIndex((row) => row.drugId === "CHEMBL1229517");
    expect(vemurafenib, "vemurafenib is a reported drug").toBeGreaterThanOrEqual(0);
    await expect(section.drugLink(vemurafenib)).toHaveText("VEMURAFENIB");
    await expect(section.drugLink(vemurafenib)).toHaveAttribute("href", "/drug/CHEMBL1229517");
    await expect(section.biomarkerButton(vemurafenib)).toContainText("BRAF");
  });

  test("pages through every biomarker, each page different, with the buttons disabled at the ends", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const { table } = section;
    const total = list.count;
    const lastPage = Math.ceil(total / PAGE_SIZE) - 1;
    const firstPage = await table.rowTexts();

    await test.step("next page shows the second slice of the API's rows", async () => {
      const response = waitForPageOfOperation<Data>(page, BIOMARKERS_OPERATION, 1);
      await table.nextPageButton.click();
      const second = evidenceList(await response, BIOMARKERS_LIST);
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await expect(table.rows).toHaveCount(second.rows.length);
      await expect(section.biomarkerButton(0)).toHaveText(second.rows[0].biomarkerName);
      await table.expectRowsChangedFrom(firstPage);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.nextPageButton).toBeEnabled();
    });

    await test.step("last page holds the remainder", async () => {
      const response = waitForPageOfOperation<Data>(page, BIOMARKERS_OPERATION, lastPage);
      await table.lastPageButton.click();
      const last = evidenceList(await response, BIOMARKERS_LIST);
      const remainder = total - lastPage * PAGE_SIZE;
      await table.expectPosition(lastPage * PAGE_SIZE + 1, total, total);
      await expect(table.rows).toHaveCount(remainder);
      await expect(section.biomarkerButton(remainder - 1)).toHaveText(
        last.rows[remainder - 1].biomarkerName
      );
      await table.expectLastPage();
    });

    await test.step("first page returns to the original rows", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectFirstPage();
      await table.expectRowTexts(firstPage);
    });
  });

  test("a larger page size shows more biomarkers on one page and can be set back", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const { table } = section;

    await table.setPageSize(25);
    await table.expectPosition(1, 25, list.count);
    await expect(table.rows).toHaveCount(25);
    await table.expectPosition(1, 25, list.count);
    await expect(table.nextPageButton).toBeEnabled();

    await table.setPageSize(100);
    await table.expectPosition(1, list.count, list.count);
    await expect(table.rows).toHaveCount(list.count);
    await table.expectFirstPage(true);

    await table.setPageSize(10);
    await expect(table.rows).toHaveCount(PAGE_SIZE);
  });

  test("the search box filters the biomarkers on the server and clearing it brings every row back", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const term = "vemurafenib";
    const searched = waitForBiomarkersRequest(page, (variables) => variables.search?.text === term);
    await section.table.search(term);
    const result = evidenceList(await searched, BIOMARKERS_LIST);
    expect(result.count, "vemurafenib biomarkers are found").toBeGreaterThan(0);
    expect(result.count, "the search narrows the list").toBeLessThan(list.count);
    await expect(section.table.rows).toHaveCount(Math.min(result.count, PAGE_SIZE));
    await section.table.expectPosition(1, Math.min(result.count, PAGE_SIZE), result.count);
    await expect
      .poll(() => section.table.columnTexts(BIOMARKERS_COLUMN.drug), {
        message: "the table shows the rows the API found",
      })
      .toEqual(result.rows.map((row) => row.drugName ?? row.drugFromSource));
    for (const name of await section.table.columnTexts(BIOMARKERS_COLUMN.drug)) {
      expect(name.toLowerCase()).toBe(term);
    }

    await test.step("a term nothing matches leaves an empty table", async () => {
      const none = waitForBiomarkersRequest(
        page,
        (variables) => variables.search?.text === "zzzz-none"
      );
      await section.table.search("zzzz-none");
      expect(evidenceList(await none, BIOMARKERS_LIST).count).toBe(0);
      await expect(section.table.rows).toHaveCount(0);
    });

    await test.step("clearing the search restores the list", async () => {
      await section.table.search("");
      await section.table.expectPosition(1, PAGE_SIZE, list.count);
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    });
  });

  test("the biomarker opens a drawer listing its variants, with ids and consequences", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => row.biomarkerName === "BRAF (V600E,V600K)");
    expect(index, "the first page holds the BRAF V600E/V600K biomarker").toBeGreaterThanOrEqual(0);
    const geneticVariation = list.rows[index].biomarkerGeneticVariations;
    expect(geneticVariation).toHaveLength(2);

    await section.biomarkerButton(index).click();
    const drawer = section.biomarkerDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Biomarker");
    await expect(drawer).toContainText("Variant:");
    await expect(drawer).not.toContainText("Gene expression:");
    for (const variant of geneticVariation) {
      await expect(drawer).toContainText(`${variant.name} (ID: ${variant.id})`);
    }
    const consequence = drawer.getByRole("link", { name: "Somatic variant" });
    await expect(consequence).toHaveCount(geneticVariation.length);
    await expect(consequence.first()).toHaveAttribute("href", "https://identifiers.org/SO:0001777");

    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("a biomarker's drawer shows the record that was clicked", async ({ page }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => row.biomarkerName === "BRAF fusion");
    expect(index, "the first page holds the BRAF fusion biomarker").toBeGreaterThanOrEqual(0);
    const [variation] = list.rows[index].biomarkerGeneticVariations;

    await section.biomarkerButton(index).click();
    await expect(section.biomarkerDrawer).toContainText(variation.name);
    await expect(section.biomarkerDrawer.getByRole("link")).toHaveText(
      sentence(variation.functionalConsequenceLabel ?? "")
    );
    await section.biomarkerDrawer.getByTestId("drawer-close").click();
    await expect(section.biomarkerDrawer).toBeHidden();
  });

  test("the biomarker name has a tooltip repeating it", async ({ page }) => {
    const { section, list } = await open(page);
    await section.biomarkerButton(0).hover();
    await expect(page.getByRole("tooltip")).toHaveText(list.rows[0].biomarkerName);
  });

  test("a gene expression biomarker lists the expression term and links to its ontology entry", async ({
    page,
  }) => {
    const { section, list } = await open(page, ERBB2, BREAST_ADENOCARCINOMA);
    const index = list.rows.findIndex((row) => row.biomarkerGeneExpressions.length > 0);
    expect(index, "ERBB2 has a gene expression biomarker on the first page").toBeGreaterThanOrEqual(
      0
    );
    const [expression] = list.rows[index].biomarkerGeneExpressions;

    await section.biomarkerButton(index).click();
    const drawer = section.biomarkerDrawer;
    await expect(drawer).toContainText("Gene expression:");
    await expect(drawer).toContainText(expression.name);
    const link = drawer.getByRole("link", { name: expression.label as string });
    await expect(link).toHaveAttribute(
      "href",
      `https://identifiers.org/${(expression.id as string).replace("_", ":")}`
    );
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("a variant without an id is listed by name only", async ({ page }) => {
    const { section, list } = await open(page, ERBB2, BREAST_ADENOCARCINOMA);
    const index = list.rows.findIndex((row) =>
      row.biomarkerGeneticVariations.some((variant) => variant.id === null)
    );
    expect(index, "ERBB2 has a copy number biomarker without a variant id").toBeGreaterThanOrEqual(
      0
    );
    const variant = list.rows[index].biomarkerGeneticVariations.find(
      (candidate) => candidate.id === null
    );

    await section.biomarkerButton(index).click();
    await expect(section.biomarkerDrawer).toContainText(variant?.name as string);
    await expect(section.biomarkerDrawer).not.toContainText(`${variant?.name} (ID:`);
    await section.biomarkerDrawer.getByTestId("drawer-close").click();
  });

  test("a source with several records opens a drawer listing each, and one record is a direct link", async ({
    page,
  }) => {
    const { section, rows } = await openWithEveryRow(page);
    const many = rows.findIndex((row) => row.urls.length > 1);
    expect(many, "a biomarker has several source records").toBeGreaterThanOrEqual(0);
    const record = rows[many];

    await section.sourceDrawerButton(many).click();
    const drawer = section.sourceDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Records");
    await expect(drawer).toContainText("Sources");
    await expect(drawer).toContainText(`${record.urls.length} Records`);
    for (const url of record.urls) {
      await expect(drawer.getByRole("link", { name: url.niceName })).toHaveAttribute(
        "href",
        url.url
      );
    }
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();

    const single = rows.findIndex((row) => row.urls.length === 1);
    expect(single, "a biomarker has exactly one source record").toBeGreaterThanOrEqual(0);
    await expect(section.sourceDrawerButton(single)).toHaveCount(0);
    await expect(section.sourceLink(single)).toHaveAttribute("href", rows[single].urls[0].url);
  });

  test("the literature cell opens a drawer with the publications of that row", async ({ page }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => row.literature.length > 1);
    expect(index, "the first page holds a row with several publications").toBeGreaterThanOrEqual(0);
    const { literature } = list.rows[index];

    await section.literatureTrigger(index, BIOMARKERS_COLUMN.literature).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(literature.length);
    for (const id of literature) await expect(drawer.entry(id)).toBeVisible();
    await drawer.close();
  });

  test("the column picker hides and restores columns, and locks the biomarker", async ({
    page,
  }) => {
    const { section } = await open(page);
    const { table } = section;
    const picker = await table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(BIOMARKERS_HEADERS.length);
    await expect(picker.getByRole("checkbox", { name: "Biomarker" })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Source" })).toBeEnabled();

    await picker.getByRole("checkbox", { name: "Source" }).uncheck();
    await expect(table.headers).toHaveCount(BIOMARKERS_HEADERS.length - 1);
    await expect(table.header("Source")).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "Source" }).check();
    await table.expectHeaders(BIOMARKERS_HEADERS);
    await table.closeColumnPicker(section.title);
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section, list } = await open(page);
    const expected = list.rows[0];
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${expected.diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(expected.diseaseName);
  });

  test("a drug link opens that drug's page", async ({ page }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => row.drugId !== null);
    expect(index, "the first page reports a drug").toBeGreaterThanOrEqual(0);
    const { drugId, drugName } = list.rows[index];
    await section.drugLink(index).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${drugId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(drugName as string, {
      ignoreCase: true,
    });
  });

  test("the export offers JSON and TSV with every biomarker, not just the visible page", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const stem = `cancer-biomarker-${BRAF}-${MELANOMA}`;

    const json = await section.table.download("Json");
    expect(json.filename).toBe(`${stem}.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(list.count);
    expect(JSON.stringify(rows)).toContain("BRAF (V600E,V600K)");

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe(`${stem}.tsv`);
    expect(tsv.text.split("\n").filter((line) => line.length > 0)).toHaveLength(list.count + 1);
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.expectApiQuery(BIOMARKERS_OPERATION, BRAF, MELANOMA);
  });

  test("an evidence page without cancer biomarkers has no such section", async ({ page }) => {
    await gotoEvidence(page, NO_SOMATIC_EVIDENCE.ensgId, NO_SOMATIC_EVIDENCE.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(new CancerBiomarkersSection(page).section).toHaveCount(0);
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  EA_COLUMN,
  EA_HEADERS,
  EA_LIST,
  EA_LOCKED,
  EA_OPERATION,
  type ExpressionAtlasRow,
  ExpressionAtlasSection,
  FGFR3_NEOPLASM_EA,
  HRAS_NEOPLASM,
  openExpressionAtlas,
  scientific,
} from "../../../../POM/objects/widgets/Evidence/expressionAtlas";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import { sentence } from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** CHRM1 in Parkinson disease: a CRISPR screen, no Expression Atlas experiment. */
const CHRM1_PD = { ensgId: "ENSG00000168539", efoId: "MONDO_0005180" };

/** Open the section with Europe PMC stubbed, so the page depends only on the app and its API. */
async function open(page: Page, pair = FGFR3_NEOPLASM_EA) {
  await stubEuropePmc(page);
  return openExpressionAtlas(page, pair);
}

test.describe("Evidence page: Expression Atlas", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count, "FGFR3 has more than two pages of experiments").toBeGreaterThan(20);

    await expect(section.title).toContainText("Expression Atlas");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Transcriptomic analysis reporting a significant differential expression of FGFR3 when comparing control samples with cancer or benign tumor samples. Source: Expression Atlas"
    );
    await expect(
      section.description.getByRole("link", { name: "Expression Atlas" })
    ).toHaveAttribute("href", "https://www.ebi.ac.uk/gxa/home");
    await expect(section.table.headers).toHaveText([...EA_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "this table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, experiment, details, confidence, percentile and p-value", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.studyId}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );
        expect(expected.disease.id).toMatch(/^(MONDO|EFO|Orphanet|HP)_\d+$/);

        await expect(section.experimentLink(index)).toHaveText(expected.studyId);
        await expect(section.experimentLink(index)).toHaveAttribute(
          "href",
          `http://www.ebi.ac.uk/gxa/experiments/${expected.studyId}`
        );
        expect(expected.studyId).toMatch(/^E-[A-Z]+-\d+$/);

        await expect(section.cell(index, EA_COLUMN.details)).toHaveText(`${expected.contrast}?`);
        await expect(section.cell(index, EA_COLUMN.confidence)).toHaveText(
          `${sentence(expected.confidence)}?`
        );
        await expect(section.cell(index, EA_COLUMN.percentile)).toHaveText(
          String(expected.log2FoldChangePercentileRank)
        );
        expect(expected.log2FoldChangePercentileRank).toBeGreaterThan(0);
        expect(expected.log2FoldChangePercentileRank).toBeLessThanOrEqual(100);
        await expect(section.cell(index, EA_COLUMN.pValue)).toHaveText(
          scientific(expected.resourceScore as number)
        );
        expect(expected.resourceScore, "a significant p-value").toBeLessThan(0.05);
      });
    }
    await expect(section.cell(0, EA_COLUMN.confidence)).toHaveText("High?");
    await expect(section.cell(0, EA_COLUMN.pValue)).toHaveText("4.140×10-10");
  });

  test("the tooltips explain the disease, the experiment and its confidence", async ({ page }) => {
    const { section, list } = await open(page);
    const disease = await section.openHelp(0, EA_COLUMN.disease);
    await expect(disease).toContainText("Reported disease or phenotype:");

    const details = await section.openHelp(0, EA_COLUMN.details);
    await expect(details).toHaveText(list.rows[0].studyOverview ?? "");

    const confidence = await section.openHelp(0, EA_COLUMN.confidence);
    await expect(confidence).toContainText("As defined by the Expression Atlas Guideline");
    await expect(
      confidence.getByRole("link", { name: "Expression Atlas Guideline" })
    ).toHaveAttribute("href", "https://www.ebi.ac.uk/gxa/FAQ.html");
  });

  test("pagination walks to the last page and back, and the page size select changes the rows", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await test.step("pages", async () => {
      await expectPaging(
        page,
        section,
        EA_OPERATION,
        EA_LIST,
        list,
        (row: ExpressionAtlasRow) => row.studyId,
        EA_COLUMN.experiment
      );
    });
    await test.step("page sizes", async () => {
      await expectPageSizes(section, list);
    });
  });

  test("the column picker hides and restores the optional columns and locks the experiment", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(section, EA_HEADERS, EA_LOCKED, "Percentile");
  });

  test("the export holds every experiment", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `expression-atlas-${FGFR3_NEOPLASM_EA.ensgId}-${FGFR3_NEOPLASM_EA.efoId}`
    );
    expect(header.slice(0, 5)).toEqual([
      "diseasePhenotype",
      "experimentId",
      "experimentDetails",
      "experimentConfidence",
      "percentile",
    ]);
    expect(header).toHaveLength(EA_HEADERS.length);
    expect(json.slice(0, list.rows.length).map((row) => row.experimentId)).toEqual(
      list.rows.map((row) => row.studyId)
    );
    expect(json.slice(0, list.rows.length).map((row) => row.percentile)).toEqual(
      list.rows.map((row) => row.log2FoldChangePercentileRank)
    );
  });

  test("the export names the p-value column", async ({ page }) => {
    // The column's label is markup (<i>p</i>-value), which the export turns into "objectObject".
    const { section, list } = await open(page);
    const { header } = await expectExports(
      section,
      list,
      `expression-atlas-${FGFR3_NEOPLASM_EA.ensgId}-${FGFR3_NEOPLASM_EA.efoId}`
    );
    expect(header[EA_COLUMN.pValue]).toMatch(/p.?value/i);
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(EA_OPERATION, FGFR3_NEOPLASM_EA.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page and back returns to the section", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const disease = list.rows[2].disease;
    await section.diseaseLink(2).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(disease.name, {
      ignoreCase: true,
    });

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${FGFR3_NEOPLASM_EA.ensgId}/${FGFR3_NEOPLASM_EA.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
  });

  test("a pair with a single experiment lists just that row", async ({ page }) => {
    const { section, list } = await open(page, HRAS_NEOPLASM);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("differential expression of HRAS");
    await expect(section.experimentLink(0)).toHaveText(list.rows[0].studyId);
    await expect(section.cell(0, EA_COLUMN.confidence)).toHaveText("Low?");
    await expect(section.table.nextPageButton).toBeDisabled();
    await expect(section.table.lastPageButton).toBeDisabled();
  });

  test("a pair without Expression Atlas data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${CHRM1_PD.ensgId}/${CHRM1_PD.efoId}`);
    await expectSections(page, expectedSectionsFor(`${CHRM1_PD.ensgId}/${CHRM1_PD.efoId}`));
    await expect(new ExpressionAtlasSection(page).section).toHaveCount(0);
  });
});

import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { stubEuropePmcSearch } from "../../../../POM/objects/widgets/Evidence/europePmc";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  BRAF_MELANOMA_CRISPR,
  CRISPR_COLUMN,
  CRISPR_HEADERS,
  CRISPR_OPERATION,
  PIK3CA_CARCINOMA,
  openCrispr,
} from "../../../../POM/objects/widgets/Evidence/crispr";
import { expectSections } from "../../../../utils/sections";

/** IL6R in myocardial infarction: no Project Score evidence. */
const IL6R_MI = "ENSG00000160712/MONDO_0005068";

test.describe("Evidence page: Project Score (CRISPR)", () => {
  test.beforeEach(async ({ page }) => {
    // BRAF in melanoma also renders the Europe PMC section, which looks publications up on
    // a third-party service that throttles.
    await stubEuropePmcSearch(page);
  });

  test("shows title, description, chip, controls and the table headers", async ({ page }) => {
    const { section, list } = await openCrispr(page);

    await expect(section.title).toContainText("Project Score");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Cancer cell line dependencies identified using CRISPR-Cas9 whole genome screenings pinpointing a BRAF dependency in melanoma. Source: Project Score"
    );
    await expect(section.description.getByRole("link", { name: "Project Score" })).toHaveAttribute(
      "href",
      "https://score.depmap.sanger.ac.uk"
    );
    await expect(section.table.headers).toHaveText([...CRISPR_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "this table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("the row shows its disease, its number of cell lines and a three-decimal priority score", async ({
    page,
  }) => {
    const { section, list } = await openCrispr(page);
    expect(list.count).toBe(1);
    const row = list.rows[0];
    const lines = row.diseaseCellLines ?? [];
    expect(lines.length, "the row has cell lines").toBeGreaterThan(1);

    await expect(section.diseaseLink(0)).toHaveText("melanoma");
    await expect(section.diseaseLink(0)).toHaveAttribute("href", `/disease/${row.disease.id}`);
    await expect(section.cellLinesButton(0)).toHaveText(
      `${lines.length} ${row.diseaseFromSource} cell lines`
    );
    await expect(section.cell(0, CRISPR_COLUMN.score)).toHaveText(row.resourceScore.toFixed(3));
    await expect(section.cell(0, CRISPR_COLUMN.score)).toHaveText(/^\d+\.\d{3}$/);
  });

  test("the cell lines open in a drawer, each linked to its Cell Model Passport, and it closes", async ({
    page,
  }) => {
    const { section, list } = await openCrispr(page);
    await expect(section.cellLinesDrawer).toHaveCount(0);
    await section.expectCellLines(0, list.rows[0].diseaseCellLines ?? []);
    await section.closeDrawer();

    await test.step("Escape closes it too, and it can be reopened", async () => {
      await section.cellLinesButton(0).click();
      await expect(section.cellLinesDrawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(section.cellLinesDrawer).toBeHidden();
    });
  });

  test("a pair with several rows gives each its own disease, cell lines and score", async ({
    page,
  }) => {
    const { section, list } = await openCrispr(page, PIK3CA_CARCINOMA);
    expect(list.count, "PIK3CA has Project Score evidence in several carcinomas").toBeGreaterThan(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("a PIK3CA dependency in carcinoma");

    for (const [index, row] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${row.disease.name}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(row.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${row.disease.id}`
        );
        await expect(section.cellLinesButton(index)).toHaveText(
          `${row.diseaseCellLines?.length} ${row.diseaseFromSource} cell lines`
        );
        await expect(section.cell(index, CRISPR_COLUMN.score)).toHaveText(
          row.resourceScore.toFixed(3)
        );
      });
    }
    const names = list.rows.map((row) => row.disease.name);
    expect(new Set(names).size, "every row is a different disease").toBe(names.length);

    await test.step("the last row opens its own cell lines, not the first row's", async () => {
      const lastIndex = list.rows.length - 1;
      const lastLines = list.rows[lastIndex].diseaseCellLines ?? [];
      await section.expectCellLines(lastIndex, lastLines);
      expect(lastLines.map((line) => line.name)).not.toEqual(
        (list.rows[0].diseaseCellLines ?? []).map((line) => line.name)
      );
      await section.closeDrawer();
    });
  });

  test("the column picker locks the disease columns and hides the score", async ({ page }) => {
    const { section } = await openCrispr(page);
    await expectColumnPicker(
      section,
      [...CRISPR_HEADERS],
      ["Disease/phenotype", "Reported disease/phenotype"],
      "Priority score"
    );
  });

  test("the export holds every row", async ({ page }) => {
    const { section, list } = await openCrispr(page, PIK3CA_CARCINOMA);
    const { json, header } = await expectExports(
      section,
      list,
      `crispr-evidence-${PIK3CA_CARCINOMA.ensgId}-${PIK3CA_CARCINOMA.efoId}`
    );
    expect(header.slice(0, 1)).toEqual(["diseasePhenotype"]);
    expect(header.at(-1)).toBe("priorityScore");
    expect(json.map((row) => row.diseasePhenotype)).toEqual(list.rows.map((row) => row.disease.name));
    expect(json.map((row) => row.priorityScore)).toEqual(list.rows.map((row) => row.resourceScore));
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await openCrispr(page);
    await section.controls.openApiQuery(CRISPR_OPERATION, BRAF_MELANOMA_CRISPR.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section, list } = await openCrispr(page, PIK3CA_CARCINOMA);
    await section.diseaseLink(1).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${list.rows[1].disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[1].disease.name
    );
  });

  test("a pair without Project Score evidence does not render the section", async ({ page }) => {
    await page.goto(`/evidence/${IL6R_MI}`);
    await expectSections(page, expectedSectionsFor(IL6R_MI));
    await expect(page.getByTestId("section-crispr")).toHaveCount(0);
  });
});

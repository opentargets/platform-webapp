import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CLINGEN_COLUMN,
  CLINGEN_HEADERS,
  CLINGEN_LIST,
  CLINGEN_OPERATION,
  ClinGenSection,
  type ClinGenRow,
} from "../../../../POM/objects/widgets/Evidence/clinGen";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  MECP2_LUBS,
  MECP2_NDD,
  NF1_NF1,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** MECP2 in neurodevelopmental disorder: two ClinGen curations, one page. */
async function open(page: Page, pair = MECP2_NDD) {
  const section = new ClinGenSection(page);
  const list = await openEvidenceSection<ClinGenRow>(
    page,
    section,
    CLINGEN_OPERATION,
    CLINGEN_LIST,
    pair
  );
  return { section, list };
}

test.describe("Evidence page: ClinGen", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.count).toBe(2);

    await expect(section.title).toContainText("ClinGen");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Gene-Disease Validity curation assesing the strength of the evidence supporting or refuting a claim that variation in MECP2 causes neurodevelopmental disorder. Source: Gene-Disease Validity curation"
    );
    await expect(
      section.description.getByRole("link", { name: "Gene-Disease Validity curation" })
    ).toHaveAttribute(
      "href",
      "https://clinicalgenome.org/curation-activities/gene-disease-validity/"
    );
    await expect(section.table.headers).toHaveText([...CLINGEN_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, allelic requirement and classification linked to the curation", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.disease.name}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );
        await expect(section.helpIcon(index, CLINGEN_COLUMN.disease)).toHaveCount(1);
        await expect(section.cell(index, CLINGEN_COLUMN.allelic)).toHaveText(
          expected.allelicRequirements!.join("")
        );
        await expect(section.classificationLink(index)).toHaveText(expected.confidence!);
        await expect(section.classificationLink(index)).toHaveAttribute(
          "href",
          expected.urls![0].url
        );
        expect(expected.urls![0].url).toMatch(
          /^https:\/\/search\.clinicalgenome\.org\/kb\/gene-validity\/CGGV:/
        );
      });
    }
    await expect(section.diseaseLink(0)).toHaveText("Rett syndrome");
    await expect(section.cell(0, CLINGEN_COLUMN.allelic)).toHaveText("XL");
    await expect(section.classificationLink(0)).toHaveText("Definitive");
  });

  test("the tooltips show the reported phenotype and link to the GenCC guidelines", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const disease = await section.openHelp(0, CLINGEN_COLUMN.disease);
    await expect(disease).toContainText("Reported disease or phenotype:");
    await expect(disease).toContainText(list.rows[0].diseaseFromSource!);

    const classification = await section.openHelp(0, CLINGEN_COLUMN.classification);
    await expect(classification).toContainText("As defined by the GenCC Guidelines");
    await expect(classification.getByRole("link", { name: "GenCC Guidelines" })).toHaveAttribute(
      "href",
      "https://thegencc.org/faq.html#validity-termsdelphi-survey"
    );
  });

  test("the column picker hides and restores columns and locks the disease", async ({ page }) => {
    const { section } = await open(page);
    await expectColumnPicker(section, [...CLINGEN_HEADERS], ["Disease/phenotype"], "Classification");
  });

  test("the page size select offers 10, 25 and 100 rows", async ({ page }) => {
    const { section, list } = await open(page);
    await expectPageSizes(section, list);
  });

  test("the export holds every row as JSON and TSV", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `clingen-${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}`
    );
    expect(json.map((row) => row.diseasePhenotype)).toEqual(
      list.rows.map((row) => row.disease.name)
    );
    expect(header).toEqual(expect.arrayContaining(["diseasePhenotype", "allelicRequirement"]));
    expect(header).not.toContain("objectObject");
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(CLINGEN_OPERATION, MECP2_NDD.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section, list } = await open(page);
    await section.diseaseLink(1).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${list.rows[1].disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[1].disease.name
    );
  });

  test("a pair with a single curation lists it", async ({ page }) => {
    const { section, list } = await open(page, NF1_NF1);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("variation in NF1 causes neurofibromatosis type 1");
    await expect(section.diseaseLink(0)).toHaveText("neurofibromatosis type 1");
  });

  test("an evidence page without ClinGen data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`);
    await expectSections(page, expectedSectionsFor(`${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`));
    await expect(new ClinGenSection(page).section).toHaveCount(0);
  });
});

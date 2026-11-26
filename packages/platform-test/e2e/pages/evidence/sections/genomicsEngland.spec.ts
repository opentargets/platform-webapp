import { expect, test } from "../../../../fixtures";
import {
  EVIDENCE_PAGE_SIZE,
  GeneticEvidenceSection,
  MECP2_NDD,
  NF1_NF1,
  PCSK9_LDL,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  GE_COLUMN,
  GE_HEADERS,
  GE_LIST,
  GE_OPERATION,
  GenomicsEnglandSection,
  type GeRow,
} from "../../../../POM/objects/widgets/Evidence/genomicsEngland";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expectSections } from "../../../../utils/sections";

async function open(page: import("@playwright/test").Page, pair = NF1_NF1) {
  const section = new GenomicsEnglandSection(page);
  const list = await openEvidenceSection<GeRow>(page, section, GE_OPERATION, GE_LIST, pair);
  return { section, list };
}

test.describe("Evidence page: Genomics England PanelApp", () => {
  test("shows title, description, chip and the table headers @smoke", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.count, "NF1 has several pages of panels").toBeGreaterThan(EVIDENCE_PAGE_SIZE);

    await expect(section.title).toContainText("GEL PanelApp");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Crowdsourced expert knowledge establishing consensus causation evidence associating NF1 with neurofibromatosis type 1. Source: Genomics England PanelApp"
    );
    await expect(section.description.getByRole("link", { name: "Genomics England PanelApp" })).toHaveAttribute(
      "href",
      "https://panelapp.genomicsengland.co.uk"
    );
    await expect(section.table.headers).toHaveText([...GE_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "the table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, allelic requirement, panel, rating and literature", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.disease.name} in ${expected.studyOverview}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );

        const allelic = section.cell(index, GE_COLUMN.allelic);
        const requirements = expected.allelicRequirements ?? [];
        if (requirements.length === 0) {
          await expect(allelic).toHaveText("N/A");
        } else {
          for (const requirement of requirements) {
            const caption = sentence(requirement.split(" ", 1)[0].replace(/[;:,]*/g, ""));
            await expect(allelic).toContainText(caption);
          }
          await expect(section.helpIcon(index, GE_COLUMN.allelic)).toHaveCount(requirements.length);
        }

        await expect(section.panelLink(index)).toHaveText(expected.studyOverview!);
        await expect(section.panelLink(index)).toHaveAttribute(
          "href",
          `https://panelapp.genomicsengland.co.uk/panels/${expected.studyId}/gene/${expected.target.approvedSymbol}`
        );

        await expect(section.cell(index, GE_COLUMN.rating)).toContainText(
          sentence(expected.confidence!)
        );
        await expect(section.helpIcon(index, GE_COLUMN.rating)).toHaveCount(1);

        await expect(section.literatureTrigger(index, GE_COLUMN.literature)).toHaveCount(
          GeneticEvidenceSection.literatureLabel(expected.literature) === "N/A" ? 0 : 1
        );
        await expect(section.cell(index, GE_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
  });

  test("the disease tooltip shows the reported phenotype and every cohort phenotype", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const row = list.rows.findIndex((r) => (r.cohortPhenotypes?.length ?? 0) > 1);
    expect(row, "the first page has a row reported with several phenotypes").toBeGreaterThanOrEqual(0);
    const expected = list.rows[row];

    const tooltip = await section.openHelp(row, GE_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(sentence(expected.diseaseFromSource!));
    await expect(tooltip).toContainText("All reported phenotypes:");
    for (const phenotype of expected.cohortPhenotypes!) await expect(tooltip).toContainText(phenotype);
  });

  test("the allelic requirement and rating tooltips explain themselves", async ({ page }) => {
    const { section, list } = await open(page);
    const [first, ...rest] = list.rows[0].allelicRequirements!;
    expect(rest, "the first row has a single allelic requirement").toHaveLength(0);

    const allelic = await section.openHelp(0, GE_COLUMN.allelic);
    await expect(allelic).toHaveText(first.split(" ").slice(1).join(" "));

    const rating = await section.openHelp(0, GE_COLUMN.rating);
    await expect(rating).toContainText("As defined by the Panel App Guidelines");
    await expect(rating.getByRole("link", { name: "Panel App Guidelines" })).toHaveAttribute(
      "href",
      "https://panelapp.genomicsengland.co.uk/#!Guidelines"
    );
  });

  test("pages through the panels, each page different, with the buttons disabled at the ends", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await expectPaging(
      page,
      section,
      GE_OPERATION,
      GE_LIST,
      list,
      (row: GeRow) => `${row.disease.name}?`, // the "?" is the help icon of the cell
      GE_COLUMN.disease
    );
  });

  test("a larger page size shows more panels", async ({ page }) => {
    const { section, list } = await open(page);
    await expectPageSizes(section, list);
  });

  test("the column picker hides and restores columns and locks disease and panel", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(
      section,
      ["Disease/phenotype", "Allelic Requirement", "Genomics England Panel", "Gene rating", "literature"],
      ["Disease/phenotype", "Genomics England Panel"],
      "Gene rating"
    );
  });

  test("the literature cell lists the publications of its row, or N/A", async ({ page }) => {
    const { section, list } = await open(page);
    const many = list.rows.findIndex((row) => (row.literature?.length ?? 0) > 1);
    const one = list.rows.findIndex((row) => row.literature?.length === 1);
    const none = list.rows.findIndex((row) => (row.literature?.length ?? 0) === 0);
    expect([many, one, none], "the first page has all three kinds of rows").not.toContain(-1);

    await section.expectLiteratureDrawer(many, GE_COLUMN.literature, list.rows[many].literature!);
    await section.expectLiteratureDrawer(one, GE_COLUMN.literature, list.rows[one].literature!);
    await expect(section.cell(none, GE_COLUMN.literature)).toHaveText("N/A");
  });

  test("the export holds every panel as JSON and TSV", async ({ page }) => {
    const { section, list } = await open(page);
    const { json } = await expectExports(
      section,
      list,
      `GEL-PanelApp-${NF1_NF1.ensgId}-${NF1_NF1.efoId}`
    );
    expect(JSON.stringify(json)).toContain("Pigmentary skin disorders");
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(GE_OPERATION, NF1_NF1.ensgId);
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

  test("a pair with a single page of panels lists them all", async ({ page }) => {
    const section = new GenomicsEnglandSection(page);
    const list = await openEvidenceSection<GeRow>(page, section, GE_OPERATION, GE_LIST, MECP2_NDD);
    expect(list.count).toBeGreaterThan(EVIDENCE_PAGE_SIZE);
    await expect(section.description).toContainText(
      "associating MECP2 with neurodevelopmental disorder"
    );
    await expect(section.panelLink(0)).toHaveAttribute("href", /\/gene\/MECP2$/);
  });

  test("an evidence page without Genomics England data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${PCSK9_LDL.ensgId}/${PCSK9_LDL.efoId}`);
    await expectSections(page, expectedSectionsFor(`${PCSK9_LDL.ensgId}/${PCSK9_LDL.efoId}`));
    await expect(new GenomicsEnglandSection(page).section).toHaveCount(0);
  });
});

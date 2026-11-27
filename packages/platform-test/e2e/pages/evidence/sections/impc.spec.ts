import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { directionText } from "../../../../POM/objects/widgets/Evidence/gene2Phenotype";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import { EVIDENCE_PAGE_SIZE } from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  allelicText,
  CTNNB1_NEOPLASM_IMPC,
  FGFR3_NEOPLASM_IMPC,
  IMPC_COLUMN,
  IMPC_HEADERS,
  IMPC_LIST,
  IMPC_LOCKED,
  IMPC_OPERATION,
  type ImpcRow,
  ImpcSection,
  openImpc,
  phenotypeCount,
} from "../../../../POM/objects/widgets/Evidence/impc";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** KIF1A in neurodegenerative disease: CRISPR screens and Expression Atlas, no IMPC mouse model. */
const KIF1A_NDD = { ensgId: "ENSG00000130294", efoId: "MONDO_0005559" };

/** Open the section with Europe PMC stubbed, so the page depends only on the app and its API. */
async function open(page: Page, pair = FGFR3_NEOPLASM_IMPC) {
  await stubEuropePmc(page);
  return openImpc(page, pair);
}

test.describe("Evidence page: IMPC", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count, "FGFR3 has many pages of mouse models").toBeGreaterThan(
      3 * EVIDENCE_PAGE_SIZE
    );

    await expect(section.title).toContainText("IMPC");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Mapping of phenotypes in FGFR3 animal model mutants similar to cancer or benign tumor. Source: IMPC"
    );
    await expect(section.description.getByRole("link", { name: "IMPC" })).toHaveAttribute(
      "href",
      "https://www.mousephenotype.org"
    );
    await expect(section.table.headers).toHaveText([...IMPC_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "this table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, phenotype counts, direction and mouse model", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.biologicalModelAllelicComposition}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );
        await expect(section.helpIcon(index, IMPC_COLUMN.disease)).toHaveCount(1);

        await expect(section.cell(index, IMPC_COLUMN.human)).toHaveText(
          phenotypeCount(expected.diseaseModelAssociatedHumanPhenotypes)
        );
        await expect(section.cell(index, IMPC_COLUMN.mouse)).toHaveText(
          phenotypeCount(expected.diseaseModelAssociatedModelPhenotypes)
        );

        await expect(section.directionIcons(index)).toHaveCount(2);

        const composition = expected.biologicalModelAllelicComposition as string;
        await expect(section.modelLink(index)).toContainText(allelicText(composition));
        await expect(section.modelLink(index)).toContainText(
          expected.biologicalModelGeneticBackground as string
        );
        await expect(section.modelLink(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/${expected.biologicalModelId}`
        );
        expect(expected.biologicalModelId).toMatch(/^MGI:\d+$/);
        expect(expected.target.id).toBe(FGFR3_NEOPLASM_IMPC.ensgId);
      });
    }
    await expect(section.cell(0, IMPC_COLUMN.model).locator("sup")).toHaveText(["m1J", "m1J"]);
  });

  test("the direction of effect icons and the header tooltip explain the assessment", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const expected = list.rows[0];
    const icons = section.directionIcons(0).first();
    await section.page.mouse.move(0, 0);
    await expect(section.tooltip).toHaveCount(0);
    await icons.hover();
    await expect(section.tooltip).toHaveText(
      directionText(expected.directionOnTarget, expected.directionOnTrait)
    );
    await expect(section.tooltip).toHaveText("Loss of Function │ Risk");

    await section.page.mouse.move(0, 0);
    await expect(section.tooltip).toHaveCount(0);
    await section.directionHeaderHelp.hover();
    await expect(
      section.tooltip.getByRole("link", { name: "More info on our assessment method" })
    ).toHaveAttribute("href", "https://platform-docs.opentargets.org/evidence#impc");
  });

  test("the disease tooltip shows the reported disease", async ({ page }) => {
    const { section, list } = await open(page);
    const tooltip = await section.openHelp(0, IMPC_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(list.rows[0].diseaseFromSource ?? "", { ignoreCase: true });
  });

  test("pagination walks to the last page and back, and the page size select changes the rows", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await test.step("pages", async () => {
      await expectPaging(
        page,
        section,
        IMPC_OPERATION,
        IMPC_LIST,
        list,
        (row: ImpcRow) => `${row.disease.name}?`,
        IMPC_COLUMN.disease
      );
    });
    await test.step("page sizes", async () => {
      await expectPageSizes(section, list);
    });
  });

  test("the column picker hides and restores the optional columns and locks the mouse model", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(section, IMPC_HEADERS, IMPC_LOCKED, "Human phenotypes");
  });

  test("the phenotype cells open drawers with the phenotypes of their row", async ({ page }) => {
    const { section, list } = await open(page);
    const row = list.rows[0];
    const human = (row.diseaseModelAssociatedHumanPhenotypes ?? []).map((entry) => entry.label);
    const mouse = row.diseaseModelAssociatedModelPhenotypes.map((entry) => entry.label);
    expect(human.length).toBeGreaterThan(1);
    expect(mouse.length).toBeGreaterThan(1);
    await expect(section.tableDrawer.root).toHaveCount(0);

    await section.phenotypesTrigger(0, IMPC_COLUMN.human).click();
    await section.tableDrawer.expectEntries("Human phenotypes", human);
    await section.tableDrawer.close();

    await section.phenotypesTrigger(0, IMPC_COLUMN.mouse).click();
    await section.tableDrawer.expectEntries("Mouse phenotypes", mouse);
    await section.tableDrawer.close();

    await test.step("another row shows its own phenotypes", async () => {
      const other = list.rows.findIndex(
        (candidate, at) =>
          at > 0 && (candidate.diseaseModelAssociatedHumanPhenotypes ?? []).length !== human.length
      );
      expect(other, "another row has a different number of human phenotypes").toBeGreaterThan(0);
      await section.phenotypesTrigger(other, IMPC_COLUMN.human).click();
      await section.tableDrawer.expectEntries(
        "Human phenotypes",
        (list.rows[other].diseaseModelAssociatedHumanPhenotypes ?? []).map((entry) => entry.label)
      );
      await page.keyboard.press("Escape");
      await expect(section.tableDrawer.root).toBeHidden();
    });
  });

  test("a model with a single human phenotype says so in the singular and still opens a drawer", async ({
    page,
  }) => {
    const { section, list } = await open(page, CTNNB1_NEOPLASM_IMPC);
    const index = list.rows.findIndex(
      (row) => row.diseaseModelAssociatedHumanPhenotypes?.length === 1
    );
    expect(index, "CTNNB1 has a model with one human phenotype").toBeGreaterThanOrEqual(0);
    await expect(section.cell(index, IMPC_COLUMN.human)).toHaveText("1 phenotype");
    await section.phenotypesTrigger(index, IMPC_COLUMN.human).click();
    await section.tableDrawer.expectEntries(
      "Human phenotypes",
      (list.rows[index].diseaseModelAssociatedHumanPhenotypes ?? []).map((entry) => entry.label)
    );
    await section.tableDrawer.close();
  });

  test("the export holds every mouse model with named columns", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(section, list, "impc-evidence");
    expect(header).toEqual([
      "diseaseId",
      "diseaseName",
      "diseaseModelAssociatedHumanPhenotypes",
      "diseaseModelAssociatedModelPhenotypes",
      "literature",
    ]);
    expect(json.slice(0, list.rows.length).map((row) => row.diseaseId)).toEqual(
      list.rows.map((row) => row.disease.id)
    );
    expect(json.slice(0, list.rows.length).map((row) => row.literature)).toEqual(
      list.rows.map((row) => row.biologicalModelId)
    );
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(IMPC_OPERATION, FGFR3_NEOPLASM_IMPC.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page and back returns to the section", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const disease = list.rows[0].disease;
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(disease.name, {
      ignoreCase: true,
    });

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${FGFR3_NEOPLASM_IMPC.ensgId}/${FGFR3_NEOPLASM_IMPC.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
  });

  test("a pair with a second page of one row shows it on that page", async ({ page }) => {
    const { section, list } = await open(page, CTNNB1_NEOPLASM_IMPC);
    expect(list.count).toBe(EVIDENCE_PAGE_SIZE + 1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("phenotypes in CTNNB1 animal model");

    await section.table.nextPageButton.click();
    await expect(section.table.position).toHaveText(
      `${EVIDENCE_PAGE_SIZE + 1} - ${list.count} of ${list.count}`
    );
    await expect(section.table.rows).toHaveCount(1);
    await expect(section.table.nextPageButton).toBeDisabled();
    await expect(section.table.lastPageButton).toBeDisabled();
    await expect(section.table.previousPageButton).toBeEnabled();
    await expect(section.modelLink(0)).toHaveAttribute(
      "href",
      /^https:\/\/identifiers\.org\/MGI:\d+$/
    );
  });

  test("a pair without IMPC data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${KIF1A_NDD.ensgId}/${KIF1A_NDD.efoId}`);
    await expectSections(page, expectedSectionsFor(`${KIF1A_NDD.ensgId}/${KIF1A_NDD.efoId}`));
    await expect(new ImpcSection(page).section).toHaveCount(0);
  });
});

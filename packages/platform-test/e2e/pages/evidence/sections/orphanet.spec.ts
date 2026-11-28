import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { directionText } from "../../../../POM/objects/widgets/Evidence/gene2Phenotype";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
  MECP2_LUBS,
  MECP2_NDD,
  NF1_NF1,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  ORPHANET_COLUMN,
  ORPHANET_HEADERS,
  ORPHANET_LIST,
  ORPHANET_OPERATION,
  type OrphanetRow,
  OrphanetSection,
} from "../../../../POM/objects/widgets/Evidence/orphanet";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/**
 * MECP2 in neurodevelopmental disorder: five Orphanet rows, one page.
 *
 * The Orphanet section has not moved to `evidenceViews` yet (its query still reads the
 * `orphanetSummary` alias of `disease.evidences`), so it cannot use the shared
 * `openEvidenceSection`, which reads `data.disease.evidenceViews`.
 */
async function open(page: Page, pair: EvidencePair = MECP2_NDD) {
  const section = new OrphanetSection(page);
  await stubEuropePmc(page);
  const response = waitForOperation<{
    disease: Record<string, EvidenceList<OrphanetRow> | undefined>;
  }>(page, ORPHANET_OPERATION);
  await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
  const { data, variables } = await response;
  expect(variables, "the section asks for the first page of its target and disease").toMatchObject({
    ensemblId: pair.ensgId,
    efoId: pair.efoId,
    index: 0,
    size: EVIDENCE_PAGE_SIZE,
  });
  await section.expectLoaded();
  const list = data.disease[ORPHANET_LIST] as EvidenceList<OrphanetRow>;
  expect(list, `the response holds disease.${ORPHANET_LIST}`).toBeDefined();
  expect(list.count, "the API has evidence for this pair").toBeGreaterThan(0);
  expect(list.rows.length).toBe(Math.min(list.count, EVIDENCE_PAGE_SIZE));
  return { section, list };
}

test.describe("Evidence page: Orphanet", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count).toBe(5);

    await expect(section.title).toContainText("Orphanet");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Expert-reviewed data supporting the relationship between MECP2 and neurodevelopmental disorder. Source: Orphanet"
    );
    await expect(section.description.getByRole("link", { name: "Orphanet" })).toHaveAttribute(
      "href",
      "https://www.orpha.net/consor/cgi-bin/Disease_Genes.php"
    );
    await expect(section.table.headers).toHaveText([...ORPHANET_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, protein, consequence, allele origin, confidence and literature", async ({
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
        await expect(section.helpIcon(index, ORPHANET_COLUMN.disease)).toHaveCount(1);

        await expect(section.proteinLink(index)).toHaveText(expected.targetFromSource!);
        await expect(section.proteinLink(index)).toHaveAttribute(
          "href",
          `/target/${expected.targetFromSourceId}`
        );

        if (expected.variantFunctionalConsequence) {
          await expect(section.consequenceLink(index)).toHaveAttribute(
            "href",
            `http://www.sequenceontology.org/browser/current_svn/term/${expected.variantFunctionalConsequence.id}`
          );
        } else {
          await expect(section.cell(index, ORPHANET_COLUMN.consequence)).toHaveText("N/A");
        }

        await expect(section.directionIcons(index)).toHaveCount(2);
        await expect(section.cell(index, ORPHANET_COLUMN.alleleOrigin)).toHaveText(
          expected.alleleOrigins.join("; ")
        );
        await expect(section.cell(index, ORPHANET_COLUMN.confidence)).toHaveText(
          expected.confidence!
        );
        await expect(section.cell(index, ORPHANET_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
    await expect(section.diseaseLink(0)).toHaveText("Rett syndrome");
    await expect(section.proteinLink(0)).toHaveText("methyl-CpG binding protein 2");
    await expect(section.cell(0, ORPHANET_COLUMN.alleleOrigin)).toHaveText("germline; somatic");
  });

  test("the direction of effect icons and the header tooltip explain the assessment", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const expected = list.rows[0];
    const tooltip = await section.openDirection(0);
    await expect(tooltip).toHaveText(
      directionText(expected.directionOnTarget, expected.directionOnTrait)
    );
    await expect(tooltip).toHaveText("Inconclusive Assessment │ Risk");

    await section.page.mouse.move(0, 0);
    await expect(section.tooltip).toHaveCount(0);
    await section.directionHeaderHelp.hover();
    await expect(
      section.tooltip.getByRole("link", { name: "More info on our assessment method" })
    ).toHaveAttribute("href", "https://platform-docs.opentargets.org/evidence#orphanet");
  });

  test("the disease tooltip shows the reported phenotype", async ({ page }) => {
    const { section, list } = await open(page);
    const tooltip = await section.openHelp(2, ORPHANET_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(list.rows[2].diseaseFromSource!);
  });

  test("the column picker hides and restores columns and locks disease and consequence", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(
      section,
      [
        "Disease/phenotype",
        "Reported protein",
        "Functional consequence",
        "Direction of Effect?",
        "Allele origin",
        "Confidence",
        "Literature",
      ],
      ["Disease/phenotype", "Functional consequence"],
      "Allele origin"
    );
  });

  test("the literature cell lists the publication of its row", async ({ page }) => {
    const { section, list } = await open(page);
    await section.expectLiteratureDrawer(0, ORPHANET_COLUMN.literature, list.rows[0].literature!);
  });

  test("the page size select offers 10, 25 and 100 rows", async ({ page }) => {
    const { section, list } = await open(page);
    await expectPageSizes(section, list);
  });

  test("the export holds every row with named columns", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `orphanet-${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}`
    );
    // export column names are the camelCased labels of the section's exportColumns
    expect(header).toEqual([
      "disease",
      "diseaseId",
      "diseaseFromSource",
      "targetFromSource",
      "targetFromSourceId",
      "alleleOrigins",
      "functionalConsequence",
      "functionalConsequenceId",
      "confidence",
      "publicationIDs",
    ]);
    expect(json.map((row) => row.diseaseId)).toEqual(list.rows.map((row) => row.disease.id));
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(ORPHANET_OPERATION, MECP2_NDD.ensgId);
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

  test("the reported protein link opens the target's page", async ({ page }) => {
    const { section } = await open(page);
    await section.proteinLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/target/${MECP2_NDD.ensgId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText("MECP2");
  });

  test("a pair with a single Orphanet row lists it", async ({ page }) => {
    const { section, list } = await open(page, NF1_NF1);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("NF1 and neurofibromatosis type 1");
    await expect(section.proteinLink(0)).toHaveAttribute("href", `/target/${NF1_NF1.ensgId}`);
  });

  test("an evidence page without Orphanet data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`);
    await expectSections(page, expectedSectionsFor(`${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`));
    await expect(new OrphanetSection(page).section).toHaveCount(0);
  });
});

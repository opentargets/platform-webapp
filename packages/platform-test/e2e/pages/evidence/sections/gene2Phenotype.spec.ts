import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  CFTR_CF,
  GeneticEvidenceSection,
  MECP2_NDD,
  NF1_NF1,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  directionText,
  G2P_COLUMN,
  G2P_HEADERS,
  G2P_LIST,
  G2P_OPERATION,
  Gene2PhenotypeSection,
  type G2pRow,
} from "../../../../POM/objects/widgets/Evidence/gene2Phenotype";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expectSections } from "../../../../utils/sections";

/** MECP2 in neurodevelopmental disorder: three Gene2Phenotype rows, one page. */
async function open(page: Page, pair = MECP2_NDD) {
  const section = new Gene2PhenotypeSection(page);
  const list = await openEvidenceSection<G2pRow>(page, section, G2P_OPERATION, G2P_LIST, pair);
  return { section, list };
}

test.describe("Evidence page: Gene2Phenotype", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.count).toBe(3);

    await expect(section.title).toContainText("Gene2Phenotype");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Supporting diagnostic evidence associating MECP2 with neurodevelopmental disorder. Source: Gene2Phenotype"
    );
    await expect(section.description.getByRole("link", { name: "Gene2Phenotype" })).toHaveAttribute(
      "href",
      "https://www.ebi.ac.uk/gene2phenotype"
    );
    await expect(section.table.headers).toHaveText([...G2P_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, consequence, allelic requirement, panel, confidence and literature", async ({
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
        await expect(section.helpIcon(index, G2P_COLUMN.disease)).toHaveCount(1);

        const consequence = expected.variantFunctionalConsequence!;
        await expect(section.consequenceLink(index)).toHaveText(sentence(consequence.label));
        await expect(section.consequenceLink(index)).toHaveAttribute(
          "href",
          `http://www.sequenceontology.org/browser/current_svn/term/${consequence.id}`
        );

        await expect(section.directionIcons(index)).toHaveCount(2);

        await expect(section.cell(index, G2P_COLUMN.allelic)).toHaveText(
          sentence(expected.allelicRequirements![0])
        );

        await expect(section.panelLink(index)).toHaveText(expected.studyId!);
        await expect(section.panelLink(index)).toHaveAttribute(
          "href",
          `https://www.ebi.ac.uk/gene2phenotype/search?query=${expected.targetFromSourceId}-related%20${expected.diseaseFromSource}`
        );

        await expect(section.cell(index, G2P_COLUMN.confidence)).toContainText(
          sentence(expected.confidence!)
        );
        await expect(section.cell(index, G2P_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
  });

  test("the first rows are Rett syndrome diagnoses with loss of function, the Lubs row is gain of function", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expect(section.diseaseLink(0)).toHaveText("atypical Rett syndrome");
    await expect(section.consequenceLink(0)).toHaveText("Absent gene product");
    await expect(section.cell(0, G2P_COLUMN.allelic)).toHaveText("Monoallelic x heterozygous");
    await expect(section.cell(0, G2P_COLUMN.confidence)).toContainText("Definitive");
    await expect(section.diseaseLink(2)).toHaveText("syndromic X-linked intellectual disability Lubs type");
    await expect(section.consequenceLink(2)).toHaveText("Increased gene product level");
    await expect(section.cell(2, G2P_COLUMN.allelic)).toHaveText("Monoallelic x hemizygous");
  });

  test("the direction of effect icons say what the variant does and what it means for the trait", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const index of [0, 2]) {
      const expected = list.rows[index];
      const tooltip = await section.openDirection(index);
      await expect(tooltip).toHaveText(
        directionText(expected.directionOnTarget, expected.directionOnTrait)
      );
    }
    await expect(section.tooltip).toHaveText("Gain of Function │ Risk");

    await section.directionHeaderHelp.hover();
    const help = section.tooltip.getByRole("link", { name: "More info on our assessment method" });
    await expect(help).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/evidence#gene2phenotype"
    );
  });

  test("the tooltips explain the reported phenotype and the confidence categories", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const disease = await section.openHelp(0, G2P_COLUMN.disease);
    await expect(disease).toContainText("Reported disease or phenotype:");
    await expect(disease).toContainText(sentence(list.rows[0].diseaseFromSource!));

    const confidence = await section.openHelp(0, G2P_COLUMN.confidence);
    await expect(confidence).toContainText("As defined by the GenCC Guidelines");
    await expect(confidence.getByRole("link", { name: "GenCC Guidelines" })).toHaveAttribute(
      "href",
      "https://thegencc.org/faq.html#validity-termsdelphi-survey"
    );
  });

  test("the column picker hides and restores columns and locks disease and panel", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(
      section,
      [
        "Disease/phenotype",
        "Functional consequence",
        "Direction of Effect?",
        "Allelic requirement",
        "Panel",
        "Confidence category",
        "Literature",
      ],
      ["Disease/phenotype", "Panel"],
      "Allelic requirement"
    );
  });

  test("the literature cell lists the publications of its row", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.rows[0].literature!.length, "the first row cites many publications").toBeGreaterThan(10);
    await section.expectLiteratureDrawer(0, G2P_COLUMN.literature, list.rows[0].literature!);
    await expect(section.cell(2, G2P_COLUMN.literature)).toHaveText(
      `${list.rows[2].literature!.length} publications`
    );
    await section.expectLiteratureDrawer(2, G2P_COLUMN.literature, list.rows[2].literature!);
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
      `${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}-gene2phenotype`
    );
    expect(json.map((row) => row.diseasePhenotype)).toEqual(
      list.rows.map((row) => row.disease.name)
    );
    expect(json.map((row) => row.panel)).toEqual(list.rows.map((row) => row.studyId));
    expect(header).toEqual(expect.arrayContaining(["diseasePhenotype", "panel", "literature"]));
  });

  test("every column of the export has a real name", async ({ page }) => {
    const { section, list } = await open(page);
    const { header } = await expectExports(
      section,
      list,
      `${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}-gene2phenotype`
    );
    // The direction-of-effect column has a React element as its title, and the export
    // turns it into the name "objectObject" with an empty value.
    expect(header, "no export column is named after '[object Object]'").not.toContain(
      "objectObject"
    );
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(G2P_OPERATION, MECP2_NDD.ensgId);
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

  test("a pair with a single Gene2Phenotype row lists it", async ({ page }) => {
    const { section, list } = await open(page, NF1_NF1);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("associating NF1 with neurofibromatosis type 1");
    await expect(section.diseaseLink(0)).toHaveAttribute("href", `/disease/${list.rows[0].disease.id}`);
  });

  test("an evidence page without Gene2Phenotype data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${CFTR_CF.ensgId}/${CFTR_CF.efoId}`);
    await expectSections(page, expectedSectionsFor(`${CFTR_CF.ensgId}/${CFTR_CF.efoId}`));
    await expect(new Gene2PhenotypeSection(page).section).toHaveCount(0);
  });
});

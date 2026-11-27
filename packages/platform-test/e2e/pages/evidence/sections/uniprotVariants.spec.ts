import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  GeneticEvidenceSection,
  MECP2_LUBS,
  MECP2_NDD,
  NF1_NF1,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  UNIPROT_VARIANTS_COLUMN,
  UNIPROT_VARIANTS_HEADERS,
  UNIPROT_VARIANTS_LIST,
  UNIPROT_VARIANTS_OPERATION,
  UniprotVariantsEvidenceSection,
  type UniprotVariantsRow,
} from "../../../../POM/objects/widgets/Evidence/uniprot";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** MECP2 in neurodevelopmental disorder: 50 UniProt variants, five pages. */
async function open(page: Page, pair = MECP2_NDD) {
  const section = new UniprotVariantsEvidenceSection(page);
  const list = await openEvidenceSection<UniprotVariantsRow>(
    page,
    section,
    UNIPROT_VARIANTS_OPERATION,
    UNIPROT_VARIANTS_LIST,
    pair
  );
  return { section, list };
}

const aminoAcids = (row: UniprotVariantsRow): string =>
  (row.variant?.transcriptConsequences ?? [])
    .map((consequence) => consequence.aminoAcidChange)
    .filter((change): change is string => change != null)
    .join(", ") || "N/A";

test.describe("Evidence page: UniProt variants", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count, "MECP2 has several pages of UniProt variants").toBeGreaterThan(20);

    await expect(section.title).toContainText("UniProt variants");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Literature-based curation associating genetic variations affecting MECP2 protein products with neurodevelopmental disorder. Source: UniProt"
    );
    await expect(section.description.getByRole("link", { name: "UniProt" })).toHaveAttribute(
      "href",
      "https://www.uniprot.org"
    );
    await expect(section.table.headers).toHaveText([...UNIPROT_VARIANTS_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, protein, variant, rsID, amino acid, ProtVar link, confidence and literature", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.variantRsId}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );
        await expect(section.proteinLink(index)).toHaveText(expected.targetFromSourceId!);
        await expect(section.proteinLink(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/uniprot:${expected.targetFromSourceId}`
        );

        const variant = expected.variant!;
        await expect(section.variantLink(index)).toHaveAttribute("href", `/variant/${variant.id}`);
        await expect(section.variantLink(index)).toHaveText(
          `${variant.id.split("_").slice(0, 2).join("_")}_${variant.referenceAllele}_${variant.alternateAllele}`
        );

        expect(expected.variantRsId).toMatch(/^rs\d+$/);
        await expect(section.rsIdLink(index)).toHaveText(expected.variantRsId!);
        await expect(section.rsIdLink(index)).toHaveAttribute(
          "href",
          `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${expected.variantRsId}`
        );

        await expect(section.cell(index, UNIPROT_VARIANTS_COLUMN.aminoAcid)).toHaveText(
          aminoAcids(expected)
        );
        await expect(section.protVarLink(index)).toHaveText("ProtVar");
        await expect(section.protVarLink(index)).toHaveAttribute(
          "href",
          `https://www.ebi.ac.uk/ProtVar/query?search=${expected.variantRsId}`
        );
        await expect(section.cell(index, UNIPROT_VARIANTS_COLUMN.confidence)).toHaveText(
          expected.confidence!
        );
        await expect(section.cell(index, UNIPROT_VARIANTS_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
  });

  test("the variant links of the first page are all different MECP2 variants on the X chromosome", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const ids = list.rows.map((row) => row.variant!.id);
    expect(new Set(ids).size, "no variant is listed twice on a page").toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^X_\d+_[ACGT]+_[ACGT]+$/);
    await expect(section.table.column(UNIPROT_VARIANTS_COLUMN.variant)).toHaveText(
      list.rows.map((row) => new RegExp(`^X_${row.variant!.position}_`))
    );
  });

  test("the variant consequence chip explains where the prediction comes from", async ({
    page,
  }) => {
    const { section } = await open(page);
    await section.protVarLink(0).hover();
    await expect(section.tooltip).toHaveText("Variant effect on protein function");
  });

  test("pages through the variants, each page different, with the buttons disabled at the ends", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await expectPaging(
      page,
      section,
      UNIPROT_VARIANTS_OPERATION,
      UNIPROT_VARIANTS_LIST,
      list,
      (row: UniprotVariantsRow) => row.variantRsId!,
      UNIPROT_VARIANTS_COLUMN.rsId
    );
  });

  test("a larger page size shows more variants", async ({ page }) => {
    const { section, list } = await open(page);
    await expectPageSizes(section, list);
  });

  test("the column picker hides and restores columns and locks disease and variant", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(
      section,
      [...UNIPROT_VARIANTS_HEADERS],
      ["Disease/phenotype", "Variant"],
      "Amino acid"
    );
  });

  test("the literature cell lists the publications of its row", async ({ page }) => {
    const { section, list } = await open(page);
    const multiple = list.rows.findIndex((row) => (row.literature?.length ?? 0) > 1);
    const single = list.rows.findIndex((row) => row.literature?.length === 1);
    expect([multiple, single], "the first page has both kinds of rows").not.toContain(-1);
    await section.expectLiteratureDrawer(
      multiple,
      UNIPROT_VARIANTS_COLUMN.literature,
      list.rows[multiple].literature!
    );
    await section.expectLiteratureDrawer(
      single,
      UNIPROT_VARIANTS_COLUMN.literature,
      list.rows[single].literature!
    );
  });

  test("the disease tooltip shows the phenotype as reported by UniProt", async ({ page }) => {
    const { section, list } = await open(page);
    const tooltip = await section.openHelp(0, UNIPROT_VARIANTS_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(list.rows[0].diseaseFromSource!);
  });

  test("the export holds every variant as JSON and TSV", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `UniProt-variants-${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}`
    );
    expect(header).toEqual([
      "diseasePhenotype",
      "reportedProtein",
      "variant",
      "rsId",
      "aminoAcid",
      "variantConsequence",
      "confidence",
      "literature",
    ]);
    expect(json.map((row) => row.rsId)).toEqual(
      expect.arrayContaining(list.rows.map((row) => row.variantRsId))
    );
    for (const row of json) {
      // A variant without an rsID has no ProtVar link either.
      expect(row.variantConsequence).toBe(
        row.rsId ? `https://www.ebi.ac.uk/ProtVar/query?search=${String(row.rsId)}` : null
      );
    }
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(UNIPROT_VARIANTS_OPERATION, MECP2_NDD.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a variant link opens that variant's page", async ({ page }) => {
    const { section, list } = await open(page);
    const id = list.rows[0].variant!.id;
    await section.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section, list } = await open(page);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${list.rows[0].disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[0].disease.name
    );
  });

  test("another pair with many variants shows NF1's pages", async ({ page }) => {
    const { section, list } = await open(page, NF1_NF1);
    expect(list.count).toBeGreaterThan(50);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("affecting NF1 protein products");
    await expect(section.cell(0, UNIPROT_VARIANTS_COLUMN.confidence)).toHaveText(
      list.rows[0].confidence!
    );
  });

  test("an evidence page without UniProt variants data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`);
    await expectSections(page, expectedSectionsFor(`${MECP2_LUBS.ensgId}/${MECP2_LUBS.efoId}`));
    await expect(new UniprotVariantsEvidenceSection(page).section).toHaveCount(0);
  });
});

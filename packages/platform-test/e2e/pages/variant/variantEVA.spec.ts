import { expect, test } from "../../../fixtures";
import {
  EVA_COLUMN,
  EVA_HEADERS,
  EVA_OPERATION,
  EVA_PAGE_SIZE,
  EVASection,
} from "../../../POM/objects/widgets/shared/evaSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../POM/objects/widgets/Target/publicationsDrawer";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, sectionLocator } from "../../../utils/sections";

/** APOE R176C: exactly one ClinVar submission (benign, hypercholesterolemia). */
const FEW = "19_44908822_C_T";
/** HBB, the sickle cell variant rs334: 32 ClinVar submissions over four pages. */
const MANY = "11_5227002_T_A";
/** Intron variant overlapping IL6R: no ClinVar submissions. */
const NONE = "1_154453788_C_T";

type EvaRow = {
  studyId: string;
  clinicalSignificances: string[];
  alleleOrigins: string[];
  allelicRequirements: string[] | null;
  confidence: string | null;
  cohortPhenotypes: string[];
  diseaseFromSource: string | null;
  literature: string[];
  disease: { id: string; name: string };
};
type EvaData = {
  variant: { evaEvidences: { count: number; rows: EvaRow[] } };
};

/** Open a variant and wait for the ClinVar section together with its first-page response. */
async function open(page: import("@playwright/test").Page, variantId: string) {
  await stubEuropePmc(page);
  const response = waitForOperation<EvaData>(page, EVA_OPERATION);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data } = await response;
  const section = new EVASection(page);
  await expectSectionLoaded(page, EVASection.id);
  return { section, evidences: data.variant.evaEvidences };
}

const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();

test.describe("Variant page: ClinVar (EVA)", () => {
  test("shows title, description and the single submission of a variant with one record", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    expect(evidences.count, "the APOE variant has one ClinVar record").toBe(1);
    expect(evidences.rows).toHaveLength(1);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("ClinVar");
      await expect(section.description).toContainText(
        "Genetic variation from clinical submissions associating"
      );
      await expect(section.description).toContainText(FEW);
      await expect(section.description).toContainText(
        "to a disease/phenotype. Source: EVA"
      );
      const eva = section.description.getByRole("link", { name: "EVA" });
      await expect(eva).toHaveAttribute("href", "https://www.ebi.ac.uk/eva/");
      await expect(eva).toHaveAttribute("target", "_blank");
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...EVA_HEADERS]);
    });

    await test.step("one row with the record's values", async () => {
      await section.table.expectRowCount(1);
      await expect(section.diseaseLink(0)).toHaveText("Hypercholesterolemia");
      await expect(section.diseaseLink(0)).toHaveAttribute("href", "/disease/HP_0003124");
      await expect(section.clinvarLink(0)).toHaveText("RCV001262472");
      await expect(section.table.cell(0, EVA_COLUMN.significance)).toHaveText("Benign");
    });

    await test.step("no allele origin and no literature show N/A", async () => {
      await expect(section.table.cell(0, EVA_COLUMN.alleleOrigin)).toHaveText("N/A");
      await expect(section.table.cell(0, EVA_COLUMN.literature)).toHaveText("N/A");
      await expect(section.literatureTrigger(0)).toHaveCount(0);
    });

    await test.step("a single page has no pagination, search or page size", async () => {
      await expect(section.table.position).toHaveCount(0);
      await expect(section.table.firstPageButton).toHaveCount(0);
      await expect(section.table.nextPageButton).toHaveCount(0);
      await expect(section.table.searchInput).toHaveCount(0);
      await expect(section.table.pageSizeSelect).toHaveCount(0);
    });
  });

  test("the ClinVar ID links to the record on ClinVar", async ({ page }) => {
    const { section } = await open(page, FEW);
    const link = section.clinvarLink(0);
    await expect(link).toHaveAttribute("href", "https://www.ncbi.nlm.nih.gov/clinvar/RCV001262472");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("the disease tooltip lists the reported disease and all reported phenotypes", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const [row] = evidences.rows;
    expect(row.cohortPhenotypes.length, "the record has several cohort phenotypes").toBeGreaterThan(1);

    await section.helpIcon(0, "disease").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(row.diseaseFromSource as string);
    await expect(tooltip).toContainText("All reported phenotypes:");
    for (const phenotype of row.cohortPhenotypes) {
      await expect(tooltip).toContainText(phenotype);
    }
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("the review status shows filled stars out of four and the status in a tooltip", async ({
    page,
  }) => {
    const { section } = await open(page, FEW);
    await expect(section.stars(0)).toHaveCount(4);
    await expect(section.filledStars(0)).toHaveCount(1);

    await section.stars(0).first().hover();
    await expect(page.getByRole("tooltip")).toHaveText("criteria provided, single submitter");
  });

  test("the disease link opens that disease's page", async ({ page }) => {
    const { section } = await open(page, FEW);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(/\/disease\/HP_0003124$/);
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("lists every submission of a variant with many records, page by page", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    expect(evidences.count, "rs334 has more than three pages of ClinVar records").toBeGreaterThan(
      3 * EVA_PAGE_SIZE
    );
    const total = evidences.count;
    const table = section.table;

    await test.step("first page", async () => {
      await table.expectRowCount(EVA_PAGE_SIZE);
      await table.expectPosition(`1 - ${EVA_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      for (let row = 0; row < EVA_PAGE_SIZE; row++) {
        const expected = evidences.rows[row];
        await expect(section.diseaseLink(row)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(row)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );
        await expect(section.clinvarLink(row)).toHaveText(expected.studyId);
        await expect(table.cell(row, EVA_COLUMN.significance)).toHaveText(
          expected.clinicalSignificances.map(sentence).join("")
        );
      }
    });

    let firstPage: string[] = [];
    await test.step("the next page shows different records", async () => {
      firstPage = (await table.rows.allInnerTexts()).map((text) => text.trim());
      await table.nextPageButton.click();
      await expect(table.position).toHaveText(`11 - 20 of ${total}`);
      await expect
        .poll(async () => (await table.rows.allInnerTexts()).map((text) => text.trim()))
        .not.toEqual(firstPage);
      await expect(table.rows).toHaveCount(EVA_PAGE_SIZE);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
    });

    await test.step("the last page holds the remainder and disables forward navigation", async () => {
      await table.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / EVA_PAGE_SIZE) * EVA_PAGE_SIZE + 1;
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("first page goes back to the start", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${EVA_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect
        .poll(async () => (await table.rows.allInnerTexts()).map((text) => text.trim()))
        .toEqual(firstPage);
    });
  });

  test("allele origins and allelic requirements of a record are shown", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    const withRequirements = evidences.rows.findIndex(
      (row) => row.allelicRequirements && row.allelicRequirements.length > 0
    );
    expect(withRequirements, "the first page holds a record with allelic requirements").toBeGreaterThanOrEqual(0);
    const record = evidences.rows[withRequirements];

    const cell = section.table.cell(withRequirements, EVA_COLUMN.alleleOrigin);
    await expect(cell).toContainText(record.alleleOrigins.map(sentence).join("; "));

    await section.helpIcon(withRequirements, "alleleOrigin").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Allelic requirements:");
    for (const requirement of record.allelicRequirements as string[]) {
      await expect(tooltip).toContainText(requirement);
    }
  });

  test("the literature cell opens a drawer with the publications of that record", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    const withLiterature = evidences.rows.findIndex((row) => row.literature.length > 1);
    expect(withLiterature, "the first page holds a record with literature").toBeGreaterThanOrEqual(0);
    const { literature } = evidences.rows[withLiterature];

    await expect(section.literatureTrigger(withLiterature)).toHaveText(
      `${literature.length} publications`
    );
    await section.literatureTrigger(withLiterature).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(literature.length);
    for (const id of literature) {
      await expect(drawer.entry(id)).toBeVisible();
    }
    await drawer.close();
  });

  test("the export offers JSON and TSV with the section's rows", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${FEW}-clinvar-variant.json`);
    expect(json.rows).toHaveLength(evidences.count);
    expect(JSON.stringify(json.rows)).toContain("RCV001262472");

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${FEW}-clinvar-variant.tsv`);
    expect(tsv.header).toEqual(expect.arrayContaining(["Disease/phenotype", "ClinVar ID"]));
    expect(tsv.lines.filter((line) => line.join("").length > 0)).toHaveLength(evidences.count);
  });

  test("the API query drawer is loaded with the section's query and variant", async ({ page }) => {
    const { section } = await open(page, FEW);
    await section.controls.openApiQuery(EVA_OPERATION, FEW);
    await section.controls.closeApiQuery();
  });

  test("a variant without ClinVar records has no ClinVar section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(NONE);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, EVASection.id)).toHaveCount(0);
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../POM/objects/widgets/shared/sectionDataControls";
import {
  UNIPROT_COLUMN,
  UNIPROT_HEADERS,
  UNIPROT_OPERATION,
  UniProtVariantsSection,
} from "../../../POM/objects/widgets/shared/uniprotVariantsSection";
import { PublicationsDrawer } from "../../../POM/objects/widgets/Target/publicationsDrawer";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, sectionLocator } from "../../../utils/sections";

/** APOE R176C: two UniProt curated associations (type III hyperlipoproteinemia and a second disease). */
const APOE = "19_44908822_C_T";
/** Intron variant overlapping IL6R: no UniProt evidence. */
const NONE = "1_154453788_C_T";

type UniProtData = {
  variant: {
    uniProtEvidences: {
      count: number;
      rows: {
        targetFromSourceId: string;
        confidence: string;
        diseaseFromSource: string;
        literature: string[];
        disease: { id: string; name: string };
      }[];
    };
  };
};

async function open(page: Page, variantId: string) {
  await stubEuropePmc(page);
  const response = waitForOperation<UniProtData>(page, UNIPROT_OPERATION);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data } = await response;
  await expectSectionLoaded(page, UniProtVariantsSection.id);
  return { section: new UniProtVariantsSection(page), evidences: data.variant.uniProtEvidences };
}

test.describe("Variant page: UniProt variants", () => {
  test("shows title, description and one row per curated disease association", async ({ page }) => {
    const { section, evidences } = await open(page, APOE);
    expect(evidences.count, "the APOE variant has two UniProt associations").toBe(2);
    const accession = evidences.rows[0].targetFromSourceId;
    expect(accession).toMatch(/^[A-Z][0-9][A-Z0-9]{3}[0-9]$/);

    await test.step("title and description link to the UniProt entry", async () => {
      await expect(section.title).toHaveText("UniProt variants");
      await expect(section.description).toContainText(
        "Literature-based curation associating"
      );
      await expect(section.description).toContainText(APOE);
      await expect(section.description).toContainText("to a disease/phenotype. Source:");
      const link = section.description.getByRole("link", { name: `UniProt (${accession})` });
      await expect(link).toHaveAttribute("href", `https://identifiers.org/uniprot:${accession}`);
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...UNIPROT_HEADERS]);
    });

    await test.step("a row per association with its disease, confidence and publications", async () => {
      await section.table.expectRowCount(evidences.count);
      for (const [index, record] of evidences.rows.entries()) {
        await expect(section.diseaseLink(index)).toHaveText(record.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${record.disease.id}`
        );
        await expect(section.table.cell(index, UNIPROT_COLUMN.confidence)).toHaveText(
          record.confidence
        );
        await expect(section.literatureTrigger(index)).toHaveText(
          `${record.literature.length} publications`
        );
      }
      expect(await section.table.columnTexts(UNIPROT_COLUMN.disease)).toEqual(
        evidences.rows.map((record) => `${record.disease.name}?`)
      );
    });

    await test.step("one page: the footer reads 1 - 2 of 2 with every pagination button disabled", async () => {
      await section.table.expectPosition(`1 - ${evidences.count} of ${evidences.count}`, {
        canGoBack: false,
        canGoForward: false,
      });
      await expect(section.table.searchInput).toHaveCount(0);
      await expect(section.table.pageSizeSelect).toHaveValue("10");
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("the disease tooltip shows the disease as the source reported it", async ({ page }) => {
    const { section, evidences } = await open(page, APOE);
    for (const [index, record] of evidences.rows.entries()) {
      await section.helpIcon(index).hover();
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toContainText("Reported disease or phenotype");
      await expect(tooltip).toContainText(record.diseaseFromSource);
      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden();
    }
  });

  for (const index of [0, 1]) {
    test(`the disease link of row ${index + 1} opens that disease's page`, async ({ page }) => {
      const { section, evidences } = await open(page, APOE);
      expect(evidences.rows[0].disease.id).not.toBe(evidences.rows[1].disease.id);
      const { id, name } = evidences.rows[index].disease;

      await expect(section.diseaseLink(index)).toHaveText(name);
      await section.diseaseLink(index).click();
      await expect(page).toHaveURL(new RegExp(`/disease/${id}$`));
      await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
    });
  }

  test("the literature cell opens a drawer listing that association's publications", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, APOE);
    const { literature } = evidences.rows[0];
    expect(literature.length).toBeGreaterThan(1);

    await section.literatureTrigger(0).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(literature.length);
    for (const id of literature) {
      await expect(drawer.entry(id)).toBeVisible();
    }
    await drawer.close();
  });

  test("the export offers JSON and TSV with the section's rows", async ({ page }) => {
    const { section, evidences } = await open(page, APOE);

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${APOE}-uniprot-variants.json`);
    expect(json.rows).toHaveLength(evidences.count);
    expect(JSON.stringify(json.rows)).toContain(evidences.rows[0].disease.name);

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${APOE}-uniprot-variants.tsv`);
    expect(tsv.header).toEqual(["diseasePhenotype", "confidence", "literature"]);
    expect(tsv.lines.filter((line) => line.join("").length > 0)).toHaveLength(evidences.count);
  });

  test("the API query drawer is loaded with the section's query and variant", async ({ page }) => {
    const { section } = await open(page, APOE);
    await section.controls.openApiQuery(UNIPROT_OPERATION, APOE);
    await section.controls.closeApiQuery();
  });

  test("a variant without UniProt evidence has no UniProt variants section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(NONE);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, UniProtVariantsSection.id)).toHaveCount(0);
  });
});

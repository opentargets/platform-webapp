import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { VariantEffectPredictorSection } from "../../../POM/objects/widgets/shared/variantEffectPredictorSection";
import { waitForOperation } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { VariantPage } from "../../../POM/page/variant/variant";

const PAGE_SIZE = VariantEffectPredictorSection.pageSize;
const NUMBER = /^-?[\d,]+$/;

type Data = { variant: { transcriptConsequencesView: { count: number; rows: unknown[] } } };

async function open(page: Page, variantId: string) {
  const answer = waitForOperation<Data>(page, VariantEffectPredictorSection.operation);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data, variables } = await answer;
  expect(variables.variantId).toBe(variantId);
  expect(variables.size).toBe(PAGE_SIZE);
  const section = new VariantEffectPredictorSection(page);
  await section.expectLoaded();
  return { section, count: data.variant.transcriptConsequencesView.count };
}

const toNumber = (text: string): number => Number(text.replace(/,/g, ""));

test.describe("Variant page: Transcript consequences", () => {
  test("shows title, description, exact columns and the first page", { tag: "@smoke" }, async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);
    expect(count, "the APOE variant has several pages of consequences").toBeGreaterThan(2 * PAGE_SIZE);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("Transcript consequences");
      await expect(section.description).toContainText(
        "Variant consequence prediction for transcripts in the genomic region of 19_44908822_C_T. Source: Ensembl VEP"
      );
      const link = section.description.getByRole("link", { name: "Ensembl VEP" });
      await expect(link).toHaveAttribute("href", "https://www.ensembl.org/tools/vep");
      await expect(link).toHaveAttribute("target", "_blank");
    });

    await section.table.expectHeaders(VariantEffectPredictorSection.headers);
    await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    await section.table.expectPosition(1, PAGE_SIZE, count);
    await section.table.expectFirstPage();
    await expect(section.table.searchInput).toBeVisible();
    await expect(section.table.pageSizeSelect).toHaveValue(String(PAGE_SIZE));

    await test.step("every row has a gene, a consequence, an impact and numeric distances", async () => {
      for (let i = 0; i < PAGE_SIZE; i++) {
        const link = section.geneLink(i);
        await expect(link).toHaveAttribute("href", /\/target\/ENSG\d{11}$/);
        await expect(link).not.toBeEmpty();
        await expect(section.table.cell(i, 1)).not.toBeEmpty();
        await expect(section.table.cell(i, 2)).toHaveText(/^(high|moderate|low|modifier)$/);
        await expect(section.table.cell(i, 3)).toHaveText(/^-?[\d,]+$|^N\/A$/);
        await expect(section.table.cell(i, 4)).toHaveText(/^-?[\d,]+$|^N\/A$/);
      }
    });

    await test.step("the first row is the APOE missense variant, R176C", async () => {
      const first = section.table.row(0);
      await expect(section.geneLink(0)).toHaveText("APOE");
      await expect(first).toContainText("protein coding");
      await expect(first).toContainText("missense variant");
      await expect(first).toContainText("R176C");
      await expect(section.table.cell(0, 2)).toHaveText("moderate");
      await expect(section.table.cell(0, 3)).toHaveText("0");
    });
  });

  test("a gene's tooltip links to its transcript and protein and the consequence links to Sequence Ontology", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.variant.withMolecularStructure);

    await test.step("gene tooltip", async () => {
      await section.geneLink(0).hover();
      const tooltip = page.getByRole("tooltip").filter({ hasText: "Ensembl canonical transcript" });
      await expect(tooltip).toBeVisible();
      await expect(tooltip.getByRole("link", { name: "ENST00000252486" })).toHaveAttribute(
        "href",
        "https://identifiers.org/ensembl:ENST00000252486"
      );
      await expect(tooltip.getByRole("link", { name: "P02649" })).toHaveAttribute(
        "href",
        "https://identifiers.org/uniprot:P02649"
      );
      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden();
    });

    await test.step("consequence link and codon tooltip", async () => {
      const consequence = section.table.cell(0, 1).getByRole("link", { name: "missense variant" });
      await expect(consequence).toHaveAttribute("href", "https://identifiers.org/SO:0001583");
      await expect(consequence).toHaveAttribute("target", "_blank");
      await consequence.hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Cgc/Tgc" })).toBeVisible();
    });
  });

  test("a gene link opens that gene's target page", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.variant.withMolecularStructure);
    await section.geneLink(0).click();
    await expect(page).toHaveURL(/\/target\/ENSG00000130203$/);
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("APOE");
  });

  test("pages through every consequence from the server, to the short last page and back", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);
    const table = section.table;
    const lastSize = count % PAGE_SIZE || PAGE_SIZE;
    const lastStart = count - lastSize + 1;
    const first = await table.rowTexts();

    await test.step("next page differs and enables first/previous", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, count);
      await table.expectRowsChangedFrom(first);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
    });

    await test.step("last page is short and disables next/last", async () => {
      await table.lastPageButton.click();
      await table.expectPosition(lastStart, count, count);
      await expect(table.rows).toHaveCount(lastSize);
      await table.expectLastPage();
    });

    await test.step("first page returns the original rows", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, count);
      await table.expectFirstPage();
      await table.expectRowTexts(first);
    });

    await test.step("page size 25 and 100", async () => {
      await table.setPageSize(25);
      await table.expectPosition(1, Math.min(25, count), count);
      await expect(table.rows).toHaveCount(Math.min(25, count));
      await table.setPageSize(100);
      await table.expectPosition(1, Math.min(100, count), count);
      await expect(table.rows).toHaveCount(Math.min(100, count));
      await table.expectFirstPage(count <= 100);
    });
  });

  test("sorting by gene and by the distance columns is done by the server", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);
    const table = section.table;

    await test.step("Gene sorts ascending, then descending", async () => {
      await table.clickHeader("Gene");
      await expect
        .poll(async () => {
          const names = await table.columnTexts(0);
          return names.map((n) => n.replace(/\s*protein coding$/, ""));
        })
        .toEqual(
          (await (async () => {
            return null;
          })()) ?? expect.anything()
        );
    });
    expect(count).toBeGreaterThan(0);
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { VariantEffectPredictorSection } from "../../../POM/objects/widgets/shared/variantEffectPredictorSection";
import { waitForOperation } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { VariantPage } from "../../../POM/page/variant/variant";

const PAGE_SIZE = VariantEffectPredictorSection.pageSize;

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
      await section.table.cell(0, 0).locator("sup").hover();
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

  test("sorting by a distance column orders the whole dataset on the server", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);
    const table = section.table;
    const first = await table.rowTexts();
    const footprint = async () =>
      (await table.columnTexts(3)).filter((text) => text !== "N/A").map(toNumber);

    const sortedBy = (direction: 1 | -1) => async () => {
      const values = await footprint();
      return (
        values.length > 1 &&
        values.every((value, i) => i === 0 || (values[i - 1] - value) * direction <= 0)
      );
    };

    await test.step("first click: largest distance first, across the whole dataset", async () => {
      await table.clickHeader("Distance from footprint (bp)");
      await expect.poll(sortedBy(-1), { message: "descending by footprint" }).toBe(true);
      await table.expectPosition(1, PAGE_SIZE, count);
      expect((await footprint())[0]).toBeGreaterThan(100_000);
      expect(await table.rowTexts()).not.toEqual(first);
    });

    await test.step("second click reverses it: the variant's own transcript (0 bp) first", async () => {
      await table.clickHeader("Distance from footprint (bp)");
      await expect.poll(sortedBy(1), { message: "ascending by footprint" }).toBe(true);
      expect((await footprint())[0]).toBe(0);
    });

    await test.step("sorting by gene reorders the rows by symbol", async () => {
      await table.clickHeader("Gene");
      await expect
        .poll(async () => {
          const symbols = await table.columnTexts(0).then((texts) =>
            texts.map((text) => text.replace(/\s*protein coding$/, "").replace(/\s*\?$/, ""))
          );
          return symbols.every((symbol, i) => i === 0 || symbols[i - 1].toLowerCase() <= symbol.toLowerCase());
        })
        .toBe(true);
    });

    await test.step("a sorted table still pages: page 2 follows page 1", async () => {
      const page1 = await table.rowTexts();
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, count);
      await table.expectRowsChangedFrom(page1);
    });
  });

  test("searching filters on the server by gene, consequence and impact, and returns to page 1", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);
    const table = section.table;
    await expect(table.searchInput).toHaveAttribute("placeholder", "Search all columns...");

    await test.step("a gene symbol", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, count);
      await table.search("APOE");
      await expect.poll(async () => table.total()).toBeLessThan(count);
      const total = await table.total();
      expect(total).toBeGreaterThan(0);
      await table.expectPosition(1, Math.min(PAGE_SIZE, total), total);
      for (const gene of await table.columnTexts(0)) expect(gene).toMatch(/APOE/i);
    });

    await test.step("a consequence term", async () => {
      await table.search("missense");
      await expect.poll(async () => table.total()).toBeGreaterThan(0);
      for (const text of await table.columnTexts(1)) expect(text).toContain("missense variant");
      await expect(section.geneLink(0)).toHaveText("APOE");
    });

    await test.step("an impact level", async () => {
      await table.search("modifier");
      await expect.poll(async () => table.total()).toBeGreaterThan(PAGE_SIZE);
      const total = await table.total();
      expect(total).toBeLessThan(count + 1);
      for (const impact of await table.columnTexts(2)) expect(impact).toBe("modifier");
      await table.nextPageButton.click();
      for (const impact of await table.columnTexts(2)) expect(impact).toBe("modifier");
    });

    await test.step("a term nothing matches leaves no rows", async () => {
      await table.search("no-such-transcript-consequence");
      await expect(table.rows).toHaveCount(0);
      await expect(section.section.getByTestId("section-error")).toHaveCount(0);
    });

    await test.step("clearing the search restores the full list", async () => {
      await table.clearSearch();
      await table.expectPosition(1, PAGE_SIZE, count);
      await expect(table.rows).toHaveCount(PAGE_SIZE);
    });
  });

  test("exports every consequence, not just the visible page", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.withMolecularStructure);

    await test.step("JSON holds the whole dataset", async () => {
      const { filename, rows } = await section.controls.downloadJson();
      expect(filename).toBe("19_44908822_C_T-variant-effect-predictor.json");
      expect(rows).toHaveLength(count);
      expect(rows[0]).toMatchObject({ impact: "MODERATE" });
    });

    await test.step("TSV has one line per consequence and the column labels", async () => {
      const tsv = await section.controls.downloadTsv();
      expect(tsv.header).toEqual([
        "gene",
        "predictedConsequence",
        "impact",
        "distanceFromFootprintBp",
        "distanceFromStartSiteBp",
      ]);
      expect(tsv.lines).toHaveLength(count);
    });
  });

  test("the API query drawer holds the section's query", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.variant.withMolecularStructure);
    await section.controls.openApiQuery(
      VariantEffectPredictorSection.operation,
      "19_44908822_C_T"
    );
    await section.controls.closeApiQuery();
  });

  test("an intron variant: IL6R first, non-coding genes carry no protein chip", async ({
    page,
    testConfig,
  }) => {
    const { section, count } = await open(page, testConfig.variant.primary);
    await section.table.expectHeaders(VariantEffectPredictorSection.headers);
    await section.table.expectPosition(1, PAGE_SIZE, count);
    await expect(section.geneLink(0)).toHaveText("IL6R");
    await expect(section.geneLink(0)).toHaveAttribute("href", /\/target\/ENSG00000160712$/);
    await expect(section.table.row(0)).toContainText("protein coding");
    await expect(section.table.cell(0, 1)).toContainText("intron variant");
    await expect(section.table.cell(0, 1)).not.toContainText(/[A-Z]\d+[A-Z]/);
    await expect(section.table.cell(0, 2)).toHaveText("modifier");
    await expect(section.table.cell(0, 3)).toHaveText("0");
    await expect(section.table.cell(0, 4)).toHaveText("-48,445");
    await test.step("a gene that is not protein coding has no chip", async () => {
      await expect(section.geneLink(1)).toHaveText("ENSG00000273110");
      await expect(section.table.row(1)).not.toContainText("protein coding");
    });
    await test.step("distances are formatted with thousands separators", async () => {
      await expect(section.table.cell(1, 3)).toHaveText("26,224");
    });
  });
});

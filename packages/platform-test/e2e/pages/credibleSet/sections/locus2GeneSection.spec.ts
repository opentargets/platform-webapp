import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { Locus2GeneSection } from "../../../../POM/objects/widgets/CredibleSet/locus2GeneSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const { column, featureGroups } = Locus2GeneSection;
const THREE_DECIMALS = /^-?\d+\.\d{3}$/;

/** The two credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl) throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(page: Page, credibleSetId: string): Promise<Locus2GeneSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, Locus2GeneSection.id);
  const l2g = new Locus2GeneSection(page);
  await expect(l2g.rows.first()).toBeVisible();
  return l2g;
}

/** The value of a heat map cell: groups are numbers with three decimals, signed. */
async function groupValues(l2g: Locus2GeneSection, rowIndex: number): Promise<number[]> {
  const texts = await l2g.groupCells(rowIndex).allInnerTexts();
  return texts.map((text) => Number(text.trim()));
}

test.describe("Credible set page: Locus-to-Gene", () => {
  test("shows title, description, legend and the heat map columns", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);

    await test.step("title and description", async () => {
      await expect(page.getByTestId("section-locus2gene-header")).toHaveText("Locus-to-Gene");
      await expect(l2g.description).toHaveText(
        "Gene assignment based on machine learning prioritisation of credible set features. Only scores above 0.05 are shown. Source: Open Targets"
      );
      await expect(l2g.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/credible-set#locus-to-gene-l2g"
      );
    });

    await test.step("columns: gene, score, seven feature groups, base and a details button", async () => {
      await expect(l2g.columnHeaders).toHaveText(Locus2GeneSection.columnTitles);
      await expect(l2g.colocalisationBanner).toHaveText("Colocalisation");
      await expect(l2g.colocalisationBanner).toHaveAttribute("colspan", "3");
    });

    await test.step("the legend explains the Shapley colours and links to the docs", async () => {
      await expect(l2g.legend).toContainText("Feature contributions (Shapley)");
      await expect(l2g.legend.locator("svg").first()).toBeVisible();
      await l2g.legend.locator("sup", { hasText: "?" }).hover();
      await expect(page.getByRole("tooltip").getByRole("link", { name: "here" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g#explaining-l2g-predictions"
      );
    });
  });

  test("ranks the prioritised genes by score, each with its Shapley contributions", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const count = await l2g.rows.count();
    expect(count, "the credible set prioritises several genes").toBeGreaterThan(1);
    expect(await l2g.geneSymbols(), "the GWAS credible set's top gene is VAMP5").toContain("VAMP5");

    await test.step("scores are above the 0.05 cut-off and come highest first", async () => {
      const scores = await l2g.scores();
      for (const score of scores) {
        expect(score).toBeGreaterThan(0.05);
        expect(score).toBeLessThanOrEqual(1);
      }
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    await test.step("every row has seven feature groups and a base value, three decimals each", async () => {
      const bases: string[] = [];
      for (let index = 0; index < count; index += 1) {
        await expect(l2g.groupCells(index)).toHaveCount(featureGroups.length);
        for (const text of await l2g.groupCells(index).allInnerTexts()) {
          expect(text.trim()).toMatch(THREE_DECIMALS);
        }
        await expect(l2g.cell(index, column.score)).toHaveText(THREE_DECIMALS);
        await expect(l2g.cell(index, column.base)).toHaveText(THREE_DECIMALS);
        bases.push((await l2g.cell(index, column.base).innerText()).trim());
      }
      expect(new Set(bases).size, "all genes share the model's base value").toBe(1);
    });

    await test.step("score is the base value plus the group contributions", async () => {
      for (let index = 0; index < count; index += 1) {
        const score = Number((await l2g.cell(index, column.score).innerText()).trim());
        const base = Number((await l2g.cell(index, column.base).innerText()).trim());
        const sum = (await groupValues(l2g, index)).reduce((a, b) => a + b, 0);
        // each of the nine printed numbers is rounded to three decimals
        expect(Math.abs(score - (base + sum)), `row ${index}`).toBeLessThan(0.005);
      }
    });

    await test.step("gene links go to the target page of that gene", async () => {
      for (let index = 0; index < count; index += 1) {
        await expect(l2g.geneLink(index)).toHaveAttribute("href", /^\/target\/ENSG\d{11}$/);
        await expect(l2g.geneLink(index)).toHaveText(/^[A-Za-z0-9-]+$/);
      }
    });
  });

  test("a gene link opens that gene's target page", async ({ page, testConfig }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const symbol = (await l2g.geneLink(0).innerText()).trim();
    const href = await l2g.geneLink(0).getAttribute("href");
    expect(href).toMatch(/^\/target\/ENSG\d{11}$/);
    await l2g.geneLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);
  });

  test("clicking a group cell opens the Shapley plot of just that group's features", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const groupFeatures: Record<string, { present: string[]; absent: string[] }> = {
      Distance: { present: ["distanceTssMean", "distanceSentinelFootprint"], absent: ["vepMean"] },
      VEP: { present: ["vepMaximum", "vepMean"], absent: ["distanceTssMean", "e2gMean"] },
      Other: { present: ["geneCount500kb", "credibleSetConfidence"], absent: ["vepMean"] },
    };

    for (const [group, features] of Object.entries(groupFeatures)) {
      await test.step(`${group} cell of the top gene`, async () => {
        const cell = l2g.groupCells(0).nth(featureGroups.indexOf(group));
        const value = (await cell.innerText()).trim();
        await cell.click();
        await expect(l2g.plotPopover).toBeVisible();
        for (const name of features.present) {
          await expect(l2g.plotPopover).toContainText(name);
        }
        for (const name of features.absent) {
          await expect(l2g.plotPopover).not.toContainText(name);
        }
        await expect(l2g.plotPopover, "the popover totals the cell's value").toContainText(
          `sum: ${value}`
        );
        await page.keyboard.press("Escape");
        await expect(l2g.plotPopover).toBeHidden();
      });
    }
  });

  test("the Details button opens every feature of the gene of its row, and closes", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const second = l2g.row(1);
    const symbol = (await l2g.geneLink(1).innerText()).trim();
    const score = (await l2g.cell(1, column.score).innerText()).trim();
    const base = (await l2g.cell(1, column.base).innerText()).trim();

    await expect(
      l2g.detailsTrigger(1).locator(".."),
      "Details is invisible until the row is hovered"
    ).toHaveCSS("opacity", "0");
    await second.hover();
    await expect(l2g.detailsTrigger(1).locator("..")).toHaveCSS("opacity", "1");
    await l2g.detailsTrigger(1).click();

    await expect(l2g.detailsDialog).toBeVisible();
    await expect(l2g.detailsDialog).toContainText(`${symbol}, score: ${score}`);
    await expect(l2g.detailsDialog, "the waterfall starts from the base value").toContainText(
      `Base: ${base}`
    );
    for (const name of [
      "distanceTssMean",
      "vepMaximum",
      "eQtlColocH4Maximum",
      "pQtlColocH4Maximum",
      "sQtlColocH4Maximum",
      "e2gMean",
      "geneCount500kb",
      "credibleSetConfidence",
    ]) {
      await expect(l2g.detailsDialog).toContainText(name);
    }
    await page.keyboard.press("Escape");
    await expect(l2g.detailsDialog).toBeHidden();
  });

  test("Export downloads one line per prioritised gene as JSON and TSV", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const symbols = await l2g.geneSymbols();
    const scores = await l2g.scores();

    await test.step("JSON", async () => {
      const { content } = await l2g.export("Json");
      const rows = JSON.parse(content) as Record<string, unknown>[];
      expect(rows.map((row) => row.gene)).toEqual(symbols);
      expect(Object.keys(rows[0])).toEqual([
        "gene",
        "score",
        "distance",
        "vep",
        "eQtl",
        "pQtl",
        "sQtl",
        "e2G",
        "other",
        "base",
      ]);
      expect(rows.map((row) => Number((row.score as number).toFixed(3)))).toEqual(scores);
    });

    await test.step("TSV", async () => {
      const { content } = await l2g.export("TSV");
      const lines = content.trimEnd().split("\n");
      expect(lines[0].split("\t")).toEqual([
        "gene",
        "score",
        "distance",
        "vep",
        "eQtl",
        "pQtl",
        "sQtl",
        "e2G",
        "other",
        "base",
      ]);
      expect(lines.slice(1).map((line) => line.split("\t")[0])).toEqual(symbols);
    });
  });

  test("the exported file is named after the credible set, not 'undefined'", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const { filename } = await l2g.export("Json");
    expect(filename).not.toMatch(/undefined/);
    expect(filename).toMatch(/\.json$/);
  });

  test("the API query button opens the playground with the Locus2GeneQuery", async ({
    page,
    testConfig,
  }) => {
    const l2g = await open(page, credibleSets(testConfig).primary);
    const schema = page.waitForResponse(
      (response) => response.request().postData()?.includes("IntrospectionQuery") ?? false
    );
    await l2g.section.getByRole("button", { name: "API query", exact: true }).click();
    await schema;
    const drawer = page.getByTestId("api-playground-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Locus2GeneQuery");
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("a credible set without L2G predictions has no Locus-to-Gene section", async ({
    page,
    testConfig,
  }) => {
    const id = credibleSets(testConfig).qtl;
    await new CredibleSetPage(page).goToCredibleSetPage(id);
    await expectSections(page, expectedSectionsFor(id));
    await expect(page.getByTestId("section-locus2gene")).toHaveCount(0);
    await expect(page.getByTestId("l2g-heatmap")).toHaveCount(0);
    await expect(
      page.getByTestId("section-variants"),
      "the page itself loaded: its variants are there"
    ).toBeVisible();
  });
});

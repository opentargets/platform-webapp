import { expect, test } from "../../../fixtures";
import { VariantEffectSection } from "../../../POM/objects/widgets/Variant/variantEffectSection";
import { waitForOperation } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { VariantPage } from "../../../POM/page/variant/variant";

type Effect = {
  method: string | null;
  assessment: string | null;
  score: number | null;
  assessmentFlag: string | null;
  normalisedScore: number | null;
};
type EffectData = { variant: { variantEffect: Effect[] } };

// Display names of the methods the app describes (VARIANT_EFFECT_METHODS). A method it does
// not know is shown under the name the API gives it.
const PRETTY: Record<string, string> = {
  VEP: "Ensembl VEP",
  LossOfFunctionCuration: "LoF curation",
};
const pretty = (method: string): string => PRETTY[method] ?? method;
const DOCS = "https://platform-docs.opentargets.org/variant#variant-effect";

/** What the table must show for the API rows: sorted by display name, formatted as the app does. */
function expectedRows(effects: Effect[]): string[][] {
  return effects
    .filter((effect) => effect.method !== null)
    .sort((a, b) => pretty(a.method as string).localeCompare(pretty(b.method as string)))
    .map((effect) => [
      pretty(effect.method as string),
      effect.assessment ?? "N/A",
      effect.score === null ? "N/A" : effect.score.toPrecision(3),
      effect.normalisedScore === null ? "N/A" : effect.normalisedScore.toFixed(3),
    ]);
}

/** A known method carries a "?" help icon after its name; the other cells are plain text. */
const rowText = (row: string[]): string => `${row[0]}? ${row.slice(1).join(" ")}`;

/** Open a variant and return its section together with the rows the API answered. */
async function open(page: import("@playwright/test").Page, variantId: string) {
  const answer = waitForOperation<EffectData>(page, VariantEffectSection.operation);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data, variables } = await answer;
  expect(variables.variantId).toBe(variantId);
  const section = new VariantEffectSection(page);
  await section.expectLoaded();
  return { section, effects: data.variant.variantEffect };
}

test.describe("Variant page: Variant effect (in-silico predictors)", () => {
  test(
    "shows title, description and the chart first",
    { tag: "@smoke" },
    async ({ page, testConfig }) => {
      const { section } = await open(page, testConfig.variant.withMolecularStructure);

      await test.step("title and description", async () => {
        await expect(section.title).toHaveText("Variant effect");
        await expect(section.description).toContainText(
          "Predicted and curated functional effect of 19_44908822_C_T. Source Ensembl VEP, gnomAD, OTAR2075."
        );
        for (const [name, href] of [
          ["Ensembl VEP,", "https://www.ensembl.org/tools/vep"],
          ["gnomAD,", "https://gnomad.broadinstitute.org/"],
          ["OTAR2075.", "https://home.opentargets.org/node/1967"],
        ]) {
          const link = section.description.getByRole("link", { name });
          await expect(link).toHaveAttribute("href", href);
        }
      });

      await test.step("chart is the default view", async () => {
        await expect(section.chartButton).toHaveAttribute("aria-pressed", "true");
        await expect(section.tableButton).toHaveAttribute("aria-pressed", "false");
        await expect(section.chart).toBeVisible();
        await expect(section.section.getByTestId("ot-table")).toHaveCount(0);
        await expect(section.chartButton).toContainText("Visualisation");
        await expect(section.tableButton).toContainText("Table view");
      });
    }
  );

  test("table lists every method with formatted prediction, score and normalised score", async ({
    page,
    testConfig,
  }) => {
    const { section, effects } = await open(page, testConfig.variant.withMolecularStructure);
    await section.showTable();
    const expected = expectedRows(effects);
    expect(expected.length, "the APOE variant has several in-silico predictions").toBeGreaterThan(
      3
    );

    await test.step("exact column headers", async () => {
      await section.table.expectHeaders(VariantEffectSection.headers);
    });

    await test.step("one row per method, sorted by display name, values as the API reports", async () => {
      await expect(section.table.rows).toHaveCount(expected.length);
      await section.table.expectRowTexts(expected.map(rowText));
      const names = (await section.table.columnTexts(0)).map((name) => name.replace(/\?$/, ""));
      expect(names).toEqual(expected.map((row) => row[0]));
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(new Set(names).size, "no method is listed twice").toBe(names.length);
    });

    await test.step("scores are numbers, normalised scores lie between 0 and 1", async () => {
      for (const score of await section.table.columnTexts(2)) {
        expect(score).toMatch(/^-?\d+(\.\d+)?$|^N\/A$/);
      }
      for (const score of await section.table.columnTexts(3)) {
        expect(score).toMatch(/^[01]\.\d{3}$|^N\/A$/);
      }
    });

    await test.step("a method the API has no assessment for shows N/A", async () => {
      const missing = effects.filter((effect) => effect.assessment === null);
      expect(missing.length, "GERP and FoldX have no assessment for this variant").toBeGreaterThan(
        0
      );
      for (const effect of missing) {
        const row = section.table.rows.filter({ hasText: pretty(effect.method as string) });
        await expect(row.locator("td").nth(1)).toHaveText("N/A");
      }
    });

    await test.step("search narrows the rows to the matching methods", async () => {
      await expect(section.table.searchInput).toHaveAttribute(
        "placeholder",
        "Search all columns..."
      );
      await section.table.search("gerp");
      await expect(section.table.rows).toHaveCount(1);
      await expect(section.table.row(0)).toContainText("GERP");
      await section.table.search("deleterious");
      const matching = effects.filter((effect) => effect.assessment?.includes("deleterious"));
      await expect(section.table.rows).toHaveCount(matching.length);
      await section.table.search("no-such-predictor");
      await expect(section.table.rows).toHaveCount(0);
      await section.table.clearSearch();
      await expect(section.table.rows).toHaveCount(expected.length);
    });
  });

  test("a method name explains itself in a tooltip linking to the docs", async ({
    page,
    testConfig,
  }) => {
    const { section } = await open(page, testConfig.variant.withMolecularStructure);
    await section.showTable();
    const row = section.table.rows.filter({ hasText: "Ensembl VEP" });
    await row.locator("sup").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      "Pathogenicity score derived from the most severe consequence term provided by Ensembl VEP."
    );
    await expect(tooltip.getByRole("link", { name: "here" })).toHaveAttribute("href", DOCS);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("chart draws one dot per method and the view toggles back and forth", async ({
    page,
    testConfig,
  }) => {
    const { section, effects } = await open(page, testConfig.variant.withMolecularStructure);
    const methods = effects.filter((effect) => effect.method !== null);

    await test.step("a dot and a help mark per method, labelled with display names", async () => {
      await expect(section.dots).toHaveCount(methods.length);
      await expect(section.methodHelpMarks).toHaveCount(methods.length);
      await expect(section.chart.getByText("Ensembl VEP", { exact: true })).toBeVisible();
      await expect(section.chart.getByText("Likely benign")).toBeVisible();
      await expect(section.chart.getByText("Likely deleterious")).toBeVisible();
    });

    await test.step("table, then chart again", async () => {
      await section.showTable();
      await expect(section.table.rows).toHaveCount(methods.length);
      await section.showChart();
      await expect(section.dots).toHaveCount(methods.length);
    });
  });

  test("hovering a dot shows that method's prediction", async ({ page, testConfig }) => {
    const { section, effects } = await open(page, testConfig.variant.withMolecularStructure);
    const sift = effects.find((effect) => effect.method === "SIFT");
    expect(sift?.assessment, "SIFT has an assessment for this variant").toBeTruthy();
    // the plot draws one dot per method in the order the table lists them
    const names = expectedRows(effects).map((row) => row[0]);
    await section.dots.nth(names.indexOf("SIFT")).hover();
    const tip = section.chart.locator("g[aria-label='tip']");
    await expect(tip).toContainText("Method:");
    await expect(tip).toContainText("SIFT");
    await expect(tip).toContainText("Assessment:");
    await expect(tip).toContainText(String(sift?.assessment));
  });

  test("hovering the ? next to a method name describes the method", async ({
    page,
    testConfig,
  }) => {
    const { section, effects } = await open(page, testConfig.variant.withMolecularStructure);
    const names = expectedRows(effects).map((row) => row[0]);
    await section.methodHelpMarks.nth(names.indexOf("Ensembl VEP")).hover();
    const popup = page.locator("body > div.popup");
    await expect(popup).toContainText(
      "Pathogenicity score derived from the most severe consequence term provided by Ensembl VEP."
    );
    await page.mouse.move(0, 0);
    await expect(popup).toHaveCount(0);
  });

  test("chart and table export the same rows as JSON and TSV", async ({ page, testConfig }) => {
    const { section, effects } = await open(page, testConfig.variant.withMolecularStructure);
    const expected = expectedRows(effects);

    await test.step("chart export", async () => {
      const { filename, rows } = await section.controls.downloadJson();
      expect(filename).toBe("variant-effect-plot.json");
      expect(rows).toHaveLength(expected.length);
    });

    await section.showTable();
    await test.step("table export", async () => {
      const { filename, rows } = await section.controls.downloadJson();
      expect(filename).toBe("19_44908822_C_T-variant-effect.json");
      expect(rows.map((row) => row.method)).toEqual(expected.map((row) => row[0]));
      const tsv = await section.controls.downloadTsv();
      expect(tsv.header).toEqual(["method", "prediction", "score", "normalisedScore"]);
      expect(tsv.lines).toHaveLength(expected.length);
    });
  });

  test("the API query drawer holds the section's query", async ({ page, testConfig }) => {
    const { section } = await open(page, testConfig.variant.withMolecularStructure);
    await section.controls.openApiQuery(VariantEffectSection.operation, "19_44908822_C_T");
    await section.controls.closeApiQuery();
  });

  test("a variant with only two predictors lists just those", async ({ page, testConfig }) => {
    const { section, effects } = await open(page, testConfig.variant.primary);
    expect(effects.map((effect) => effect.method).sort()).toEqual(["GPN-Star", "VEP"]);
    await expect(section.dots).toHaveCount(2);
    await section.showTable();
    await section.table.expectHeaders(VariantEffectSection.headers);
    await section.table.expectRowTexts(expectedRows(effects).map(rowText));
    await expect(section.table.cell(0, 0)).toContainText("Ensembl VEP");
    await expect(section.table.cell(0, 1)).toHaveText("intron_variant");
    await expect(section.table.cell(1, 0)).toContainText("GPN-Star");
  });

  test("a long deletion lists VEP and GERP", async ({ page }) => {
    const { section, effects } = await open(page, "1_916631_AGAGCCGGCCCT_A");
    expect(effects.map((effect) => effect.method).sort()).toEqual(["GERP", "VEP"]);
    await section.showTable();
    await section.table.expectRowTexts(expectedRows(effects).map(rowText));
    await expect(section.table.cell(0, 0)).toContainText("Ensembl VEP");
    await expect(section.table.cell(1, 0)).toContainText("GERP");
  });
});

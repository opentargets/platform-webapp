import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expect, test } from "../../../../fixtures";
import {
  DEPMAP_EXPORT_COLUMNS,
  DepMapSection,
} from "../../../../POM/objects/widgets/shared/depMapSection";
import { targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { TargetPage, targetWidget } from "../../../../POM/page/target/target";
import { expectSections } from "../../../../utils/sections";

const PRIMARY = "ENSG00000157764"; // BRAF: 29 tissues, few dependencies
const SECOND = "ENSG00000146648"; // EGFR (BRCA2 has no AlphaFold prediction, which the structure section logs as a console error)

async function open(page: import("@playwright/test").Page, ensgId: string) {
  const depMap = new DepMapSection(page);
  await page.goto(`/target/${ensgId}`);
  await depMap.expectLoaded();
  await expect(depMap.dots.first()).toBeVisible();
  return depMap;
}

test.describe("Target profile: Cancer DepMap section", () => {
  test("shows its title, description and source link", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const depMap = await open(page, targetId);

    await expect(depMap.title).toHaveText("Cancer DepMap");
    await expect(depMap.description).toHaveText(
      `Gene Essentiality assessment for ${targetFacts(targetId).symbol} obtained through CRISPR loss-of-function screens in a wide range of cancer cell lines. Source: DepMap Portal.`
    );
    await expect(depMap.descriptionLink("DepMap Portal")).toHaveAttribute(
      "href",
      "https://depmap.org/portal/"
    );
  });

  test("draws the plot with its axes, legend and threshold", async ({ page }) => {
    const depMap = await open(page, PRIMARY);

    await expect(depMap.legendItems).toHaveText(["Dependency", "Neutral"]);
    await expect(depMap.xAxisLabel).toHaveText("Gene Effect →");
    await expect(depMap.yAxisLabel).toHaveText("Tissue name");
    await expect(depMap.xTickLabels.first()).toHaveText("−6");
    await expect(depMap.xTickLabels.last()).toHaveText("6");
    await expect(depMap.thresholdRule, "a dashed line marks gene effect -1").toHaveCount(1);
    await expect(depMap.thresholdRule.locator("line")).toHaveCount(1);
    await expect(depMap.tissueLabels.first()).toBeVisible();
    expect(await depMap.tissueLabels.count(), "the plot spans many tissues").toBeGreaterThan(5);
  });

  test("the plot shows exactly the exported cell lines, one dot each, in one box per tissue", async ({
    page,
  }) => {
    const depMap = await open(page, PRIMARY);
    const rows = await depMap.exportedRows();

    await expect(depMap.dots).toHaveCount(rows.length);
    const tissues = [...new Set(rows.map((row) => row.tissueName))];
    await expect(depMap.tissueLabels).toHaveCount(tissues.length);
    expect((await depMap.tissueLabels.allTextContents()).sort()).toEqual([...tissues].sort());
    await expect(depMap.plot.locator("g[aria-label='bar'] rect")).toHaveCount(tissues.length);

    await test.step("dots are coloured by gene effect", async () => {
      const dependencies = rows.filter((row) => row.geneEffect < DepMapSection.DEPENDENCY_THRESHOLD);
      expect(dependencies.length, "BRAF has some dependent cell lines").toBeGreaterThan(0);
      expect(dependencies.length).toBeLessThan(rows.length);
      await expect(depMap.dependencyDots).toHaveCount(dependencies.length);
      await expect(depMap.neutralDots).toHaveCount(rows.length - dependencies.length);
    });
  });

  test("a broadly essential gene is mostly dependency, a selective one is mostly neutral", async ({
    page,
    testConfig,
  }) => {
    const essentialId = testConfig.target?.coreEssential as string; // PLK1
    const essential = await open(page, essentialId);
    const essentialRows = await essential.exportedRows();
    await expect(essential.dots).toHaveCount(essentialRows.length);
    const dependencies = await essential.dependencyDots.count();
    expect(dependencies / essentialRows.length, "PLK1 kills most cell lines").toBeGreaterThan(0.8);
    await expect(essential.neutralDots).toHaveCount(essentialRows.length - dependencies);

    const selective = await open(page, PRIMARY);
    const selectiveRows = await selective.exportedRows();
    await expect(selective.dots).toHaveCount(selectiveRows.length);
    expect(
      (await selective.dependencyDots.count()) / selectiveRows.length,
      "BRAF does not kill most cell lines"
    ).toBeLessThan(0.2);
  });

  test("the exported JSON has one well-formed record per dot @smoke", async ({ page }) => {
    const depMap = await open(page, PRIMARY);
    const { filename, rows } = await depMap.controls.downloadJson();

    expect(filename).toBe("cancer-depmap-target.json");
    expect(rows.length).toBeGreaterThan(100);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(DEPMAP_EXPORT_COLUMNS);
    }
    const typed = rows as unknown as Awaited<ReturnType<DepMapSection["exportedRows"]>>;
    for (const row of typed) {
      expect(row.depmapId).toMatch(/^ACH-\d{6}$/);
      expect(row.cellLineName.length).toBeGreaterThan(0);
      expect(row.diseaseFromSource.length).toBeGreaterThan(0);
      expect(row.tissueName).toMatch(/^[A-Z]/);
      expect(typeof row.geneEffect).toBe("number");
      // a cell line without an expression measurement has null
      expect(["number", "object"]).toContain(typeof row.expression);
      if (row.expression !== null) expect(Number.isFinite(row.expression)).toBe(true);
    }
    expect(
      typed.filter((row) => typeof row.expression === "number").length,
      "most cell lines have an expression value"
    ).toBeGreaterThan(typed.length / 2);
  });

  test("the exported TSV has a header and the same number of rows as the JSON", async ({ page }) => {
    const depMap = await open(page, PRIMARY);
    const json = await depMap.exportedRows();
    const tsv = await depMap.controls.downloadTsv();

    expect(tsv.filename).toBe("cancer-depmap-target.tsv");
    expect(tsv.header).toEqual(DEPMAP_EXPORT_COLUMNS);
    const lines = tsv.lines.filter((line) => line.length > 1);
    expect(lines).toHaveLength(json.length);
    expect(lines[0][0]).toBe(json[0].depmapId);
    expect(lines[0][1]).toBe(json[0].cellLineName);
    expect(Number(lines[0][3])).toBeCloseTo(json[0].geneEffect, 5);
    for (const line of lines) expect(line).toHaveLength(DEPMAP_EXPORT_COLUMNS.length);
  });

  test("the export menu offers Json and TSV and closes without downloading", async ({ page }) => {
    const depMap = await open(page, PRIMARY);
    const menu = await depMap.controls.openExportMenu();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("the API query drawer opens with the DepMap query and the target, and closes", async ({
    page,
  }) => {
    const depMap = await open(page, PRIMARY);
    await depMap.controls.openApiQuery("TargetDepMapQuery", PRIMARY);
    await expect(depMap.controls.apiQueryDrawer).toContainText("depMapEssentiality");
    await depMap.controls.closeApiQuery();
  });

  for (const kind of ["dependency", "neutral"] as const) {
    test(`pointing at a ${kind} dot shows that cell line in the tooltip`, async ({ page }) => {
      const depMap = await open(page, PRIMARY);
      const rows = await depMap.exportedRows();
      const isolated = await depMap.isolatedDotIndexes();
      const isDependency = (geneEffect: number) => geneEffect < DepMapSection.DEPENDENCY_THRESHOLD;
      const index = isolated.find((i) => isDependency(rows[i].geneEffect) === (kind === "dependency"));
      expect(index, `an unambiguous ${kind} dot exists`).toBeDefined();
      const row = rows[index as number];

      const lines = await depMap.hoverDot(index as number);
      expect(lines).toHaveLength(5);
      expect(lines[0]).toBe(row.cellLineName);
      expect(lines[1]).toBe(`Disease: ${row.diseaseFromSource}`);
      expect(lines[2]).toMatch(/^Gene effect: -?\d/);
      expect(Number(lines[2].replace("Gene effect:", ""))).toBeCloseTo(row.geneEffect, 1);
      expect(lines[3]).toBe(`Tissue: ${row.tissueName}`);
      expect(lines[4]).toMatch(/^Expression: -?\d/);
      expect(Number(lines[4].replace("Expression:", ""))).toBeCloseTo(row.expression as number, 1);
    });
  }

  test("moving the pointer off the dots closes the tooltip", async ({ page }) => {
    const depMap = await open(page, PRIMARY);
    const [index] = await depMap.isolatedDotIndexes();
    await depMap.hoverDot(index);
    await page.mouse.move(2, 300);
    await expect(depMap.tip.locator("tspan[x]")).toHaveCount(0);
  });

  test("a second target renders its own plot", async ({ page }) => {
    const depMap = await open(page, SECOND);
    const rows = await depMap.exportedRows();
    await expect(depMap.description).toContainText(targetFacts(SECOND).symbol);
    await expect(depMap.dots).toHaveCount(rows.length);
    await expect(depMap.tissueLabels).toHaveCount(new Set(rows.map((row) => row.tissueName)).size);
  });

  test("the summary chip scrolls to the section and keeps it in the URL", async ({ page }) => {
    const target = new TargetPage(page);
    await target.goto(PRIMARY);
    await expectSections(page, expectedSectionsFor(PRIMARY));
    await target.followSummaryChip(targetWidget("depmapessentiality"));
  });

  test("a deep link to the section renders it", async ({ page }) => {
    const target = new TargetPage(page);
    const depMap = new DepMapSection(page);
    await target.gotoSection(PRIMARY, "depMapEssentiality");
    await depMap.expectLoaded();
    await expect(depMap.dots.first()).toBeVisible();
  });

  test("a target without DepMap data does not render the section", async ({ page, testConfig }) => {
    const ensgId = testConfig.target?.withoutLiteratureOrQtl as string;
    const sectionsWithData = expectedSectionsFor(ensgId);
    const depMap = new DepMapSection(page);
    const target = new TargetPage(page);

    expect(sectionsWithData, "the manifest records this target as without DepMap data").not.toContain(
      "depmapessentiality"
    );
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);
    await expect(depMap.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("depmapessentiality"))).toHaveCSS("cursor", "auto");
  });
});

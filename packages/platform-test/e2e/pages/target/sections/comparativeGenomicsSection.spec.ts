import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CHART_SPECIES,
  COMPARATIVE_GENOMICS_COLUMNS,
  COMPARATIVE_GENOMICS_OPERATION,
  ComparativeGenomicsSection,
  HOMOLOGY_TYPES,
} from "../../../../POM/objects/widgets/shared/comparativeGenomicsSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import { requireTarget, TargetPage, targetIdentity, targetWidget } from "../../../../POM/page/target";
import { expectSections } from "../../../../utils/sections";

const ENSEMBL_GENE_URL = /^https:\/\/identifiers\.org\/ensembl:ENS[A-Z]*G\d{11}$/;
/** Percentage identities are printed with three decimals. */
const IDENTITY = /^\d{1,3}\.\d{3}$/;

/**
 * Target profile > Comparative Genomics (packages/sections/src/target/ComparativeGenomics).
 * TargetHomologuesQuery returns every homologue at once; the section opens on a chart of
 * them and can switch to a client-side table.
 */
test.describe("Target comparative genomics section", () => {
  test("the section is loaded with its title, description and source link, and opens on the chart", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();

    await expect(genomics.title).toHaveText("Comparative Genomics");
    await expect(genomics.description).toHaveText(
      `Homology for ${symbol} across selected species. Source: Ensembl Compara.`
    );
    await expect(genomics.description.locator("strong")).toHaveText(symbol);
    await expect(genomics.descriptionLink("Ensembl Compara")).toHaveAttribute(
      "href",
      "https://www.ensembl.org/help"
    );

    await expect(genomics.chartViewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(genomics.tableViewToggle).toHaveAttribute("aria-pressed", "false");
    await expect(genomics.chartViewToggle).toHaveText("Visualisation");
    await expect(genomics.tableViewToggle).toHaveText("Table view");
    await expect(genomics.chart).toBeVisible();
    await expect(genomics.dots.first()).toBeVisible();
    await expect(genomics.section.getByTestId("ot-table")).toHaveCount(0);
  });

  test("the chart draws two dots per homologue on labelled axes", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await expect(genomics.dots.first()).toBeVisible();

    await test.step("axes", async () => {
      await expect(genomics.speciesLabels).toHaveText([...CHART_SPECIES]);
      await expect(genomics.chartSvg.getByText("Query Percentage Identity →")).toBeVisible();
      await expect(genomics.chartSvg.getByText("← Target Percentage Identity")).toBeVisible();
    });

    await test.step("every dot is placed inside the chart", async () => {
      const width = Number(await genomics.chartSvg.getAttribute("width"));
      const height = Number(await genomics.chartSvg.getAttribute("height"));
      expect(width, "the chart should have been measured and drawn at a real width").toBeGreaterThan(300);
      const positions = await genomics.dots.evaluateAll((dots) =>
        dots.map((dot) => ({ cx: Number(dot.getAttribute("cx")), cy: Number(dot.getAttribute("cy")) }))
      );
      for (const { cx, cy } of positions) {
        expect(cx, "a dot's x should be a position inside the chart").toBeGreaterThan(0);
        expect(cx).toBeLessThanOrEqual(width);
        expect(cy, "a dot's y should be on a species row").toBeGreaterThan(0);
        expect(cy).toBeLessThanOrEqual(height);
      }
    });

    await test.step("the table holds one row for every pair of dots", async () => {
      const dots = await genomics.dots.count();
      expect(dots % 2, "dots come in pairs: query and target identity").toBe(0);
      expect(await genomics.queryDots.count()).toBe(dots / 2);
      await genomics.showTable();
      expect(await genomics.table.total()).toBe(dots / 2);
    });
  });

  test("hovering a dot shows the homologue it stands for", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await expect(genomics.dots.first()).toBeVisible();

    // dots can overlap, so hover without insisting that this dot is the topmost element
    await genomics.queryDots.first().hover({ force: true });
    await expect(genomics.chartTooltip).toHaveCSS("opacity", "1");
    await expect(genomics.chartTooltip).toHaveText(
      /Type:\s*(ortholog_one2one|ortholog_one2many|ortholog_many2many|within_species_paralog|other_paralog)\s*Homolog:\s*\S+\s*Query Percentage:\s*\d+(\.\d+)?\s*Target Percentage:\s*\d+(\.\d+)?/
    );

    await genomics.title.hover();
    await expect(genomics.chartTooltip).toHaveCSS("opacity", "0");
  });

  test("the toggle switches between the chart and the table, and back", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await expect(genomics.dots.first()).toBeVisible();
    const dots = await genomics.dots.count();

    await genomics.showTable();
    await genomics.table.expectHeaders(COMPARATIVE_GENOMICS_COLUMNS);

    await genomics.showChart();
    await expect(genomics.dots).toHaveCount(dots);
  });

  test("clicking the view that is already selected keeps it", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await expect(genomics.dots.first()).toBeVisible();
    const dots = await genomics.dots.count();
    expect(dots).toBeGreaterThan(0);

    await genomics.chartViewToggle.click();

    await expect(genomics.chartViewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(genomics.tableViewToggle).toHaveAttribute("aria-pressed", "false");
    await expect(genomics.dots).toHaveCount(dots);
  });

  test("the table lists each homologue with its species, type, gene link and identities", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();

    await genomics.table.expectHeaders(COMPARATIVE_GENOMICS_COLUMNS);
    const total = await genomics.table.total();
    expect(total, "the primary target should have more than one page of homologues").toBeGreaterThan(10);

    await genomics.table.setPageSize(100);
    await expect(genomics.table.rows).toHaveCount(total);
    await genomics.table.expectPosition(1, total, total);

    const homologyTypes = new RegExp(`^\\s*(${HOMOLOGY_TYPES.join("|")})\\s*$`);
    for (let row = 0; row < total; row++) {
      await expect(genomics.cell(row, "species")).toHaveText(/^\s*[A-Z][A-Za-z /()-]+\s*$/);
      await expect(genomics.cell(row, "homologyType")).toHaveText(homologyTypes);
      const homologue = genomics.cell(row, "homologue").getByRole("link");
      await expect(homologue).toHaveText(/^\S+$/);
      await expect(homologue).toHaveAttribute("href", ENSEMBL_GENE_URL);
      for (const column of ["queryIdentity", "targetIdentity"] as const) {
        await expect(genomics.cell(row, column)).toHaveText(IDENTITY);
        const identity = Number((await genomics.cell(row, column).innerText()).trim());
        expect(identity).toBeGreaterThan(0);
        expect(identity).toBeLessThanOrEqual(100);
      }
    }

    const species = (await genomics.column("species").allInnerTexts()).map((name) => name.trim());
    expect(species, "a human gene's closest relatives include the chimpanzee and the mouse").toEqual(
      expect.arrayContaining(["Chimpanzee", "Mouse"])
    );
  });

  test("orthologues carry a confidence star with a tooltip", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();
    await genomics.table.setPageSize(100);

    const orthologues = genomics.table.rows.filter({ hasText: /ortholog (one2one|one2many|many2many)/ });
    await expect(orthologues.first()).toBeVisible();
    const count = await orthologues.count();
    for (let index = 0; index < count; index++) {
      await expect(
        genomics.confidenceStar(orthologues.nth(index)),
        "each orthologue should show whether it is high or low confidence"
      ).toHaveCount(1);
    }

    await genomics.confidenceStar(orthologues.first()).hover();
    await expect(genomics.tooltip).toHaveText(/^(High|Low) confidence orthologue$/);
  });

  test("paralogues do not carry the orthologue confidence star", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();
    await genomics.table.setPageSize(100);

    const paralogues = genomics.table.rows.filter({ hasText: /paralog/ });
    await expect(paralogues.first(), "the primary target should have paralogues").toBeVisible();
    await expect(
      paralogues.locator("svg[data-icon='star']"),
      "orthologue confidence does not apply to paralogues: the API returns no value for them and the table should show no star"
    ).toHaveCount(0);
  });

  test("searching filters the homologues and a term with no match empties the table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();
    const total = await genomics.table.total();

    // mouse gene ids have their own prefix, and the id is only in the link
    await genomics.table.search("ENSMUSG");
    await expect(genomics.table.pagePosition, "the search should narrow the table").not.toHaveText(
      new RegExp(` of ${total}$`)
    );
    await expect(genomics.column("species").first()).toHaveText(/Mouse/);
    const mouseRows = await genomics.table.total();
    expect(mouseRows).toBeGreaterThan(0);
    expect(mouseRows, "the search should narrow the table").toBeLessThan(total);
    await expect(genomics.table.rows).toHaveCount(mouseRows);
    for (let row = 0; row < mouseRows; row++) {
      await expect(genomics.cell(row, "species")).toHaveText(/^\s*Mouse\s*$/);
      await expect(genomics.cell(row, "homologue").getByRole("link")).toHaveAttribute(
        "href",
        /ensembl:ENSMUSG\d{11}$/
      );
    }

    await genomics.table.search("no homologue matches this");
    await expect(genomics.table.rows).toHaveCount(0);
    await expect(genomics.table.pagePosition).toHaveText(/ of 0$/);

    await genomics.table.search("");
    await genomics.table.expectPosition(1, 10, total);
    await expect(genomics.table.rows).toHaveCount(10);
  });

  test("the table is paged ten rows at a time and the page size changes the rows shown", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();
    const total = await genomics.table.total();
    expect(total).toBeGreaterThan(20);
    const lastPageStart = Math.floor((total - 1) / 10) * 10 + 1;

    await expect(genomics.table.rows).toHaveCount(10);
    await genomics.table.expectPosition(1, 10, total);
    await genomics.table.expectFirstPage();
    const firstPage = await genomics.table.rowTexts();

    await genomics.table.nextPageButton.click();
    await genomics.table.expectPosition(11, 20, total);
    const secondPage = await genomics.table.rowTexts();
    for (const row of secondPage) expect(firstPage, "page 2 should not repeat page 1").not.toContain(row);

    await genomics.table.lastPageButton.click();
    await genomics.table.expectPosition(lastPageStart, total, total);
    await expect(genomics.table.rows).toHaveCount(total - lastPageStart + 1);
    await genomics.table.expectLastPage();

    await genomics.table.firstPageButton.click();
    await genomics.table.expectPosition(1, 10, total);
    expect(await genomics.table.rowTexts()).toEqual(firstPage);

    await expect(genomics.table.pageSizeSelect.locator("option")).toHaveText(["5", "10", "25", "100"]);
    await genomics.table.setPageSize(5);
    await genomics.table.expectPosition(1, 5, total);
    await expect(genomics.table.rows).toHaveCount(5);
    await genomics.table.setPageSize(25);
    await genomics.table.expectPosition(1, 25, total);
    await expect(genomics.table.rows).toHaveCount(25);
  });

  test("columns can be hidden and shown, except the species and the homologue", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();

    const picker = await genomics.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(COMPARATIVE_GENOMICS_COLUMNS.length);
    await expect(picker.getByRole("checkbox", { name: "Species", exact: true })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Homologue", exact: true })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Query %id", exact: true }).uncheck();
    await picker.getByRole("checkbox", { name: "Target %id", exact: true }).uncheck();
    await genomics.table.expectHeaders(["Species", "Homology type", "Homologue"]);

    await picker.getByRole("checkbox", { name: "Query %id", exact: true }).check();
    await picker.getByRole("checkbox", { name: "Target %id", exact: true }).check();
    await genomics.table.expectHeaders(COMPARATIVE_GENOMICS_COLUMNS);
    await genomics.table.closeColumnPicker(genomics.title);
  });

  test("the table export downloads every homologue", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await genomics.showTable();
    const total = await genomics.table.total();

    const file = await genomics.table.download("TSV");
    expect(file.filename).toBe(`${ensgId}-comparative-genomics-target.tsv`);
    const { header, rows } = parseTsv(file.text);
    expect(header).toEqual(["species", "homologyType", "homologue", "queryId", "targetId"]);
    expect(rows).toHaveLength(total);
    for (const row of rows) {
      expect(row).toHaveLength(5);
      expect(row[1]).toMatch(/^(ortholog_one2one|ortholog_one2many|ortholog_many2many|within_species_paralog|other_paralog)$/);
      expect(Number(row[3])).toBeGreaterThan(0);
      expect(Number(row[4])).toBeGreaterThan(0);
    }
  });

  test("the chart has its own export and API query", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const genomics = new ComparativeGenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await genomics.expectLoaded();
    await expect(genomics.dots.first()).toBeVisible();
    const homologues = (await genomics.dots.count()) / 2;

    await test.step("export", async () => {
      const file = await genomics.table.download("Json");
      expect(file.filename).toBe("comparative-genomics-plot.json");
      const rows = JSON.parse(file.text) as Record<string, unknown>[];
      expect(rows).toHaveLength(homologues);
      expect(Object.keys(rows[0])).toEqual(["species", "homologyType", "homologue", "queryId", "targetId"]);
    });

    await test.step("API query", async () => {
      await genomics.table.expectApiQuery(COMPARATIVE_GENOMICS_OPERATION);
    });
  });

  test("a target without homologues does not render the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "nonCoding");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const genomics = new ComparativeGenomicsSection(page);
    const target = new TargetPage(page);

    expect(sectionsWithData, "the manifest should record this target as having no homologues").not.toContain(
      "compgenomics"
    );
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(genomics.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("compgenomics"))).toHaveCSS("cursor", "auto");
  });
});

import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** Column headers of the homologues table, in order. */
export const COMPARATIVE_GENOMICS_COLUMNS = [
  "Species",
  "Homology type",
  "Homologue",
  "Query %id",
  "Target %id",
] as const;

export const HOMOLOGUE_COLUMN = {
  species: 0,
  homologyType: 1,
  homologue: 2,
  queryIdentity: 3,
  targetIdentity: 4,
} as const;

/** The species on the chart's axis, bottom to top (ComparativeGenomicsPlot.tsx). */
export const CHART_SPECIES = [
  "Caenorhabditis elegans (Nematode, N2)",
  "Drosophila melanogaster (Fruit fly)",
  "Zebrafish",
  "Tropical clawed frog",
  "Pig",
  "Dog",
  "Guinea Pig",
  "Rabbit",
  "Rat",
  "Mouse",
  "Macaque",
  "Chimpanzee",
  "Human",
] as const;

/** How the table words each homology type the API returns. */
export const HOMOLOGY_TYPES = [
  "ortholog one2one",
  "ortholog one2many",
  "ortholog many2many",
  "within species paralog",
  "other paralog",
] as const;

/** GraphQL operation behind the section (packages/sections/src/target/ComparativeGenomics). */
export const COMPARATIVE_GENOMICS_OPERATION = "TargetHomologuesQuery";

/**
 * Target profile > Comparative Genomics. Opens on a chart with two dots per homologue
 * (query and target percentage identity); the toggle switches to a client-side table.
 */
export class ComparativeGenomicsSection extends ProfileSection {
  readonly table: TableControls;

  constructor(page: Page) {
    super(page, "compGenomics");
    this.table = new TableControls(page, this.section);
  }

  get tableViewToggle(): Locator {
    return this.section.getByTestId("view-toggle-table");
  }

  get chartViewToggle(): Locator {
    return this.section.getByTestId("view-toggle-chart");
  }

  get chart(): Locator {
    return this.section.getByTestId("comparative-genomics-chart");
  }

  get chartSvg(): Locator {
    return this.chart.locator("svg").filter({ has: this.page.locator("circle") });
  }

  /** The dots of the chart: one on the query axis and one on the target axis per homologue. */
  get dots(): Locator {
    return this.chartSvg.locator("circle");
  }

  /** Query-side dots only (left half of the chart). */
  get queryDots(): Locator {
    return this.chartSvg.locator("g.queryContainer circle");
  }

  /** The species labels down the middle of the chart. */
  get speciesLabels(): Locator {
    return this.chartSvg.locator("g.queryContainer .tick text");
  }

  /** The box that follows the pointer over a dot. */
  get chartTooltip(): Locator {
    return this.chart.locator("#tolltip-template-comp-genomic .tooltip");
  }

  /** The Export button above the chart (the table has its own). */
  get chartExportButton(): Locator {
    return this.chart.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  cell(row: number, column: keyof typeof HOMOLOGUE_COLUMN): Locator {
    return this.table.rows.nth(row).locator("td").nth(HOMOLOGUE_COLUMN[column]);
  }

  /** Every cell of one column on the current page. */
  column(column: keyof typeof HOMOLOGUE_COLUMN): Locator {
    return this.table.rows.locator(`td:nth-child(${HOMOLOGUE_COLUMN[column] + 1})`);
  }

  /** The orthologue-confidence star inside a "Homology type" cell. */
  confidenceStar(row: Locator): Locator {
    return row.locator("td").nth(HOMOLOGUE_COLUMN.homologyType).locator("svg[data-icon='star']");
  }

  /** Switch to the table and assert the chart is replaced by a loaded table. */
  async showTable(): Promise<void> {
    await this.tableViewToggle.click();
    await expect(this.tableViewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(this.chartViewToggle).toHaveAttribute("aria-pressed", "false");
    await expect(this.chart, "the chart should be replaced by the table").toHaveCount(0);
    await this.table.expectLoaded();
  }

  /** Switch to the chart and assert the table is replaced by a drawn chart. */
  async showChart(): Promise<void> {
    await this.chartViewToggle.click();
    await expect(this.chartViewToggle).toHaveAttribute("aria-pressed", "true");
    await expect(this.tableViewToggle).toHaveAttribute("aria-pressed", "false");
    await expect(
      this.section.getByTestId("ot-table"),
      "the table should be replaced by the chart"
    ).toHaveCount(0);
    await expect(this.dots.first(), "the chart should be drawn").toBeVisible();
  }
}

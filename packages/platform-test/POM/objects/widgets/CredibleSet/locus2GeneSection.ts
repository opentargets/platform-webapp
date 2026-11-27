import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";

/** The "Locus-to-Gene" section of the credible set page: a Shapley heatmap, one row per gene. */
export class Locus2GeneSection {
  static readonly id = "locus2gene";
  /** The score table columns; the last cell of a row holds the "Details" button. */
  static readonly columnTitles = [
    "Gene",
    "Score",
    "Distance",
    "VEP",
    "eQTL",
    "pQTL",
    "sQTL",
    "E2G",
    "Other",
    "Base",
    "",
  ];
  static readonly featureGroups = ["Distance", "VEP", "eQTL", "pQTL", "sQTL", "E2G", "Other"];
  /** Column positions inside a row. */
  static readonly column = { gene: 0, score: 1, firstGroup: 2, base: 9, details: 10 } as const;

  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, Locus2GeneSection.id);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get heatmap(): Locator {
    return this.section.getByTestId("l2g-heatmap");
  }

  /** The header row of column titles (the first header row is the "Colocalisation" banner). */
  get columnHeaders(): Locator {
    return this.heatmap.locator("thead tr").nth(1).locator("th");
  }

  get colocalisationBanner(): Locator {
    return this.heatmap.locator("thead tr").first().locator("th[colspan]");
  }

  get rows(): Locator {
    return this.heatmap.locator("tbody tr");
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  cell(rowIndex: number, columnIndex: number): Locator {
    return this.row(rowIndex).locator("td").nth(columnIndex);
  }

  /** The gene link of a row. */
  geneLink(rowIndex: number): Locator {
    return this.cell(rowIndex, Locus2GeneSection.column.gene).getByRole("link");
  }

  /** A row's feature-group cells, in the order of `featureGroups`. */
  groupCells(rowIndex: number): Locator {
    return this.row(rowIndex).getByTestId("l2g-heat-cell");
  }

  /** The Shapley plot popover a group cell opens. */
  get plotPopover(): Locator {
    return this.page.getByTestId("l2g-plot-popover");
  }

  /** The dialog a row's "Details" button opens. */
  get detailsDialog(): Locator {
    return this.page.getByTestId("l2g-details-dialog");
  }

  detailsTrigger(rowIndex: number): Locator {
    return this.row(rowIndex).getByTestId("l2g-details-trigger");
  }

  get legend(): Locator {
    return this.heatmap.locator("caption");
  }

  get exportButton(): Locator {
    return this.section.getByTestId("data-downloader").getByRole("button", { name: "Export" });
  }

  /** Download through the Export menu and return what was saved. */
  async export(format: "Json" | "TSV"): Promise<{ filename: string; content: string }> {
    await this.exportButton.click();
    const menu = this.page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Json", "TSV"]);
    const downloadPromise = this.page.waitForEvent("download");
    await menu.getByRole("menuitem", { name: format, exact: true }).click();
    const download = await downloadPromise;
    const content = await readFile(await download.path(), "utf8");
    await expect(menu, "the export menu closes after a format is chosen").toBeHidden();
    return { filename: download.suggestedFilename(), content };
  }

  /** The score of every row, as numbers, top to bottom. */
  async scores(): Promise<number[]> {
    const texts = await this.rows
      .locator(`td:nth-child(${Locus2GeneSection.column.score + 1})`)
      .allInnerTexts();
    return texts.map((text) => Number(text.trim()));
  }

  async geneSymbols(): Promise<string[]> {
    const texts = await this.rows
      .locator(`td:nth-child(${Locus2GeneSection.column.gene + 1})`)
      .allInnerTexts();
    return texts.map((text) => text.trim());
  }
}

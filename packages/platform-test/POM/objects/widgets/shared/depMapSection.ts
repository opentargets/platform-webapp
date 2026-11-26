import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection } from "../Target/sectionWidgets";
import { SectionDataControls } from "./sectionDataControls";

/** The cell-line fields the export and the tooltip carry for each dot of the plot. */
export const DEPMAP_EXPORT_COLUMNS = [
  "depmapId",
  "cellLineName",
  "diseaseFromSource",
  "geneEffect",
  "expression",
  "tissueName",
];

export type DepMapExportRow = {
  depmapId: string;
  cellLineName: string;
  diseaseFromSource: string;
  geneEffect: number;
  expression: number;
  tissueName: string;
};

/**
 * Cancer DepMap section of the target profile: a box plot of the CRISPR gene effect per
 * tissue, with one dot per cancer cell line (Observable Plot SVG).
 */
export class DepMapSection extends ProfileSection {
  /** Dots with a gene effect below this value are coloured as a dependency. */
  static readonly DEPENDENCY_THRESHOLD = -1;
  static readonly DEPENDENCY_COLOUR = "#EC2846";
  static readonly NEUTRAL_COLOUR = "#08519C";

  readonly controls: SectionDataControls;

  constructor(page: Page) {
    super(page, "depmapessentiality");
    this.controls = new SectionDataControls(page, this.section);
  }

  get plot(): Locator {
    return this.section.getByTestId("depmap-plot");
  }

  /** The chart itself, as opposed to its legend swatches. */
  get chart(): Locator {
    return this.plot.locator("svg[aria-label='dot']").or(this.plot.locator("svg").last());
  }

  /** One circle per cancer cell line screen. */
  get dots(): Locator {
    return this.plot.locator("g[aria-label='dot'] circle");
  }

  /** One box per tissue. */
  get tissueLabels(): Locator {
    return this.plot.locator("g[aria-label='y-axis tick label'] text");
  }

  /** The legend entries ("Dependency", "Neutral"). */
  get legendItems(): Locator {
    return this.plot.locator("[class*='-swatches'] > span, [class*='-swatches'] > div");
  }

  /** The tooltip Observable Plot draws next to the pointed dot. */
  get tip(): Locator {
    return this.plot.locator("g[aria-label='tip']");
  }

  /** The export rows, as the section's own export button delivers them. */
  async exportedRows(): Promise<DepMapExportRow[]> {
    const { rows } = await this.controls.downloadJson();
    return rows as unknown as DepMapExportRow[];
  }

  async expectDotsMatch(rows: DepMapExportRow[]): Promise<void> {
    await expect(this.dots).toHaveCount(rows.length);
  }
}

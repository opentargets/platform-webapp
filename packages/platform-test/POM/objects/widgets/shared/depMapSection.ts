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

  /** One circle per cancer cell line screen, in the order of the exported rows. */
  get dots(): Locator {
    return this.plot.locator("circle[r='3']");
  }

  /** The dots coloured as a dependency (gene effect below -1). */
  get dependencyDots(): Locator {
    return this.plot.locator(`circle[r='3'][fill='${DepMapSection.DEPENDENCY_COLOUR}']`);
  }

  /** The dots coloured as neutral. */
  get neutralDots(): Locator {
    return this.plot.locator(`circle[r='3'][fill='${DepMapSection.NEUTRAL_COLOUR}']`);
  }

  /** One label per tissue on the y axis. */
  get tissueLabels(): Locator {
    return this.plot.locator("g[aria-label='y-axis tick label'] text");
  }

  get xAxisLabel(): Locator {
    return this.plot.locator("g[aria-label='x-axis label'] text");
  }

  get yAxisLabel(): Locator {
    return this.plot.locator("g[aria-label='y-axis label'] text");
  }

  get xTickLabels(): Locator {
    return this.plot.locator("g[aria-label='x-axis tick label'] text");
  }

  /** The dashed line at gene effect -1 that separates dependency from neutral. */
  get thresholdRule(): Locator {
    return this.plot.locator(`g[aria-label='rule'][stroke='${DepMapSection.DEPENDENCY_COLOUR}']`);
  }

  /** The legend entries, "Dependency" and "Neutral". */
  get legendItems(): Locator {
    return this.plot.locator("figure > div > span");
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

  /**
   * Indexes of the dots no other dot is within 8px of. The plot picks the nearest dot
   * under the pointer, so only these can be pointed at unambiguously.
   */
  async isolatedDotIndexes(): Promise<number[]> {
    return this.dots.evaluateAll((circles) => {
      const points = circles.map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
      const isolated: number[] = [];
      points.forEach(([x, y], i) => {
        const crowded = points.some(
          ([x2, y2], j) => j !== i && Math.abs(x - x2) < 8 && Math.abs(y - y2) < 8
        );
        if (!crowded) isolated.push(i);
      });
      return isolated;
    });
  }

  /** Point at one dot and return the lines of the tooltip that appears. */
  async hoverDot(index: number): Promise<string[]> {
    const dot = this.dots.nth(index);
    await dot.evaluate((element) => element.scrollIntoView({ block: "center" }));
    const box = await dot.boundingBox();
    if (!box) throw new Error(`dot ${index} has no bounding box`);
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(this.tip.locator("tspan[x]").first(), "a tooltip should open on the dot").toBeVisible();
    const lines = await this.tip.locator("tspan[x]").allTextContents();
    return lines.map((line) => line.replace(/\u200b/g, "").trim());
  }
}

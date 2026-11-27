import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection, TableControls } from "./sectionWidgets";

/** The services the section reads structures from. They are not part of the platform. */
export const STRUCTURE_SERVICES = {
  /** AlphaFold: is there a predicted structure for this UniProt accession? */
  alphaFoldPrediction: /^https:\/\/alphafold\.ebi\.ac\.uk\/api\/prediction\/[A-Z0-9]+$/,
  /** UniProt: the entry, whose cross-references list the experimental (PDB) structures. */
  uniprotEntry: /^https:\/\/rest\.uniprot\.org\/uniprotkb\/[A-Z0-9]+$/,
  /** AlphaFold: the coordinates of a predicted structure. */
  alphaFoldModel: /^https:\/\/alphafold\.ebi\.ac\.uk\/files\/AF-[A-Z0-9]+-F\d+-model_v\d+\.cif$/,
  /** PDBe: the coordinates of an experimental structure. */
  pdbModel: /^https:\/\/www\.ebi\.ac\.uk\/pdbe\/entry-files\/download\/[a-z0-9]{4}\.cif$/,
} as const;

/**
 * Molecular Structure section of the target profile: a table of the AlphaFold prediction
 * and the experimental structures of the target's protein, and a 3D viewer showing the
 * selected one.
 */
export class MolecularStructureSection extends ProfileSection {
  static readonly COLUMNS = ["ID", "Method", "Resolution", "Chain", "Positions", "Source"];

  readonly controls: TableControls;

  constructor(page: Page) {
    super(page, "molecularstructure");
    this.controls = new TableControls(page, this.section);
  }

  /** "Fetching structure data for <accession>" or "No structure available for <accession>". */
  get status(): Locator {
    return this.section.getByTestId("structure-status");
  }

  /** Rows of experimental structures: their ID is a four-character PDB code. */
  get pdbRows(): Locator {
    return this.controls.rows.filter({
      has: this.page.locator("td:first-child", { hasText: /^[0-9][A-Za-z0-9]{3}$/ }),
    });
  }

  /** Rows of predicted structures. */
  get alphaFoldRows(): Locator {
    return this.controls.rows.filter({
      has: this.page.locator("td:first-child", { hasText: /^AF-/ }),
    });
  }

  /** Rows whose Method column is exactly `method` (e.g. "NMR"). */
  rowsWithMethod(method: string): Locator {
    return this.controls.rows.filter({
      has: this.page.locator("td:nth-child(2)", { hasText: new RegExp(`^${method}$`) }),
    });
  }

  /** The column header to click to sort by a column. */
  sortHeader(name: string): Locator {
    return this.controls.table.header(name).getByText(name, { exact: true });
  }

  /** The heading above the viewer: "<structure id>: <title>". */
  get structureTitle(): Locator {
    return this.section.getByTestId("structure-title");
  }

  get viewer(): Locator {
    return this.section.getByTestId("structure-viewer");
  }

  get canvas(): Locator {
    return this.viewer.locator("canvas");
  }

  /** Shown over the viewer while a structure loads, or when it could not be shown. */
  get viewerMessage(): Locator {
    return this.section.getByTestId("structure-viewer-message");
  }

  get infoButton(): Locator {
    return this.section.getByTestId("structure-info-button");
  }

  /** The viewer controls help (rendered in a tooltip outside the section). */
  get infoContent(): Locator {
    return this.page.getByTestId("structure-info-content");
  }

  get screenshotButton(): Locator {
    return this.section.getByTestId("structure-screenshot-button");
  }

  /** Shown only for structures with several models (NMR ensembles). */
  get modelPicker(): Locator {
    return this.section.getByTestId("structure-model-picker");
  }

  get previousModelButton(): Locator {
    return this.section.getByTestId("structure-model-previous");
  }

  get nextModelButton(): Locator {
    return this.section.getByTestId("structure-model-next");
  }

  /** The colour key for AlphaFold's per-residue confidence, shown only for predictions. */
  get confidenceLegend(): Locator {
    return this.section.getByText("AlphaFold model confidence:");
  }

  /** Assert the structure table has been filled from the structure services. */
  async expectTableLoaded(): Promise<void> {
    await expect(this.status, "the list of structures should finish loading").toHaveCount(0, {
      timeout: 45_000,
    });
    await this.controls.expectLoaded();
  }

  /**
   * Assert the viewer finished loading a structure and actually drew it: no message over
   * the canvas, the viewer buttons are there, and the canvas is not one flat colour.
   */
  async expectStructureDrawn(): Promise<void> {
    await expect(this.viewerMessage, "the structure should finish loading").toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(this.canvas).toBeVisible();
    await expect(this.infoButton).toBeVisible();
    await expect(this.screenshotButton).toBeVisible();
    await expect
      .poll(async () => this.canvasColourCount(), {
        message: "the 3D canvas should show a structure, not an empty background",
      })
      .toBeGreaterThan(1);
  }

  /** A fingerprint of what the canvas shows, to tell two renderings apart. */
  async canvasFingerprint(): Promise<string> {
    return this.canvas.evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d") as CanvasRenderingContext2D;
      context.drawImage(canvas, 0, 0);
      const { data } = context.getImageData(0, 0, copy.width, copy.height);
      let hash = 0;
      for (let i = 0; i < data.length; i += 4 * 53) {
        hash = (hash * 31 + data[i] * 65536 + data[i + 1] * 256 + data[i + 2]) % 2147483647;
      }
      return String(hash);
    });
  }

  private async canvasColourCount(): Promise<number> {
    return this.canvas.evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d") as CanvasRenderingContext2D;
      context.drawImage(canvas, 0, 0);
      const { data } = context.getImageData(0, 0, copy.width, copy.height);
      const colours = new Set<number>();
      for (let i = 0; i < data.length; i += 4 * 53) {
        colours.add(data[i] * 65536 + data[i + 1] * 256 + data[i + 2]);
      }
      return colours.size;
    });
  }
}

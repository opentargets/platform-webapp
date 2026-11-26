import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";

export const STRUCTURE_OPTIONS = ["cartoon", "hybrid", "transparent", "opaque"] as const;
export const COLOUR_OPTIONS = [
  "confidence",
  "pathogenicity",
  "domain",
  "hydrophobicity",
  "secondary structure",
  "none",
] as const;
export type ColourOption = (typeof COLOUR_OPTIONS)[number];

/**
 * Variant page: Molecular Structure section. An AlphaFold model of the protein the
 * variant changes, drawn on a 3D canvas, with a representation switch, a colour scheme
 * dropdown and a legend that follows the colour scheme.
 */
export class MolecularStructureSection {
  static readonly id = "molecular-structure";
  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, MolecularStructureSection.id);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get viewer(): Locator {
    return this.section.getByTestId("alphafold-viewer");
  }

  /** The WebGL canvas the structure is drawn on. */
  get canvas(): Locator {
    return this.viewer.locator("canvas");
  }

  get screenshotButton(): Locator {
    return this.viewer.locator("button:has(svg[data-icon='camera'])");
  }

  get usageButton(): Locator {
    return this.viewer.locator("button:has(svg[data-icon='info'])");
  }

  structureRadio(option: (typeof STRUCTURE_OPTIONS)[number]): Locator {
    return this.viewer.getByRole("radio", { name: option, exact: true });
  }

  get structureRadios(): Locator {
    return this.viewer.getByRole("radio");
  }

  get colourSelect(): Locator {
    return this.viewer.getByRole("combobox");
  }

  get missingColourWarning(): Locator {
    return this.viewer.getByText(/Pathogenicity scores not available|Domain information not available/);
  }

  /** Wait for the structure to be fetched and drawn. */
  async expectStructureDrawn(): Promise<void> {
    await expect(this.canvas, "the AlphaFold structure should be drawn on a canvas").toBeVisible({
      timeout: 45_000,
    });
    await expect(this.viewer.getByText("AlphaFold structure not available")).toHaveCount(0);
    await expect(this.colourSelect).toBeVisible();
    await expect
      .poll(async () => (await this.canvas.boundingBox())?.height ?? 0, {
        message: "the canvas should have a real size",
      })
      .toBeGreaterThan(100);
  }

  async chooseColour(option: ColourOption): Promise<void> {
    await this.colourSelect.click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
    await expect(this.colourSelect).toHaveText(option);
  }
}

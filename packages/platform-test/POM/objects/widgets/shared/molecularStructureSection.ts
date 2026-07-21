import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Molecular Structure section on Variant page
 */
export class MolecularStructureSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-molecular-structure']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to finish loading
   */
  async waitForLoad(): Promise<void> {
    const section = this.getSection();
    await section.waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
    await this.page.waitForTimeout(500);
  }

  // AlphaFold viewer
  getAlphaFoldViewer(): Locator {
    return this.getSection().locator("[data-testid='alphafold-viewer']");
  }

  async isAlphaFoldViewerVisible(): Promise<boolean> {
    return await this.getAlphaFoldViewer()
      .isVisible()
      .catch(() => false);
  }

  // Check if section has structure viewer content
  async hasStructureViewer(): Promise<boolean> {
    return await this.getAlphaFoldViewer()
      .isVisible()
      .catch(() => false);
  }

  // Structure information
  async hasStructureInfo(): Promise<boolean> {
    const info = this.getSection().locator("text=AlphaFold");
    return await info.isVisible().catch(() => false);
  }
}

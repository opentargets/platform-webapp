import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Molecular Structure section on Variant pages.
 *
 * Displays 3D protein structure visualization showing the variant's location
 * within the protein. Uses AlphaFold predicted structures when experimental
 * structures are unavailable. Features include:
 * - **3D structure viewer**: Interactive protein structure visualization
 * - **Variant mapping**: Highlights the variant position on the structure
 * - **Confidence scores**: AlphaFold pLDDT scores for structure reliability
 *
 * Helps understand the potential structural impact of amino acid changes.
 *
 * @example
 * ```typescript
 * const structure = new MolecularStructureSection(page);
 * await structure.waitForLoad();
 *
 * // Check if structure is available
 * const hasStructure = await structure.hasStructureViewer();
 * const viewerVisible = await structure.isAlphaFoldViewerVisible();
 * ```
 *
 * @category shared
 * @remarks Section ID: `molecular-structure`
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
    await section.waitFor({ state: "visible", timeout: 10000 });
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

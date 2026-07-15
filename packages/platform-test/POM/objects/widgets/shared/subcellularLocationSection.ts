import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Subcellular Location section on Target pages.
 *
 * Displays protein localization data from the Human Protein Atlas (HPA) and
 * UniProt, showing where in the cell the protein is found. Features include:
 * - **Cell diagram**: Visual representation of protein location
 * - **Location tabs**: HPA Main, HPA Additional, HPA Extracellular, UniProt
 * - **Confidence levels**: Reliability of localization data
 *
 * Important for understanding protein function and drug accessibility.
 *
 * @example
 * ```typescript
 * const location = new SubcellularLocationSection(page);
 * await location.waitForLoad();
 *
 * // Check visualization
 * const diagramVisible = await location.isCellDiagramVisible();
 *
 * // Switch between data sources
 * await location.clickHpaMainTab();
 * await location.clickUniprotTab();
 *
 * // Get location details
 * const locationCount = await location.getLocationCount();
 * const locationName = await location.getLocationName(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `subcellularlocation`
 */
export class SubcellularLocationSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-subcellularlocation']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to finish loading (no skeleton loaders)
   */
  async waitForLoad(): Promise<void> {
    const section = this.getSection();
    await section.waitFor({ state: "visible", timeout: 10000 });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const sect = document.querySelector("[data-testid='section-subcellularlocation']");
          if (!sect) return false;
          const skeletons = sect.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // If no skeletons found, section already loaded
      });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-subcellularlocation-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // Cell diagram visualization
  getVisualization(): Locator {
    return this.getSection().locator("[data-testid='subcellular-visualization']");
  }

  getCellDiagram(): Locator {
    return this.getSection().locator("[data-testid='subcellular-cell-diagram']");
  }

  async isVisualizationVisible(): Promise<boolean> {
    return await this.getVisualization()
      .isVisible()
      .catch(() => false);
  }

  async isCellDiagramVisible(): Promise<boolean> {
    return await this.getCellDiagram()
      .isVisible()
      .catch(() => false);
  }

  // Tabs container
  getTabs(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tabs']");
  }

  // Individual source tabs
  getHpaMainTab(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tab-hpa_main']");
  }

  getHpaAdditionalTab(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tab-hpa_additional']");
  }

  getHpaExtracellularTab(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tab-hpa_extracellular_location']");
  }

  getUniprotTab(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tab-uniprot']");
  }

  async clickHpaMainTab(): Promise<void> {
    await this.getHpaMainTab().click();
  }

  async clickHpaAdditionalTab(): Promise<void> {
    await this.getHpaAdditionalTab().click();
  }

  async clickHpaExtracellularTab(): Promise<void> {
    await this.getHpaExtracellularTab().click();
  }

  async clickUniprotTab(): Promise<void> {
    await this.getUniprotTab().click();
  }

  // Tab panels
  getHpaMainPanel(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tabpanel-hpa_main']");
  }

  getHpaAdditionalPanel(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tabpanel-hpa_additional']");
  }

  getHpaExtracellularPanel(): Locator {
    return this.getSection().locator(
      "[data-testid='subcellular-tabpanel-hpa_extracellular_location']"
    );
  }

  getUniprotPanel(): Locator {
    return this.getSection().locator("[data-testid='subcellular-tabpanel-uniprot']");
  }

  // Locations list
  getLocationsList(): Locator {
    return this.getSection().locator("[data-testid='subcellular-locations-list']");
  }

  getLocationItems(): Locator {
    return this.getSection().locator("[data-testid='subcellular-location-item']");
  }

  async getLocationCount(): Promise<number> {
    return await this.getLocationItems().count();
  }

  getLocationItem(index: number): Locator {
    return this.getLocationItems().nth(index);
  }

  async getLocationName(index: number): Promise<string | null> {
    return await this.getLocationItem(index).textContent();
  }
}

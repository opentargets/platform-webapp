import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Tractability section on Target page.
 *
 * Displays tractability assessment across different therapeutic modalities:
 * - **Small molecule (SM)**: Druggability for small molecule interventions
 * - **Antibody (AB)**: Accessibility for antibody-based therapies
 * - **PROTAC (PR)**: Suitability for proteolysis targeting chimeras
 * - **Other (OC)**: Other clinical modalities
 *
 * Uses data-testid selectors for reliable, predictable testing.
 *
 * @example
 * ```typescript
 * const tractability = new TractabilitySection(page);
 * await tractability.waitForLoad();
 * const smEnabled = await tractability.getSmallMoleculeEnabledCount();
 * const abEnabled = await tractability.getAntibodyEnabledCount();
 * ```
 *
 * @category shared
 * @remarks Section ID: `tractability`
 */
export class TractabilitySection {
  constructor(private page: Page) {}

  /**
   * Get the main section container element.
   * @returns Locator for the section container
   */
  getSection(): Locator {
    return this.page.locator("[data-testid='section-tractability']");
  }

  /**
   * Check if the section is currently visible.
   * @returns Promise resolving to true if visible, false otherwise
   */
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
          const sect = document.querySelector("[data-testid='section-tractability']");
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
    return this.page.locator("[data-testid='section-tractability-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // Grid container
  getGrid(): Locator {
    return this.getSection().locator("[data-testid='tractability-grid']");
  }

  // Get modality columns by specific modality code
  getSmallMoleculeModality(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-sm']");
  }

  getAntibodyModality(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-ab']");
  }

  getProtacModality(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-pr']");
  }

  getOtherModality(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-oc']");
  }

  // Get modality titles
  getSmallMoleculeTitle(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-title-sm']");
  }

  getAntibodyTitle(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-title-ab']");
  }

  getProtacTitle(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-title-pr']");
  }

  getOtherTitle(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-title-oc']");
  }

  // Get modality lists
  getSmallMoleculeList(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-list-sm']");
  }

  getAntibodyList(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-list-ab']");
  }

  getProtacList(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-list-pr']");
  }

  getOtherList(): Locator {
    return this.getSection().locator("[data-testid='tractability-modality-list-oc']");
  }

  // Get enabled/disabled items within a modality list
  getEnabledItems(modalityList: Locator): Locator {
    return modalityList.locator("[data-testid='tractability-item-enabled']");
  }

  getDisabledItems(modalityList: Locator): Locator {
    return modalityList.locator("[data-testid='tractability-item-disabled']");
  }

  // Convenience methods for counting enabled/disabled items per modality
  async getSmallMoleculeEnabledCount(): Promise<number> {
    return await this.getEnabledItems(this.getSmallMoleculeList()).count();
  }

  async getSmallMoleculeDisabledCount(): Promise<number> {
    return await this.getDisabledItems(this.getSmallMoleculeList()).count();
  }

  async getAntibodyEnabledCount(): Promise<number> {
    return await this.getEnabledItems(this.getAntibodyList()).count();
  }

  async getAntibodyDisabledCount(): Promise<number> {
    return await this.getDisabledItems(this.getAntibodyList()).count();
  }

  async getProtacEnabledCount(): Promise<number> {
    return await this.getEnabledItems(this.getProtacList()).count();
  }

  async getProtacDisabledCount(): Promise<number> {
    return await this.getDisabledItems(this.getProtacList()).count();
  }

  async getOtherEnabledCount(): Promise<number> {
    return await this.getEnabledItems(this.getOtherList()).count();
  }

  async getOtherDisabledCount(): Promise<number> {
    return await this.getDisabledItems(this.getOtherList()).count();
  }
}

import type { Locator, Page } from "@playwright/test";

/**
 * Helper class for sample size and population data
 */
export class SampleFields {
  constructor(private page: Page) {}

  // Sample size
  getSampleSizeField(): Locator {
    return this.page.locator("[data-testid='field-sample-size']");
  }

  async getSampleSize(): Promise<string | null> {
    return await this.getSampleSizeField().textContent();
  }

  async isSampleSizeVisible(): Promise<boolean> {
    return await this.getSampleSizeField()
      .isVisible()
      .catch(() => false);
  }

  // N cases
  getNCasesField(): Locator {
    return this.page.locator("[data-testid='field-n-cases']");
  }

  async getNCases(): Promise<string | null> {
    return await this.getNCasesField().textContent();
  }

  async isNCasesVisible(): Promise<boolean> {
    return await this.getNCasesField()
      .isVisible()
      .catch(() => false);
  }

  // N controls
  getNControlsField(): Locator {
    return this.page.locator("[data-testid='field-n-controls']");
  }

  async getNControls(): Promise<string | null> {
    return await this.getNControlsField().textContent();
  }

  async isNControlsVisible(): Promise<boolean> {
    return await this.getNControlsField()
      .isVisible()
      .catch(() => false);
  }

  // Analysis
  getAnalysisField(): Locator {
    return this.page.locator("[data-testid='field-analysis']");
  }

  async getAnalysis(): Promise<string | null> {
    return await this.getAnalysisField().textContent();
  }

  async isAnalysisVisible(): Promise<boolean> {
    return await this.getAnalysisField()
      .isVisible()
      .catch(() => false);
  }

  // Population chips
  getPopulationChips(): Locator {
    return this.page.locator("[data-testid^='chip-ld-population-']");
  }

  async getPopulationChipsCount(): Promise<number> {
    return await this.getPopulationChips().count();
  }

  async getPopulationChipLabel(index: number): Promise<string | null> {
    return await this.getPopulationChips()
      .nth(index)
      .locator("[data-testid='label-chip-label']")
      .textContent();
  }

  async getPopulationChipValue(index: number): Promise<string | null> {
    return await this.getPopulationChips()
      .nth(index)
      .locator("[data-testid='label-chip-value']")
      .textContent();
  }

  async hoverPopulationChip(index: number): Promise<void> {
    await this.getPopulationChips().nth(index).hover();
  }
}

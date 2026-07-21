import type { Locator, Page } from "@playwright/test";

/**
 * Drug Page Object Model
 */
export class DrugPage {
  constructor(private page: Page) {}

  /**
   * Navigate to a drug page
   * @param chemblId - ChEMBL ID of the drug (e.g., "CHEMBL1201585")
   */
  async goToDrugPage(chemblId: string): Promise<void> {
    await this.page.goto(`/drug/${chemblId}`);
    await this.page.waitForSelector("[data-testid='profile-page-header-text']", {
      state: "visible",
    });
  }

  /**
   * Get the drug page header
   */
  getDrugHeader(): Locator {
    return this.page.locator("[data-testid='profile-header']");
  }

  /**
   * Check if drug page is loaded
   */
  async isDrugPageLoaded(): Promise<boolean> {
    return await this.getDrugHeader()
      .isVisible()
      .catch(() => false);
  }
}

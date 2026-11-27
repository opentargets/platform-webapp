import type { Page } from "@playwright/test";

/**
 * Evidence Page Object Model (target-disease evidence, /evidence/:ensgId/:efoId)
 */
export class EvidencePage {
  constructor(private page: Page) {}

  /**
   * Navigate to the evidence page of a target-disease pair
   * @param ensgId - Ensembl gene ID (e.g., "ENSG00000099381")
   * @param efoId - disease ID (e.g., "MONDO_0005090")
   */
  async goToEvidencePage(ensgId: string, efoId: string): Promise<void> {
    await this.page.goto(`/evidence/${ensgId}/${efoId}`);
    await this.page.waitForSelector("[data-testid='profile-page-header-text']", {
      state: "visible",
    });
  }
}

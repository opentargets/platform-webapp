import type { Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../utils/timeouts";

export class VariantPage {
  page: Page;
  originalURL: string;

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  /**
   * Navigate to a variant page by variant ID
   * @param variantId - Variant ID in format: chromosome_position_ref_alt (e.g., "1_154453788_C_T")
   */
  async goToVariantPage(variantId: string): Promise<void> {
    await this.page.goto(`/variant/${variantId}`);
    await this.waitForVariantPageLoad();
  }

  /**
   * Wait for the variant page to load
   */
  async waitForVariantPageLoad(): Promise<void> {
    await this.page.waitForSelector("[data-testid='profile-page-header-block']", {
      state: "visible",
    });
    // Wait for any section loaders to disappear
    await this.page
      .waitForSelector("[data-testid='section-loader']", {
        state: "hidden",
        timeout: WIDGET_LOAD_TIMEOUT,
      })
      .catch(() => {
        // If no loader found, that's fine - means sections loaded quickly
      });
  }

  /**
   * Get variant ID from the page header
   */
  async getVariantIdFromHeader(): Promise<string | null> {
    const headerTitle = this.page.locator("[data-testid='profile-page-header-text']");
    return await headerTitle.textContent();
  }

  /**
   * Navigate to variant page from a credible set link
   * @param variantId - Variant ID to navigate to
   */
  async goToVariantPageFromCredibleSet(variantId: string): Promise<void> {
    const variantLink = this.page.locator(`a[href*="/variant/${variantId}"]`).first();
    await variantLink.click();
    await this.waitForVariantPageLoad();
  }

  /**
   * Navigate to variant page from any table that has variant links
   * @param variantId - Variant ID to navigate to
   */
  async goToVariantPageFromTable(variantId: string): Promise<void> {
    const variantLink = this.page.locator(`a[href*="/variant/${variantId}"]`).first();
    await variantLink.click();
    await this.waitForVariantPageLoad();
  }

  /**
   * Check if the variant page is currently displayed
   */
  async isVariantPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes("/variant/");
  }

  /**
   * Wait for a specific section to finish loading
   * @param sectionTestId - The test-id of the section (e.g., 'section-gwas-credible-sets')
   */
  async waitForSectionToLoad(sectionTestId: string): Promise<void> {
    const section = this.page.locator(`[data-testid='${sectionTestId}']`);

    // Wait for section to be visible
    await section.waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });

    // Wait for any skeleton loaders within the section to disappear
    const skeletons = section.locator(".MuiSkeleton-root");
    const hasSkeletons = await skeletons
      .count()
      .then((count) => count > 0)
      .catch(() => false);

    if (hasSkeletons) {
      await this.page.waitForFunction(
        (testId) => {
          const sect = document.querySelector(`[data-testid='${testId}']`);
          if (!sect) return false;
          const skels = sect.querySelectorAll(".MuiSkeleton-root");
          return skels.length === 0;
        },
        sectionTestId,
        { timeout: 15000 }
      );
    }
  }
}

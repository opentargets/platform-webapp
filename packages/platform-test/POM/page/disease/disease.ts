import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../utils/timeouts";

export class DiseasePage {
  page: Page;
  originalURL: string;

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  getProfilePage() {
    return this.originalURL.replace(/\/associations$/, "");
  }

  async goToProfilePage() {
    await this.page.goto(this.getProfilePage());
  }

  async goToAssociationsPage() {
    await this.page.goto(`${this.originalURL}`);
  }

  // External links methods
  getEfoLink(): Locator {
    return this.page.locator('a[href*="ebi.ac.uk/ols4/ontologies/efo"]');
  }

  async getEfoLinkHref(): Promise<string | null> {
    return await this.getEfoLink().getAttribute("href");
  }

  getXrefLinks(): Locator {
    return this.page.locator('[data-testid^="header-external-links-"] a');
  }

  async getXrefLinksCount(): Promise<number> {
    return await this.getXrefLinks().count();
  }

  async getFirstXrefLinkHref(): Promise<string | null> {
    return await this.getXrefLinks().first().getAttribute("href");
  }

  // Navigate to study page from evidence table
  getStudyLinkInEvidence(studyId: string): Locator {
    return this.page.locator(`a[href*="/study/${studyId}"]`).first();
  }

  async goToStudyPageFromEvidence(studyId: string): Promise<void> {
    await this.getStudyLinkInEvidence(studyId).click();
    await this.page.waitForURL(`**/study/${studyId}**`);
  }

  async getFirstStudyLinkInEvidence(): Promise<Locator> {
    return this.page.locator('a[href*="/study/"]').first();
  }

  async clickFirstStudyInEvidence(): Promise<void> {
    const firstStudyLink = await this.getFirstStudyLinkInEvidence();
    await firstStudyLink.click();
    await this.page.waitForURL(/\/study\//);
  }

  // Wait for page load - check for loaders to disappear
  async waitForPageLoad(): Promise<void> {
    // Wait for the main page header to be visible
    await this.page
      .waitForSelector("[data-testid='profile-page-header']", {
        state: "visible",
        timeout: WIDGET_LOAD_TIMEOUT,
      })
      .catch(() => {
        // Header might not be immediately available
      });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const skeletons = document.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found, page already loaded
      });

    // Wait for any loading spinners
    await this.page
      .waitForFunction(
        () => {
          const spinners = document.querySelectorAll(".MuiCircularProgress-root");
          return spinners.length === 0;
        },
        { timeout: WIDGET_LOAD_TIMEOUT }
      )
      .catch(() => {
        // No spinners found
      });

    // Wait for header text to be populated
    await this.page
      .waitForFunction(
        () => {
          const headerText = document.querySelector("[data-testid='profile-page-header-text']");
          return headerText?.textContent && headerText.textContent.trim().length > 0;
        },
        { timeout: WIDGET_LOAD_TIMEOUT }
      )
      .catch(() => {
        // Header text might not be available
      });
  }
}

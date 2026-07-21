import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../utils/timeouts";
import { GWASStudiesSection } from "../../objects/widgets/GWAS/gwasStudiesSection";

export class StudyPage {
  page: Page;
  originalURL: string;
  STUDY_BASE_URL = "/study/";
  CHOSEN_STUDY_ID = "";

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  /**
   * Navigate to a study page from disease page evidence table
   * @param studyId - The study ID to navigate to
   */
  async goToStudyPageFromEvidence(studyId: string) {
    // Find the study link in evidence tables and click it
    const studyLink = this.page.locator(`a[href*="${this.STUDY_BASE_URL}${studyId}"]`).first();
    await studyLink.click();
    await this.page.waitForURL(`**${this.STUDY_BASE_URL}${studyId}**`);
  }

  /**
   * Navigate directly to a study page
   * @param baseURL - The base URL of the application
   * @param studyId - The study ID to navigate to
   */
  async goToStudyPage(baseURL: string, studyId: string) {
    await this.page.goto(`${baseURL}${this.STUDY_BASE_URL}${studyId}`);
  }

  async goToStudyPageFromGWASWidgetOnDiseasePage(DISEASE_EFO_ID: string) {
    await this.page.goto(`/disease/${DISEASE_EFO_ID}/`);
    const gwasStudiesSection = new GWASStudiesSection(this.page);
    await gwasStudiesSection.getStudyId(0).then(async (studyId) => {
      if (studyId) {
        const trimmedStudyId = studyId.trim();
        this.CHOSEN_STUDY_ID = trimmedStudyId;
        await this.goToStudyPageFromEvidence(trimmedStudyId);
      }
    });
  }

  // Tab navigation
  getProfileTab(): Locator {
    return this.page.locator(`a[href*="${this.STUDY_BASE_URL}"][role="tab"]`).first();
  }

  async isProfileTabActive(): Promise<boolean> {
    const tab = this.getProfileTab();
    const ariaSelected = await tab.getAttribute("aria-selected");
    return ariaSelected === "true";
  }

  async clickProfileTab(): Promise<void> {
    await this.getProfileTab().click();
  }

  // Study page header
  getStudyHeader(): Locator {
    return this.page.locator("[data-testid='profile-page-header']");
  }

  async isStudyHeaderVisible(): Promise<boolean> {
    return await this.getStudyHeader()
      .isVisible()
      .catch(() => false);
  }

  async getStudyIdFromHeader(): Promise<string | null> {
    return await this.page.locator("[data-testid='profile-page-header-text']").textContent();
  }

  // Wait for page load - check for loaders to disappear
  async waitForStudyPageLoad(): Promise<void> {
    // Wait for the main page content to be visible
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

    // Also wait for any loading spinners
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
  }
}

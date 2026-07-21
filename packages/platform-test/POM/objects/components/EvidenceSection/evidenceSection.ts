import type { Locator, Page } from "@playwright/test";

export class EvidenceSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Get evidence section by section ID
  getEvidenceSection(sectionId: string): Locator {
    return this.page.locator(`[data-testid='evidence-section-${sectionId}']`);
  }

  // Check if evidence section is visible
  async isEvidenceSectionVisible(sectionId: string): Promise<boolean> {
    return await this.getEvidenceSection(sectionId)
      .isVisible()
      .catch(() => false);
  }

  // Wait for evidence section to appear
  async waitForEvidenceSection(sectionId: string): Promise<void> {
    const section = this.getEvidenceSection(sectionId);
    await section.waitFor({ state: "visible", timeout: 20000 });

    // Wait for skeleton loaders within the section to disappear
    await this.page
      .waitForFunction(
        (id) => {
          const sect = document.querySelector(`[data-testid='evidence-section-${id}']`);
          if (!sect) return false;
          const skeletons = sect.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        sectionId,
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found, section already loaded
      });
  }

  // Get all visible evidence sections
  getAllEvidenceSections(): Locator {
    return this.page.locator("[data-testid^='evidence-section-']");
  }

  // Get count of visible evidence sections
  async getEvidenceSectionCount(): Promise<number> {
    return await this.getAllEvidenceSections().count();
  }

  // Check if any evidence section is displayed
  async hasAnyEvidenceSection(): Promise<boolean> {
    const count = await this.getEvidenceSectionCount();
    return count > 0;
  }

  // Close/collapse evidence section (if there's a close button)
  async closeEvidenceSection(sectionId: string): Promise<void> {
    const section = this.getEvidenceSection(sectionId);
    const closeButton = section.locator("button[aria-label='close']").first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  // Check if loader is present in evidence section
  getLoader(): Locator {
    return this.page.locator("[data-testid='section-loader']");
  }

  async isLoaderVisible(): Promise<boolean> {
    return await this.getLoader()
      .isVisible()
      .catch(() => false);
  }

  async waitForLoaderToDisappear(): Promise<void> {
    // Wait for the section-specific loader to disappear
    try {
      await this.getLoader().waitFor({ state: "hidden", timeout: 15000 });
    } catch {
      // Loader might not appear at all, which is fine
    }

    // Also wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const evidenceSections = document.querySelectorAll("[data-testid^='evidence-section-']");
          for (const section of evidenceSections) {
            const skeletons = section.querySelectorAll(".MuiSkeleton-root");
            if (skeletons.length > 0) return false;
          }
          return true;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found
      });
  }

  // Wait for section to fully load (section visible and no loader)
  // Note: There is no error fallback UI - if there's an error, the section simply won't render
  async waitForSectionLoad(sectionId: string): Promise<void> {
    // Wait for section to appear (if this fails, it indicates an error state)
    await this.waitForEvidenceSection(sectionId);

    // Wait for loader to disappear
    await this.waitForLoaderToDisappear();
  }
}

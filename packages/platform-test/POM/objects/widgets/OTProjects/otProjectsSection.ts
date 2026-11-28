import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";

/**
 * Disease page: Open Targets Projects section. It is partner-only and the profile does not
 * register it at all (the API no longer exposes `otarProjects`), so the public page must
 * never show it, nor its summary chip.
 */
export class OTProjectsSection {
  static readonly id = "otProjects";
  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, OTProjectsSection.id);
  }

  /** The chip in the summary grid above the sections. */
  get summaryCard(): Locator {
    return this.page.getByTestId(`summary-${OTProjectsSection.id.toLowerCase()}`);
  }
}

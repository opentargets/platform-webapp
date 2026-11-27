import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** The evidence page, /evidence/:ensgId/:efoId. */
export class EvidencePage {
  constructor(readonly page: Page) {}

  /** Open the page and wait for its header to show the title. */
  async goto(ensgId: string, efoId: string, suffix = ""): Promise<void> {
    await this.page.goto(`/evidence/${ensgId}/${efoId}${suffix}`);
    await expect(this.title, "the evidence page header should show a title").toContainText(
      "Evidence for"
    );
  }

  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** Link to the target in the profile header card. */
  get targetLink(): Locator {
    return this.page.locator("a[href^='/target/']").first();
  }

  /** Link to the disease in the profile header card. */
  get diseaseLink(): Locator {
    return this.page.locator("a[href^='/disease/']").first();
  }

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }

  /** The summary card of a section. */
  summaryCard(sectionId: string): Locator {
    return this.page.getByTestId(`summary-${sectionId.toLowerCase().replace(/[-_]/g, "")}`);
  }

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }
}

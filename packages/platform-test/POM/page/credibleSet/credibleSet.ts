import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** The credible set profile page, /credible-set/:credibleSetId. */
export class CredibleSetPage {
  CREDIBLE_SET_BASE_URL = "/credible-set/";

  constructor(readonly page: Page) {}

  /** Open a credible set page and wait for its header to show the page title. */
  async goToCredibleSetPage(credibleSetId: string): Promise<void> {
    await this.page.goto(`${this.CREDIBLE_SET_BASE_URL}${credibleSetId}`);
    await expect(this.title, "the credible set header should show its title").toHaveText(
      "Credible set"
    );
  }

  /** Click the link to a credible set in a table and wait for the page header. */
  async goToCredibleSetPageFromTable(credibleSetId: string): Promise<void> {
    await this.page
      .locator(`a[href*="${this.CREDIBLE_SET_BASE_URL}${credibleSetId}"]`)
      .first()
      .click();
    await expect(this.page).toHaveURL(new RegExp(`${this.CREDIBLE_SET_BASE_URL}${credibleSetId}`));
    await expect(this.title).toHaveText("Credible set");
  }

  get header(): Locator {
    return this.page.getByTestId("profile-page-header-block");
  }

  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** The lead variant link in the page header. */
  get leadVariantLink(): Locator {
    return this.page.getByTestId("external-links").getByRole("link").first();
  }

  /** The study link in the page header. */
  get studyLink(): Locator {
    return this.page.getByTestId("external-links").getByRole("link").nth(1);
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  /** The two-column block of lead variant / fine-mapping / study fields. */
  get profileHeader(): Locator {
    return this.page.getByTestId("profile-header");
  }

  /** A "Title: value" field of the profile header, found by its title. */
  field(title: string): Locator {
    return this.profileHeader.getByRole("heading", { name: new RegExp(`^${title}`) });
  }

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }
}

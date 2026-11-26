import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The drawer a "<pmid>" / "N publications" cell opens (ui PublicationsDrawer). It asks
 * Europe PMC for the publications and lists them, one `literature-entry-<id>` each.
 */
export class PublicationsDrawer {
  constructor(readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("publications-drawer");
  }

  get entries(): Locator {
    return this.root.locator("[data-testid^='literature-entry-']");
  }

  entry(europePmcId: string): Locator {
    return this.root.getByTestId(`literature-entry-${europePmcId}`);
  }

  get closeButton(): Locator {
    return this.root.getByTestId("drawer-close");
  }

  /** Assert the drawer is open under its caption and has finished asking Europe PMC. */
  async expectOpen(caption = "Publications"): Promise<void> {
    await expect(this.root, "the publications drawer should open").toBeVisible();
    await expect(this.root).toContainText(caption);
    await expect(
      this.root.getByText("Loading Europe PMC search results"),
      "the drawer should finish loading from Europe PMC"
    ).toHaveCount(0);
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root, "the publications drawer should close").toBeHidden();
  }
}

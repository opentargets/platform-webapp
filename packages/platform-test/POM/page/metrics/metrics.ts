import type { Locator, Page } from "@playwright/test";

export class MetricsPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/metrics");
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.getTitle().waitFor({ state: "visible" });
    await this.getCardsContainer().waitFor({ state: "visible" });
  }

  // Page title
  getTitle(): Locator {
    return this.page.getByTestId("metrics-page-title");
  }

  async getTitleText(): Promise<string | null> {
    return await this.getTitle().textContent();
  }

  // Metric cards
  getCardsContainer(): Locator {
    return this.page.getByTestId("metrics-cards");
  }

  getCards(): Locator {
    // Direct children only: value/label sub-elements also start with "metrics-card-"
    return this.getCardsContainer().locator("> [data-testid^='metrics-card-']");
  }

  async getCardCount(): Promise<number> {
    return await this.getCards().count();
  }

  getCard(slug: string): Locator {
    return this.page.getByTestId(`metrics-card-${slug}`);
  }

  async isCardVisible(slug: string): Promise<boolean> {
    return await this.getCard(slug).isVisible();
  }

  getCardValue(slug: string): Locator {
    return this.getCard(slug).getByTestId("metrics-card-value");
  }

  async getCardValueText(slug: string): Promise<string | null> {
    return await this.getCardValue(slug).textContent();
  }

  getCardLabel(slug: string): Locator {
    return this.getCard(slug).getByTestId("metrics-card-label");
  }

  async getCardLabelText(slug: string): Promise<string | null> {
    return await this.getCardLabel(slug).textContent();
  }

  // Metric widgets (chart sections)
  getWidget(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}`);
  }

  async isWidgetVisible(id: string): Promise<boolean> {
    return await this.getWidget(id).isVisible();
  }

  getWidgetTitle(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-title`);
  }

  async getWidgetTitleText(id: string): Promise<string | null> {
    return await this.getWidgetTitle(id).textContent();
  }

  getWidgetDescription(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-description`);
  }

  getWidgetContent(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-content`);
  }

  // External documentation links within a widget description
  getWidgetExternalLinks(id: string): Locator {
    return this.getWidgetDescription(id).locator("a");
  }

  async getWidgetExternalLinksCount(id: string): Promise<number> {
    return await this.getWidgetExternalLinks(id).count();
  }
}

import { expect, type Locator, type Page } from "@playwright/test";

export class MetricsPage {
  readonly title: Locator;
  readonly cardsContainer: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("metrics-page-title");
    this.cardsContainer = page.getByTestId("metrics-cards");
  }

  async goto(): Promise<void> {
    await this.page.goto("/metrics");
    await expect(this.title).toBeVisible();
    await expect(this.cardsContainer).toBeVisible();
  }

  /** Direct children only: value and label sub-elements also have ids starting "metrics-card-". */
  get cards(): Locator {
    return this.cardsContainer.locator("> [data-testid^='metrics-card-']");
  }

  card(slug: string): Locator {
    return this.page.getByTestId(`metrics-card-${slug}`);
  }

  cardValue(slug: string): Locator {
    return this.card(slug).getByTestId("metrics-card-value");
  }

  cardLabel(slug: string): Locator {
    return this.card(slug).getByTestId("metrics-card-label");
  }

  widget(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}`);
  }

  widgetTitle(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-title`);
  }

  widgetDescription(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-description`);
  }

  widgetContent(id: string): Locator {
    return this.page.getByTestId(`metrics-widget-${id}-content`);
  }

  widgetLinks(id: string): Locator {
    return this.widgetDescription(id).getByRole("link");
  }

  /** The chart marks an Observable Plot exposes through aria-label. */
  marks(id: string, ariaLabel: string): Locator {
    return this.widgetContent(id).locator(`[aria-label='${ariaLabel}']`);
  }

  /** Axis tick labels of the Variants chart: one `text` per consequence. */
  get consequenceLabels(): Locator {
    return this.marks("variants", "y-axis tick label").locator("text");
  }

  get showMoreButton(): Locator {
    return this.widgetContent("variants").getByRole("button", { name: /^Show (more|less)$/ });
  }
}

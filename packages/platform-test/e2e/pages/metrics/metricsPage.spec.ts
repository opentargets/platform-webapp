import { expect, test } from "../../../fixtures";
import { MetricsPage } from "../../../POM/page/metrics/metrics";

const WIDGET_IDS = [
  "disease-target-associations",
  "drugs",
  "studies-and-credible-sets",
  "variants",
];

const CARD_SLUGS = [
  "targets",
  "diseases",
  "drugs-and-clinical-candidates",
  "clinical-reports",
  "gwas",
  "target-disease-evidence",
  "direct-target-disease-associations",
  "indirect-target-disease-associations",
  "credible-sets",
  "variants",
];

test.describe("Metrics Page", { tag: "@smoke" }, () => {
  test.beforeEach(async ({ page }) => {
    const metricsPage = new MetricsPage(page);
    await metricsPage.goto();
  });

  test.describe("Page Header", () => {
    test("Metrics page loads with the correct title", async ({ page }) => {
      const metricsPage = new MetricsPage(page);

      const titleText = await metricsPage.getTitleText();
      expect(titleText).toContain("Open Targets Platform Metrics");
    });

    test("Page has the correct document title", async ({ page }) => {
      const title = await page.title();
      expect(title).toContain("Data Metrics");
    });
  });

  test.describe("Metric Cards", () => {
    test("All metric cards are rendered", async ({ page }) => {
      const metricsPage = new MetricsPage(page);

      const cardCount = await metricsPage.getCardCount();
      expect(cardCount).toBe(CARD_SLUGS.length);
    });

    for (const slug of CARD_SLUGS) {
      test(`"${slug}" card is visible with a numeric value and label`, async ({ page }) => {
        const metricsPage = new MetricsPage(page);

        const isVisible = await metricsPage.isCardVisible(slug);
        expect(isVisible).toBe(true);

        const valueText = await metricsPage.getCardValueText(slug);
        expect(valueText).toBeTruthy();
        expect(valueText?.trim().length).toBeGreaterThan(0);

        const labelText = await metricsPage.getCardLabelText(slug);
        expect(labelText?.trim().length).toBeGreaterThan(0);
      });
    }
  });

  test.describe("Metric Widgets", () => {
    for (const id of WIDGET_IDS) {
      test(`"${id}" widget is visible with a title and chart content`, async ({ page }) => {
        const metricsPage = new MetricsPage(page);

        const isVisible = await metricsPage.isWidgetVisible(id);
        expect(isVisible).toBe(true);

        const titleText = await metricsPage.getWidgetTitleText(id);
        expect(titleText?.trim().length).toBeGreaterThan(0);

        await expect(metricsPage.getWidgetContent(id)).toBeVisible();
      });
    }

    test("Evidence and Associations widget links to the platform docs", async ({ page }) => {
      const metricsPage = new MetricsPage(page);

      const linksCount = await metricsPage.getWidgetExternalLinksCount("disease-target-associations");
      expect(linksCount).toBeGreaterThanOrEqual(2);

      const firstLink = metricsPage.getWidgetExternalLinks("disease-target-associations").first();
      await expect(firstLink).toHaveAttribute("href", /platform-docs\.opentargets\.org/);
    });
  });
});

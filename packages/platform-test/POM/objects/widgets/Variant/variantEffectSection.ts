import { expect, type Locator, type Page } from "@playwright/test";
import { OtTable } from "../../../../utils/table";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { SectionDataControls } from "../shared/sectionDataControls";

/** The "Variant effect" section (in_silico_predictors) of the variant page. */
export class VariantEffectSection {
  static readonly id = "in_silico_predictors";
  static readonly operation = "VariantEffectQuery";
  static readonly headers = ["Method", "Prediction", "Score", "Normalised score"] as const;

  constructor(readonly page: Page) {}

  get section(): Locator {
    return sectionLocator(this.page, VariantEffectSection.id);
  }

  /** Wait for the section to be rendered and loaded (chart view is the default). */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, VariantEffectSection.id);
  }

  get title(): Locator {
    return this.section.getByTestId("section-in-silico-predictors-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get table(): OtTable {
    return new OtTable(this.section);
  }

  get controls(): SectionDataControls {
    return new SectionDataControls(this.page, this.section);
  }

  get chartButton(): Locator {
    return this.section.getByTestId("view-toggle-chart");
  }

  get tableButton(): Locator {
    return this.section.getByTestId("view-toggle-table");
  }

  get chart(): Locator {
    return this.section.locator("svg[class^='plot-']");
  }

  /** One circle per method in the plot. */
  get dots(): Locator {
    return this.chart.locator("g[aria-label='dot'] circle");
  }

  /** The "?" hover targets next to each method name in the plot. */
  get methodHelpMarks(): Locator {
    return this.chart.locator(".y-label-tooltips text");
  }

  async showTable(): Promise<void> {
    await this.tableButton.click();
    await expect(this.tableButton).toHaveAttribute("aria-pressed", "true");
    await expect(this.chartButton).toHaveAttribute("aria-pressed", "false");
    await expect(this.chart).toHaveCount(0);
    await this.table.expectLoaded();
  }

  async showChart(): Promise<void> {
    await this.chartButton.click();
    await expect(this.chartButton).toHaveAttribute("aria-pressed", "true");
    await expect(this.tableButton).toHaveAttribute("aria-pressed", "false");
    await expect(this.section.getByTestId("ot-table")).toHaveCount(0);
    await expect(this.chart).toBeVisible();
  }
}

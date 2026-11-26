import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for the Gene Burden evidence section on the evidence page
 */
export class GeneBurdenSection {
  constructor(private page: Page) {}

  getSection(): Locator {
    return this.page.getByTestId("section-gene-burden");
  }

  getTableRows(): Locator {
    return this.getSection().locator("table tbody tr");
  }

  /**
   * Wait until the section shows its first table row
   */
  async waitForLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
    await this.getTableRows().first().waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
  }

  /**
   * Get the first row whose Cohort/Project cell shows the given text, e.g. "SCHEMA2 (SCHEMA)"
   */
  getRowBySource(source: string): Locator {
    return this.getTableRows().filter({ hasText: source }).first();
  }

  /**
   * Get the external link in the Cohort/Project cell of the row for the given source
   */
  getSourceLink(source: string): Locator {
    return this.getRowBySource(source).getByRole("link", { name: source, exact: true });
  }
}

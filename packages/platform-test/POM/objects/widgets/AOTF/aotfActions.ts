import { expect, type Locator, type Page } from "@playwright/test";

/**
 * A thin helper still used by the target-associations and evidence-widgets specs.
 * The disease controls specs use AssociationsTable (associationsTable.ts) instead.
 * Nothing here sleeps or swallows an error.
 */
export class AotfActions {
  constructor(readonly page: Page) {}

  getNameFilterInput(): Locator {
    return this.page.getByTestId("name-filter-input");
  }

  async searchByName(name: string): Promise<void> {
    await this.getNameFilterInput().fill(name);
    await expect(this.getNameFilterInput()).toHaveValue(name);
  }

  /** Type a name and wait until the search chip shows it (the input is debounced). */
  async applyNameFilterAndWaitForResults(name: string): Promise<void> {
    await this.searchByName(name);
    await expect(this.getActiveFilterChip("entity-search")).toBeVisible();
  }

  async clearNameFilter(): Promise<void> {
    await this.getNameFilterInput().clear();
    await expect(this.getNameFilterInput()).toHaveValue("");
  }

  getPrioritisationViewButton(): Locator {
    return this.page.getByTestId("prioritisation-view-button");
  }

  async switchToPrioritisationView(): Promise<void> {
    await this.getPrioritisationViewButton().click();
    await expect(this.getPrioritisationViewButton()).toHaveAttribute("aria-pressed", "true");
  }

  getActiveFilterChip(filterName: string): Locator {
    return this.page.getByTestId(`active-filter-chip-${filterName}`);
  }

  /** The chip shown while the table is sorted by something other than the score. */
  get sortFilterChip(): Locator {
    return this.getActiveFilterChip("sort");
  }
}

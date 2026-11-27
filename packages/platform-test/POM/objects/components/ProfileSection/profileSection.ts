import { expect, type Locator, type Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * A widget section on a profile page (`SectionItem`, data-testid="section-<id>").
 *
 * Methods return Locators so tests use web-first assertions, which wait and
 * fail loudly, instead of reading a boolean snapshot.
 */
export class ProfileSection {
  readonly root: Locator;

  constructor(
    readonly page: Page,
    readonly id: string
  ) {
    this.root = page.getByTestId(`section-${id}`);
  }

  header(): Locator {
    return this.page.getByTestId(`section-${this.id}-header`);
  }

  table(): Locator {
    return this.root.getByTestId("ot-table");
  }

  rows(): Locator {
    return this.table().locator("tbody tr");
  }

  searchInput(): Locator {
    return this.root.getByTestId("table-search-input");
  }

  exportButton(): Locator {
    return this.root.getByTestId("data-downloader");
  }

  nextPageButton(): Locator {
    return this.root.getByTestId("pagination-next-button");
  }

  /** Fails if the section does not render or never finishes loading. */
  async waitForLoaded(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: WIDGET_LOAD_TIMEOUT });
    await expect(this.root.locator(".MuiSkeleton-root")).toHaveCount(0, {
      timeout: WIDGET_LOAD_TIMEOUT,
    });
  }

  /** Types into the table search and waits for the debounced filter to apply. */
  async search(term: string): Promise<void> {
    await this.searchInput().fill(term);
    await expect(this.searchInput()).toHaveValue(term);
  }
}

import { expect, type Locator, type Page, type Response } from "@playwright/test";

type Entity = "target" | "disease" | "drug" | "variant" | "study";

/** The key of each result group in the dialog (the alias of its search in SearchQuery). */
export const GROUP_OF: Record<Entity, GroupKey> = {
  target: "targets",
  disease: "diseases",
  drug: "drugs",
  variant: "variants",
  study: "studies",
};

export type GroupKey = "topHit" | "targets" | "diseases" | "drugs" | "variants" | "studies";

/** The order the dialog renders the result groups in. */
export const GROUP_ORDER: readonly GroupKey[] = [
  "topHit",
  "targets",
  "diseases",
  "variants",
  "studies",
  "drugs",
];

/** The dialog asks for 15 results, shared between the entity types being searched. */
export const TOTAL_DIALOG_RESULTS = 15;

export const SEARCH_PLACEHOLDER = "Search for a target, drug, disease, or phenotype...";
export const HISTORY_STORAGE_KEY = "search-history";
/** The dialog keeps at most this many recent searches. */
export const MAX_RECENT_ITEMS = 8;

/** What the app stores about an item, in its `data-item-details` attribute. */
export type ItemDetails = { entity: string; id?: string; name?: string; symbol?: string; type?: string };

function isSearchQueryFor(response: Response, term: string): boolean {
  const request = response.request();
  if (request.method() !== "POST") return false;
  const body = request.postData();
  if (!body?.includes('"SearchQuery"')) return false;
  const parsed = JSON.parse(body) as { operationName?: string; variables?: { queryString?: string } };
  return parsed.operationName === "SearchQuery" && parsed.variables?.queryString === term;
}

/**
 * The global search: the box in the page header (and on the home page) and the dialog
 * it opens, with entity filters, recent searches, suggestions and live results.
 */
export class GlobalSearch {
  constructor(readonly page: Page) {}

  /** The search box that opens the dialog. */
  get trigger(): Locator {
    return this.page.getByTestId("global-search-button");
  }

  /** The keyboard shortcut the search box advertises. */
  get shortcutHint(): Locator {
    return this.page.getByTestId("global-search-shortcut");
  }

  get dialog(): Locator {
    return this.page.getByTestId("global-search-dialog");
  }

  get input(): Locator {
    return this.dialog.getByTestId("global-search-input");
  }

  get closeButton(): Locator {
    return this.dialog.getByTestId("global-search-close");
  }

  get loading(): Locator {
    return this.dialog.getByTestId("global-search-loading");
  }

  /** The "Search for: <term>" row that opens the results page. */
  get freeSearchItem(): Locator {
    return this.dialog.getByTestId("global-search-free-item");
  }

  get noResults(): Locator {
    return this.dialog.getByTestId("global-search-no-results");
  }

  get variantMessage(): Locator {
    return this.dialog.getByTestId("global-search-variant-message");
  }

  /** The chip of an entity filter: click this. */
  filterChip(entity: Entity | "all"): Locator {
    return this.dialog.getByTestId(`entity-filter-${entity}`);
  }

  /** The checkbox behind a filter chip: assert its checked state on this. */
  filter(entity: Entity | "all"): Locator {
    return this.filterChip(entity).locator("input[type='checkbox']");
  }

  /** A group of results: its header and its items. */
  group(key: GroupKey | "recent" | "suggestions"): Locator {
    return this.dialog.getByTestId(`global-search-group-${key}`);
  }

  /** Every result group on screen, in order. */
  get resultGroups(): Locator {
    return this.dialog.locator(
      GROUP_ORDER.map((key) => `[data-testid='global-search-group-${key}']`).join(", ")
    );
  }

  groupHeader(key: GroupKey | "recent"): Locator {
    return this.dialog.getByTestId(`top-hit-list-item-${key}`);
  }

  /** The detailed row of the best match. */
  get topHit(): Locator {
    return this.group("topHit").getByTestId("top-hit-list-result-item");
  }

  /** The rows of an entity's result group. */
  items(entity: Entity): Locator {
    return this.group(GROUP_OF[entity]).getByTestId("global-search-item");
  }

  get recentItems(): Locator {
    return this.group("recent").getByTestId("global-search-recent-item");
  }

  removeRecentButton(item: Locator): Locator {
    return item.getByTestId("global-search-recent-remove");
  }

  get clearRecentButton(): Locator {
    return this.dialog.getByTestId("global-search-clear-recent");
  }

  get suggestions(): Locator {
    return this.group("suggestions").getByTestId("global-search-suggestion-item");
  }

  /** Every row the arrow keys move through, in order. */
  get rows(): Locator {
    return this.dialog.getByRole("menuitem");
  }

  /** The row Enter would open. The app marks it with this class. */
  get activeRow(): Locator {
    return this.dialog.locator(".search-list-item-active");
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog, "the search dialog should open").toBeVisible();
    await expect(this.input, "the search input should take focus").toBeFocused();
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog, "the search dialog should close").toHaveCount(0);
  }

  /** Open the dialog from the search box. */
  async open(): Promise<void> {
    await this.trigger.click();
    await this.expectOpen();
  }

  /**
   * Type a term and wait until the dialog shows what the API returned for it: the
   * response for this exact term has arrived and the loading placeholder is gone.
   */
  async search(term: string): Promise<void> {
    const answered = this.page.waitForResponse((response) => isSearchQueryFor(response, term));
    await this.input.fill(term);
    await expect(this.freeSearchItem).toContainText(`Search for: ${term}`);
    await answered;
    await expect(this.loading, "the dialog should finish loading").toHaveCount(0);
  }

  /** Open the dialog and search for a term. */
  async openAndSearch(term: string): Promise<void> {
    await this.open();
    await this.search(term);
  }

  /**
   * Tick or untick an entity filter chip. With a term typed, the dialog searches again
   * with a different page size, so wait for that answer too.
   */
  async setFilter(entity: Entity, checked: boolean, term?: string): Promise<void> {
    const answered = term
      ? this.page.waitForResponse((response) => isSearchQueryFor(response, term))
      : null;
    await this.filterChip(entity).click();
    await expect(this.filter(entity)).toBeChecked({ checked });
    if (answered) {
      await answered;
      await expect(this.loading, "the dialog should finish loading").toHaveCount(0);
    }
  }

  /** What the app stored about a row (its entity and id), from `data-item-details`. */
  async details(row: Locator): Promise<ItemDetails> {
    await expect(row, "the row should carry its item details").toHaveAttribute(
      "data-item-details",
      /"entity":/
    );
    return JSON.parse((await row.getAttribute("data-item-details")) as string) as ItemDetails;
  }

  /** The recent searches as stored in the browser, newest first. */
  async storedHistory(): Promise<ItemDetails[]> {
    return this.page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "[]") as ItemDetails[],
      HISTORY_STORAGE_KEY
    );
  }

  /** Put recent searches in the browser's storage. Call before opening the dialog. */
  async seedHistory(items: ItemDetails[]): Promise<void> {
    await this.page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [HISTORY_STORAGE_KEY, JSON.stringify(items)] as const
    );
  }
}

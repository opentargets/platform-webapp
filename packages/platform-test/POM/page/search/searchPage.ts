import { expect, type Locator, type Page } from "@playwright/test";
import { entityRoute, type SearchEntity } from "./searchData";

/** The label each entity filter carries on the results page, before its count. */
export const FILTER_LABEL: Record<SearchEntity, string> = {
  target: "Target",
  variant: "Variant",
  study: "Study",
  disease: "Disease or phenotype",
  drug: "Drug",
};

export const RESULTS_PER_PAGE = 10;

type SearchParams = { q: string; page?: number; entities?: readonly SearchEntity[] };

/** The search path the app itself navigates to for these parameters. */
export function searchPath({ q, page = 1, entities = [] }: SearchParams): string {
  const query = `q=${encodeURIComponent(q)}&page=${page}`;
  return entities.length > 0
    ? `/search?${query}&entities=${entities.join(",")}`
    : `/search?${query}`;
}

/** The search results page: /search?q=&page=&entities= */
export class SearchPage {
  constructor(readonly page: Page) {}

  /** Open a results page and wait until it shows the results for that query. */
  async goto(params: SearchParams): Promise<void> {
    await this.page.goto(searchPath(params));
    await this.expectResultsFor(params.q);
  }

  /** "N results for "q"" */
  get heading(): Locator {
    return this.page.getByTestId("search-results-heading");
  }

  get filters(): Locator {
    return this.page.getByTestId("search-filters");
  }

  filter(entity: SearchEntity): Locator {
    return this.filters.getByRole("checkbox", {
      name: new RegExp(`^${FILTER_LABEL[entity]} \\(\\d+\\)$`),
    });
  }

  /** The list of result cards with its two pagination bars. Absent when nothing matched. */
  get results(): Locator {
    return this.page.getByTestId("search-results");
  }

  /** Every result card, of any entity type, in page order. */
  get cards(): Locator {
    return this.results.locator("[data-testid^='search-result-']");
  }

  cardsOf(entity: SearchEntity): Locator {
    return this.results.getByTestId(`search-result-${entity}`);
  }

  /** The link that titles each result card, in page order. */
  get cardLinks(): Locator {
    return this.cards.locator("> a");
  }

  pagination(position: "top" | "bottom"): Locator {
    return this.page.getByTestId(`search-pagination-${position}`);
  }

  nextButton(position: "top" | "bottom" = "top"): Locator {
    return this.pagination(position).getByRole("button", { name: "Go to next page" });
  }

  previousButton(position: "top" | "bottom" = "top"): Locator {
    return this.pagination(position).getByRole("button", { name: "Go to previous page" });
  }

  /** The card beside the results that details the best match. */
  get topHit(): Locator {
    return this.page.getByTestId("search-top-hit");
  }

  topHitDetail(entity: Exclude<SearchEntity, "study">): Locator {
    return this.topHit.getByTestId(`search-top-hit-${entity}`);
  }

  get noResults(): Locator {
    return this.page.getByTestId("search-no-results");
  }

  /** The "Matches:" line of a result card. */
  highlights(card: Locator): Locator {
    return card.locator(".highlights");
  }

  async expectResultsFor(q: string): Promise<void> {
    await expect(
      this.heading,
      `the results page should show the results for "${q}"`
    ).toHaveText(new RegExp(`^\\d+ results for "${escapeRegExp(q)}"$`));
  }

  /** The total in the heading, once the heading shows results for `q`. */
  async total(q: string): Promise<number> {
    await this.expectResultsFor(q);
    return Number.parseInt(await this.heading.innerText(), 10);
  }

  /** The count an entity filter shows in its label. */
  async filterCount(entity: SearchEntity): Promise<number> {
    const label = this.filters
      .locator("label")
      .filter({ hasText: new RegExp(`^${FILTER_LABEL[entity]} \\(\\d+\\)$`) });
    await expect(label, `the ${entity} filter should be listed with a count`).toHaveCount(1);
    const text = (await label.innerText()).trim();
    return Number(text.slice(text.lastIndexOf("(") + 1, -1));
  }

  /** Both pagination bars show this range, e.g. "11–20 of 346". */
  async expectRange(from: number, to: number, total: number): Promise<void> {
    for (const position of ["top", "bottom"] as const) {
      await expect(
        this.pagination(position),
        `the ${position} pagination should show ${from}–${to} of ${total}`
      ).toContainText(`${from}–${to} of ${total}`);
    }
  }

  /** The hrefs of the result cards, in page order: what identifies a page of results. */
  async cardHrefs(): Promise<string[]> {
    await expect(this.cards.first(), "the page should list result cards").toBeVisible();
    return this.cardLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? "")
    );
  }

  /** Tick or untick an entity filter and wait for the URL the app navigates to. */
  async setFilter(entity: SearchEntity, checked: boolean, expectedPath: string): Promise<void> {
    await this.filter(entity).setChecked(checked);
    await expectPath(this.page, expectedPath);
    await expect(this.filter(entity)).toBeChecked({ checked });
  }
}

/** The page is at this path and query string (compared decoded, so %20 and a space match). */
export async function expectPath(page: Page, expected: string): Promise<void> {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return decodeURIComponent(url.pathname + url.search);
      },
      { message: `the app should navigate to ${expected}` }
    )
    .toBe(decodeURIComponent(expected));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The app is on the page of this entity and the page rendered its header.
 * `headerText` is what identifies the entity there: a symbol, a name or an id.
 */
export async function expectEntityPage(
  page: Page,
  entity: SearchEntity,
  id: string,
  headerText: string | RegExp
): Promise<void> {
  await expectPath(page, entityRoute(entity, id));
  await expect(
    page.getByTestId("profile-page-header-text"),
    `the ${entity} page of ${id} should render its header`
  ).toHaveText(headerText);
}

import { expect, type Locator, type Page } from "@playwright/test";
import { ENTITY_ROUTE_PATTERN, type SearchEntity } from "../search/searchData";
import { CHIP_ENTITIES, entityOfHref, idOfHref, suggestionFor } from "./siteData";

/** The home page, /. */
export class HomePage {
  constructor(readonly page: Page) {}

  /** Open the home page and wait until its search box and suggestions are there. */
  async goto(): Promise<void> {
    await this.page.goto("/");
    await expect(this.searchButton, "the home page should show its search box").toBeVisible();
    await expect(this.chips, "the home page should show its suggestion chips").toHaveCount(
      CHIP_ENTITIES.length * 2
    );
  }

  /** The big search box. Clicking it opens the search dialog. */
  get searchButton(): Locator {
    return this.page.getByTestId("global-search-button");
  }

  get searchDialog(): Locator {
    return this.page.getByTestId("global-search-dialog");
  }

  get searchInput(): Locator {
    return this.page.getByTestId("global-search-input");
  }

  /** The suggestions listed in the search dialog before anything is typed. */
  get dialogSuggestions(): Locator {
    return this.page.getByTestId("global-search-group-suggestions").getByTestId("global-search-suggestion-item");
  }

  async openSearch(): Promise<void> {
    await this.searchButton.click();
    await expect(this.searchDialog).toBeVisible();
    await expect(this.searchInput).toBeFocused();
  }

  /** The "Last update: Month 20YY (YY.M)" line under the suggestions. */
  get dataVersion(): Locator {
    return this.page.getByTestId("home-data-version");
  }

  /** The suggestion chips: one link per suggestion. */
  get chips(): Locator {
    return this.page.getByTestId("home-suggestions").getByRole("link");
  }

  /** The chips of one entity type. */
  chipsOf(entity: SearchEntity): Locator {
    return this.page.getByTestId("home-suggestions").locator(`a[href^="/${entity}/"]`);
  }

  /** Every chip's label and route, read together, once the chips are on the page. */
  async chipFacts(): Promise<{ label: string; href: string; entity: SearchEntity; id: string }[]> {
    await expect(this.chips).toHaveCount(CHIP_ENTITIES.length * 2);
    const raw = await this.chips.evaluateAll((links) =>
      links.map((link) => ({ label: link.textContent ?? "", href: link.getAttribute("href") ?? "" }))
    );
    return raw.map(({ label, href }) => ({ label, href, entity: entityOfHref(href), id: idOfHref(href) }));
  }

  /** Assert a chip link is one of the app's suggestions of its type, with the right route. */
  expectChipIsSuggestion(chip: { label: string; href: string; entity: SearchEntity; id: string }): void {
    expect(chip.href, `route of chip "${chip.label}"`).toMatch(ENTITY_ROUTE_PATTERN[chip.entity]);
    expect(chip.label, `label of the ${chip.entity} suggestion ${chip.id}`).toBe(
      suggestionFor(chip.entity, chip.id)?.name
    );
  }

  // Below the fold

  get aboutHeading(): Locator {
    return this.page.getByRole("heading", { name: "About the Open Targets Platform" });
  }

  get getStartedHeading(): Locator {
    return this.page.getByRole("heading", { name: "Get started with the Platform" });
  }

  /** One of the "Get started" panels, by the text under its icon. */
  helpPanel(label: string): Locator {
    return this.page.getByRole("link", { name: label, exact: true });
  }

  get scrollDownButton(): Locator {
    // The wrapper is zero pixels high; the icons inside it are what the user clicks.
    return this.page.getByTestId("home-scroll-down").locator("svg").last();
  }
}

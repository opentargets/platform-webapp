import { expect, test } from "../../../fixtures";
import {
  GlobalSearch,
  type ItemDetails,
  MAX_RECENT_ITEMS,
  SEARCH_PLACEHOLDER,
} from "../../../POM/objects/components/GlobalSearch/globalSearch";
import {
  ENTITY_ID_PATTERN,
  entityRoute,
  SEARCH,
  SEARCH_ENTITIES,
  type SearchEntity,
} from "../../../POM/page/search/searchData";
import {
  expectEntityPage,
  expectPath,
  SearchPage,
  searchPath,
} from "../../../POM/page/search/searchPage";

/**
 * The global search dialog before anything is typed: how it opens and closes, the entity
 * filter chips, the suggestions and the recent searches kept in the browser.
 * What it shows for a typed term is in globalSearchResults.spec.ts.
 */

/** Recent searches as the app stores them, newest first. */
const HISTORY: ItemDetails[] = [
  {
    type: "recent",
    entity: "target",
    id: SEARCH.target.id,
    symbol: SEARCH.target.symbol,
    name: SEARCH.target.name,
  },
  { type: "recent", entity: "disease", id: SEARCH.disease.id, name: SEARCH.disease.name },
  { type: "recent", entity: "drug", id: SEARCH.drug.id, name: SEARCH.drug.name },
  { type: "recent", entity: "variant", id: SEARCH.variant.id },
  { type: "recent", entity: "study", id: SEARCH.study.id, name: SEARCH.study.trait },
  {
    symbol: `Search for: ${SEARCH.disease.term}`,
    name: SEARCH.disease.term,
    entity: "search",
    type: "recent",
  },
];
const DRUG_INDEX = 2;
const STUDY_INDEX = 4;
const FREE_TEXT_INDEX = 5;
const HISTORY_LABELS = [
  SEARCH.target.symbol,
  SEARCH.disease.name,
  SEARCH.drug.name,
  SEARCH.variant.id,
  SEARCH.study.trait,
  `Search for: ${SEARCH.disease.term}`,
];

/** The suggestions are two random picks per entity type, in this order. */
const SUGGESTION_ENTITIES: SearchEntity[] = [
  "target",
  "target",
  "disease",
  "disease",
  "drug",
  "drug",
  "variant",
  "variant",
  "study",
  "study",
];

test.describe("Global search dialog", () => {
  test("opens from the home page search box with the input, the entity filters and suggestions", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await expect(search.trigger).toContainText("Search...");
    await expect(search.dialog).toHaveCount(0);

    await search.open();

    await test.step("the input is empty and says what can be searched", async () => {
      await expect(search.input).toHaveValue("");
      await expect(search.input).toHaveAttribute("placeholder", SEARCH_PLACEHOLDER);
      await expect(search.closeButton).toHaveText("esc");
    });

    await test.step("the entity filters are listed in order, with only All selected", async () => {
      await expect(search.filter("all")).toBeChecked();
      await expect(search.filterChip("all")).toHaveText("All");
      for (const entity of SEARCH_ENTITIES) {
        await expect(search.filterChip(entity)).toHaveText(entity);
        await expect(search.filter(entity)).not.toBeChecked();
      }
      const order = await search.dialog
        .locator("[data-testid^='entity-filter-']")
        .evaluateAll((chips) => chips.map((chip) => chip.getAttribute("data-testid")));
      expect(order).toEqual([
        "entity-filter-all",
        ...SEARCH_ENTITIES.map((e) => `entity-filter-${e}`),
      ]);
    });

    await test.step("nothing typed: no results, no free search row, no recent searches", async () => {
      await expect(search.freeSearchItem).toHaveCount(0);
      await expect(search.resultGroups).toHaveCount(0);
      await expect(search.noResults).toHaveCount(0);
      await expect(search.group("recent")).toHaveCount(0);
    });

    await test.step("two suggestions per entity type, each a valid entity id", async () => {
      await expect(search.group("suggestions")).toContainText("Search Suggestions");
      await expect(search.suggestions).toHaveCount(SUGGESTION_ENTITIES.length);
      for (const [index, entity] of SUGGESTION_ENTITIES.entries()) {
        const suggestion = search.suggestions.nth(index);
        const details = await search.details(suggestion);
        expect(details.type, `suggestion ${index + 1}`).toBe("suggestion");
        expect(details.entity, `suggestion ${index + 1}`).toBe(entity);
        expect(details.id, `suggestion ${index + 1} (${entity})`).toMatch(
          ENTITY_ID_PATTERN[entity]
        );
        // A variant is suggested by its id, everything else by its name.
        const label = entity === "variant" ? details.id : details.name;
        await expect(suggestion).toHaveText(label as string);
      }
    });
  });

  test("opens from the header of another page and closes with the esc button, Escape and a click outside", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    const results = new SearchPage(page);
    await results.goto({ q: SEARCH.study.term });

    await search.open();
    await search.closeButton.click();
    await search.expectClosed();

    await search.open();
    await page.keyboard.press("Escape");
    await search.expectClosed();

    await search.open();
    // The corner of the viewport is outside the dialog, on its backdrop.
    await page.mouse.click(5, 5);
    await search.expectClosed();

    await expectPath(page, searchPath({ q: SEARCH.study.term }));
    await results.expectResultsFor(SEARCH.study.term);
  });

  test("on a Mac the search box advertises ⌘ K and that shortcut opens the dialog", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "platform", { get: () => "MacIntel" });
    });
    const search = new GlobalSearch(page);
    await page.goto("/");
    await expect(search.shortcutHint).toHaveText("⌘ K");

    await page.keyboard.press("Meta+k");
    await search.expectOpen();
  });

  test("on other platforms the search box advertises Ctrl+K and that shortcut opens the dialog", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "platform", { get: () => "Win32" });
    });
    const search = new GlobalSearch(page);
    await page.goto("/");
    await expect(search.shortcutHint).toHaveText("Ctrl+K");

    await page.keyboard.press("Control+k");
    await search.expectOpen();
  });

  test("the entity filter chips toggle, All clears them, and closing the dialog resets them", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await search.open();

    await search.setFilter("disease", true);
    await expect(search.filter("all")).not.toBeChecked();
    await search.setFilter("drug", true);
    await expect(search.filter("disease")).toBeChecked();

    await search.setFilter("disease", false);
    await expect(search.filter("drug")).toBeChecked();
    await expect(search.filter("all")).not.toBeChecked();

    await search.filterChip("all").click();
    await expect(search.filter("all")).toBeChecked();
    for (const entity of SEARCH_ENTITIES) await expect(search.filter(entity)).not.toBeChecked();

    await search.setFilter("target", true);
    await page.keyboard.press("Escape");
    await search.expectClosed();
    await search.open();
    await expect(search.filter("all")).toBeChecked();
    await expect(search.filter("target")).not.toBeChecked();
  });

  test("clicking a suggestion opens that entity's page and records it as a recent search", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await search.open();

    const suggestion = search.suggestions.first();
    const details = await search.details(suggestion);
    expect(details.entity).toBe("target");
    await suggestion.click();

    await search.expectClosed();
    await expectPath(page, entityRoute("target", details.id as string));
    expect(await search.storedHistory()).toEqual([{ ...details, type: "recent" }]);
  });

  test.describe("recent searches", () => {
    test("are listed newest first above the suggestions, each by its symbol, name or id", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(HISTORY);
      await search.open();

      await expect(search.groupHeader("recent")).toHaveText("recent");
      await expect(search.clearRecentButton).toHaveText("clear all");
      await expect(search.recentItems).toHaveText(HISTORY_LABELS);
      await expect(search.suggestions).toHaveCount(SUGGESTION_ENTITIES.length);
      // The first row is the one Enter would open.
      await expect(search.activeRow).toHaveText(HISTORY_LABELS[0]);
      await expect(search.rows).toHaveCount(HISTORY.length + SUGGESTION_ENTITIES.length);
    });

    test("a recent entity opens its page and moves to the top of the list", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(HISTORY);
      await search.open();

      await search.recentItems.nth(STUDY_INDEX).click();
      await search.expectClosed();
      await expectEntityPage(page, "study", SEARCH.study.id, SEARCH.study.id);

      const stored = await search.storedHistory();
      expect(stored).toHaveLength(HISTORY.length);
      expect(stored[0]).toEqual(HISTORY[STUDY_INDEX]);

      await search.open();
      await expect(search.recentItems).toHaveText([
        HISTORY_LABELS[STUDY_INDEX],
        ...HISTORY_LABELS.filter((_, index) => index !== STUDY_INDEX),
      ]);
    });

    test("a recent free-text search opens the results page for that term", async ({ page }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.seedHistory(HISTORY);
      await search.open();

      await search.recentItems.nth(FREE_TEXT_INDEX).click();
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.disease.term }));
      await results.expectResultsFor(SEARCH.disease.term);
      await expect(results.cards.first()).toBeVisible();
    });

    test("Enter opens the first recent search", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(HISTORY.slice(1));
      await search.open();
      await expect(search.activeRow).toHaveText(SEARCH.disease.name);

      await page.keyboard.press("Enter");
      await search.expectClosed();
      await expectEntityPage(page, "disease", SEARCH.disease.id, SEARCH.disease.name);
    });

    test("one can be removed, and clear all removes the rest", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(HISTORY);
      await search.open();
      await expect(search.recentItems).toHaveCount(HISTORY.length);

      await test.step("remove one: the dialog stays open on the same page", async () => {
        await search.removeRecentButton(search.recentItems.nth(DRUG_INDEX)).click();
        const remaining = HISTORY_LABELS.filter((_, index) => index !== DRUG_INDEX);
        await expect(search.recentItems).toHaveText(remaining);
        await expect(search.dialog).toBeVisible();
        await expectPath(page, "/");
        expect((await search.storedHistory()).map((item) => item.id ?? item.symbol)).toEqual([
          SEARCH.target.id,
          SEARCH.disease.id,
          SEARCH.variant.id,
          SEARCH.study.id,
          `Search for: ${SEARCH.disease.term}`,
        ]);
      });

      await test.step("clear all: the recent group disappears, the suggestions stay", async () => {
        await search.clearRecentButton.click();
        await expect(search.group("recent")).toHaveCount(0);
        await expect(search.suggestions).toHaveCount(SUGGESTION_ENTITIES.length);
        expect(await search.storedHistory()).toEqual([]);
      });

      await test.step("still empty after closing and reopening", async () => {
        await page.keyboard.press("Escape");
        await search.expectClosed();
        await search.open();
        await expect(search.group("recent")).toHaveCount(0);
      });
    });

    test("survive a reload", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(HISTORY);
      await page.reload();
      await search.open();
      await expect(search.recentItems).toHaveText(HISTORY_LABELS);
    });

    test(`keep the ${MAX_RECENT_ITEMS} newest: a new search pushes the oldest out`, async ({
      page,
    }) => {
      const full: ItemDetails[] = Array.from({ length: MAX_RECENT_ITEMS }, (_, index) => ({
        symbol: `Search for: term ${index + 1}`,
        name: `term ${index + 1}`,
        entity: "search",
        type: "recent",
      }));
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.seedHistory(full);
      await search.open();
      await expect(search.recentItems).toHaveCount(MAX_RECENT_ITEMS);

      const added = search.suggestions.first();
      const details = await search.details(added);
      await added.click();
      await search.expectClosed();
      await expectPath(page, entityRoute("target", details.id as string));

      const stored = await search.storedHistory();
      expect(stored).toHaveLength(MAX_RECENT_ITEMS);
      expect(stored[0]).toEqual({ ...details, type: "recent" });
      expect(stored.slice(1)).toEqual(full.slice(0, MAX_RECENT_ITEMS - 1));
    });
  });
});

import type { Locator } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import {
  GlobalSearch,
  GROUP_OF,
  TOTAL_DIALOG_RESULTS,
} from "../../../POM/objects/components/GlobalSearch/globalSearch";
import {
  ENTITY_ID_PATTERN,
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
 * What the global search dialog shows for a typed term: the top hit, the results grouped
 * by entity type, where each row leads, the keyboard, the entity filters and the inputs
 * that match nothing.
 */

const STUDY_META = /Study type: \S+ • Credible sets count: [\d,]+ • Sample size: [\d,]+/;
/** With every entity type searched, each group gets a fifth of the dialog's results. */
const PER_GROUP = TOTAL_DIALOG_RESULTS / SEARCH_ENTITIES.length;

/**
 * A result group has between one row and `max` rows, and each row shows the id the app
 * would navigate to, in the format of that entity type.
 */
async function expectGroupRows(
  search: GlobalSearch,
  entity: SearchEntity,
  max: number
): Promise<number> {
  const rows = search.items(entity);
  await expect(rows.first(), `the ${entity} group should list results`).toBeVisible();
  const count = await rows.count();
  expect(count, `the ${entity} group should list at most ${max} results`).toBeLessThanOrEqual(max);
  for (let index = 0; index < count; index++) {
    const row = rows.nth(index);
    const details = await search.details(row);
    expect(details.entity, `${entity} row ${index + 1}`).toBe(entity);
    expect(details.id, `${entity} row ${index + 1}`).toMatch(ENTITY_ID_PATTERN[entity]);
    // A variant row shows its id with the alleles styled, so compare without markup.
    await expect(row, `${entity} row ${index + 1} should show its id`).toContainText(
      details.id as string
    );
    const label = details.symbol ?? details.name;
    if (entity !== "variant") {
      expect(label, `${entity} row ${index + 1} should have a symbol or name`).toBeTruthy();
      await expect(row).toContainText(label as string);
    }
    if (entity === "study") await expect(row).toContainText(STUDY_META);
  }
  return count;
}

async function expectActive(search: GlobalSearch, row: Locator): Promise<void> {
  await expect(search.activeRow, "exactly one row should be active").toHaveCount(1);
  await expect(row, "this row should be the active one").toHaveClass(/search-list-item-active/);
}

test.describe("Global search results", () => {
  test("a disease term shows the free search row, the top hit and results grouped by entity type @smoke", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await search.openAndSearch(SEARCH.disease.term);

    await test.step("the free search row comes first and is the active row", async () => {
      await expect(search.rows.first()).toContainText(`Search for: ${SEARCH.disease.term}`);
      await expectActive(search, search.freeSearchItem);
    });

    await test.step("the top hit is the disease, with its id and the start of its description", async () => {
      await expect(search.groupHeader("topHit")).toHaveText("topHit");
      await expect(search.topHit).toHaveCount(1);
      await expect(search.topHit).toContainText(SEARCH.disease.name);
      await expect(search.topHit).toContainText(SEARCH.disease.id);
      await expect(search.topHit).toContainText(SEARCH.disease.descriptionStart);
      const details = await search.details(search.topHit);
      expect(details).toMatchObject({ type: "topHit", entity: "disease", id: SEARCH.disease.id });
    });

    await test.step("groups are headed and ordered: targets, diseases, studies, drugs", async () => {
      await expect(search.groupHeader("targets")).toHaveText("targets");
      await expect(search.groupHeader("diseases")).toHaveText("diseases");
      await expect(search.groupHeader("studies")).toHaveText("GWAS studiesnew");
      await expect(search.groupHeader("drugs")).toHaveText("drugs");
      const order = await search.resultGroups.evaluateAll((groups) =>
        groups.map((group) => group.getAttribute("data-testid"))
      );
      expect(order.filter((key) => key !== "global-search-group-variants")).toEqual(
        ["topHit", "targets", "diseases", "studies", "drugs"].map(
          (key) => `global-search-group-${key}`
        )
      );
    });

    await test.step("each group lists up to three results with ids of the right format", async () => {
      for (const entity of ["target", "disease", "study", "drug"] as const) {
        await expectGroupRows(search, entity, PER_GROUP);
      }
      await expect(search.items("disease").first()).toContainText(SEARCH.disease.name);
      await expect(search.items("disease").first()).toContainText(SEARCH.disease.id);
    });

    await expect(search.noResults).toHaveCount(0);
    await expect(search.variantMessage).toHaveCount(0);
  });

  test("shows a loading placeholder while the search is in flight, then the results", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/*", async (route) => {
      const body = route.request().method() === "POST" ? route.request().postData() : null;
      if (body?.includes('"SearchQuery"')) await held;
      await route.fallback();
    });
    await page.goto("/");
    await search.open();

    await search.input.fill(SEARCH.study.term);
    await expect(search.loading).toBeVisible();
    await expect(search.freeSearchItem).toContainText(`Search for: ${SEARCH.study.term}`);
    await expect(search.resultGroups).toHaveCount(0);
    await expect(search.noResults).toHaveCount(0);
    await expect(search.group("suggestions")).toHaveCount(0);

    release();
    await expect(search.topHit).toContainText(SEARCH.study.id);
    await expect(search.loading).toHaveCount(0);
  });

  test.describe("top hit", () => {
    test("for a target: symbol, id and approved name, and it opens the target's associations", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.target.term);

      await expect(search.topHit).toContainText(SEARCH.target.symbol);
      await expect(search.topHit).toContainText(SEARCH.target.id);
      await expect(search.topHit).toContainText(SEARCH.target.name);
      expect(await search.details(search.topHit)).toMatchObject({
        type: "topHit",
        entity: "target",
        id: SEARCH.target.id,
      });

      await search.topHit.click();
      await search.expectClosed();
      await expectEntityPage(page, "target", SEARCH.target.id, SEARCH.target.symbol);
    });

    test("for a disease: name, id and description, and it opens the disease's associations", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);

      await expect(search.topHit).toContainText(SEARCH.disease.id);
      // The description is cut at 180 characters.
      await expect(search.topHit).toContainText(
        new RegExp(`${SEARCH.disease.descriptionStart}.*\\.\\.\\.$`)
      );

      await search.topHit.click();
      await search.expectClosed();
      await expectEntityPage(page, "disease", SEARCH.disease.id, SEARCH.disease.name);
    });

    test("for a drug: name, id and description, and it opens the drug page", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.drug.term);

      await expect(search.topHit).toContainText(SEARCH.drug.name);
      await expect(search.topHit).toContainText(SEARCH.drug.id);
      await expect(search.topHit).toContainText(SEARCH.drug.descriptionStart);
      expect(await search.details(search.topHit)).toMatchObject({
        type: "topHit",
        entity: "drug",
        id: SEARCH.drug.id,
      });

      await search.topHit.click();
      await search.expectClosed();
      await expectEntityPage(page, "drug", SEARCH.drug.id, SEARCH.drug.name);
    });

    test("for an rsID: the variant id, its rsID and description, and it opens the variant page", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.variant.term);

      await expect(search.topHit).toContainText(SEARCH.variant.id);
      await expect(search.topHit).toContainText(SEARCH.variant.rsId);
      await expect(search.topHit).toContainText(SEARCH.variant.descriptionStart);
      // The rsID matched a variant, so the "no exact variant match" note must not show.
      await expect(search.variantMessage).toHaveCount(0);
      await expect(search.groupHeader("variants")).toHaveText("variantsnew");
      await expectGroupRows(search, "variant", PER_GROUP);

      await search.topHit.click();
      await search.expectClosed();
      await expectEntityPage(page, "variant", SEARCH.variant.id, SEARCH.variant.id);
    });

    test("for a variant id: the same variant is the top hit", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.variant.id);

      await expect(search.topHit).toContainText(SEARCH.variant.id);
      await expect(search.topHit).toContainText(SEARCH.variant.rsId);
      expect(await search.details(search.topHit)).toMatchObject({
        type: "topHit",
        entity: "variant",
        id: SEARCH.variant.id,
      });
      await expect(search.variantMessage).toHaveCount(0);
    });

    test("for a study id: trait, id, publication, study facts and the summary statistics chip, and it opens the study page", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.study.term);

      await expect(search.topHit).toContainText(SEARCH.study.trait);
      await expect(search.topHit).toContainText(SEARCH.study.id);
      await expect(search.topHit).toContainText(SEARCH.study.publication);
      await expect(search.topHit).toContainText(STUDY_META);
      await expect(search.topHit).toContainText("Study type: GWAS");
      await expect(search.topHit).toContainText("summary statistics");

      await test.step("an id search finds only that study and its disease", async () => {
        await expect(search.items("study")).toHaveCount(1);
        await expect(search.items("study")).toContainText(SEARCH.study.id);
        await expect(search.items("disease")).toHaveCount(1);
        await expect(search.items("disease")).toContainText(SEARCH.study.diseaseId);
        for (const entity of ["target", "drug", "variant"] as const) {
          await expect(search.group(GROUP_OF[entity]), `no ${entity} group`).toHaveCount(0);
        }
      });

      await search.topHit.click();
      await search.expectClosed();
      await expectEntityPage(page, "study", SEARCH.study.id, SEARCH.study.id);
    });
  });

  test.describe("a result row opens its entity", () => {
    test("target row → target associations", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.target.term);

      const row = search.items("target").first();
      await expect(row).toContainText(SEARCH.target.symbol);
      await expect(row).toContainText(SEARCH.target.name);
      await expect(row).toContainText(SEARCH.target.id);
      await row.click();
      await search.expectClosed();
      await expectEntityPage(page, "target", SEARCH.target.id, SEARCH.target.symbol);
      expect((await search.storedHistory())[0]).toMatchObject({
        type: "recent",
        entity: "target",
        id: SEARCH.target.id,
      });
    });

    test("disease row → disease associations", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);

      const row = search.items("disease").first();
      await expect(row).toContainText(SEARCH.disease.id);
      await row.click();
      await search.expectClosed();
      await expectEntityPage(page, "disease", SEARCH.disease.id, SEARCH.disease.name);
    });

    test("drug row → drug page", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.drug.term);

      const row = search.items("drug").first();
      await expect(row).toContainText(SEARCH.drug.name);
      await expect(row).toContainText(SEARCH.drug.id);
      await row.click();
      await search.expectClosed();
      await expectEntityPage(page, "drug", SEARCH.drug.id, SEARCH.drug.name);
    });

    test("variant row → variant page", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.variant.term);

      const row = search.items("variant").first();
      await expect(row).toContainText(SEARCH.variant.id);
      await expect(row).toContainText(SEARCH.variant.rsId);
      await row.click();
      await search.expectClosed();
      await expectEntityPage(page, "variant", SEARCH.variant.id, SEARCH.variant.id);
    });

    test("study row → study page", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.study.term);

      const row = search.items("study").first();
      await expect(row).toContainText(SEARCH.study.trait);
      await expect(row).toContainText(SEARCH.study.id);
      await row.click();
      await search.expectClosed();
      await expectEntityPage(page, "study", SEARCH.study.id, SEARCH.study.id);
    });
  });

  test.describe("free search", () => {
    test("Enter opens the results page for the typed term and records the search", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);

      await page.keyboard.press("Enter");
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.disease.term }));
      await results.expectResultsFor(SEARCH.disease.term);
      await expect(results.cards.first()).toBeVisible();
      expect((await search.storedHistory())[0]).toEqual({
        symbol: `Search for: ${SEARCH.disease.term}`,
        name: SEARCH.disease.term,
        entity: "search",
        type: "recent",
      });
    });

    test("clicking the free search row opens the results page for the typed term", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.study.term);

      await search.freeSearchItem.click();
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.study.term }));
      await results.expectResultsFor(SEARCH.study.term);
      await expect(results.cardsOf("study")).toHaveCount(1);
    });

    test("from a results page, a new term replaces the results", async ({ page }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.study.term });
      await expect(results.cardsOf("study")).toHaveCount(1);

      await search.openAndSearch(SEARCH.disease.term);
      await page.keyboard.press("Enter");
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.disease.term }));
      await results.expectResultsFor(SEARCH.disease.term);
      await expect(results.topHitDetail("disease")).toContainText(SEARCH.disease.name);
    });

    test("a term with an ampersand reaches the results page whole", async ({ page }) => {
      const term = "foot & mouth";
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.openAndSearch(term);

      await page.keyboard.press("Enter");
      await search.expectClosed();
      await results.expectResultsFor(term);
    });

    test("the selected entity filters are carried to the results page", async ({ page }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);
      await search.setFilter("disease", true, SEARCH.disease.term);

      await search.freeSearchItem.click();
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.disease.term, entities: ["disease"] }));
      await results.expectResultsFor(SEARCH.disease.term);
      await expect(results.filter("disease")).toBeChecked();
    });
  });

  test("the arrow keys move through the rows, wrap at the ends, and Enter opens the active row", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await search.openAndSearch(SEARCH.study.term);
    // free search row, top hit, one disease, one study
    await expect(search.rows).toHaveCount(4);
    await expectActive(search, search.rows.nth(0));

    await page.keyboard.press("ArrowDown");
    await expectActive(search, search.topHit);
    await page.keyboard.press("ArrowDown");
    await expectActive(search, search.items("disease").first());
    await page.keyboard.press("ArrowDown");
    await expectActive(search, search.items("study").first());

    await test.step("down from the last row wraps to the first, up from the first to the last", async () => {
      await page.keyboard.press("ArrowDown");
      await expectActive(search, search.freeSearchItem);
      await page.keyboard.press("ArrowUp");
      await expectActive(search, search.items("study").first());
    });

    await page.keyboard.press("ArrowUp");
    await expectActive(search, search.items("disease").first());
    // Moving through the rows must not change what was typed.
    await expect(search.input).toHaveValue(SEARCH.study.term);

    await page.keyboard.press("Enter");
    await search.expectClosed();
    await expectEntityPage(page, "disease", SEARCH.study.diseaseId, SEARCH.disease.name);
  });

  test.describe("entity filters", () => {
    test("one filter leaves only that entity's group, with all fifteen results", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);
      await expectGroupRows(search, "target", PER_GROUP);

      await search.setFilter("disease", true, SEARCH.disease.term);
      await expect(search.filter("all")).not.toBeChecked();
      await expect(search.items("disease")).toHaveCount(TOTAL_DIALOG_RESULTS);
      await expectGroupRows(search, "disease", TOTAL_DIALOG_RESULTS);
      // The top hit is a disease, so it stays.
      await expect(search.topHit).toContainText(SEARCH.disease.id);
      for (const entity of ["target", "drug", "study", "variant"] as const) {
        await expect(search.group(GROUP_OF[entity]), `no ${entity} group`).toHaveCount(0);
      }
    });

    test("two filters share the results between their groups, and All brings every group back", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);

      await search.setFilter("disease", true, SEARCH.disease.term);
      await expect(search.items("disease")).toHaveCount(TOTAL_DIALOG_RESULTS);
      await search.setFilter("study", true, SEARCH.disease.term);
      const perGroup = Math.ceil(TOTAL_DIALOG_RESULTS / 2);
      await expect(search.items("disease")).toHaveCount(perGroup);
      await expect(search.items("study")).toHaveCount(perGroup);
      await expectGroupRows(search, "study", perGroup);
      await expect(search.group("targets")).toHaveCount(0);
      await expect(search.group("drugs")).toHaveCount(0);

      const answered = page.waitForResponse((response) =>
        (response.request().postData() ?? "").includes('"SearchQuery"')
      );
      await search.filterChip("all").click();
      await answered;
      await expect(search.filter("all")).toBeChecked();
      await expect(search.items("disease")).toHaveCount(PER_GROUP);
      await expect(search.items("study")).toHaveCount(PER_GROUP);
      await expectGroupRows(search, "target", PER_GROUP);
      await expectGroupRows(search, "drug", PER_GROUP);
    });

    test("a top hit of another entity type is hidden by the filter", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.disease.term);
      await expect(search.topHit).toContainText(SEARCH.disease.id);

      await search.setFilter("study", true, SEARCH.disease.term);
      await expect(search.items("study")).toHaveCount(TOTAL_DIALOG_RESULTS);
      await expect(search.group("topHit")).toHaveCount(0);
      await expect(search.group("diseases")).toHaveCount(0);
      // The free search row is always offered.
      await expect(search.freeSearchItem).toContainText(`Search for: ${SEARCH.disease.term}`);
    });

    test("a filter whose entity has no match leaves no result group", async ({ page }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.study.term);
      await expect(search.items("study")).toHaveCount(1);

      await search.setFilter("drug", true, SEARCH.study.term);
      await expect(search.resultGroups).toHaveCount(0);
      await expect(search.freeSearchItem).toContainText(`Search for: ${SEARCH.study.term}`);

      await search.setFilter("drug", false, SEARCH.study.term);
      await expect(search.items("study")).toHaveCount(1);
      await expect(search.topHit).toContainText(SEARCH.study.id);
    });
  });

  test.describe("input that matches nothing", () => {
    test("shows the no-result message with suggestions, and Enter still opens the results page", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      const results = new SearchPage(page);
      await page.goto("/");
      await search.openAndSearch(SEARCH.noMatch);

      await expect(search.noResults).toHaveText("No search result found");
      await expect(search.resultGroups).toHaveCount(0);
      await expect(search.variantMessage).toHaveCount(0);
      await expect(search.suggestions).toHaveCount(10);
      await expectActive(search, search.freeSearchItem);

      await page.keyboard.press("Enter");
      await search.expectClosed();
      await expectPath(page, searchPath({ q: SEARCH.noMatch }));
      await expect(results.noResults).toContainText(`"${SEARCH.noMatch}"`);
    });

    test("a well-formed variant id or rsID that is not in the Platform gets the variant note", async ({
      page,
    }) => {
      const search = new GlobalSearch(page);
      await page.goto("/");
      await search.open();

      for (const term of SEARCH.unknownVariants) {
        await test.step(term, async () => {
          await search.search(term);
          await expect(search.noResults).toHaveText("No search result found");
          await expect(search.variantMessage).toContainText(
            "No exact variant match found. Only variants with known phenotypic associations are included."
          );
        });
      }

      const docs = search.variantMessage.getByRole("link", { name: "Documentation" });
      await expect(docs).toHaveAttribute("href", "https://platform-docs.opentargets.org/variant");
      await expect(docs).toHaveAttribute("target", "_blank");

      await test.step("text that is not a variant id gets no note", async () => {
        await search.search(SEARCH.noMatch);
        await expect(search.noResults).toHaveText("No search result found");
        await expect(search.variantMessage).toHaveCount(0);
      });
    });
  });

  test("clearing the input returns to the suggestions, and reopening the dialog starts empty", async ({
    page,
  }) => {
    const search = new GlobalSearch(page);
    await page.goto("/");
    await search.openAndSearch(SEARCH.study.term);
    await expect(search.topHit).toContainText(SEARCH.study.id);

    await search.input.fill("");
    await expect(search.group("suggestions")).toBeVisible();
    await expect(search.resultGroups).toHaveCount(0);
    await expect(search.freeSearchItem).toHaveCount(0);

    await search.search(SEARCH.study.term);
    await expect(search.topHit).toContainText(SEARCH.study.id);
    await page.keyboard.press("Escape");
    await search.expectClosed();

    await search.open();
    await expect(search.input).toHaveValue("");
    await expect(search.resultGroups).toHaveCount(0);
    await expect(search.suggestions).toHaveCount(10);
  });
});

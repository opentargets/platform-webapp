import { expect, test } from "../../../fixtures";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import {
  BASKET_STORAGE_KEY,
  COACH_MARK_STORAGE_KEY,
  DOWNLOADS_CATEGORIES,
  DownloadsPage,
  SCRIPT_TOOLS,
} from "../../../POM/page/site/downloadsPage";

/**
 * The Downloads page, /downloads: the dataset cards with search and category filters, the
 * bag (basket) with its drawer and access scripts, the schema / access dialogs and the
 * network view of how the datasets reference each other.
 *
 * Elements are found through the page object (by test id); this file only asserts on them.
 *
 * The ids below identify datasets in the Open Targets data model and exist in every release:
 * `target` (a hub of the network, category Target), `disease`, `clinical_indication` (two
 * categories), `colocalisation` and the two Literature datasets (the only ones in that category).
 */
const TARGET = { id: "target", name: "Target", category: "Target" };
const DISEASE = { id: "disease", name: "Disease/Phenotype" };
const CLINICAL_INDICATION = {
  id: "clinical_indication",
  name: "Clinical indication",
  categories: ["Drug", "Disease"],
};
const COLOCALISATION = { id: "colocalisation", name: "Colocalisation with colocPIP and eCAVIAR" };
const LONG_DESCRIPTION = { id: "association_by_datasource_direct" };
const LITERATURE_IDS = ["literature_entity_lut", "literature_vector"];

test.describe("Downloads page", () => {
  // The first add to the bag opens a one-time coach mark that sits over the toolbar. It has its
  // own tests below; everywhere else it is marked as already seen.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (key) => window.localStorage.setItem(key, "1"),
      COACH_MARK_STORAGE_KEY
    );
  });

  test.describe("page and dataset cards", () => {
    test("renders the title, description, tags, toolbar and a card per dataset @smoke", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await expect(page).toHaveTitle(/^Data downloads \| Open Targets Platform/);
      await expect(downloads.title).toHaveText("Open Targets Platform Datasets");

      await test.step("the description and the header tags are there", async () => {
        await expect(downloads.description).toContainText("comprehensive data integration tool");
        await expect(downloads.tag("cite-us")).toContainText("Cite Us");
        await expect(downloads.tag("croissant")).toContainText("Croissant");
        await expect(downloads.tag("parquet")).toContainText("Parquet");
        await expect(downloads.tag("version")).toHaveText(/^\s*\d+\.\d+\s*$/);
      });

      await test.step("one card per dataset, and the counter agrees", async () => {
        const total = await downloads.totalDatasets();
        expect(total, "the Platform publishes dozens of datasets").toBeGreaterThan(40);
        await downloads.expectShown(total, total);
      });

      await test.step("every category has a chip, none selected, with a count", async () => {
        await expect(downloads.chips).toHaveCount(DOWNLOADS_CATEGORIES.length);
        for (const category of DOWNLOADS_CATEGORIES) {
          await expect(downloads.chip(category)).toHaveAttribute("aria-checked", "false");
          await expect(downloads.chip(category)).toContainText(category);
          await expect(downloads.chipCount(category)).toHaveText(/^[1-9]\d*$/);
        }
      });

      await test.step("the bag starts empty and the Cards view is the default", async () => {
        await downloads.expectBagCount(0);
        await expect(downloads.networkToggle).toHaveAttribute("aria-pressed", "false");
        await expect(downloads.cardsToggle).toHaveAttribute("aria-pressed", "true");
        await expect(downloads.clearAllButton).toHaveCount(0);
      });
    });

    test("a dataset card shows its name, id, description, category and actions", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await expect(downloads.cardName(TARGET.id)).toHaveText(TARGET.name);
      await expect(downloads.cardId(TARGET.id)).toHaveText(TARGET.id);
      await expect(downloads.cardDescription(TARGET.id)).toContainText(
        "Core annotation for drug targets"
      );
      await expect(downloads.cardCategories(TARGET.id)).toHaveText([TARGET.category]);

      await expect(downloads.cardSchemaLink(TARGET.id)).toHaveAttribute(
        "href",
        `/downloads/${TARGET.id}/schema`
      );
      await expect(downloads.cardAccessLink(TARGET.id)).toHaveAttribute(
        "href",
        `/downloads/${TARGET.id}/access`
      );
      // the controls are named for assistive technology
      await expect(downloads.cardToggle(TARGET.id)).toHaveAccessibleName(
        `Add ${TARGET.name} to bag`
      );
      await expect(downloads.cardToggle(TARGET.id)).toHaveAttribute("aria-pressed", "false");
      await expect(downloads.card(TARGET.id)).toHaveAccessibleName(TARGET.name);
    });

    test("a dataset in two categories shows both", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await expect(downloads.cardCategories(CLINICAL_INDICATION.id)).toHaveText(
        CLINICAL_INDICATION.categories
      );
    });

    test("every card is well formed and links to its own dialogs", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await downloads.expectShown(total, total);

      const cards = await downloads.cardFacts();
      expect(cards).toHaveLength(total);
      const ids = new Set<string>();
      for (const card of cards) {
        expect(card.name, `the name of ${card.id}`).not.toBe("");
        expect(card.id, `the id of "${card.name}"`).toMatch(/^[a-z0-9_]+$/);
        expect(card.testId, "the card is addressed by its dataset id").toBe(
          `dataset-card-${card.id}`
        );
        expect(card.schemaHref, `schema link of ${card.id}`).toBe(`/downloads/${card.id}/schema`);
        expect(card.accessHref, `access link of ${card.id}`).toBe(`/downloads/${card.id}/access`);
        expect(card.descriptionLength, `${card.id} should show a description`).toBeGreaterThan(15);
        expect(card.categories.length, `${card.id} should have a category`).toBeGreaterThan(0);
        ids.add(card.id);
      }
      expect(ids.size, "dataset ids are unique").toBe(total);
    });

    test("every category on a card has a filter chip", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const { onCards, onChips } = await downloads.categorySlugs();
      expect(onCards.length).toBeGreaterThan(3);
      for (const category of onCards)
        expect(onChips, `no chip for the category "${category}" shown on a card`).toContain(
          category
        );
      expect(onChips, "every chip has datasets").toEqual(expect.arrayContaining(onCards));
    });

    test("a long description expands with the more link", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const { id } = LONG_DESCRIPTION;
      const toggle = downloads.cardDescriptionToggle(id);
      await expect(toggle).toHaveText("more");
      const collapsed = (await downloads.cardDescription(id).boundingBox())?.height ?? 0;
      expect(collapsed).toBeGreaterThan(0);

      await toggle.click();
      await expect(toggle).toHaveText("hide");
      await expect
        .poll(async () => (await downloads.cardDescription(id).boundingBox())?.height ?? 0)
        .toBeGreaterThan(collapsed);
      await toggle.click();
      await expect(toggle).toHaveText("more");
    });
  });

  test.describe("search", () => {
    test("narrows the cards to the datasets matching the term and updates the counter", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(total);
      const shown = await downloads.shownCount();
      expect(shown).toBeGreaterThan(0);
      await downloads.expectShown(shown, total);
      await expect(downloads.cardName(COLOCALISATION.id)).toHaveText(COLOCALISATION.name);

      for (const id of await downloads.cardIds()) {
        const text =
          ((await downloads.cardName(id).textContent()) ?? "") +
          ((await downloads.cardDescription(id).textContent()) ?? "");
        expect(text.toLowerCase(), `${id} should match the search`).toContain("colocalisation");
      }
      await expect(downloads.clearAllButton).toBeVisible();
    });

    test("ignores case", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(total);
      const shown = await downloads.shownCount();
      expect(shown).toBeGreaterThan(0);
      await downloads.search("zzzqqq");
      await downloads.expectShown(0);

      await downloads.search("ColocALisation");
      await downloads.expectShown(shown);
      await expect(downloads.card(COLOCALISATION.id)).toBeVisible();
    });

    // A pasted term often carries spaces around it.
    test("ignores spaces around the term", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.search("  colocalisation ");
      await expect(downloads.card(COLOCALISATION.id)).toBeVisible();
      await expect(downloads.chipCount("Genetics")).not.toHaveText("0");
    });

    // The empty state says "Search looks at dataset names, ids and descriptions", and the chip
    // counts do count id matches.
    test("finds a dataset by its id", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.search(CLINICAL_INDICATION.id);
      await expect(downloads.card(CLINICAL_INDICATION.id)).toBeVisible();
      await expect(downloads.chipCount("Drug")).not.toHaveText("0");
    });

    // Typing the same term again right after clearing it must search again. Known app bug:
    // the debounced value has not changed yet, so SearchField never dispatches the second search.
    test("a term typed again right after clearing is applied", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(total);
      await downloads.clearSearchButton.click();
      await downloads.expectShown(total, total);
      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(total);
    });

    test("a term that matches nothing shows the empty state, and clearing it brings the cards back", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.search("zzzqqq");
      await downloads.expectShown(0, total);
      await expect(downloads.emptyStateTitle).toHaveText("No datasets match “zzzqqq”");
      await expect(downloads.emptyStateBody).toContainText(
        "Search looks at dataset names, ids and descriptions"
      );
      await expect(downloads.chips.first()).toBeVisible();

      await expect(downloads.emptyStateAction).toHaveText("Clear search");
      await downloads.emptyStateAction.click();
      await expect(downloads.searchBox).toHaveValue("");
      await downloads.expectShown(total, total);
      await expect(downloads.emptyState).toHaveCount(0);
    });

    test("the clear button, Escape and Clear all each empty the search", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.search("target");
      await expect(downloads.cards).not.toHaveCount(total);
      await downloads.clearSearchButton.click();
      await expect(downloads.searchBox).toHaveValue("");
      await downloads.expectShown(total, total);

      await downloads.search("disease");
      await expect(downloads.cards).not.toHaveCount(total);
      await downloads.searchBox.press("Escape");
      await expect(downloads.searchBox).toHaveValue("");
      await downloads.expectShown(total, total);

      await downloads.search("variant");
      await expect(downloads.cards).not.toHaveCount(total);
      await downloads.clearAllButton.click();
      await expect(downloads.searchBox).toHaveValue("");
      await downloads.expectShown(total, total);
      await expect(downloads.clearAllButton).toHaveCount(0);
    });

    test("the chip counts follow the search, and a chip with no match is disabled with a tooltip", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.search("colocalisation");
      await expect(downloads.chipCount("Literature")).toHaveText("0");
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-disabled", "true");
      await expect(downloads.chipCount("Genetics")).toHaveText(/^[1-9]\d*$/);
      await expect(downloads.chip("Genetics")).not.toHaveAttribute("aria-disabled", "true");

      await downloads.chip("Literature").hover();
      await expect(downloads.chipTooltip).toHaveText("No matches for this search");

      // a disabled chip does nothing when clicked
      await downloads.chip("Literature").click({ force: true });
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "false");
    });
  });

  test.describe("category filters", () => {
    test("selecting a category shows only its datasets and a results summary", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      const drugCount = Number(await downloads.chipCount("Drug").textContent());
      expect(drugCount).toBeGreaterThan(0);

      await downloads.chip("Drug").click();
      await expect(downloads.chip("Drug")).toHaveAttribute("aria-checked", "true");
      await downloads.expectShown(drugCount, total);
      await expect(downloads.resultsSummary).toHaveText(`${drugCount} Drug datasets`);
      for (const id of await downloads.cardIds()) {
        expect(
          await downloads.cardCategories(id).allTextContents(),
          `${id} is a Drug dataset`
        ).toContain("Drug");
      }
      await expect(downloads.card(CLINICAL_INDICATION.id)).toBeVisible();
      await expect(downloads.card(DISEASE.id)).toHaveCount(0);
    });

    test("several categories show the union of their datasets", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.expectShown(LITERATURE_IDS.length);
      await downloads.chip("Ontology").click();
      await expect(downloads.chip("Ontology")).toHaveAttribute("aria-checked", "true");
      const shown = await downloads.shownCount();
      expect(shown).toBeGreaterThan(LITERATURE_IDS.length);
      await downloads.expectShown(shown);
      await expect(downloads.resultsSummary).toHaveText(
        `${shown} datasets in Literature, Ontology`
      );
      for (const id of await downloads.cardIds()) {
        const categories = await downloads.cardCategories(id).allTextContents();
        expect(
          categories.some((c) => c === "Literature" || c === "Ontology"),
          `${id} is in Literature or Ontology`
        ).toBe(true);
      }
    });

    test("clicking a selected chip deselects it", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.chip("Genetics").click();
      await expect(downloads.cards).not.toHaveCount(total);
      await downloads.chip("Genetics").click();
      await expect(downloads.chip("Genetics")).toHaveAttribute("aria-checked", "false");
      await downloads.expectShown(total, total);
      await expect(downloads.resultsSummary).toHaveCount(0);
    });

    test("Clear all removes the categories and the search together", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.chip("Genetics").click();
      const genetics = await downloads.shownCount();
      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(genetics);
      await downloads.clearAllButton.click();
      await expect(downloads.chip("Genetics")).toHaveAttribute("aria-checked", "false");
      await expect(downloads.searchBox).toHaveValue("");
      await downloads.expectShown(total, total);
    });

    test("a search inside a category that has no match explains where the matches are", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.chip("Literature").click();
      await downloads.search("colocalisation");
      await downloads.expectShown(0, total);
      await expect(downloads.emptyStateTitle).toHaveText(
        "No Literature datasets match “colocalisation”"
      );
      await expect(downloads.emptyStateBody).toContainText(
        /\d+ datasets? in other categories match\. Remove the Literature filter/
      );
      // the selected chip stays selected although nothing matches inside it
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "true");

      await expect(downloads.emptyStateAction).toHaveText("Remove Literature filter");
      await downloads.emptyStateAction.click();
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "false");
      await expect(downloads.cards.first()).toBeVisible();
      await expect(downloads.emptyState).toHaveCount(0);
      await expect(downloads.searchBox).toHaveValue("colocalisation");
    });

    test("with several categories selected the empty state offers to remove the filters", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.chip("Ontology").click();
      await downloads.search("colocalisation");
      await downloads.expectShown(0);
      await expect(downloads.emptyStateTitle).toHaveText(
        "No Literature, Ontology datasets match “colocalisation”"
      );
      await expect(downloads.emptyStateAction).toHaveText("Remove filters");
      await downloads.emptyStateAction.click();
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "false");
      await expect(downloads.chip("Ontology")).toHaveAttribute("aria-checked", "false");
      await expect(downloads.cards.first()).toBeVisible();
    });

    test("Add all puts every dataset of the filter into the bag", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.expectShown(LITERATURE_IDS.length);
      await expect(downloads.addAllButton).toHaveText(`+ Add all ${LITERATURE_IDS.length} to bag`);

      await downloads.addAllButton.click();
      await downloads.expectBagCount(LITERATURE_IDS.length);
      await expect(downloads.addAllButton).toHaveText("All in bag");
      await expect(downloads.addAllButton).toBeDisabled();
      for (const id of LITERATURE_IDS)
        await expect(downloads.cardToggle(id)).toHaveAttribute("aria-pressed", "true");
    });

    test("Add all only adds what is not in the bag yet", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.expectShown(LITERATURE_IDS.length);
      await downloads.cardToggle(LITERATURE_IDS[0]).click();
      await downloads.expectBagCount(1);
      await expect(downloads.addAllButton).toHaveText(
        `+ Add all ${LITERATURE_IDS.length - 1} to bag`
      );
      await downloads.addAllButton.click();
      await downloads.expectBagCount(LITERATURE_IDS.length);
    });
  });

  test.describe("the bag", () => {
    test("adding a dataset marks its card and counts it; adding again takes it out", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      const toggle = downloads.cardToggle(TARGET.id);
      await toggle.click();
      await expect(toggle).toHaveAccessibleName(`Remove ${TARGET.name} from bag`);
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await expect(toggle).toHaveText("In bag");
      await downloads.expectBagCount(1);

      await downloads.cardToggle(DISEASE.id).click();
      await downloads.expectBagCount(2);

      await toggle.click();
      await expect(toggle).toHaveAccessibleName(`Add ${TARGET.name} to bag`);
      await expect(toggle).toHaveText("Add");
      await downloads.expectBagCount(1);
    });

    test("the drawer lists the datasets with a schema link, and Remove takes one out", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.openBag(2);

      await expect(downloads.drawerTitle).toHaveText("Your data bundle");
      await expect(downloads.drawerListTitle).toHaveText(/Datasets · file location/i);
      await expect(downloads.drawerRowName(TARGET.id)).toHaveText(TARGET.name);
      await expect(downloads.drawerRowName(DISEASE.id)).toHaveText(DISEASE.name);
      await expect(downloads.drawerRows).toHaveCount(2);
      await expect(downloads.drawerRowSchemaLink(TARGET.id)).toHaveAttribute(
        "href",
        `/downloads/${TARGET.id}/schema`
      );
      await expect(downloads.drawerRowRemove(DISEASE.id)).toHaveAccessibleName(
        `Remove ${DISEASE.name} from bag`
      );

      await downloads.drawerRowRemove(DISEASE.id).click();
      await expect(downloads.drawerRows).toHaveCount(1);
      await expect(downloads.drawerCount).toHaveText("1 dataset");
      await expect(downloads.drawerRow(DISEASE.id)).toHaveCount(0);
      await downloads.expectBagCount(1);

      await downloads.closeBagButton.click();
      await expect(downloads.drawer).toBeHidden();
      await expect(downloads.cardToggle(DISEASE.id)).toHaveAttribute("aria-pressed", "false");
      await expect(downloads.cardToggle(TARGET.id)).toHaveAttribute("aria-pressed", "true");
    });

    test("the drawer closes with Escape", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.openBag(1);
      await expect(downloads.bagButton).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(downloads.drawer).toBeHidden();
      await expect(downloads.bagButton).toHaveAttribute("aria-expanded", "false");
    });

    test("an empty bag has no rows and no access script", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.openBag(0);
      await expect(downloads.scriptText).toHaveCount(0);
      await expect(downloads.scriptTitle).toHaveCount(0);
      await expect(downloads.emptyBagButton).toBeVisible();
    });

    test("Empty bag clears it at once and Undo brings it back", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.openBag(2);

      await downloads.emptyBagButton.click();
      await expect(downloads.drawer).toBeHidden();
      await downloads.expectBagCount(0);
      await expect(downloads.undoSnackbar).toContainText("Bag emptied");
      await expect(downloads.cardToggle(TARGET.id)).toHaveAttribute("aria-pressed", "false");

      await downloads.undoButton.click();
      await downloads.expectBagCount(2);
      await expect(downloads.undoSnackbar).toBeHidden();
      await expect(downloads.cardToggle(TARGET.id)).toHaveAttribute("aria-pressed", "true");
      await expect(downloads.cardToggle(DISEASE.id)).toHaveAttribute("aria-pressed", "true");
    });

    test("the bag survives a reload and is stored as dataset ids, not in the URL", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.expectBagCount(2);
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), BASKET_STORAGE_KEY))
        .toBe(JSON.stringify([TARGET.id, DISEASE.id]));
      expect(page.url()).not.toContain(TARGET.id);

      await page.reload();
      await expect(downloads.counter).toBeVisible();
      await downloads.expectBagCount(2);
      await expect(downloads.cardToggle(TARGET.id)).toHaveAttribute("aria-pressed", "true");
      await downloads.openBag(2);
    });

    test("stored ids that are not datasets of this release are dropped", async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        [BASKET_STORAGE_KEY, JSON.stringify([TARGET.id, "no_such_dataset"])]
      );
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.expectBagCount(1);
      await downloads.openBag(1);
      await expect(downloads.drawerRow(TARGET.id)).toBeVisible();
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), BASKET_STORAGE_KEY))
        .toBe(JSON.stringify([TARGET.id]));
    });

    test("a bag that is not valid JSON in storage is ignored", async ({ page }) => {
      await page.addInitScript(
        (key) => window.localStorage.setItem(key, "{not json"),
        BASKET_STORAGE_KEY
      );
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.expectBagCount(0);
      await expect(downloads.cards.first()).toBeVisible();
    });

    test("the bag is not changed by the filters", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.chip("Literature").click();
      await downloads.search("literature");
      await downloads.expectBagCount(1);
      await downloads.openBag(1);
      await expect(downloads.drawerRow(TARGET.id)).toBeVisible();
    });
  });

  test.describe("access scripts of the bag", () => {
    test("one tab per tool, each script listing the bag's datasets and the release locations", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.openBag(2);

      await expect(downloads.scriptTitle).toContainText("all 2 datasets");
      for (const tool of SCRIPT_TOOLS) await expect(downloads.scriptTab(tool)).toBeVisible();
      await expect(downloads.scriptTab("aws")).toHaveText("AWS CLI");
      await expect(downloads.scriptTab("gcp")).toHaveText("Google Cloud CLI");
      await expect(downloads.scriptTab("rsync")).toHaveText("Rsync");
      await expect(downloads.scriptTab("wget")).toHaveText("Wget");

      await test.step("AWS", async () => {
        await downloads.scriptTab("aws").click();
        await expect(downloads.scriptText).toContainText(
          /BASE="s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output"/
        );
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
        await expect(downloads.scriptText).toContainText("aws s3 cp");
        await expect(downloads.scriptText).toContainText("--no-sign-request");
      });

      await test.step("Google Cloud with its billing project note", async () => {
        await downloads.scriptTab("gcp").click();
        await expect(downloads.scriptText).toContainText(
          /BASE="gs:\/\/open-targets-data-releases\/\d+\.\d+\/output"/
        );
        await expect(downloads.scriptText).toContainText("gcloud storage cp");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
        await expect(downloads.drawer).toContainText("You need to specify a billing project");
      });

      await test.step("Rsync", async () => {
        await downloads.scriptTab("rsync").click();
        await expect(downloads.scriptText).toContainText(
          /BASE="rsync\.ebi\.ac\.uk::pub\/databases\/opentargets\/platform\/\d+\.\d+\/output"/
        );
        await expect(downloads.scriptText).toContainText("rsync -rpltvz");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
      });

      await test.step("Wget", async () => {
        await downloads.scriptTab("wget").click();
        await expect(downloads.scriptText).toContainText(
          /BASE="ftp:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output"/
        );
        await expect(downloads.scriptText).toContainText("--cut-dirs=6");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
      });
    });

    test("the script follows the bag: a removed dataset leaves it and a new one joins it", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.openBag(1);
      await expect(downloads.scriptTitle).toContainText("all 1 dataset");
      await downloads.expectScriptDatasets([TARGET.id]);

      await downloads.closeBagButton.click();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.openBag(2);
      await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);

      await downloads.drawerRowRemove(TARGET.id).click();
      await downloads.expectScriptDatasets([DISEASE.id]);
    });

    test("the copy button puts the script on the clipboard", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(TARGET.id).click();
      await downloads.openBag(1);

      await downloads.scriptTab("wget").click();
      await expect(downloads.copyScriptButton).toHaveAccessibleName("Copy Wget script");
      const shown = (await downloads.scriptText.innerText()).replace(/ /g, " ");
      await downloads.copyScriptButton.click();
      await expect(downloads.copyTooltip).toHaveText("Copied");
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toContain(`BASE="ftp://ftp.ebi.ac.uk/pub/databases/opentargets/platform/`);
      expect(copied).toContain(TARGET.id);
      expect(copied.replace(/\s+/g, "")).toBe(shown.replace(/\s+/g, ""));
    });
  });

  test.describe("first add coach mark", () => {
    // These tests start from a browser that has never added to the bag.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (key) => window.localStorage.removeItem(key),
        COACH_MARK_STORAGE_KEY
      );
    });

    test("the first dataset added opens the coach mark; Open bag opens the drawer", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await expect(downloads.coachMark).toHaveCount(0);

      await downloads.cardToggle(TARGET.id).click();
      await expect(downloads.coachMark).toBeVisible();
      await expect(downloads.coachMark).toContainText("Collect the datasets you need here");
      await downloads.coachMarkOpenButton.click();
      await expect(downloads.coachMark).toHaveCount(0);
      await expect(downloads.drawer).toBeVisible();
    });

    test("Keep browsing dismisses it and it does not come back for the next dataset", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.cardToggle(TARGET.id).click();
      await expect(downloads.coachMark).toBeVisible();
      await downloads.coachMarkDismissButton.click();
      await expect(downloads.coachMark).toHaveCount(0);

      await downloads.cardToggle(DISEASE.id).click();
      await downloads.expectBagCount(2);
      await expect(downloads.coachMark).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate((key) => window.localStorage.getItem(key), COACH_MARK_STORAGE_KEY)
        )
        .toBe("1");
    });
  });

  test.describe("schema and access dialogs", () => {
    test("Schema opens the dataset's columns and the URL carries the dataset", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardSchemaLink(TARGET.id).click();

      await expect(page).toHaveURL(/\/downloads\/target\/schema$/);
      await expect(downloads.datasetDialog).toBeVisible();
      await expect(downloads.dialogTitle).toHaveText(`Dataset: ${TARGET.id}`);
      await expect(downloads.schemaHeaders).toHaveText(["Column", "Data Type", "Description"]);
      // the first column of the target dataset is its primary key
      await expect(downloads.schemaRows.first()).toContainText("│⎯id");
      await expect(downloads.schemaRows.first()).toContainText("Text");
      await expect(downloads.schemaRow("approvedSymbol")).toBeVisible();
      await expect(downloads.dialogSwitchButton).toHaveText("Access Data");
    });

    test("a schema deep link opens the dialog over the page, and Close returns to /downloads", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/disease/schema");
      await expect(downloads.datasetDialog).toBeVisible();
      await expect(downloads.dialogTitle).toHaveText("Dataset: disease");
      await expect(downloads.schemaRows.first()).toContainText("│⎯id");

      await downloads.dialogCloseButton.click();
      await expect(downloads.datasetDialog).toBeHidden();
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.cards.first()).toBeVisible();
    });

    test("Escape closes the dialog", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/disease/schema");
      await expect(downloads.datasetDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(downloads.datasetDialog).toBeHidden();
      await expect(page).toHaveURL(/\/downloads$/);
    });

    test("the schema marks primary keys and foreign keys", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/evidence_clinical_precedence/schema");
      await expect(downloads.schemaRows.first()).toBeVisible();

      await expect(downloads.schemaRowType("targetId")).toHaveText("Text");
      await downloads.schemaForeignKey("targetId").hover();
      // the array form waits until one of the tooltips on the page has this text
      await expect(downloads.schemaKeyTooltip).toContainText(["Foreign Key: target/id"]);

      await downloads.schemaPrimaryKey("id").hover();
      await expect(downloads.schemaKeyTooltip).toContainText(["Primary Key"]);
    });

    test("struct columns are followed by their indented sub-columns", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto(`/downloads/${TARGET.id}/schema`);
      await expect(downloads.schemaRowType("genomicLocation")).toContainText("Struct");
      await expect(downloads.schemaRowName("genomicLocation")).toContainText("│⎯genomicLocation");
      await expect(downloads.schemaRowName("genomicLocation.chromosome")).toContainText(
        "│⎯│⎯chromosome"
      );
    });

    test("Access data opens the file locations and the scripts of one dataset", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardAccessLink(TARGET.id).click();

      await expect(page).toHaveURL(/\/downloads\/target\/access$/);
      await expect(downloads.dialogTitle).toHaveText("Dataset: target");
      await expect(downloads.accessLocations).toContainText("File Location:");
      await expect(downloads.accessScripts).toContainText("Access Script:");
      await expect(downloads.locationTab("http-location")).toHaveText("Browse (link)");
      await expect(downloads.browseLink).toHaveAttribute(
        "href",
        /^https:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target$/
      );
      await expect(downloads.locationTab("ftp-location")).toHaveText("FTP location");

      await downloads.locationTab("gcp-location").click();
      await expect(downloads.locationCode).toContainText(
        /gs:\/\/open-targets-data-releases\/\d+\.\d+\/output\/target/
      );
      await downloads.locationTab("aws-location").click();
      await expect(downloads.locationCode).toContainText(
        /s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output\/target/
      );
    });

    for (const script of [
      {
        tool: "rsync" as const,
        command:
          /rsync -rpltvz --delete rsync\.ebi\.ac\.uk::pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target \./,
      },
      {
        tool: "wget" as const,
        command:
          /wget --recursive --no-parent --no-host-directories --cut-dirs 6 ftps:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target \./,
      },
      {
        tool: "gcp" as const,
        command:
          /gcloud storage cp -r --billing-project \$\{PROJECT_ID\} gs:\/\/open-targets-data-releases\/\d+\.\d+\/output\/target\/ \./,
      },
      {
        tool: "aws" as const,
        command:
          /aws s3 cp --recursive --no-sign-request s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output\/target\/ \./,
      },
    ]) {
      test(`the access dialog's ${script.tool} command downloads the dataset`, async ({ page }) => {
        const downloads = new DownloadsPage(page);
        await downloads.goto(`/downloads/${TARGET.id}/access`);
        await downloads.accessScriptTab(script.tool).click();
        await expect(downloads.scriptCode).toHaveText(script.command);
        if (script.tool === "gcp")
          await expect(downloads.accessScripts).toContainText(
            "You need to specify a billing project"
          );
      });
    }

    test("the dialog switches between Access and Schema and keeps the dataset", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/disease/access");
      await expect(downloads.accessLocations).toContainText("File Location:");
      await expect(downloads.dialogSwitchButton).toHaveText("Show Schema");

      await downloads.dialogSwitchButton.click();
      await expect(page).toHaveURL(/\/downloads\/disease\/schema$/);
      await expect(downloads.schemaTable).toBeVisible();
      await expect(downloads.dialogSwitchButton).toHaveText("Access Data");

      await downloads.dialogSwitchButton.click();
      await expect(page).toHaveURL(/\/downloads\/disease\/access$/);
      await expect(downloads.accessLocations).toContainText("File Location:");
    });

    test("the browser back button closes the dialog", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardSchemaLink(DISEASE.id).click();
      await expect(downloads.datasetDialog).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.datasetDialog).toBeHidden();
      await page.goForward();
      await expect(downloads.datasetDialog).toBeVisible();
    });

    test("the bag drawer's Schema link opens that dataset's schema", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.cardToggle(DISEASE.id).click();
      await downloads.openBag(1);
      await downloads.drawerRowSchemaLink(DISEASE.id).click();
      await expect(page).toHaveURL(/\/downloads\/disease\/schema$/);
      await expect(downloads.dialogTitle).toHaveText("Dataset: disease");
      await expect(downloads.schemaTable).toBeVisible();
    });

    test("a dataset that does not exist sends the visitor back to the list", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/no_such_dataset/schema");
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.datasetDialog).toHaveCount(0);
      await expect(downloads.cards.first()).toBeVisible();
    });

    test("an unknown dialog view sends the visitor back to the list", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/target/bogus");
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.datasetDialog).toHaveCount(0);
    });
  });

  test.describe("header tags", () => {
    test("Croissant explains the format, links to it and downloads the metadata", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("croissant").click();
      await expect(downloads.tagPopover).toContainText("About this format");
      await expect(downloads.tagPopover).toContainText("conforms to Croissant");
      await expect(downloads.tagReadMoreLink).toHaveAttribute("href", /croissant/i);

      const download = page.waitForEvent("download");
      await downloads.croissantDownloadLink.click();
      expect((await download).suggestedFilename()).toBe("croissant.json");
    });

    test("Parquet links to the format documentation", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("parquet").click();
      await expect(downloads.tagPopover).toContainText("File Format");
      await expect(downloads.tagReadMoreLink).toHaveAttribute(
        "href",
        "https://parquet.apache.org/docs/overview/"
      );
    });

    test("the version tag names the release and links to the release notes", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const version = ((await downloads.tag("version").textContent()) ?? "").trim();
      expect(version).toMatch(/^\d+\.\d+$/);
      await downloads.tag("version").click();
      await expect(downloads.tagPopover).toContainText(`Current version: ${version}`);
      await expect(downloads.tagReadMoreLink).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/release-notes"
      );
    });

    test("Cite Us opens the publication of the Platform", async ({ page }) => {
      await stubEuropePmc(page);
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("cite-us").click();
      await expect(downloads.publicationEntries).toHaveCount(1);
      await expect(downloads.publicationEntries.first()).toContainText(/Stubbed publication \d+/);
    });
  });

  test.describe("network view", () => {
    test("the view toggle puts ?view=network in the URL and back", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.networkToggle.click();
      await expect(page).toHaveURL(/\/downloads\?view=network$/);
      await expect(downloads.networkToggle).toHaveAttribute("aria-pressed", "true");
      await expect(downloads.graphNodes.first()).toBeVisible();
      await expect(downloads.cards).toHaveCount(0);
      await expect(downloads.searchBox).toHaveCount(0);
      await expect(downloads.categoryFilters).toHaveCount(0);

      await downloads.cardsToggle.click();
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.cards.first()).toBeVisible();
      await expect(downloads.graphNodes).toHaveCount(0);
    });

    test("?view=network opens the network, survives a reload, and any other value shows the cards", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await expect(downloads.networkToggle).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(downloads.graphNodes.first()).toBeVisible();
      await expect(downloads.networkToggle).toHaveAttribute("aria-pressed", "true");

      await downloads.goto("/downloads?view=bogus");
      await expect(downloads.cards.first()).toBeVisible();
      await expect(downloads.cardsToggle).toHaveAttribute("aria-pressed", "true");
    });

    test("draws a node for each connected dataset, with the legend of the categories", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await downloads.networkToggle.click();
      await expect(downloads.graphNodes.first()).toBeVisible();

      const nodes = await downloads.graphNodes.count();
      expect(
        nodes,
        "datasets with no reference to another dataset are left off the canvas"
      ).toBeGreaterThan(total / 2);
      expect(nodes).toBeLessThanOrEqual(total);
      await expect(downloads.node(TARGET.id)).toBeVisible();
      await expect(downloads.node(DISEASE.id)).toBeVisible();
      await expect(downloads.node(CLINICAL_INDICATION.id)).toBeVisible();

      await expect(downloads.legend).toBeVisible();
      for (const category of ["Target", "Drug", "Genetics", "Ontology"]) {
        await expect(downloads.legendItem(category)).toHaveText(category);
      }
      await expect(downloads.legendItem("In bag")).toHaveCount(0);
      // the only switch above the canvas is the scope: there is one layout
      await expect(downloads.scopeSwitch).toBeVisible();
      await expect(downloads.hint).toHaveText(
        "Hover a node to preview · click to select · scroll to zoom"
      );
    });

    test("selecting a node docks its details with the datasets it connects to", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();

      await expect(downloads.panel).toHaveCount(0);
      await downloads.selectNode(CLINICAL_INDICATION.id, CLINICAL_INDICATION.name);
      await expect(downloads.panelType).toHaveText("Drug");
      await expect(downloads.selectedChip).toContainText(`Selected: ${CLINICAL_INDICATION.name}`);
      await expect(downloads.hint).toHaveText("Esc or click the canvas to clear");
      await expect(downloads.node(CLINICAL_INDICATION.id)).toHaveClass(/selected/);

      await expect(downloads.connectedTitle).toHaveText(/^Connected datasets · \d+$/);
      const connected = Number(
        /(\d+)$/.exec((await downloads.connectedTitle.textContent()) ?? "")?.[1]
      );
      expect(connected).toBeGreaterThan(0);
      await expect(downloads.connectedRows).toHaveCount(connected);
      // a dataset is never listed as its own neighbour, and every neighbour is a node of the graph
      const ids = await downloads.connectedIds();
      expect(ids).not.toContain(CLINICAL_INDICATION.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) await expect(downloads.node(id)).toBeVisible();

      await expect(downloads.panelSchemaLink).toHaveAttribute(
        "href",
        `/downloads/${CLINICAL_INDICATION.id}/schema?view=network`
      );
      await expect(downloads.panelAccessLink).toHaveAttribute(
        "href",
        `/downloads/${CLINICAL_INDICATION.id}/access?view=network`
      );
    });

    test("clicking a connected dataset moves the selection to it", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.selectNode(CLINICAL_INDICATION.id, CLINICAL_INDICATION.name);

      const [neighbourId] = await downloads.connectedIds();
      expect(neighbourId).toMatch(/^[a-z0-9_]+$/);
      const neighbourName = (
        (await downloads.connectedRowName(neighbourId).textContent()) ?? ""
      ).trim();
      expect(neighbourName).not.toBe("");
      await downloads.connectedRowSelect(neighbourId).click();

      await expect(downloads.panelId).toHaveText(neighbourId);
      await expect(downloads.panelName).toHaveText(neighbourName);
      await expect(downloads.panel).toHaveCount(1);
      await expect(downloads.selectedChip).toContainText(`Selected: ${neighbourName}`);
      await expect(downloads.node(neighbourId)).toHaveClass(/selected/);
      await expect(downloads.node(CLINICAL_INDICATION.id)).not.toHaveClass(/selected/);
      // the dataset we came from is a neighbour of the new selection
      await expect(downloads.connectedRow(CLINICAL_INDICATION.id)).toHaveCount(1);
    });

    test("the selection clears with Escape, the close button, the chip and a click on the canvas", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();

      await downloads.selectNode(TARGET.id, TARGET.name);
      await page.keyboard.press("Escape");
      await expect(downloads.panel).toBeHidden();
      await expect(downloads.node(TARGET.id)).not.toHaveClass(/selected/);

      await downloads.selectNode(TARGET.id, TARGET.name);
      await downloads.panelClose.click();
      await expect(downloads.panel).toBeHidden();

      await downloads.selectNode(TARGET.id, TARGET.name);
      await downloads.selectedChipClear.click();
      await expect(downloads.panel).toBeHidden();
      await expect(downloads.selectedChip).toHaveCount(0);

      await downloads.selectNode(TARGET.id, TARGET.name);
      // the top-left corner of the canvas is empty
      await downloads.canvas.click({ position: { x: 4, y: 4 } });
      await expect(downloads.panel).toBeHidden();
    });

    test("a hub's details group the connections by category, filter them and collapse", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.selectNode(TARGET.id, TARGET.name);

      const connected = Number(
        /(\d+)$/.exec((await downloads.connectedTitle.textContent()) ?? "")?.[1]
      );
      expect(connected, "the target dataset is referenced by many others").toBeGreaterThan(8);
      await expect
        .poll(() => downloads.connectedGroups.count(), "connections are grouped by category")
        .toBeGreaterThan(1);

      await test.step("a group's header collapses and expands its rows", async () => {
        const group = downloads.connectedGroups.first();
        const toggle = downloads.connectedGroupToggle(group);
        const expanded = await toggle.getAttribute("aria-expanded");
        await toggle.click();
        await expect(toggle).toHaveAttribute(
          "aria-expanded",
          expanded === "true" ? "false" : "true"
        );
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", expanded ?? "");
      });

      await test.step("filter narrows the list to matching datasets", async () => {
        await downloads.connectedFilter.fill("evidence_gwas");
        await expect(downloads.connectedRows.first()).toBeVisible();
        for (const id of await downloads.connectedIds()) expect(id).toContain("evidence_gwas");
        await downloads.connectedFilter.fill("zzzqqq");
        await expect(downloads.connectedRows).toHaveCount(0);
        await downloads.connectedFilter.fill("");
        await expect(downloads.connectedGroups.first()).toBeVisible();
      });

      await test.step("Collapse all / Expand all flips every group", async () => {
        const before = (await downloads.connectedToggleAll.textContent()) ?? "";
        expect(before).toMatch(/^(Collapse|Expand) all$/);
        await downloads.connectedToggleAll.click();
        const after = before === "Collapse all" ? "Expand all" : "Collapse all";
        await expect(downloads.connectedToggleAll).toHaveText(after);
        // collapsing all hides every row; expanding all shows every connection
        await expect(downloads.connectedRows).toHaveCount(after === "Expand all" ? 0 : connected);
        await downloads.connectedToggleAll.click();
        await expect(downloads.connectedToggleAll).toHaveText(before);
      });
    });

    test("a node's panel adds the dataset to the bag, and its dialogs keep the network view", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.selectNode(DISEASE.id, DISEASE.name);

      await expect(downloads.panelToggle).toHaveAccessibleName(`Add ${DISEASE.name} to bag`);
      await downloads.panelToggle.click();
      await downloads.expectBagCount(1);
      await expect(downloads.panelToggle).toHaveAccessibleName(`Remove ${DISEASE.name} from bag`);
      await expect(downloads.panelToggle).toHaveText("In bag");

      await downloads.panelSchemaLink.click();
      await expect(page).toHaveURL(/\/downloads\/disease\/schema\?view=network$/);
      await expect(downloads.datasetDialog).toBeVisible();
      await expect(downloads.schemaTable).toBeVisible();
      await downloads.dialogCloseButton.click();
      await expect(page).toHaveURL(/\/downloads\?view=network$/);
      await expect(downloads.graphNodes.first()).toBeVisible();
    });

    test("hovering a node previews it with its actions", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.previewNode(DISEASE.id, DISEASE.name);

      await expect(downloads.nodePopover).toContainText(DISEASE.id);
      await expect(downloads.popoverSchemaLink).toHaveAttribute(
        "href",
        /\/downloads\/disease\/schema/
      );
      await expect(downloads.popoverAccessLink).toHaveAttribute(
        "href",
        /\/downloads\/disease\/access/
      );

      await downloads.popoverToggle.click();
      await downloads.expectBagCount(1);
      await expect(downloads.popoverToggle).toHaveAccessibleName(`Remove ${DISEASE.name} from bag`);
      await expect(downloads.popoverToggle).toHaveText("In bag");
    });

    test("the bag scope is disabled while the bag is empty, then shows only the bag", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await expect(downloads.scopeAll).toHaveText("All datasets");
      await expect(downloads.scopeAll).toHaveAttribute("aria-checked", "true");
      await expect(downloads.scopeBag).toHaveText("Bag");
      await expect(downloads.scopeBag).toHaveAttribute("aria-disabled", "true");
      await downloads.scopeBag.click({ force: true });
      await expect(downloads.scopeAll).toHaveAttribute("aria-checked", "true");
      await expect(downloads.scopeBag).toHaveAttribute("aria-checked", "false");

      await downloads.previewNode(DISEASE.id, DISEASE.name);
      await downloads.popoverToggle.click();
      await downloads.expectBagCount(1);
      await expect(downloads.scopeBag).toHaveText("Bag · 1");
      await expect(downloads.scopeBag).not.toHaveAttribute("aria-disabled", "true");

      await downloads.scopeBag.click();
      await expect(downloads.scopeBag).toHaveAttribute("aria-checked", "true");
      await expect(downloads.scopeAll).toHaveAttribute("aria-checked", "false");
      await expect(downloads.hint).toHaveText(
        "1 dataset in your bag · 0 direct connections between them"
      );
      await expect(downloads.legendItem("In bag")).toHaveText("In bag");
      await expect(downloads.node(DISEASE.id)).toHaveClass(/in-basket/);
      await expect(downloads.node(TARGET.id)).not.toHaveClass(/in-basket/);

      await downloads.scopeAll.click();
      await expect(downloads.scopeAll).toHaveAttribute("aria-checked", "true");
      await expect(downloads.legendItem("In bag")).toHaveCount(0);
    });

    test("emptying the bag while it is the scope returns the network to all datasets", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.previewNode(DISEASE.id, DISEASE.name);
      await downloads.popoverToggle.click();
      await downloads.scopeBag.click();
      await expect(downloads.scopeBag).toHaveAttribute("aria-checked", "true");

      await downloads.openBag(1);
      await downloads.emptyBagButton.click();
      await downloads.expectBagCount(0);
      await expect(downloads.scopeAll).toHaveAttribute("aria-checked", "true");
      await expect(downloads.scopeBag).toHaveText("Bag");
    });

    test("the nodes sit in category lanes, with a single layout", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await expect(downloads.scopeSwitch).toBeVisible();

      const lanes = await downloads.lanes.count();
      expect(lanes, "one lane per category of the connected datasets").toBeGreaterThan(2);
      await expect(downloads.legendItems).not.toHaveCount(0);

      const placed = await downloads.nodeLanes();
      expect(placed.length).toBeGreaterThan(20);
      for (const { id, lane } of placed)
        expect(lane, `${id} should sit inside a category lane`).not.toBeNull();
      const byId = Object.fromEntries(placed.map((p) => [p.id, p.lane]));
      expect(byId[`graph-node-${TARGET.id}`], "the target dataset is in the Target lane").toMatch(
        /^Target/
      );
      expect(byId[`graph-node-${DISEASE.id}`]).toMatch(/Disease/);
      expect(byId[`graph-node-${TARGET.id}`]).not.toBe(byId[`graph-node-${DISEASE.id}`]);
    });

    test("the zoom buttons change the scale of the canvas and Fit restores it", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const fitted = await downloads.zoomLayer.getAttribute("transform");
      expect(fitted).toMatch(/scale\(/);

      await downloads.zoomIn.click();
      await expect.poll(() => downloads.zoomLayer.getAttribute("transform")).not.toBe(fitted);
      const zoomedIn = scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? "");
      expect(zoomedIn).toBeGreaterThan(scaleOf(fitted ?? ""));

      await downloads.zoomFit.click();
      await expect
        .poll(async () => scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? ""))
        .toBeCloseTo(scaleOf(fitted ?? ""), 2);

      await downloads.zoomOut.click();
      await expect
        .poll(async () => scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? ""))
        .toBeLessThan(scaleOf(fitted ?? ""));
    });

    test("the bag drawer works from the network view and in-bag nodes are marked", async ({
      page,
    }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.previewNode(DISEASE.id, DISEASE.name);
      await downloads.popoverToggle.click();
      await downloads.scopeBag.click();
      await expect(downloads.node(DISEASE.id)).toHaveClass(/in-basket/);
      await downloads.openBag(1);
      await expect(downloads.drawerRow(DISEASE.id)).toBeVisible();
      await downloads.drawerRowRemove(DISEASE.id).click();
      await expect(downloads.drawerRows).toHaveCount(0);
      await downloads.expectBagCount(0);
      await expect(downloads.node(DISEASE.id)).not.toHaveClass(/in-basket/);
    });
  });
});

function scaleOf(transform: string): number {
  const scale = /scale\(([\d.]+)\)/.exec(transform)?.[1];
  expect(scale, `transform "${transform}" should have a scale`).toBeTruthy();
  return Number(scale);
}

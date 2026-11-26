import { expect, test } from "../../../fixtures";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import {
  BASKET_STORAGE_KEY,
  DOWNLOADS_CATEGORIES,
  DownloadsPage,
  SCRIPT_TABS,
} from "../../../POM/page/site/downloadsPage";

/**
 * The Downloads page, /downloads: the dataset cards with search and category filters, the
 * bag (basket) with its drawer and access scripts, the schema / access dialogs and the
 * network view of how the datasets reference each other.
 *
 * The ids below identify datasets in the Open Targets data model and exist in every release:
 * `target` (a hub of the network, category Target), `disease`, `clinical_indication` (two
 * categories) and the two Literature datasets (the only ones in that category).
 */
const TARGET = { id: "target", name: "Target", category: "Target" };
const DISEASE = { id: "disease", name: "Disease/Phenotype" };
const CLINICAL_INDICATION = { id: "clinical_indication", name: "Clinical indication", categories: ["Drug", "Disease"] };
const LITERATURE_IDS = ["literature_entity_lut", "literature_vector"];

const COACH_MARK_STORAGE_KEY = "ot.downloads.basketCoachSeen";

test.describe("Downloads page", () => {
  // The first add to the bag opens a one-time coach mark that sits over the toolbar. It has its
  // own tests below; everywhere else it is marked as already seen.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, "1"), COACH_MARK_STORAGE_KEY);
  });

  test.describe("page and dataset cards", () => {
    test("renders the title, description, tags, toolbar and a card per dataset @smoke", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await expect(page).toHaveTitle(/^Data downloads \| Open Targets Platform/);
      await expect(downloads.heading).toHaveText("Open Targets Platform Datasets");

      await test.step("the description and the header tags are there", async () => {
        await expect(page.getByText(/comprehensive data integration tool/)).toBeVisible();
        await expect(downloads.tag("Cite Us")).toBeVisible();
        await expect(downloads.tag("Croissant")).toBeVisible();
        await expect(downloads.tag("Parquet")).toBeVisible();
        await expect(downloads.versionTag).toBeVisible();
      });

      await test.step("one card per dataset, and the counter agrees", async () => {
        const total = await downloads.totalDatasets();
        expect(total, "the Platform publishes dozens of datasets").toBeGreaterThan(40);
        await downloads.expectShown(total, total);
        await expect(downloads.cards.first()).toBeVisible();
      });

      await test.step("every category has a chip, none selected, with a count", async () => {
        await expect(downloads.chips).toHaveCount(DOWNLOADS_CATEGORIES.length);
        for (const category of DOWNLOADS_CATEGORIES) {
          await expect(downloads.chip(category)).toHaveAttribute("aria-checked", "false");
        }
      });

      await test.step("the bag starts empty and the Cards view is the default", async () => {
        await downloads.expectBagCount(0);
        await expect(downloads.networkToggle).toHaveAttribute("aria-pressed", "false");
        await expect(downloads.cardsToggle).toHaveAttribute("aria-pressed", "true");
        await expect(downloads.clearAllButton).toHaveCount(0);
      });
    });

    test("a dataset card shows its name, id, description, category and actions", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      const card = downloads.card(TARGET.name);
      await expect(card.getByRole("heading", { level: 3 })).toHaveText(TARGET.name);
      await expect(downloads.cardId(card)).toHaveText(TARGET.id);
      await expect(card).toContainText("Core annotation for drug targets");
      await expect(card).toContainText(TARGET.category);

      await expect(downloads.schemaLink(card)).toHaveAttribute("href", `/downloads/${TARGET.id}/schema`);
      await expect(downloads.accessLink(card)).toHaveAttribute("href", `/downloads/${TARGET.id}/access`);
      const add = downloads.addButton(card);
      await expect(add).toHaveAccessibleName(`Add ${TARGET.name} to bag`);
      await expect(add).toHaveAttribute("aria-pressed", "false");
    });

    test("a dataset in two categories shows both", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const card = downloads.card(CLINICAL_INDICATION.name);
      for (const category of CLINICAL_INDICATION.categories) {
        await expect(card).toContainText(category);
      }
    });

    test("every card is well formed and links to its own dialogs", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await expect(downloads.cards).toHaveCount(total);

      const cards = await downloads.cards.evaluateAll((articles) =>
        articles.map((article) => ({
          name: article.getAttribute("aria-label"),
          title: article.querySelector("h3")?.textContent,
          id: article.querySelector("h3 + div")?.textContent,
          description: (article.textContent ?? "").length,
          schema: article.querySelector("a[href$='/schema']")?.getAttribute("href"),
          access: article.querySelector("a[href$='/access']")?.getAttribute("href"),
        }))
      );

      const ids = new Set<string>();
      for (const card of cards) {
        expect(card.name, "the card is named after its dataset").toBeTruthy();
        expect(card.title, `the heading of ${card.id}`).toBe(card.name);
        expect(card.id, `the id of "${card.name}"`).toMatch(/^[a-z0-9_]+$/);
        expect(card.schema, `schema link of ${card.id}`).toBe(`/downloads/${card.id}/schema`);
        expect(card.access, `access link of ${card.id}`).toBe(`/downloads/${card.id}/access`);
        expect(card.description, `${card.id} should show a description`).toBeGreaterThan(`${card.name}${card.id}`.length + 40);
        ids.add(card.id as string);
      }
      expect(ids.size, "dataset ids are unique").toBe(total);
    });

    test("every category on a card has a filter chip", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      const onCards = await downloads.cards.evaluateAll((articles) => {
        const names = new Set<string>();
        for (const article of articles) {
          // category labels are the spans after the description, next to a coloured dot
          for (const span of article.querySelectorAll("span")) {
            const parent = span.parentElement;
            if (parent && parent.children.length === 2 && parent.firstElementChild?.tagName === "SPAN" && span.textContent) {
              names.add(span.textContent);
            }
          }
        }
        return [...names];
      });
      for (const category of onCards.filter((c) => /^[A-Z][A-Za-z-]+$/.test(c))) {
        if (!(DOWNLOADS_CATEGORIES as readonly string[]).includes(category)) continue;
        await expect(downloads.chip(category)).toBeVisible();
      }
      expect(onCards, "the category labels were found on the cards").toEqual(expect.arrayContaining([...DOWNLOADS_CATEGORIES]));
    });

    test("a long description expands with the more link", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const card = downloads.card("Associations - direct (by data source)");
      const more = card.getByText("more", { exact: true });
      await expect(more).toBeVisible();
      const description = card.locator("span").filter({ hasText: /^Data source-specific metrics/ }).first();
      const collapsedHeight = (await description.evaluate((el) => (el.parentElement as HTMLElement).offsetHeight));
      await more.click();
      await expect(card.getByText("hide", { exact: true })).toBeVisible();
      await expect
        .poll(() => description.evaluate((el) => (el.parentElement as HTMLElement).offsetHeight))
        .toBeGreaterThan(collapsedHeight);
      await card.getByText("hide", { exact: true }).click();
      await expect(card.getByText("more", { exact: true })).toBeVisible();
    });
  });

  test.describe("search", () => {
    test("narrows the cards to the datasets matching the term and updates the counter", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.search("colocalisation");
      await expect(downloads.cards).not.toHaveCount(total);
      const shown = await downloads.shownCount();
      expect(shown).toBeGreaterThan(0);
      await downloads.expectShown(shown, total);
      await expect(downloads.card("Colocalisation with colocPIP and eCAVIAR")).toBeVisible();

      const texts = await downloads.cards.allTextContents();
      for (const text of texts) expect(text.toLowerCase()).toContain("colocalisation");
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
      await expect(downloads.card("Colocalisation with colocPIP and eCAVIAR")).toBeVisible();
    });

    // A pasted term often carries spaces around it.
    test("ignores spaces around the term", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.search("  colocalisation ");
      await expect(downloads.card("Colocalisation with colocPIP and eCAVIAR")).toBeVisible();
      await expect(downloads.chip("Genetics")).not.toHaveAccessibleName("Genetics 0");
    });

    // The empty state says "Search looks at dataset names, ids and descriptions", and the chip
    // counts do count id matches.
    test("finds a dataset by its id", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.search(CLINICAL_INDICATION.id);
      await expect(downloads.card(CLINICAL_INDICATION.name)).toBeVisible();
      await expect(downloads.chip("Drug")).not.toHaveAccessibleName("Drug 0");
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

    test("a term that matches nothing shows the empty state, and clearing it brings the cards back", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.search("zzzqqq");
      await downloads.expectShown(0, total);
      await expect(downloads.emptyState.getByRole("heading")).toHaveText("No datasets match “zzzqqq”");
      await expect(downloads.emptyState).toContainText("Search looks at dataset names, ids and descriptions");
      await expect(downloads.chips.first()).toBeVisible();

      await downloads.emptyState.getByRole("button", { name: "Clear search" }).click();
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

    test("the chip counts follow the search, and a chip with no match is disabled with a tooltip", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.search("colocalisation");
      await expect(downloads.chip("Literature")).toHaveAccessibleName("Literature 0");
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-disabled", "true");
      await expect(downloads.chip("Genetics")).not.toHaveAttribute("aria-disabled", "true");

      await downloads.chip("Literature").hover();
      await expect(page.getByRole("tooltip")).toHaveText("No matches for this search");

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

      const chipLabel = (await downloads.chip("Drug").textContent()) ?? "";
      const drugCount = Number(/(\d+)$/.exec(chipLabel)?.[1]);
      expect(drugCount).toBeGreaterThan(0);

      await downloads.chip("Drug").click();
      await expect(downloads.chip("Drug")).toHaveAttribute("aria-checked", "true");
      await downloads.expectShown(drugCount, total);
      await expect(downloads.resultsSummary).toHaveText(`${drugCount} Drug datasets`);
      for (const text of await downloads.cards.allTextContents()) expect(text).toContain("Drug");
      await expect(downloads.card(CLINICAL_INDICATION.name)).toBeVisible();
      await expect(downloads.card(DISEASE.name)).toHaveCount(0);
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
      await expect(downloads.resultsSummary).toHaveText(`${shown} datasets in Literature, Ontology`);
      for (const text of await downloads.cards.allTextContents()) {
        expect(text).toMatch(/Literature|Ontology/);
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

    test("a search inside a category that has no match explains where the matches are", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();

      await downloads.chip("Literature").click();
      await downloads.search("colocalisation");
      await downloads.expectShown(0, total);
      await expect(downloads.emptyState.getByRole("heading")).toHaveText("No Literature datasets match “colocalisation”");
      await expect(downloads.emptyState).toContainText(/\d+ datasets? in other categories match\. Remove the Literature filter/);
      // the selected chip stays selected although nothing matches inside it
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "true");

      await downloads.emptyState.getByRole("button", { name: "Remove Literature filter" }).click();
      await expect(downloads.chip("Literature")).toHaveAttribute("aria-checked", "false");
      await expect(downloads.cards.first()).toBeVisible();
      await expect(downloads.emptyState).toHaveCount(0);
      await expect(downloads.searchBox).toHaveValue("colocalisation");
    });

    test("with several categories selected the empty state offers to remove the filters", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.chip("Ontology").click();
      await downloads.search("colocalisation");
      await downloads.expectShown(0);
      await expect(downloads.emptyState.getByRole("heading")).toHaveText(
        "No Literature, Ontology datasets match “colocalisation”"
      );
      await downloads.emptyState.getByRole("button", { name: "Remove filters" }).click();
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
      for (const card of await downloads.cards.all()) {
        await expect(downloads.addButton(card)).toHaveAttribute("aria-pressed", "true");
      }
    });

    test("Add all only adds what is not in the bag yet", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.chip("Literature").click();
      await downloads.expectShown(LITERATURE_IDS.length);
      await downloads.addButton(downloads.cards.first()).click();
      await downloads.expectBagCount(1);
      await expect(downloads.addAllButton).toHaveText(`+ Add all ${LITERATURE_IDS.length - 1} to bag`);
      await downloads.addAllButton.click();
      await downloads.expectBagCount(LITERATURE_IDS.length);
    });
  });

  test.describe("the bag", () => {
    test("adding a dataset marks its card and counts it; adding again takes it out", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      const card = downloads.card(TARGET.name);
      const add = downloads.addButton(card);
      await add.click();
      await expect(add).toHaveAccessibleName(`Remove ${TARGET.name} from bag`);
      await expect(add).toHaveAttribute("aria-pressed", "true");
      await expect(add).toHaveText("In bag");
      await downloads.expectBagCount(1);

      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.expectBagCount(2);

      await add.click();
      await expect(add).toHaveAccessibleName(`Add ${TARGET.name} to bag`);
      await expect(add).toHaveText("Add");
      await downloads.expectBagCount(1);
    });

    test("the drawer lists the datasets with a schema link, and Remove takes one out", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.openBag(2);

      await expect(downloads.drawer.getByRole("heading", { level: 2 })).toHaveText("Your data bundle");
      await expect(downloads.drawer.getByRole("heading", { name: "Datasets · file location" })).toBeVisible();
      await expect(downloads.drawerRows.nth(0)).toContainText(TARGET.name);
      await expect(downloads.drawerRows.nth(1)).toContainText(DISEASE.name);
      await expect(downloads.drawerRow(TARGET.name).getByRole("link", { name: "Schema" })).toHaveAttribute(
        "href",
        `/downloads/${TARGET.id}/schema`
      );

      await downloads.drawerRow(DISEASE.name).getByRole("button", { name: "Remove" }).click();
      await expect(downloads.drawerRows).toHaveCount(1);
      await expect(downloads.drawer.getByText("1 dataset", { exact: true })).toBeVisible();
      await expect(downloads.drawerRow(DISEASE.name)).toHaveCount(0);
      await downloads.expectBagCount(1);

      await downloads.closeBagButton.click();
      await expect(downloads.drawer).toBeHidden();
      await expect(downloads.addButton(downloads.card(DISEASE.name))).toHaveAttribute("aria-pressed", "false");
      await expect(downloads.addButton(downloads.card(TARGET.name))).toHaveAttribute("aria-pressed", "true");
    });

    test("the drawer closes with Escape", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
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
      await expect(downloads.drawer.getByRole("heading", { name: /^Access script/ })).toHaveCount(0);
    });

    test("Empty bag clears it at once and Undo brings it back", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.openBag(2);

      await downloads.emptyBagButton.click();
      await expect(downloads.drawer).toBeHidden();
      await downloads.expectBagCount(0);
      await expect(downloads.undoSnackbar).toBeVisible();
      await expect(downloads.addButton(downloads.card(TARGET.name))).toHaveAttribute("aria-pressed", "false");

      await downloads.undoButton.click();
      await downloads.expectBagCount(2);
      await expect(downloads.undoSnackbar).toBeHidden();
      await expect(downloads.addButton(downloads.card(TARGET.name))).toHaveAttribute("aria-pressed", "true");
      await expect(downloads.addButton(downloads.card(DISEASE.name))).toHaveAttribute("aria-pressed", "true");
    });

    test("the bag survives a reload and is stored as dataset ids, not in the URL", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.expectBagCount(2);
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), BASKET_STORAGE_KEY))
        .toBe(JSON.stringify([TARGET.id, DISEASE.id]));
      expect(page.url()).not.toContain(TARGET.id);

      await page.reload();
      await expect(downloads.counter).toBeVisible();
      await downloads.expectBagCount(2);
      await expect(downloads.addButton(downloads.card(TARGET.name))).toHaveAttribute("aria-pressed", "true");
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
      await expect(downloads.drawerRow(TARGET.name)).toBeVisible();
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), BASKET_STORAGE_KEY))
        .toBe(JSON.stringify([TARGET.id]));
    });

    test("a bag that is not valid JSON in storage is ignored", async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.setItem(key, "{not json"), BASKET_STORAGE_KEY);
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.expectBagCount(0);
      await expect(downloads.cards.first()).toBeVisible();
    });

    test("the bag is not changed by the filters", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.chip("Literature").click();
      await downloads.search("literature");
      await downloads.expectBagCount(1);
      await downloads.openBag(1);
      await expect(downloads.drawerRow(TARGET.name)).toBeVisible();
    });
  });

  test.describe("access scripts of the bag", () => {
    test("one tab per tool, each script listing the bag's datasets and the release locations", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.openBag(2);

      await expect(downloads.drawer.getByRole("heading", { name: "Access script · all 2 datasets" })).toBeVisible();
      for (const tab of SCRIPT_TABS) await expect(downloads.scriptTab(tab)).toBeVisible();

      await test.step("AWS", async () => {
        await downloads.scriptTab("AWS CLI").click();
        await expect(downloads.scriptText).toContainText(/BASE="s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output"/);
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
        await expect(downloads.scriptText).toContainText("aws s3 cp");
        await expect(downloads.scriptText).toContainText("--no-sign-request");
      });

      await test.step("Google Cloud with its billing project note", async () => {
        await downloads.scriptTab("Google Cloud CLI").click();
        await expect(downloads.scriptText).toContainText(/BASE="gs:\/\/open-targets-data-releases\/\d+\.\d+\/output"/);
        await expect(downloads.scriptText).toContainText("gcloud storage cp");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
        await expect(downloads.drawer).toContainText("You need to specify a billing project");
      });

      await test.step("Rsync", async () => {
        await downloads.scriptTab("Rsync").click();
        await expect(downloads.scriptText).toContainText(/BASE="rsync\.ebi\.ac\.uk::pub\/databases\/opentargets\/platform\/\d+\.\d+\/output"/);
        await expect(downloads.scriptText).toContainText("rsync -rpltvz");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
      });

      await test.step("Wget", async () => {
        await downloads.scriptTab("Wget").click();
        await expect(downloads.scriptText).toContainText(/BASE="ftp:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output"/);
        await expect(downloads.scriptText).toContainText("--cut-dirs=6");
        await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);
      });
    });

    test("the script follows the bag: a removed dataset leaves it and a new one joins it", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.openBag(1);
      await expect(downloads.drawer.getByRole("heading", { name: "Access script · all 1 dataset" })).toBeVisible();
      await downloads.expectScriptDatasets([TARGET.id]);

      await downloads.closeBagButton.click();
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.openBag(2);
      await downloads.expectScriptDatasets([TARGET.id, DISEASE.id]);

      await downloads.drawerRow(TARGET.name).getByRole("button", { name: "Remove" }).click();
      await downloads.expectScriptDatasets([DISEASE.id]);
    });

    test("the copy button puts the script on the clipboard", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.addButton(downloads.card(TARGET.name)).click();
      await downloads.openBag(1);

      await downloads.scriptTab("Wget").click();
      const shown = (await downloads.scriptText.innerText()).replace(/ /g, " ");
      await downloads.copyScriptButton("Wget").click();
      await expect(page.getByRole("tooltip", { name: "Copied" })).toBeVisible();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toContain(`BASE="ftp://ftp.ebi.ac.uk/pub/databases/opentargets/platform/`);
      expect(copied).toContain(TARGET.id);
      expect(copied.replace(/\s+/g, "")).toBe(shown.replace(/\s+/g, ""));
    });
  });

  test.describe("first add coach mark", () => {
    // These tests start from a browser that has never added to the bag.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.removeItem(key), COACH_MARK_STORAGE_KEY);
    });

    test("the first dataset added opens the coach mark; Open bag opens the drawer", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await expect(downloads.coachMark).toHaveCount(0);

      await downloads.addButton(downloads.card(TARGET.name)).click();
      await expect(downloads.coachMark).toBeVisible();
      await expect(downloads.coachMark).toContainText("Collect the datasets you need here");
      await downloads.coachMark.getByRole("button", { name: "Open bag" }).click();
      await expect(downloads.coachMark).toHaveCount(0);
      await expect(downloads.drawer).toBeVisible();
    });

    test("Keep browsing dismisses it and it does not come back for the next dataset", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();

      await downloads.addButton(downloads.card(TARGET.name)).click();
      await expect(downloads.coachMark).toBeVisible();
      await downloads.coachMark.getByRole("button", { name: "Keep browsing" }).click();
      await expect(downloads.coachMark).toHaveCount(0);

      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.expectBagCount(2);
      await expect(downloads.coachMark).toHaveCount(0);
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), COACH_MARK_STORAGE_KEY))
        .toBe("1");
    });
  });

  test.describe("schema and access dialogs", () => {
    test("Schema opens the dataset's columns and the URL carries the dataset", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.schemaLink(downloads.card(TARGET.name)).click();

      await expect(page).toHaveURL(/\/downloads\/target\/schema$/);
      await expect(downloads.datasetDialog).toBeVisible();
      await expect(downloads.datasetDialog.getByText(`Dataset: ${TARGET.id}`)).toBeVisible();
      await expect(downloads.schemaTable.getByRole("columnheader")).toHaveText(["Column", "Data Type", "Description"]);
      // the first column of the target dataset is its primary key
      await expect(downloads.schemaTable.getByRole("row").nth(1)).toContainText("│⎯id");
      await expect(downloads.schemaTable.getByRole("row").nth(1)).toContainText("Text");
      await expect(downloads.schemaTable).toContainText("approvedSymbol");
      await expect(downloads.dialogSwitchButton).toHaveText("Access Data");
    });

    test("a schema deep link opens the dialog over the page, and Close returns to /downloads", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/disease/schema");
      await expect(downloads.datasetDialog).toBeVisible();
      await expect(downloads.datasetDialog.getByText("Dataset: disease")).toBeVisible();
      await expect(downloads.schemaTable).toContainText("│⎯id");

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

    test("the schema marks primary keys, foreign keys and nests structs", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/evidence_clinical_precedence/schema");
      const table = downloads.schemaTable;
      await expect(table.getByRole("row").nth(1)).toBeVisible();

      const fk = table.getByRole("row").filter({ hasText: "│⎯targetId" }).first();
      await expect(fk).toContainText("Text");
      await fk.locator("svg").hover();
      await expect(page.getByRole("tooltip", { name: "Foreign Key: target/id" })).toBeVisible();

      const pk = table.getByRole("row").filter({ hasText: /^│⎯id\b/ }).first();
      await pk.locator("svg").hover();
      await expect(page.getByRole("tooltip", { name: "Primary Key" })).toBeVisible();

    });

    test("struct columns are followed by their indented sub-columns", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto(`/downloads/${TARGET.id}/schema`);
      const struct = downloads.schemaTable.getByRole("row").filter({ hasText: "│⎯genomicLocation" });
      await expect(struct).toContainText("Struct");
      await expect(downloads.schemaTable.getByRole("cell", { name: /^│⎯│⎯chromosome/ })).toBeVisible();
    });

    test("Access data opens the file locations and the scripts of one dataset", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.accessLink(downloads.card(TARGET.name)).click();

      await expect(page).toHaveURL(/\/downloads\/target\/access$/);
      const dialog = downloads.datasetDialog;
      await expect(dialog.getByText("Dataset: target")).toBeVisible();
      await expect(dialog.getByText("File Location:")).toBeVisible();
      await expect(dialog.getByText("Access Script:")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Browse (link)" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: /^https:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target$/ })).toHaveAttribute(
        "href",
        /^https:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target$/
      );
      await expect(dialog.getByRole("button", { name: "FTP location" })).toBeVisible();

      await dialog.getByRole("button", { name: "Google Cloud", exact: true }).click();
      await expect(dialog).toContainText(/gs:\/\/open-targets-data-releases\/\d+\.\d+\/output\/target/);
      await dialog.getByRole("button", { name: "AWS", exact: true }).click();
      await expect(dialog).toContainText(/s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output\/target/);

    });

    for (const script of [
      { tab: "Rsync", command: /rsync -rpltvz --delete rsync\.ebi\.ac\.uk::pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target \./ },
      { tab: "Wget", command: /wget --recursive --no-parent --no-host-directories --cut-dirs 6 ftp:\/\/ftp\.ebi\.ac\.uk\/pub\/databases\/opentargets\/platform\/\d+\.\d+\/output\/target \./ },
      { tab: "Google Cloud CLI", command: /gcloud storage cp -r --billing-project \$\{PROJECT_ID\} gs:\/\/open-targets-data-releases\/\d+\.\d+\/output\/target\/ \./ },
      { tab: "AWS CLI", command: /aws s3 cp --recursive --no-sign-request s3:\/\/open-targets-public-data-releases\/platform\/\d+\.\d+\/output\/target\/ \./ },
    ]) {
      test(`the access dialog's ${script.tab} command downloads the dataset`, async ({ page }) => {
        const downloads = new DownloadsPage(page);
        await downloads.goto(`/downloads/${TARGET.id}/access`);
        const dialog = downloads.datasetDialog;
        await dialog.getByRole("button", { name: script.tab, exact: true }).click();
        await expect(dialog.locator("code").last()).toHaveText(script.command);
        if (script.tab === "Google Cloud CLI") await expect(dialog).toContainText("You need to specify a billing project");
      });
    }

    test("the dialog switches between Access and Schema and keeps the dataset", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto("/downloads/disease/access");
      await expect(downloads.datasetDialog.getByText("File Location:")).toBeVisible();
      await expect(downloads.dialogSwitchButton).toHaveText("Show Schema");

      await downloads.dialogSwitchButton.click();
      await expect(page).toHaveURL(/\/downloads\/disease\/schema$/);
      await expect(downloads.schemaTable).toBeVisible();
      await expect(downloads.dialogSwitchButton).toHaveText("Access Data");

      await downloads.dialogSwitchButton.click();
      await expect(page).toHaveURL(/\/downloads\/disease\/access$/);
      await expect(downloads.datasetDialog.getByText("File Location:")).toBeVisible();
    });

    test("the browser back button closes the dialog", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.schemaLink(downloads.card(DISEASE.name)).click();
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
      await downloads.addButton(downloads.card(DISEASE.name)).click();
      await downloads.openBag(1);
      await downloads.drawerRow(DISEASE.name).getByRole("link", { name: "Schema" }).click();
      await expect(page).toHaveURL(/\/downloads\/disease\/schema$/);
      await expect(downloads.datasetDialog.getByText("Dataset: disease")).toBeVisible();
      await expect(downloads.schemaTable).toBeVisible();
    });

    test("a dataset that does not exist sends the visitor back to the list", async ({ page, pageHealth }) => {
      void pageHealth;
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
    test("Croissant explains the format, links to it and downloads the metadata", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("Croissant").click();
      const popover = page.getByRole("presentation").filter({ hasText: "About this format" });
      await expect(popover).toContainText("conforms to Croissant");
      await expect(popover.getByRole("link", { name: "Read more" })).toHaveAttribute("href", /croissant/i);

      const download = page.waitForEvent("download");
      await popover.getByText("Download Croissant metadata").click();
      expect((await download).suggestedFilename()).toBe("croissant.json");
    });

    test("Parquet links to the format documentation", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("Parquet").click();
      const popover = page.getByRole("presentation").filter({ hasText: "File Format" });
      await expect(popover.getByRole("link", { name: "here." })).toHaveAttribute(
        "href",
        "https://parquet.apache.org/docs/overview/"
      );
    });

    test("the version tag names the release and links to the release notes", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const version = ((await downloads.versionTag.textContent()) ?? "").trim();
      await downloads.versionTag.click();
      const popover = page.getByRole("presentation").filter({ hasText: "Current version" });
      await expect(popover).toContainText(`Current version: ${version}`);
      await expect(popover.getByRole("link", { name: "Read more" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/release-notes"
      );
    });

    test("Cite Us opens the publication of the Platform", async ({ page }) => {
      await stubEuropePmc(page);
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      await downloads.tag("Cite Us").click();
      const drawer = page.getByRole("presentation").filter({ hasText: "Stubbed publication" });
      await expect(drawer).toContainText(/Stubbed publication \d+/);
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
      await expect(downloads.categoryGroup).toHaveCount(0);

      await downloads.cardsToggle.click();
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(downloads.cards.first()).toBeVisible();
      await expect(downloads.graphNodes).toHaveCount(0);
    });

    test("?view=network opens the network, survives a reload, and any other value shows the cards", async ({ page }) => {
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

    test("draws a node for each connected dataset, with the legend of the categories", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.goto();
      const total = await downloads.totalDatasets();
      await downloads.networkToggle.click();
      await expect(downloads.graphNodes.first()).toBeVisible();

      const nodes = await downloads.graphNodes.count();
      expect(nodes, "datasets with no reference to another dataset are left off the canvas").toBeGreaterThan(total / 2);
      expect(nodes).toBeLessThanOrEqual(total);
      await expect(downloads.node(TARGET.id)).toBeVisible();
      await expect(downloads.node(DISEASE.id)).toBeVisible();
      await expect(downloads.node(CLINICAL_INDICATION.id)).toBeVisible();

      await expect(downloads.legend).toBeVisible();
      for (const category of ["Target", "Drug", "Genetics", "Ontology"]) {
        await expect(downloads.legend.getByRole("listitem").filter({ hasText: category }).first()).toBeVisible();
      }
      await expect(downloads.legend).not.toContainText("In bag");
      await expect(downloads.page.getByText("Hover a node to preview · click to select · scroll to zoom")).toBeVisible();
    });

    test("selecting a node docks its details with the datasets it connects to", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();

      await expect(downloads.panels).toHaveCount(0);
      const panel = await downloads.selectNode(CLINICAL_INDICATION.id, CLINICAL_INDICATION.name);
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(CLINICAL_INDICATION.name);
      await expect(panel).toContainText(CLINICAL_INDICATION.id);
      await expect(panel).toContainText("Drug");
      await expect(downloads.selectedChip).toHaveText(`Selected: ${CLINICAL_INDICATION.name}`);
      await expect(downloads.page.getByText("Esc or click the canvas to clear")).toBeVisible();
      await expect(downloads.node(CLINICAL_INDICATION.id)).toHaveClass(/selected/);

      const heading = panel.getByRole("heading", { level: 4 });
      await expect(heading).toHaveText(/^Connected datasets · \d+$/);
      const connected = Number(/(\d+)$/.exec((await heading.textContent()) ?? "")?.[1]);
      expect(connected).toBeGreaterThan(0);
      await expect(panel.getByRole("listitem")).toHaveCount(connected);
      // a dataset is never listed as its own neighbour, and every neighbour is a real dataset
      await expect(panel.getByRole("listitem").filter({ hasText: CLINICAL_INDICATION.id })).toHaveCount(0);
      for (const row of await panel.getByRole("listitem").all()) {
        await expect(row.getByRole("button").first()).toBeVisible();
      }
      await expect(panel.getByRole("link", { name: "Schema" })).toHaveAttribute("href", `/downloads/${CLINICAL_INDICATION.id}/schema?view=network`);
      await expect(panel.getByRole("link", { name: "Access data" })).toHaveAttribute("href", `/downloads/${CLINICAL_INDICATION.id}/access?view=network`);
    });

    test("clicking a connected dataset moves the selection to it", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const panel = await downloads.selectNode(CLINICAL_INDICATION.id, CLINICAL_INDICATION.name);

      const first = panel.getByRole("listitem").first();
      const neighbourName = ((await first.getByRole("button").first().locator("div").first().textContent()) ?? "").trim();
      const neighbourId = ((await first.getByRole("button").first().locator("div").nth(1).textContent()) ?? "").trim();
      expect(neighbourId).toMatch(/^[a-z0-9_]+$/);
      await first.getByRole("button").first().click();

      await expect(downloads.panel(neighbourName)).toBeVisible();
      await expect(downloads.panels).toHaveCount(1);
      await expect(downloads.selectedChip).toHaveText(`Selected: ${neighbourName}`);
      await expect(downloads.node(neighbourId)).toHaveClass(/selected/);
      await expect(downloads.node(CLINICAL_INDICATION.id)).not.toHaveClass(/selected/);
      // the dataset we came from is a neighbour of the new selection
      await expect(downloads.panel(neighbourName).getByRole("listitem").filter({ hasText: CLINICAL_INDICATION.id })).toHaveCount(1);
    });

    test("the selection clears with Escape, the close button, the chip and a click on the canvas", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();

      const panel = await downloads.selectNode(TARGET.id, TARGET.name);
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(downloads.node(TARGET.id)).not.toHaveClass(/selected/);

      await downloads.selectNode(TARGET.id, TARGET.name);
      await panel.getByRole("button", { name: "Clear selection" }).click();
      await expect(panel).toBeHidden();

      await downloads.selectNode(TARGET.id, TARGET.name);
      await downloads.selectedChipClear.click();
      await expect(panel).toBeHidden();
      await expect(downloads.selectedChip).toHaveCount(0);

      await downloads.selectNode(TARGET.id, TARGET.name);
      const svg = page.locator("svg").filter({ has: page.locator("g.zoom-layer") });
      const box = await svg.boundingBox();
      expect(box).not.toBeNull();
      // the top-left corner of the canvas is empty
      await svg.click({ position: { x: 4, y: 4 } });
      await expect(panel).toBeHidden();
    });

    test("a hub's details group the connections by category, filter them and collapse", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const panel = await downloads.selectNode(TARGET.id, TARGET.name);

      const heading = panel.getByRole("heading", { level: 4 });
      const connected = Number(/(\d+)$/.exec((await heading.textContent()) ?? "")?.[1]);
      expect(connected, "the target dataset is referenced by many others").toBeGreaterThan(8);

      const groups = panel.getByRole("button", { expanded: true }).or(panel.getByRole("button", { expanded: false }));
      expect(await groups.count()).toBeGreaterThan(1);

      await test.step("filter narrows the list to matching datasets", async () => {
        const filter = panel.getByRole("searchbox", { name: "Filter connections" });
        await filter.fill("evidence_gwas");
        const rows = panel.getByRole("listitem");
        await expect(rows.first()).toBeVisible();
        for (const text of await rows.allTextContents()) expect(text.toLowerCase()).toContain("evidence_gwas");
        await filter.fill("zzzqqq");
        await expect(panel.getByRole("listitem")).toHaveCount(0);
        await filter.fill("");
      });

      await test.step("Collapse all hides every row, Expand all shows them", async () => {
        await panel.getByRole("button", { name: "Expand all" }).or(panel.getByRole("button", { name: "Collapse all" })).click();
        const toggle = panel.getByRole("button", { name: /^(Expand|Collapse) all$/ });
        const label = await toggle.textContent();
        if (label === "Expand all") {
          await toggle.click();
          await expect(toggle).toHaveText("Collapse all");
          await expect(panel.getByRole("listitem")).toHaveCount(connected);
        } else {
          await expect(panel.getByRole("listitem")).toHaveCount(0);
        }
      });
    });

    test("a node's panel adds the dataset to the bag, and its dialogs keep the network view", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const panel = await downloads.selectNode(DISEASE.id, DISEASE.name);

      await panel.getByRole("button", { name: `Add ${DISEASE.name} to bag` }).click();
      await downloads.expectBagCount(1);
      await expect(panel.getByRole("button", { name: `Remove ${DISEASE.name} from bag` })).toHaveText("In bag");

      await panel.getByRole("link", { name: "Schema" }).click();
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
      await downloads.nodeBox(DISEASE.id).hover();

      const popover = downloads.nodePopover(DISEASE.name);
      await expect(popover).toBeVisible();
      await expect(popover).toContainText(DISEASE.id);
      await expect(popover.getByRole("link", { name: "Schema" })).toHaveAttribute("href", /\/downloads\/disease\/schema/);
      await expect(popover.getByRole("link", { name: "Access data" })).toHaveAttribute("href", /\/downloads\/disease\/access/);

      await popover.getByRole("button", { name: `Add ${DISEASE.name} to bag` }).click();
      await downloads.expectBagCount(1);
      await expect(popover.getByRole("button", { name: `Remove ${DISEASE.name} from bag` })).toHaveText("In bag");
    });

    test("the bag scope is disabled while the bag is empty, then shows only the bag", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const all = downloads.scopeRadio("All datasets");
      await expect(all).toHaveAttribute("aria-checked", "true");
      const bagRadio = downloads.scopeRadio(/^Bag/);
      await expect(bagRadio).toHaveText("Bag");
      await expect(bagRadio).toHaveAttribute("aria-disabled", "true");
      await bagRadio.click({ force: true });
      await expect(all).toHaveAttribute("aria-checked", "true");
      await expect(bagRadio).toHaveAttribute("aria-checked", "false");

      await downloads.nodeBox(DISEASE.id).hover();
      await downloads.nodePopover(DISEASE.name).getByRole("button", { name: `Add ${DISEASE.name} to bag` }).click();
      await downloads.expectBagCount(1);
      await expect(bagRadio).toHaveText("Bag · 1");
      await expect(bagRadio).not.toHaveAttribute("aria-disabled", "true");

      await bagRadio.click();
      await expect(bagRadio).toHaveAttribute("aria-checked", "true");
      await expect(all).toHaveAttribute("aria-checked", "false");
      await expect(downloads.page.getByText("1 dataset in your bag · 0 direct connections between them")).toBeVisible();
      await expect(downloads.legend).toContainText("In bag");
      await expect(downloads.node(DISEASE.id)).toHaveClass(/in-basket/);
      await expect(downloads.node(TARGET.id)).not.toHaveClass(/in-basket/);

      await all.click();
      await expect(all).toHaveAttribute("aria-checked", "true");
      await expect(downloads.legend).not.toContainText("In bag");
    });

    test("emptying the bag while it is the scope returns the network to all datasets", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.nodeBox(DISEASE.id).hover();
      await downloads.nodePopover(DISEASE.name).getByRole("button", { name: `Add ${DISEASE.name} to bag` }).click();
      await downloads.scopeRadio(/^Bag/).click();
      await expect(downloads.scopeRadio(/^Bag/)).toHaveAttribute("aria-checked", "true");

      await downloads.openBag(1);
      await downloads.emptyBagButton.click();
      await downloads.expectBagCount(0);
      await expect(downloads.scopeRadio("All datasets")).toHaveAttribute("aria-checked", "true");
      await expect(downloads.scopeRadio(/^Bag/)).toHaveText("Bag");
    });

    test("has no layout switch: the nodes sit in category lanes", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await expect(downloads.scopeRadio("All datasets")).toBeVisible();
      await expect(downloads.layoutSwitch).toHaveCount(0);
      await expect(page.getByRole("radio", { name: /^(Radial|Stacked)$/ })).toHaveCount(0);

      const lanes = await downloads.lanes.count();
      expect(lanes, "one lane per category of the connected datasets").toBeGreaterThan(2);
      await expect(downloads.legend.getByRole("listitem").filter({ hasText: /^(?!Category)/ })).not.toHaveCount(0);

      const placed = await downloads.nodeLanes();
      expect(placed.length).toBeGreaterThan(20);
      for (const { id, lane } of placed) expect(lane, `${id} should sit inside a category lane`).not.toBeNull();
      const byId = Object.fromEntries(placed.map((p) => [p.id, p.lane]));
      expect(byId[`graph-node-${TARGET.id}`], "the target dataset is in the Target lane").toMatch(/^Target/);
      expect(byId[`graph-node-${DISEASE.id}`]).toMatch(/Disease/);
      expect(byId[`graph-node-${TARGET.id}`]).not.toBe(byId[`graph-node-${DISEASE.id}`]);
    });

    test("the zoom buttons change the scale of the canvas and Fit restores it", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      const fitted = await downloads.zoomLayer.getAttribute("transform");
      expect(fitted).toMatch(/scale\(/);

      await page.getByRole("button", { name: "Zoom in" }).click();
      await expect.poll(() => downloads.zoomLayer.getAttribute("transform")).not.toBe(fitted);
      const zoomedIn = scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? "");
      expect(zoomedIn).toBeGreaterThan(scaleOf(fitted ?? ""));

      await page.getByRole("button", { name: "Fit", exact: true }).click();
      await expect.poll(async () => scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? "")).toBeCloseTo(scaleOf(fitted ?? ""), 2);

      await page.getByRole("button", { name: "Zoom out" }).click();
      await expect.poll(async () => scaleOf((await downloads.zoomLayer.getAttribute("transform")) ?? "")).toBeLessThan(scaleOf(fitted ?? ""));
    });

    test("the bag drawer works from the network view and in-bag nodes are marked", async ({ page }) => {
      const downloads = new DownloadsPage(page);
      await downloads.gotoNetwork();
      await downloads.nodeBox(DISEASE.id).hover();
      await downloads.nodePopover(DISEASE.name).getByRole("button", { name: `Add ${DISEASE.name} to bag` }).click();
      await downloads.scopeRadio(/^Bag/).click();
      await expect(downloads.node(DISEASE.id)).toHaveClass(/in-basket/);
      await downloads.openBag(1);
      await expect(downloads.drawerRow(DISEASE.name)).toBeVisible();
      await downloads.drawerRow(DISEASE.name).getByRole("button", { name: "Remove" }).click();
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

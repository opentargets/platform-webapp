import { expect, test } from "../../fixtures";
import { ENTITY_ROUTE_PATTERN, type SearchEntity } from "../../POM/page/search/searchData";
import { HomePage } from "../../POM/page/site/homePage";
import {
  CHIP_ENTITIES,
  HELP_PANELS,
  MAIN_MENU,
  type MetaVersions,
  MONTH_NAMES,
} from "../../POM/page/site/siteData";
import { failMeta, SiteShell, stubMeta, waitForMeta } from "../../POM/page/site/siteShell";

/** The text the home page shows for a data release, as its code builds it. */
function lastUpdateText({ data }: MetaVersions): string {
  const iteration = data.revision ? `.${data.revision}` : "";
  return `Last update: ${MONTH_NAMES[Number(data.month) - 1]} 20${data.year} (${data.year}.${data.month}${iteration})`;
}

test.describe("Home page", () => {
  test("renders the search box, suggestions, menu, about text and footer @smoke", async ({
    page,
  }) => {
    const home = new HomePage(page);
    const shell = new SiteShell(page);
    await home.goto();

    await expect(page).toHaveTitle("Open Targets Platform");
    await expect(page).toHaveURL(/\/$/);

    await test.step("the search box invites a search and shows its shortcut", async () => {
      await expect(home.searchButton).toContainText("Search...");
      await expect(page.getByTestId("global-search-shortcut")).toHaveText(/^(⌘ K|Ctrl\+K)$/);
    });

    await test.step("the header has no logo or search of its own, only the menu", async () => {
      await expect(shell.header.getByTestId("global-search-button")).toHaveCount(0);
      await expect(shell.header.getByRole("link", { name: /Open Targets/ })).toHaveCount(0);
      await expect(shell.inlineLinks).toHaveText(MAIN_MENU.map((item) => item.name));
    });

    await test.step("the About and Get started blocks follow", async () => {
      await expect(home.aboutHeading).toBeVisible();
      await expect(page.getByText(/The Platform is a freely available resource/)).toBeVisible();
      await expect(home.getStartedHeading).toBeVisible();
    });

    await test.step("the footer closes the page", async () => {
      await expect(shell.footer).toBeVisible();
      await expect(shell.footerHeadings).toHaveText([
        "About",
        "Help",
        "Follow us",
        "Partners",
        "About Open Targets",
      ]);
    });
  });

  test.describe("suggestion chips", () => {
    test("there are two chips for each entity type, each a known suggestion with the right route", async ({
      page,
    }) => {
      const home = new HomePage(page);
      await home.goto();
      const chips = await home.chipFacts();

      expect(
        chips.map((chip) => chip.entity),
        "two chips per entity type, in the order target, disease, drug, variant, study"
      ).toEqual(CHIP_ENTITIES.flatMap((entity) => [entity, entity]));
      for (const chip of chips) home.expectChipIsSuggestion(chip);
      for (const entity of CHIP_ENTITIES) {
        const ids = chips.filter((chip) => chip.entity === entity).map((chip) => chip.id);
        expect(new Set(ids).size, `the two ${entity} chips should be different`).toBe(2);
      }
    });

    const TITLE: Record<SearchEntity, (label: string) => RegExp> = {
      target: (label) =>
        new RegExp(`^Diseases associated with ${label} \\| Open Targets Platform$`),
      disease: () => /^Targets associated with .+ \| Open Targets Platform$/,
      // The chip may show a trade name (VIAGRA) or an rsID for what the page names otherwise.
      drug: () => /^.+ profile page \| Open Targets Platform$/,
      variant: () => /^.+ profile page \| Open Targets Platform$/,
      study: (label) => new RegExp(`^${label} profile page \\| Open Targets Platform$`),
    };

    for (const entity of CHIP_ENTITIES) {
      test(`a ${entity} chip opens that ${entity}'s page, and back returns to the home page`, async ({
        page,
      }) => {
        const home = new HomePage(page);
        await home.goto();
        const chip = home.chipsOf(entity).first();
        await expect(chip).toBeVisible();
        const href = await chip.getAttribute("href");
        const label = (await chip.textContent()) ?? "";
        expect(href).toMatch(ENTITY_ROUTE_PATTERN[entity]);

        await chip.click();
        await expect(page).toHaveURL(href as string);
        await expect(page).toHaveTitle(TITLE[entity](label));
        await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
        await expect(page.getByTestId("app-footer")).toBeVisible();

        await page.goBack();
        await expect(page).toHaveURL(/\/$/);
        await expect(home.searchButton).toBeVisible();
      });

      test(`hovering a ${entity} chip previews the ${entity}`, async ({ page }) => {
        const home = new HomePage(page);
        await home.goto();
        const chip = home.chipsOf(entity).first();
        const href = (await chip.getAttribute("href")) as string;
        const id = href.split("/")[2];

        await chip.hover();
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText(`${entity}/${id}`);
        // The preview is loaded from the API: it has more than the entity's id.
        await expect(tooltip).not.toHaveText(`${entity}/${id}`);

        await page.mouse.move(0, 0);
        await expect(tooltip).toBeHidden();
      });
    }
  });

  test.describe("search box", () => {
    test("opens the search dialog, which offers the same suggestions as the chips", async ({
      page,
    }) => {
      const home = new HomePage(page);
      await home.goto();
      const chips = await home.chipFacts();
      await home.openSearch();

      // A variant is listed by its id in the dialog and by its rsID, when it has one, on the chip.
      const expected = chips.map((chip) => (chip.entity === "variant" ? chip.id : chip.label));
      await expect(home.dialogSuggestions).toHaveText(expected);
    });

    test("a suggestion in the dialog opens the same page as its chip", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      const [first] = await home.chipFacts();
      await home.openSearch();

      await home.dialogSuggestions.first().click();
      await expect(page).toHaveURL(first.href);
      await expect(page.getByTestId("profile-page-header-text")).toHaveText(first.label);
    });

    test("a typed term lists matches, and the top hit opens its page", async ({
      page,
      testConfig,
    }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.openSearch();

      await home.searchInput.fill(testConfig.disease.name as string);
      const topHit = page.getByTestId("top-hit-list-result-item").first();
      await expect(topHit).toContainText(new RegExp(testConfig.disease.name as string, "i"));
      for (const group of ["topHit", "targets", "diseases", "drugs", "studies"]) {
        await expect(page.getByTestId(`top-hit-list-item-${group}`), group).toBeVisible();
      }

      await topHit.click();
      await expect(page).toHaveURL(
        new RegExp(`/disease/${testConfig.disease.primary}/associations$`)
      );
    });

    test("Enter opens the search results page for the typed term", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.openSearch();

      await home.searchInput.fill("BRAF");
      await expect(page.getByTestId("top-hit-list-result-item").first()).toBeVisible();
      await home.searchInput.press("Enter");
      await expect(page).toHaveURL(/\/search\?q=BRAF/);
      await expect(page.getByTestId("search-results-heading")).toContainText("BRAF");
    });

    test("a term that matches nothing says so and still offers suggestions", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.openSearch();

      await home.searchInput.fill("zzqxjvkw");
      await expect(page.getByTestId("global-search-no-results")).toHaveText(
        "No search result found"
      );
      await expect(page.getByTestId("global-search-group-suggestions")).toBeVisible();
    });

    test("closing the dialog with its esc button leaves the home page", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.openSearch();

      await page.getByTestId("global-search-close").click();
      await expect(home.searchDialog).toHaveCount(0);
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe("Get started panels and menu", () => {
    test("the five panels link to the downloads, API, documentation, publications and community", async ({
      page,
    }) => {
      const home = new HomePage(page);
      await home.goto();
      await expect(home.getStartedHeading).toBeVisible();
      for (const panel of HELP_PANELS) {
        await expect(home.helpPanel(panel.label), panel.label).toHaveAttribute("href", panel.href);
      }
    });

    test("the downloads panel opens the downloads page", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.helpPanel("Download all of our open datasets").click();
      await expect(page).toHaveURL(/\/downloads$/);
      await expect(page).toHaveTitle(/^Data downloads/);
    });

    test("the API panel opens the API page", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.helpPanel("Access data with our GraphQL API").click();
      await expect(page).toHaveURL(/\/api$/);
      await expect(page).toHaveTitle("API | Open Targets Platform");
    });

    test("the chevron scrolls the page down by one screen", async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      await home.scrollDownButton.click();
      await expect
        .poll(() => page.evaluate(() => window.scrollY), "the page should scroll down")
        .toBeGreaterThan(0);
      await expect(home.aboutHeading).toBeInViewport();
    });

    test("menu links open their pages", async ({ page }) => {
      const home = new HomePage(page);
      const shell = new SiteShell(page);
      await home.goto();
      for (const item of MAIN_MENU) {
        await expect(
          shell.header.getByRole("link", { name: item.name, exact: true }),
          item.name
        ).toHaveAttribute("href", item.href);
      }

      await shell.header.getByRole("link", { name: "Metrics", exact: true }).click();
      await expect(page).toHaveURL(/\/metrics$/);
      await expect(page).toHaveTitle("Data Metrics | Open Targets Platform");
    });

    test("on a narrow screen the menu collapses into the burger button", async ({ page }) => {
      await page.setViewportSize({ width: 500, height: 800 });
      const home = new HomePage(page);
      const shell = new SiteShell(page);
      await home.goto();

      await expect(shell.inlineLinks).toHaveCount(0);
      await shell.openMenu();
      await shell.expectMenu(MAIN_MENU);
    });
  });

  test.describe("data version", () => {
    test("shows the release the API reports", async ({ page }) => {
      const home = new HomePage(page);
      const meta = waitForMeta(page);
      await home.goto();
      const versions = await meta;

      await expect(home.dataVersion).toHaveText(lastUpdateText(versions));
      await expect(home.dataVersion.getByRole("link")).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/release-notes"
      );
    });

    test("builds the text from the version the API gives, with its revision", async ({ page }) => {
      await stubMeta(page, {
        data: { month: "3", year: "25", revision: "2" },
        api: { month: "8", year: "9", revision: "7" },
      });
      const home = new HomePage(page);
      await home.goto();

      await expect(home.dataVersion).toHaveText("Last update: March 2025 (25.3.2)");
    });

    test("names the month of any year the API reports", async ({ page }) => {
      // The app builds the date as `new Date(year + 2000, month - 1)` from strings, which
      // concatenates ("28" + 2000 = "282000") and is an invalid date from the year 28 on.
      await stubMeta(page, {
        data: { month: "1", year: "28", revision: "" },
        api: { month: "1", year: "0", revision: "0" },
      });
      const home = new HomePage(page);
      await home.goto();

      await expect(home.dataVersion).toHaveText("Last update: January 2028 (28.1)");
    });

    test("is left out, with the rest of the page intact, when the version cannot be read", async ({
      page,
      pageHealth,
    }) => {
      pageHealth.allow(
        /DataVersion/,
        "this test makes the meta query fail on purpose",
        "graphql-error"
      );
      pageHealth.allow(
        /meta is unavailable/,
        "logged by Apollo for the failing meta query",
        "console-error"
      );
      await failMeta(page);
      const home = new HomePage(page);
      await home.goto();

      await expect(home.dataVersion).toHaveCount(0);
      await expect(page.getByText(/Loading data version/)).toHaveCount(0);
      await expect(home.aboutHeading).toBeVisible();
    });
  });
});

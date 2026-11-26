import { expect, test } from "../../../fixtures";
import { MAIN_MENU, PARTNER_ONLY_MENU } from "../../../POM/page/site/siteData";
import { SiteShell } from "../../../POM/page/site/siteShell";

test.describe("Header", () => {
  test("shows the logo, the search box and a closed menu button", async ({ page }) => {
    const shell = new SiteShell(page);
    await page.goto("/api");

    await expect(shell.logoLink).toHaveAttribute("href", "/");
    await expect(shell.logoLink).toContainText("Open Targets");
    await expect(shell.logoLink).toContainText("Platform");
    await expect(shell.searchButton).toContainText("Search...");
    await expect(shell.menuButton).toBeVisible();
    await expect(shell.menuItems).toHaveCount(0);
  });

  test("the logo returns to the home page", async ({ page }) => {
    const shell = new SiteShell(page);
    await page.goto("/api");

    await shell.logoLink.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle("Open Targets Platform");
    await expect(page.getByTestId("home-suggestions")).toBeVisible();
  });

  test("is the same on a profile page", async ({ page, testConfig }) => {
    const shell = new SiteShell(page);
    await page.goto(`/drug/${testConfig.drug.primary}`);

    await expect(shell.logoLink).toBeVisible();
    await expect(shell.searchButton).toBeVisible();
    await expect(shell.menuButton).toBeVisible();
  });

  test.describe("search box", () => {
    test("opens the search dialog and a result opens its page", async ({ page, testConfig }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");

      await shell.searchButton.click();
      const input = page.getByTestId("global-search-input");
      await expect(input).toBeFocused();
      await input.fill(testConfig.disease.name as string);
      await page.getByTestId("top-hit-list-result-item").first().click();

      await expect(page).toHaveURL(new RegExp(`/disease/${testConfig.disease.primary}/associations$`));
      await expect(page.getByTestId("global-search-dialog")).toHaveCount(0);
    });

    test("the dialog closes and the page stays where it was", async ({ page }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");

      await shell.searchButton.click();
      await expect(page.getByTestId("global-search-dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("global-search-dialog")).toHaveCount(0);
      await expect(page).toHaveURL(/\/api$/);
    });
  });

  test.describe("main menu", () => {
    test("lists the public pages in order and nothing meant for partners", async ({ page }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");
      await shell.openMenu();

      await shell.expectMenu(MAIN_MENU);
      for (const name of PARTNER_ONLY_MENU) await expect(shell.menuItem(name), name).toHaveCount(0);
    });

    test("the burger button turns into a cross while the menu is open and back when it closes", async ({
      page,
    }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");
      const icon = shell.menuButton.locator("svg");

      await expect(icon).toHaveAttribute("data-icon", "bars");
      await shell.openMenu();
      await expect(icon).toHaveAttribute("data-icon", "xmark");
      await shell.menuButton.click();
      await expect(shell.menuItems).toHaveCount(0);
      await expect(icon).toHaveAttribute("data-icon", "bars");
    });

    test("clicking outside the menu closes it", async ({ page }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");
      await shell.openMenu();

      await page.mouse.click(5, 400);
      await expect(shell.menuItems).toHaveCount(0);
      await expect(page).toHaveURL(/\/api$/);
    });

    test("Tab closes the menu", async ({ page }) => {
      const shell = new SiteShell(page);
      await page.goto("/api");
      await shell.openMenu();

      await page.keyboard.press("Tab");
      await expect(shell.menuItems).toHaveCount(0);
    });

    const internal: { name: string; url: RegExp; title: RegExp }[] = [
      { name: "Metrics", url: /\/metrics$/, title: /^Data Metrics \| Open Targets Platform$/ },
      { name: "Data downloads", url: /\/downloads$/, title: /^Data downloads/ },
      { name: "API", url: /\/api$/, title: /^API \| Open Targets Platform$/ },
    ];

    for (const item of internal) {
      test(`"${item.name}" opens its page inside the app and closes the menu`, async ({ page }) => {
        const shell = new SiteShell(page);
        // Start from a page that is none of the targets, so the click has to change something.
        await page.goto("/search?q=braf");
        await expect(page.getByTestId("search-results-heading")).toContainText("BRAF");
        await shell.openMenu();

        await shell.menuItem(item.name).click();
        await expect(page).toHaveURL(item.url);
        await expect(page).toHaveTitle(item.title);
        await expect(shell.menuItems).toHaveCount(0);
        await expect(shell.footer).toBeVisible();
      });
    }

    test("on a narrow screen the small logo replaces the title and the menu keeps every entry", async ({ page }) => {
      await page.setViewportSize({ width: 420, height: 800 });
      const shell = new SiteShell(page);
      await page.goto("/api");

      await expect(shell.logoLink).toBeHidden();
      await expect(shell.header.getByRole("img", { name: "logo" })).toBeVisible();
      await shell.openMenu();
      await shell.expectMenu(MAIN_MENU);
    });
  });

  test("a partner-only page is not reachable on the public platform", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "the test opens a partner-only route on the public platform", "error-ui");
    await page.goto("/projects");

    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page).toHaveTitle("Open Targets Platform");
  });
});

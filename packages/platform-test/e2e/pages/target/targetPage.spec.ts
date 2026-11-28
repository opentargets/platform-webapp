import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { requireTarget, TargetPage, targetIdentity } from "../../../POM/page/target";
import { expectSections, sectionLocator } from "../../../utils/sections";

/**
 * The target page shell: the route, the header above the tabs, the Associated diseases
 * and Profile tabs, and what the app does with a target that does not exist.
 * The profile header, summary chips and sticky header are in targetProfile.spec.ts.
 */
test.describe("Target page", () => {
  test("the primary target renders its header and exactly the expected sections @smoke", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const identity = targetIdentity(ensgId);
    const target = new TargetPage(page);

    await target.goto(ensgId);

    await expect(target.symbol).toHaveText(identity.symbol);
    await expect(target.name).toHaveText(identity.name);
    await expect(target.uniprotLinks.getByRole("link")).toHaveText([...identity.uniprotIds]);
    await expectSections(page, expectedSectionsFor(ensgId));
  });

  test("the alternative target renders its header and exactly the expected sections @smoke", async ({
    page,
    testConfig,
  }) => {
    const ensgId = testConfig.target?.alternatives?.[0];
    if (!ensgId) throw new Error("testConfig.target.alternatives has no target to test");
    const identity = targetIdentity(ensgId);
    const target = new TargetPage(page);

    await target.goto(ensgId);

    await expect(target.symbol).toHaveText(identity.symbol);
    await expect(target.name).toHaveText(identity.name);
    await expect(target.uniprotLinks.getByRole("link")).toHaveText([...identity.uniprotIds]);
    await expectSections(page, expectedSectionsFor(ensgId));
  });

  test("the header names the target and links to its Ensembl, UniProt, GeneCards and HGNC records", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol, name, uniprotIds } = targetIdentity(ensgId);
    const target = new TargetPage(page);

    await target.goto(ensgId);

    await test.step("symbol, name and document title", async () => {
      await expect(target.symbol).toHaveText(symbol);
      await expect(target.symbol).toHaveAttribute("title", symbol);
      await expect(target.name).toHaveText(name);
      await expect(page).toHaveTitle(`${symbol} profile page | Open Targets Platform`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `Annotation information for ${symbol}`
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`/target/${ensgId}$`)
      );
    });

    await test.step("external links, in order, with nothing else among them", async () => {
      const links = target.externalLinks.getByRole("link");
      await expect(links).toHaveText([ensgId, ...uniprotIds, symbol, symbol]);
      await expect(target.externalLinks).toHaveText(
        new RegExp(
          `^Ensembl:\\s*${ensgId}\\s*UniProt:\\s*${uniprotIds.join(",\\s*")}\\s*GeneCards:\\s*${symbol}\\s*HGNC:\\s*${symbol}$`
        )
      );
      await expect(links.nth(0)).toHaveAttribute(
        "href",
        `https://identifiers.org/ensembl:${ensgId}`
      );
      for (const [index, uniprotId] of uniprotIds.entries()) {
        await expect(target.uniprotLinks.getByRole("link").nth(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/uniprot:${uniprotId}`
        );
      }
      await expect(links.nth(uniprotIds.length + 1)).toHaveAttribute(
        "href",
        `https://www.genecards.org/card/${symbol}`
      );
      await expect(links.nth(uniprotIds.length + 2)).toHaveAttribute(
        "href",
        `https://identifiers.org/hgnc.symbol:${symbol}`
      );
    });
  });

  test("the Profile and Associated diseases tabs switch route and content, and back and forward follow", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol, uniprotIds } = targetIdentity(ensgId);
    const firstSection = expectedSectionsFor(ensgId)[0];
    const target = new TargetPage(page);

    await target.goto(ensgId);

    await test.step("the profile route shows the Profile tab selected and the sections", async () => {
      await expect(target.profileTab).toHaveAttribute("aria-selected", "true");
      await expect(target.associationsTab).toHaveAttribute("aria-selected", "false");
      await expect(target.profileTab).toHaveAttribute("href", `/target/${ensgId}`);
      await expect(target.associationsTab).toHaveAttribute(
        "href",
        `/target/${ensgId}/associations`
      );
      await expect(sectionLocator(page, firstSection)).toBeVisible();
    });

    await test.step("Associated diseases replaces the profile with the associations table", async () => {
      await target.openAssociationsTab(ensgId);
      await expect(page).toHaveTitle(`Diseases associated with ${symbol} | Open Targets Platform`);
      await expect(page.getByTestId("associations-table")).toBeVisible();
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();
      await expect(page.getByTestId("profile-header")).toHaveCount(0);
      await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
      // the header above the tabs is shared by both routes
      await expect(target.symbol).toHaveText(symbol);
      await expect(target.uniprotLinks.getByRole("link")).toHaveText([...uniprotIds]);
    });

    await test.step("Profile brings the sections back", async () => {
      await target.openProfileTab(ensgId);
      await expect(page).toHaveTitle(`${symbol} profile page | Open Targets Platform`);
      await expect(page.getByTestId("associations-table")).toHaveCount(0);
      await expect(sectionLocator(page, firstSection)).toBeVisible();
    });

    await test.step("browser back returns to the associations, forward to the profile", async () => {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/target/${ensgId}/associations$`));
      await expect(target.associationsTab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();

      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`/target/${ensgId}$`));
      await expect(target.profileTab).toHaveAttribute("aria-selected", "true");
      await expect(sectionLocator(page, firstSection)).toBeVisible();
    });
  });

  test("the associations route opens directly and survives a reload", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol, name, uniprotIds } = targetIdentity(ensgId);
    const target = new TargetPage(page);

    await target.gotoAssociations(ensgId);

    const expectAssociationsRoute = async () => {
      await expect(target.symbol).toHaveText(symbol);
      await expect(target.name).toHaveText(name);
      await expect(target.uniprotLinks.getByRole("link")).toHaveText([...uniprotIds]);
      await expect(target.associationsTab).toHaveAttribute("aria-selected", "true");
      await expect(target.profileTab).toHaveAttribute("aria-selected", "false");
      await expect(page).toHaveTitle(`Diseases associated with ${symbol} | Open Targets Platform`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `Ranked list of diseases and phenotypes associated with ${symbol}`
      );
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();
      await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
    };

    await expectAssociationsRoute();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/target/${ensgId}/associations$`));
    await expectAssociationsRoute();
  });

  test("a well-formed Ensembl id that does not exist shows the 404 page", async ({
    page,
    pageHealth,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "this test opens a target that does not exist",
      "error-ui"
    );
    const target = new TargetPage(page);

    await page.goto("/target/ENSG00000000000");

    await expect(target.notFoundPage).toBeVisible();
    await expect(
      target.notFoundPage.getByRole("heading", { name: "404: Page not found" })
    ).toBeVisible();
    await expect(target.notFoundPage).toContainText("We can't find the page you're looking for.");
    await expect(
      target.notFoundPage.getByRole("link", { name: "Documentation", exact: true })
    ).toHaveAttribute("href", /^https:\/\/platform-docs\.opentargets\.org/);
    await expect(
      target.notFoundPage.getByRole("link", { name: "Community", exact: true })
    ).toHaveAttribute("href", /^https:\/\/community\.opentargets\.org/);
    await expect(
      target.notFoundPage.getByRole("link", { name: "Go back to Home Page" })
    ).toHaveAttribute("href", "/");

    // nothing of a target page is rendered around the 404
    await expect(target.symbol).toHaveCount(0);
    await expect(target.profileTab).toHaveCount(0);
    await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
    await expect(page).toHaveTitle(/^\s*Open Targets Platform$/);
  });

  test("an id that is not an Ensembl gene id shows the 404 page, and its home link works", async ({
    page,
    pageHealth,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "this test opens a target route with a malformed id",
      "error-ui"
    );
    const target = new TargetPage(page);

    await page.goto("/target/not-a-target-id");

    await expect(target.notFoundPage).toBeVisible();
    await expect(target.symbol).toHaveCount(0);

    await target.notFoundPage.getByRole("link", { name: "Go back to Home Page" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(target.notFoundPage).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Open Targets Platform/ }).first()
    ).toBeVisible();
  });

  test("an unknown route under an existing target shows the 404 page", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "this test opens a route that does not exist under a target",
      "error-ui"
    );
    const ensgId = requireTarget(testConfig, "primary");
    const target = new TargetPage(page);

    await page.goto(`/target/${ensgId}/this-tab-does-not-exist`);

    await expect(
      target.notFoundPage,
      "a route that matches neither tab should be a 404, not a target header over an empty page"
    ).toBeVisible();
  });
});

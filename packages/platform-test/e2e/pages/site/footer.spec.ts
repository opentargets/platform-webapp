import { expect, test } from "../../../fixtures";
import { drugFacts } from "../../../POM/page/drug/drugData";
import {
  FOOTER_LICENSE,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL,
  MONTH_NAMES,
  PARTNER_ONLY_MENU,
} from "../../../POM/page/site/siteData";
import { SiteShell, stubMeta, waitForMeta } from "../../../POM/page/site/siteShell";

const FOOTER_HEADINGS = ["About", "Help", "Follow us", "Partners", "About Open Targets"];
/** Links in the footer: every section's, the licence's two, the four social icons. */
const FOOTER_LINK_COUNT = FOOTER_SECTIONS.reduce((n, section) => n + section.links.length, 0) + 2 + FOOTER_SOCIAL.length;

test.describe("Footer", () => {
  const routes = [
    { name: "an app page", path: () => "/api" },
    { name: "the home page", path: () => "/" },
    { name: "a profile page", path: (id: string) => `/target/${id}/associations` },
  ];

  for (const route of routes) {
    test(`on ${route.name} it lists every link of every column`, async ({ page, testConfig }) => {
      const shell = new SiteShell(page);
      await page.goto(route.path(testConfig.target?.primary as string));
      await expect(shell.footer).toBeVisible();

      await test.step("the columns are in order", async () => {
        await expect(shell.footerHeadings).toHaveText(FOOTER_HEADINGS);
      });

      await test.step("each link has its label and address", async () => {
        for (const section of FOOTER_SECTIONS) {
          for (const link of section.links) {
            await expect(shell.footerLink(link.label), `${section.heading}: ${link.label}`).toHaveAttribute(
              "href",
              link.href
            );
          }
        }
      });

      await test.step("the social icons link to the four networks", async () => {
        for (const social of FOOTER_SOCIAL) {
          await expect(shell.footerSocialLink(social.name), social.name).toHaveAttribute("href", social.href);
        }
      });

      await test.step("the licence line names the platform and CC0", async () => {
        await expect(shell.footer).toContainText("Open Targets Platform is marked with CC0 1.0");
        await expect(shell.footerLink("Open Targets Platform")).toHaveAttribute("href", FOOTER_LICENSE.platformHref);
        await expect(
          shell.footer.getByRole("link", { name: "Read more about creative commons license on this link" })
        ).toHaveAttribute("href", FOOTER_LICENSE.cc0Href);
        await expect(shell.footer.getByRole("img", { name: /cc0 license image/ })).toHaveCount(2);
      });

      await test.step("nothing else is linked", async () => {
        await expect(shell.footer.getByRole("link")).toHaveCount(FOOTER_LINK_COUNT);
      });
    });
  }

  test("does not show the links that belong to the Partner Preview Platform", async ({ page }) => {
    const shell = new SiteShell(page);
    await page.goto("/api");
    await expect(shell.footer).toBeVisible();

    await expect(shell.footerLink("Contact us")).toHaveCount(0);
    await expect(shell.footer.locator("a[href^='mailto']")).toHaveCount(0);
    for (const name of PARTNER_ONLY_MENU) await expect(shell.footer.getByText(name, { exact: true }), name).toHaveCount(0);
  });

  test("every footer address is absolute, so none can land on the 404 page", async ({ page }) => {
    await page.goto("/api");
    const hrefs = await new SiteShell(page).footer.getByRole("link").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
    );
    expect(hrefs).toHaveLength(FOOTER_LINK_COUNT);
    for (const href of hrefs) expect(href, "footer address").toMatch(/^https?:\/\//);
  });

  test.describe("version block", () => {
    test("shows the API version the meta query reports and a UI version", async ({ page }) => {
      const shell = new SiteShell(page);
      const meta = waitForMeta(page);
      await page.goto("/api");
      const { api } = await meta;

      await expect(shell.versionBlock).toContainText(`API: ${api.year}.${api.month}.${api.revision}`);
      await expect(shell.versionBlock).toContainText(/^UI:/);
      await expect(shell.versionBlock).toHaveText(/^UI:\s*\S*\s*API:\s*\d+\.\d+\.\d+$/);
    });

    test("builds the API version from the numbers the API gives", async ({ page }) => {
      await stubMeta(page, {
        data: { month: "3", year: "25", revision: "" },
        api: { month: "8", year: "9", revision: "7" },
      });
      await page.goto("/api");

      await expect(new SiteShell(page).versionBlock).toContainText("API: 9.8.7");
    });

    test("the footer and the home page's last-update line each use their own half of the meta answer", async ({
      page,
    }) => {
      await stubMeta(page, {
        data: { month: "1", year: "30", revision: "1" },
        api: { month: "2", year: "3", revision: "4" },
      });
      await page.goto("/");

      await expect(new SiteShell(page).versionBlock).toContainText("API: 3.2.4");
      await expect(page.getByTestId("home-data-version")).toHaveText(
        `Last update: ${MONTH_NAMES[0]} 2030 (30.1.1)`
      );
    });

    test("is shown on a profile page too", async ({ page, testConfig }) => {
      const shell = new SiteShell(page);
      const meta = waitForMeta(page);
      await page.goto(`/drug/${testConfig.drug.primary}`);
      await expect(page).toHaveTitle(`${drugFacts(testConfig.drug.primary).name} profile page | Open Targets Platform`);
      const { api } = await meta;

      await expect(shell.versionBlock).toContainText(`API: ${api.year}.${api.month}.${api.revision}`);
    });
  });
});

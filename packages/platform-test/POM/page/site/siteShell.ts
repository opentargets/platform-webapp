import { expect, type Locator, type Page, type Response } from "@playwright/test";
import type { MenuLink, MetaVersions } from "./siteData";

const META_OPERATION = "DataVersion";
const GRAPHQL_URL = /\/graphql$/;
/**
 * The Platform API's own GraphQL endpoint. A production build also posts the same
 * `DataVersion` operation to the partner API to see whether the visitor may reach it (a
 * 200 opens the "Partner Preview Platform" dialog), so a stub must not answer that one.
 */
const PARTNER_API_HOST = "api.partner-platform.opentargets.org";
const isPlatformGraphQL = (url: URL): boolean =>
  GRAPHQL_URL.test(url.pathname) && url.hostname !== PARTNER_API_HOST;

function isMetaRequest(response: Response): boolean {
  const request = response.request();
  if (request.method() !== "POST" || !GRAPHQL_URL.test(response.url())) return false;
  return request.postDataJSON()?.operationName === META_OPERATION;
}

/**
 * Start listening for the app's `meta` query. Call it before navigating, then await the
 * result: it is what the footer and the home page's "Last update" are built from.
 */
export function waitForMeta(page: Page): Promise<MetaVersions> {
  return page.waitForResponse(isMetaRequest).then(async (response) => {
    const { data } = await response.json();
    return { data: data.meta.dataVersion, api: data.meta.apiVersion };
  });
}

/** Answer the `meta` query with these versions, whatever the API says. */
export async function stubMeta(page: Page, versions: MetaVersions): Promise<void> {
  await page.route(isPlatformGraphQL, async (route) => {
    if (route.request().postDataJSON()?.operationName !== META_OPERATION) return route.fallback();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          meta: {
            dataVersion: { __typename: "Version", ...versions.data },
            apiVersion: { __typename: "Version", ...versions.api },
          },
        },
      }),
    });
  });
}

/** Make the `meta` query fail with a GraphQL error. */
export async function failMeta(page: Page): Promise<void> {
  await page.route(isPlatformGraphQL, async (route) => {
    if (route.request().postDataJSON()?.operationName !== META_OPERATION) return route.fallback();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: null, errors: [{ message: "meta is unavailable" }] }),
    });
  });
}

/** The header bar and the footer that frame every page. */
export class SiteShell {
  constructor(readonly page: Page) {}

  get header(): Locator {
    return this.page.getByRole("banner");
  }

  get footer(): Locator {
    return this.page.getByTestId("app-footer");
  }

  /** The "Open Targets Platform" logo link, on pages other than the home page. */
  get logoLink(): Locator {
    return this.header.getByRole("link", { name: /Open Targets\s*Platform/ });
  }

  /** The search box in the header (not on the home page, which has its own). */
  get searchButton(): Locator {
    return this.header.getByTestId("global-search-button");
  }

  /** The burger button that opens the main menu. */
  get menuButton(): Locator {
    return this.header.getByRole("button", { name: "open header menu" });
  }

  /** Entries of the burger menu. */
  get menuItems(): Locator {
    return this.page.getByRole("menuitem");
  }

  menuItem(name: string): Locator {
    return this.page.getByRole("menuitem", { name, exact: true });
  }

  /** Open the burger menu and wait for its entries. */
  async openMenu(): Promise<void> {
    await this.menuButton.click();
    await expect(this.menuItems.first()).toBeVisible();
  }

  /** Links shown directly in the header, as on the home page of a wide screen. */
  get inlineLinks(): Locator {
    return this.header.getByRole("link");
  }

  /** Assert the entries of an open burger menu are exactly these links, in order. */
  async expectMenu(expected: readonly MenuLink[]): Promise<void> {
    await expect(this.menuItems).toHaveText(expected.map((item) => item.name));
    for (const item of expected) {
      await expect(this.menuItem(item.name).getByRole("link"), item.name).toHaveAttribute(
        "href",
        item.href
      );
    }
  }

  // Footer

  get footerHeadings(): Locator {
    return this.footer.getByTestId("footer-heading");
  }

  /** A link of the footer, by the label it shows. */
  footerLink(label: string): Locator {
    return this.footer.getByRole("link", { name: `Read more about ${label} on this link` });
  }

  footerSocialLink(name: string): Locator {
    return this.footer.getByRole("link", { name, exact: true });
  }

  /** "UI: <git version> API: x.y.z" */
  get versionBlock(): Locator {
    return this.page.getByTestId("footer-version");
  }
}

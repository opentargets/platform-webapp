import type { Locator, Page } from "@playwright/test";

/** The 404 page (EmptyPage) and the route error page the app shows for broken routes. */
export class ErrorPages {
  constructor(private page: Page) {}

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }

  get notFoundHeading(): Locator {
    return this.notFound.getByRole("heading", { name: "404: Page not found" });
  }

  get homeLink(): Locator {
    return this.notFound.getByRole("link", { name: "Go back to Home Page" });
  }

  get documentationLink(): Locator {
    return this.notFound.getByRole("link", { name: "Documentation", exact: true });
  }

  get communityLink(): Locator {
    return this.notFound.getByRole("link", { name: "Community", exact: true });
  }

  get routeError(): Locator {
    return this.page.getByTestId("route-error");
  }

  /** What a visitor must not see around an error page: a profile header or any section. */
  get profileContent(): Locator {
    return this.page.locator("section[data-testid^='section-'], [data-testid='profile-page-header-block']");
  }
}

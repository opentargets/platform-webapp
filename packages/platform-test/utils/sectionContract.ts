import { expect, test } from "../fixtures";
import { ProfileSection } from "../POM/objects/components/ProfileSection/profileSection";
import type { TestConfig } from "../types";

export interface SectionContract {
  /** SectionItem definition id, lower-cased (data-testid="section-<id>") */
  id: string;
  title: string;
  /** Profile page that shows the section, built from the test config */
  url: (config: TestConfig) => string;
  /** Table checks, for sections that render an OtTable */
  table?: {
    /** A term that matches at least one row of the entity in `url` */
    searchTerm?: string;
    exportable?: boolean;
  };
}

/**
 * The checks every profile section must pass: it renders with its title and,
 * for tables, shows rows, filters on search and offers the export.
 * Call inside a `test.describe` that adds the section-specific tests.
 */
export function sectionContract({ id, title, url, table }: SectionContract): void {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    await page.goto(`${baseURL}${url(testConfig)}`);
    await new ProfileSection(page, id).waitForLoaded();
  });

  test("renders with its title", async ({ page }) => {
    await expect(new ProfileSection(page, id).header()).toHaveText(title);
  });

  if (!table) return;

  test("table shows rows", async ({ page }) => {
    await expect(new ProfileSection(page, id).rows().first()).toBeVisible();
  });

  const { searchTerm } = table;
  if (searchTerm) {
    test("search keeps matching rows and drops the rest", async ({ page }) => {
      const section = new ProfileSection(page, id);

      await section.search(searchTerm);
      await expect(section.rows().first()).toContainText(searchTerm, { ignoreCase: true });

      await section.search("zzz-no-such-row-zzz");
      await expect(section.rows().filter({ hasText: searchTerm })).toHaveCount(0);
    });
  }

  if (table.exportable) {
    test("offers the data export", async ({ page }) => {
      await expect(new ProfileSection(page, id).exportButton()).toBeVisible();
    });
  }
}

import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** Column headers of the mouse phenotypes table, in order. */
export const MOUSE_PHENOTYPES_COLUMNS = [
  "Mouse gene",
  "Phenotype",
  "Category",
  "Allelic composition",
] as const;

export const MOUSE_PHENOTYPE_COLUMN = { gene: 0, phenotype: 1, category: 2, models: 3 } as const;

/** GraphQL operation behind the section (packages/sections/src/target/MousePhenotypes). */
export const MOUSE_PHENOTYPES_OPERATION = "TargetMousePhenotypesQuery";

/**
 * Target profile > Mouse Phenotypes: a server-paginated table. A row with several
 * categories opens them in a drawer; the allelic composition cell opens the mouse models.
 */
export class MousePhenotypesSection extends ProfileSection {
  readonly table: TableControls;

  constructor(page: Page) {
    super(page, "mousePhenotypes");
    this.table = new TableControls(page, this.section);
  }

  cell(row: number, column: keyof typeof MOUSE_PHENOTYPE_COLUMN): Locator {
    return this.table.rows.nth(row).locator("td").nth(MOUSE_PHENOTYPE_COLUMN[column]);
  }

  /** Every cell of one column on the current page. */
  column(column: keyof typeof MOUSE_PHENOTYPE_COLUMN): Locator {
    return this.table.rows.locator(`td:nth-child(${MOUSE_PHENOTYPE_COLUMN[column] + 1})`);
  }

  /** The "N categories" buttons on the current page (rows with more than one category). */
  get categoryDrawerTriggers(): Locator {
    return this.column("category").getByTestId("table-drawer");
  }

  /** The drawer listing the categories of a phenotype. */
  get categoryDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  /** The "N model(s)" buttons on the current page. */
  get modelsDrawerTriggers(): Locator {
    return this.column("models").getByTestId("allelic-composition-trigger");
  }

  /** The drawer listing the mouse models behind a phenotype. */
  get modelsDrawer(): Locator {
    return this.page.getByTestId("allelic-composition-drawer");
  }

  /** One card per mouse model in the open drawer. */
  get modelCards(): Locator {
    return this.modelsDrawer.getByTestId("allelic-composition-model");
  }

  async closeDrawer(drawer: Locator): Promise<void> {
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer, "the drawer should close").toBeHidden();
  }
}

/**
 * The Subcellular Location section of every target page downloads cell diagrams from
 * SwissBioPics, a third-party service that sometimes answers without CORS headers, which
 * the browser reports as a console error on an otherwise healthy page. Pass the real
 * response through with the header always present, so these tests depend on the app only.
 */
export async function allowSwissBioPicsCors(page: Page): Promise<void> {
  await page.route(/^https:\/\/www\.swissbiopics\.org\/+api\//, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "access-control-allow-origin": "*" },
    });
  });
}

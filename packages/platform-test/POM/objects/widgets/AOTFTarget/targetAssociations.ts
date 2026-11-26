import { expect, type Locator, type Page } from "@playwright/test";
import {
  AssociationsTable,
  type AssociationsUrlState,
  TABLE_LOAD_TIMEOUT,
} from "../AOTF/associationsTable";

/**
 * The associations view of a target, /target/:ensgId/associations: the same
 * associations-on-the-fly table as the disease page, turned the other way round. One
 * target, a row per disease.
 *
 * It reuses AssociationsTable for everything the two views share (rows, cells, sorting,
 * pagination, filters, panels, export) and adds what differs: the route, the labels that
 * name the row entity, and the "Exclude measurements" switch that only this view has.
 */
export class TargetAssociations extends AssociationsTable {
  /** Path of the associations view of a target, with the given URL state. */
  static targetPath(ensgId: string, state: AssociationsUrlState = {}): string {
    const params = new URLSearchParams(state as Record<string, string>).toString();
    return `/target/${ensgId}/associations${params ? `?${params}` : ""}`;
  }

  /** Open the associations view of a target and wait until its first rows are shown. */
  async gotoTarget(ensgId: string, state: AssociationsUrlState = {}): Promise<void> {
    await this.page.goto(TargetAssociations.targetPath(ensgId, state));
    await this.expectLoaded();
  }

  /** The "Associated diseases" tab of the target page. */
  get associationsTab(): Locator {
    return this.page.getByRole("tab", { name: "Associated diseases" });
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  /** The target symbol in the page header. */
  get pageTitle(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** The "Exclude measurements" switch in the filter popover. */
  get excludeMeasurementsSwitch(): Locator {
    return this.facetsPopover.getByRole("checkbox");
  }

  /** The chip the table shows while measurements are excluded (the default). */
  get excludeMeasurementsChip(): Locator {
    return this.activeFilters.getByText("Exclude measurements", { exact: true });
  }

  /** Pin a disease row of the core body through its menu. Returns the disease name. */
  async pinDisease(row: Locator): Promise<string> {
    const name = await this.openRowMenu(row);
    await this.rowMenu.getByRole("menuitem", { name: "Pin disease", exact: true }).click();
    await expect(this.rowMenu).toBeHidden();
    await expect(
      this.rowByName(name, "pinning"),
      `${name} should appear in the pinned rows`
    ).toBeVisible({ timeout: TABLE_LOAD_TIMEOUT });
    return name;
  }
}

export function targetAssociations(page: Page): TargetAssociations {
  return new TargetAssociations(page);
}

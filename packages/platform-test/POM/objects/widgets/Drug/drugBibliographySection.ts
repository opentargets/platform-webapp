import { expect, type Locator, type Page } from "@playwright/test";
import { SECTION_LOAD_TIMEOUT, sectionLocator } from "../../../../utils/sections";

const COUNT_INFO = /^Showing (\d+) of (\d+) results$/;

/** Drug page: Bibliography section (literature co-occurrences with entity filters). */
export class DrugBibliographySection {
  static readonly id = "bibliography";
  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, DrugBibliographySection.id);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** "Showing 5 of 9250 results" */
  get countInfo(): Locator {
    return this.section.getByTestId("literature-count-info");
  }

  /** One of the "Tag category" checkboxes: Target, Disease or Drug. */
  categoryCheckbox(label: "Target" | "Disease" | "Drug"): Locator {
    return this.section.getByRole("checkbox", { name: label });
  }

  /** The row of entities the publications must mention: the drug, then any added ones. */
  get selectedEntities(): Locator {
    return this.section.getByTestId("literature-selected-entities");
  }

  /** The chip of the drug itself; it cannot be removed. */
  get drugChip(): Locator {
    return this.selectedEntities.getByTitle(/^ID: /);
  }

  /** Chips of the entities added to the filter; clicking one removes it. */
  get addedEntityChips(): Locator {
    return this.selectedEntities.getByRole("button");
  }

  /** Chips of co-occurring entities that can be added to the filter. */
  get similarEntityChips(): Locator {
    return this.section.getByTestId("literature-similar-entities").getByRole("button");
  }

  /** The publications of the current page. */
  get publications(): Locator {
    return this.section.locator("[data-testid^='literature-entry-']");
  }

  /** "1–5 of 9250" */
  get position(): Locator {
    return this.section.getByText(/^\d+–\d+ of \d+$/);
  }

  get nextPageButton(): Locator {
    return this.section.getByRole("button", { name: "Go to next page" });
  }

  get previousPageButton(): Locator {
    return this.section.getByRole("button", { name: "Go to previous page" });
  }

  get pageSizeSelect(): Locator {
    return this.section.getByRole("combobox", { name: "Rows per page select dropdown" });
  }

  get dateRangeStart(): Locator {
    return this.section.getByTestId("literature-date-start");
  }

  get dateRangeEnd(): Locator {
    return this.section.getByTestId("literature-date-end");
  }

  get dateSliderThumbs(): Locator {
    return this.section.getByRole("slider", { name: "date-range-slider" });
  }

  /**
   * Assert the section has answered the current filters and shows `shown` publications
   * with their details. Returns the total number of matching publications.
   */
  async expectResults(shown: number): Promise<number> {
    await expect(this.countInfo, "the result count should be shown").toHaveText(COUNT_INFO);
    // The details come from Europe PMC, a third party that can take its time; the app
    // fills them in whenever they arrive.
    await expect(
      this.publications,
      `${shown} publications with details from Europe PMC should be listed`
    ).toHaveCount(shown, { timeout: SECTION_LOAD_TIMEOUT });
    const match = COUNT_INFO.exec((await this.countInfo.innerText()).trim());
    if (!match) throw new Error("the result count changed while it was being read");
    expect(Number(match[1]), "the count line should state how many are shown").toBe(shown);
    return Number(match[2]);
  }

  /** One publication of the current page, by its Europe PMC id. */
  publication(id: string): Locator {
    return this.section.getByTestId(`literature-entry-${id}`);
  }

  /**
   * Toggle a "Tag category" checkbox. The box only changes once the server has
   * answered with the entities of the new selection.
   */
  async setCategory(label: "Target" | "Disease" | "Drug", checked: boolean): Promise<void> {
    const checkbox = this.categoryCheckbox(label);
    await checkbox.click();
    await (checked ? expect(checkbox).toBeChecked() : expect(checkbox).not.toBeChecked());
    await expect(checkbox, "the filters are enabled again once the answer arrived").toBeEnabled();
  }

  /** The Europe PMC ids of the publications on the current page, in order. */
  async publicationIds(): Promise<string[]> {
    const testIds = await this.publications.evaluateAll((entries) =>
      entries.map((entry) => entry.getAttribute("data-testid") ?? "")
    );
    return testIds.map((testId) => testId.replace("literature-entry-", ""));
  }
}

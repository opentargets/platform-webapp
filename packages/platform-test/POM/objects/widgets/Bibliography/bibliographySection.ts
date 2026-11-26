import { expect, type Locator, type Page } from "@playwright/test";

/** GraphQL operations behind the bibliography section, per entity. */
export const BIBLIOGRAPHY_OPERATION = {
  target: "TargetBibliographyQuery",
} as const;

/** What one bibliography request asked for and what the API answered. */
export type BibliographyResponse = {
  variables: {
    id: string;
    ids: string[];
    index: number;
    pageSize: number;
    entityNames: string[] | null;
    startYear: number | null;
    startMonth: number | null;
    endYear: number | null;
    endMonth: number | null;
  };
  /** Publication ids of the page, as the list keys them (PubMed id, else PMC id). */
  publicationIds: string[];
  count: number;
  /** Ids of the co-occurring entities returned, the entity itself included. */
  similarEntityIds: string[];
};

type BibliographyEntityData = {
  similarEntities: { rows: { id: string }[] };
  literatureOcurrences: { count: number; rows: { pmid: string | null; pmcid: string | null }[] };
};

/** Page sizes the publication list offers. */
export const BIBLIOGRAPHY_PAGE_SIZES = ["5", "10", "25"] as const;

/**
 * Profile > Bibliography (packages/sections/src/common/Literature): tag-category
 * checkboxes, a date filter, the entity itself plus the co-occurring entities that can be
 * added to the search, and a server-paginated list of publications whose details come
 * from Europe PMC.
 *
 * Getters return Locators; methods act and assert the effect of the action.
 */
export class BibliographySection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get section(): Locator {
    return this.page.getByTestId("section-bibliography");
  }

  get title(): Locator {
    return this.section.getByTestId("section-bibliography-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** A "Tag category" checkbox: which kinds of co-occurring entity are offered. */
  categoryCheckbox(category: "Target" | "Disease" | "Drug"): Locator {
    return this.section.getByRole("checkbox", { name: category, exact: true });
  }

  /** "Showing 5 of 74839 results", or "Loading count..." while a request is in flight. */
  get countInfo(): Locator {
    return this.section.getByTestId("literature-count-info");
  }

  /** The two thumbs of the publication date range slider. */
  get dateSliderThumbs(): Locator {
    return this.section.getByRole("slider", { name: "date-range-slider" });
  }

  get dateRangeStart(): Locator {
    return this.section.getByTestId("literature-date-start");
  }

  get dateRangeEnd(): Locator {
    return this.section.getByTestId("literature-date-end");
  }

  /** The row holding the entity itself followed by the entities added to the search. */
  get selectedEntities(): Locator {
    return this.section.getByTestId("literature-selected-entities");
  }

  /** The chip of the entity the page is about; always first in the selected row, never removable. */
  ownEntityChip(label: string): Locator {
    return this.selectedEntities.getByText(label, { exact: true });
  }

  /** The chips of the entities added to the search; clicking one removes it again. */
  get addedEntityChips(): Locator {
    return this.selectedEntities.getByRole("button");
  }

  /** The row of co-occurring entities that can still be added to the search. */
  get similarEntities(): Locator {
    return this.section.getByTestId("literature-similar-entities");
  }

  /** One clickable chip per co-occurring entity; its title carries the score and the id. */
  get similarEntityChips(): Locator {
    return this.similarEntities.getByRole("button");
  }

  /** The spinner shown in place of the list while publications are being fetched. */
  get listLoader(): Locator {
    return this.section.getByText("Loading literature ocurrences results");
  }

  /** One element per publication whose details arrived from Europe PMC. */
  get publications(): Locator {
    return this.section.locator("[data-testid^='literature-entry-']");
  }

  publication(europePmcId: string): Locator {
    return this.section.getByTestId(`literature-entry-${europePmcId}`);
  }

  /** Rows shown for publications whose details Europe PMC did not return. */
  get unavailablePublications(): Locator {
    return this.section.getByText("Could not download publication details");
  }

  get pageSizeSelect(): Locator {
    return this.section.getByRole("combobox", { name: "Rows per page select dropdown" });
  }

  /** "1–5 of 74839": the range of publications on this page and the total. */
  get pagePosition(): Locator {
    return this.section.getByText(/^\d+–\d+ of \d+$/);
  }

  get nextPageButton(): Locator {
    return this.section.getByRole("button", { name: "Go to next page" });
  }

  get previousPageButton(): Locator {
    return this.section.getByRole("button", { name: "Go to previous page" });
  }

  /**
   * Start waiting for the next bibliography request. Call it BEFORE the navigation or
   * click that issues the query and await it afterwards. Fails when the API answers with
   * an error or without the entity.
   */
  async nextResponse(
    operationName: string,
    entity: "target" | "disease" | "drug"
  ): Promise<BibliographyResponse> {
    const response = await this.page.waitForResponse(
      (candidate) => {
        const request = candidate.request();
        if (request.method() !== "POST") return false;
        const body = request.postData();
        // only GraphQL requests carry a JSON body with a "query"
        if (!body?.includes('"query"')) return false;
        return (JSON.parse(body) as { operationName?: string }).operationName === operationName;
      },
      { timeout: 60_000 }
    );
    expect(response.status(), `${operationName} should answer with HTTP 200`).toBe(200);
    const body = (await response.json()) as {
      data: Record<string, BibliographyEntityData | null> | null;
      errors?: unknown[];
    };
    expect(body.errors, `${operationName} should not return GraphQL errors`).toBeUndefined();
    const data = body.data?.[entity];
    if (!data) throw new Error(`${operationName} returned no ${entity}`);
    const { variables } = JSON.parse(response.request().postData() ?? "{}") as {
      variables: BibliographyResponse["variables"];
    };
    return {
      variables,
      publicationIds: data.literatureOcurrences.rows.map((row) => row.pmid || row.pmcid || ""),
      count: data.literatureOcurrences.count,
      similarEntityIds: data.similarEntities.rows.map((row) => row.id),
    };
  }

  /** Assert no request is in flight: the count is shown and the list is rendered. */
  async expectSettled(): Promise<void> {
    await expect(this.countInfo, "the result count should be shown").toHaveText(
      /^Showing \d+ of \d+ results$/
    );
    await expect(this.listLoader, "the publication list should finish loading").toHaveCount(0);
    await expect(
      this.section.locator(".MuiSkeleton-root"),
      "publication details should finish loading"
    ).toHaveCount(0);
  }

  /**
   * Assert the list shows these publications, in this order, with their details loaded.
   * The ids come from the GraphQL response, the details from Europe PMC.
   */
  async expectPublications(ids: readonly string[]): Promise<void> {
    await this.expectSettled();
    await expect
      .poll(() => this.publicationIds(), {
        message: "the list should show the publications the API returned, in order",
      })
      .toEqual([...ids]);
  }

  /** Assert the pagination footer reads "<start>–<end> of <total>" and the count label agrees. */
  async expectPosition(start: number, end: number, total: number): Promise<void> {
    await expect(this.pagePosition).toHaveText(`${start}–${end} of ${total}`);
    await expect(this.countInfo).toHaveText(
      `Showing ${Math.min(end - start + 1, total)} of ${total} results`
    );
  }

  /** Choose a page size and wait for the list to be fetched again. */
  async setPageSize(size: (typeof BIBLIOGRAPHY_PAGE_SIZES)[number]): Promise<void> {
    await this.pageSizeSelect.selectOption(size);
    await expect(this.pageSizeSelect).toHaveValue(size);
    await this.expectSettled();
  }

  /** The id in a chip's title ("Score: 0.86 ID: CHEMBL2103875" or "ID: ENSG00000157764"). */
  async chipEntityId(chip: Locator): Promise<string> {
    const title = (await chip.getAttribute("title")) ?? "";
    const match = /ID: (\S+)$/.exec(title);
    if (!match) throw new Error(`the chip title "${title}" does not name an entity id`);
    return match[1];
  }

  /** The total number of publications for the current filters, from the count label. */
  async total(): Promise<number> {
    await expect(this.countInfo).toHaveText(/^Showing \d+ of \d+ results$/);
    const match = /of (\d+) results/.exec(await this.countInfo.innerText());
    if (!match) throw new Error("the bibliography count label lost its total");
    return Number(match[1]);
  }

  /** The Europe PMC ids of the publications on the current page, in order. */
  async publicationIds(): Promise<string[]> {
    return this.publications.evaluateAll((entries) =>
      entries.map((entry) => (entry.getAttribute("data-testid") ?? "").replace("literature-entry-", ""))
    );
  }
}

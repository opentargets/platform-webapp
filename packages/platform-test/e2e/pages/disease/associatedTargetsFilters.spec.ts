import type { Request } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
import { DATA_SOURCE_COLUMNS } from "../../../POM/objects/widgets/AOTF/columns";

/** Facet labels of the target index. Their ids change with every release; labels do not. */
const KINASE = { label: "Kinase", category: "ChEMBL Target Class" };
const ENZYME = { label: "Enzyme", category: "ChEMBL Target Class" };
const RTK_SIGNALLING = { label: "Signaling by Receptor Tyrosine Kinases", category: "Reactome" };

const TARGET_FACET_CATEGORIES = [
  "All Categories",
  "Names",
  "Symbol",
  "ChEMBL Target Class",
  "GO:BP",
  "GO:CC",
  "GO:MF",
  "Reactome",
  "Subcellular Location",
  "Target ID (ENSG)",
  "Tractability Antibody",
  "Tractability Other Modalities",
  "Tractability PROTAC",
  "Tractability Small Molecule",
];

type Facet = { label: string; category: string };

/**
 * Search the facet box for a facet's label and pick the suggestion with exactly that
 * label and category. The popover must be open.
 */
async function pickFacet(aotf: AssociationsTable, facet: Facet): Promise<void> {
  await aotf.facetSearchInput.fill(facet.label);
  const option = aotf.facetOptions.filter({
    has: aotf.page.getByText(facet.label, { exact: true }),
    hasText: `in ${facet.category}`,
  });
  await expect(option, `"${facet.label}" should be suggested in ${facet.category}`).toHaveCount(1);
  await option.click();
  // Picking a facet clears the box and lists the facet as a chip inside the popover.
  await expect(aotf.facetSearchInput).toHaveValue("");
  await expect(
    aotf.facetsPopover.getByRole("button", { name: facet.label, exact: true })
  ).toBeVisible();
}

/** The association query's variables, when a request is that query. */
function associationsVariables(request: Request): Record<string, unknown> | null {
  if (request.method() !== "POST") return null;
  const data = request.postData();
  if (!data?.includes('"operationName":"DiseaseAssociationsQuery"')) return null;
  return (JSON.parse(data) as { variables: Record<string, unknown> }).variables;
}

type PolicyOverride = { id: string; policy: { weight: number; required: boolean } };

test.describe("Disease associations: advanced filters (facets)", () => {
  test("the filter popover explains itself and lists the target facet categories", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    await aotf.openFacets();

    await test.step("help block", async () => {
      const help = aotf.facetsPopover.getByText("How do facet filters work?");
      const example = aotf.facetsPopover.getByText(
        "Search by target or filter by target category. Example: Enzyme"
      );
      await expect(example).toBeHidden();
      await help.click();
      await expect(example).toBeVisible();
      await expect(aotf.facetsPopover.getByText("Filters across categories use AND")).toBeVisible();
      await expect(aotf.facetsPopover.getByText("Filters within a category use OR")).toBeVisible();
      const docs = aotf.facetsPopover.getByRole("link", { name: "Read more details here" });
      await expect(docs).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/web-interface/associations-on-the-fly#filtering-functionality"
      );
      await expect(docs).toHaveAttribute("target", "_blank");
      await help.click();
      await expect(example).toBeHidden();
    });

    await test.step("category select", async () => {
      await expect(aotf.facetCategorySelect).toHaveText("All Categories");
      await aotf.facetCategorySelect.click();
      await expect(page.getByRole("listbox").getByRole("option")).toHaveText(
        TARGET_FACET_CATEGORIES
      );
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
    });

    // The disease page filters targets: "Exclude measurements" belongs to the target page.
    await expect(aotf.facetsPopover.getByText("Exclude measurements")).toHaveCount(0);

    await aotf.dismissOverlay(aotf.facetsPopover);
  });

  test("searching a facet suggests matches with their category, and picking one filters the table", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;
    const unfiltered = await aotf.rowNames();

    await aotf.openFacets();
    await aotf.facetSearchInput.fill("kinase");
    await expect(aotf.facetOptions.first()).toBeVisible();
    const suggestions = await aotf.facetOptions.allInnerTexts();
    expect(suggestions.length).toBeGreaterThan(1);
    for (const suggestion of suggestions) {
      expect(suggestion.toLowerCase(), "a suggestion should match the search").toContain("kinase");
      expect(suggestion, "a suggestion should name its category").toMatch(/\bin \S/);
    }

    await pickFacet(aotf, KINASE);

    await test.step("the table is narrowed to the facet", async () => {
      const filtered = await aotf.expectTotalBelow(total);
      await aotf.expectRowsToDifferFrom(unfiltered);
      await aotf.expectSortedBy("score");
      await expect(aotf.displayedRows).toHaveText(`1–25 of ${filtered}`);
    });

    await test.step("the facet is in the URL and in the applied filters", async () => {
      await aotf.expectUrlParam("facets", /^[\w-]+~Kinase~ChEMBL Target Class$/);
      await expect(aotf.filterChips).toHaveCount(1);
      await expect(aotf.filterChips).toHaveText("Kinase");
      const facetId = (aotf.urlParam("facets") as string).split("~")[0];
      await expect(aotf.filterChip(facetId)).toBeVisible();
      await expect(aotf.clearAllFiltersButton).toBeVisible();
    });

    await test.step("removing the chip in the popover restores the full list", async () => {
      await aotf.facetsPopover
        .getByRole("button", { name: "Kinase", exact: true })
        .locator(".MuiChip-deleteIcon")
        .click();
      await aotf.expectUrlParam("facets", "");
      await aotf.expectTotal(total);
      await aotf.expectRowNames(unfiltered);
      await expect(aotf.filterChips).toHaveCount(0);
    });
  });

  test("choosing a category limits the suggestions to it", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    await aotf.openFacets();

    await aotf.facetCategorySelect.click();
    await page.getByRole("option", { name: "Reactome", exact: true }).click();
    await expect(aotf.facetCategorySelect).toHaveText("Reactome");

    await test.step("opening the box lists facets of the category without typing", async () => {
      await aotf.facetSearchInput.click();
      await expect(aotf.facetOptions.first()).toBeVisible();
      const suggestions = await aotf.facetOptions.allInnerTexts();
      expect(suggestions.length).toBeGreaterThan(1);
      for (const suggestion of suggestions) expect(suggestion).toMatch(/in Reactome$/);
    });

    await test.step("typing searches within the category", async () => {
      // The search is fuzzy (it also suggests "Kinesins"), so only the best match is
      // asserted to contain the term.
      await aotf.facetSearchInput.fill("kinase");
      await expect(
        aotf.facetOptions.first(),
        "the best match should lead the new suggestions"
      ).toContainText(/kinase/i);
      const suggestions = await aotf.facetOptions.allInnerTexts();
      expect(suggestions.length).toBeGreaterThan(1);
      for (const suggestion of suggestions) expect(suggestion).toMatch(/in Reactome$/);
    });
  });

  test("two facets of the same category widen the list (OR)", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;

    await aotf.openFacets();
    await pickFacet(aotf, KINASE);
    const kinases = await aotf.expectTotalBelow(total);

    await pickFacet(aotf, ENZYME);
    await expect(aotf.filterChips).toHaveCount(2);
    await expect
      .poll(async () => (await aotf.displayedRange()).total, {
        message: "Kinase OR Enzyme should match more targets than Kinase alone",
        timeout: 45_000,
      })
      .toBeGreaterThan(kinases);
    await aotf.expectLoaded(25);
    expect((await aotf.displayedRange()).total).toBeLessThan(total);
    expect((aotf.urlParam("facets") as string).split("|")).toHaveLength(2);
  });

  test("facets of different categories narrow the list (AND)", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;

    await aotf.openFacets();
    await pickFacet(aotf, KINASE);
    const kinases = await aotf.expectTotalBelow(total);

    await pickFacet(aotf, RTK_SIGNALLING);
    await expect(aotf.filterChips).toHaveCount(2);
    // The total changes when the response for both facets arrives.
    await expect
      .poll(async () => (await aotf.displayedRange()).total, {
        message: "adding a second facet should change the total",
        timeout: 45_000,
      })
      .not.toBe(kinases);
    await aotf.expectLoaded();
    const both = (await aotf.displayedRange()).total;
    expect(
      both,
      `"Filters across categories use AND": kinases in the pathway (${both}) cannot outnumber kinases (${kinases})`
    ).toBeLessThan(kinases);
    expect(both).toBeGreaterThan(0);
  });

  test("a facet in the URL is applied on load and survives a reload", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);
    const total = (await aotf.displayedRange()).total;
    await aotf.openFacets();
    await pickFacet(aotf, KINASE);
    const kinases = await aotf.expectTotalBelow(total);
    const kinaseRows = await aotf.rowNames();
    const facets = aotf.urlParam("facets") as string;

    // A fresh load of the same URL: nothing is carried over from the session above.
    await aotf.gotoDisease(diseaseId, { facets });
    await expect(aotf.filterChips).toHaveText("Kinase");
    await aotf.expectTotal(kinases);
    await aotf.expectRowNames(kinaseRows);

    await page.reload();
    await aotf.expectLoaded();
    await expect(aotf.filterChips).toHaveText("Kinase");
    await aotf.expectTotal(kinases);
    await aotf.expectRowNames(kinaseRows);

    await test.step("the chip removes it", async () => {
      await aotf.removeFilterChip(facets.split("~")[0]);
      await aotf.expectUrlParam("facets", "");
      await aotf.expectTotal(total);
    });
  });

  test("a facet returns the table to its first page", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { page: "3" });
    const total = (await aotf.displayedRange()).total;
    await aotf.openFacets();
    await pickFacet(aotf, KINASE);
    await aotf.expectUrlParam("page", "");
    await aotf.expectTotalBelow(total);
    expect((await aotf.displayedRange()).from).toBe(1);
  });
});

test.describe("Disease associations: column options (weights and required sources)", () => {
  test("Column options opens a weight slider and an Include checkbox per data source, at their defaults", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    await expect(aotf.weightsPanel).toBeHidden();

    await aotf.openColumnOptions();
    await expect(aotf.weightsPanel.getByRole("heading", { name: "Weight" })).toBeVisible();
    await expect(aotf.weightsPanel.getByRole("heading", { name: "Include" })).toBeVisible();
    await expect(aotf.weightSliders).toHaveCount(DATA_SOURCE_COLUMNS.length);
    await expect(aotf.requiredCheckboxes).toHaveCount(DATA_SOURCE_COLUMNS.length);
    for (const column of DATA_SOURCE_COLUMNS) {
      const slider = aotf.weightSlider(column.id);
      await expect(slider, `${column.label} weight`).toHaveAttribute(
        "aria-valuenow",
        String(column.weight)
      );
      await expect(slider).toHaveAttribute("aria-valuemin", "0");
      await expect(slider).toHaveAttribute("aria-valuemax", "1");
      await expect(
        aotf.requiredCheckbox(column.id),
        `${column.label} is not required`
      ).not.toBeChecked();
    }
    await expect(aotf.filterChip("column-options"), "defaults are not a filter").toHaveCount(0);

    await test.step("the X closes the panel and the URL forgets it", async () => {
      await aotf.closeWeightsButton.click();
      await expect(aotf.weightsPanel).toBeHidden();
      await aotf.expectUrlParam("weights", "");
    });

    await test.step("the button toggles the panel", async () => {
      await aotf.openColumnOptions();
      await aotf.columnOptionsButton.click();
      await expect(aotf.weightsPanel).toBeHidden();
      await aotf.expectUrlParam("weights", "");
    });
  });

  test("the panel is open on load when the URL says so, and stays open across a reload", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { weights: "1" });
    await expect(aotf.weightsPanel).toBeVisible();
    await expect(aotf.weightSliders).toHaveCount(DATA_SOURCE_COLUMNS.length);

    await page.reload();
    await aotf.expectLoaded();
    await expect(aotf.weightsPanel).toBeVisible();
  });

  test("requiring a data source keeps only targets with evidence from it", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { weights: "1" });
    const total = (await aotf.displayedRange()).total;
    const unfiltered = await aotf.rowNames();

    const requested = page.waitForRequest((request) => {
      const overrides = associationsVariables(request)?.datasourcePolicyOverrides as
        | PolicyOverride[]
        | undefined;
      return !!overrides?.some(({ id, policy }) => id === "clinical_precedence" && policy.required);
    });
    await aotf.requiredCheckbox("clinical_precedence").check();
    const overrides = associationsVariables(await requested)
      ?.datasourcePolicyOverrides as PolicyOverride[];
    expect(
      overrides.filter(({ policy }) => policy.required).map(({ id }) => id),
      "only the ticked source is required"
    ).toEqual(["clinical_precedence"]);

    const required = await aotf.expectTotalBelow(total);
    await expect(aotf.rows()).toHaveCount(Math.min(required, 25));
    await expect(
      aotf.columnCells("clinical_precedence"),
      "every remaining target should have clinical precedence evidence"
    ).toHaveCount(Math.min(required, 25));
    await aotf.expectSortedBy("score");
    await expect(aotf.filterChip("column-options")).toHaveText("Column options");

    await test.step("the Column options chip resets the controls", async () => {
      await aotf.removeFilterChip("column-options");
      await expect(aotf.requiredCheckbox("clinical_precedence")).not.toBeChecked();
      await aotf.expectTotal(total);
      await aotf.expectRowNames(unfiltered);
    });
  });

  test("requiring two data sources keeps targets with evidence from either", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { weights: "1" });
    const total = (await aotf.displayedRange()).total;

    await aotf.requiredCheckbox("clinical_precedence").check();
    const clinical = await aotf.expectTotalBelow(total);

    await aotf.requiredCheckbox("gene_burden").check();
    await expect
      .poll(async () => (await aotf.displayedRange()).total, {
        message: "a second required source should add its targets",
        timeout: 45_000,
      })
      .toBeGreaterThan(clinical);
    await aotf.expectLoaded();
    expect((await aotf.displayedRange()).total).toBeLessThan(total);
    const withEither = await aotf
      .rows()
      .evaluateAll((rows) =>
        rows.map(
          (row) =>
            !!row.querySelector(
              "[data-testid='score-cell-clinical_precedence'], [data-testid='score-cell-gene_burden']"
            )
        )
      );
    expect(withEither.length).toBeGreaterThan(0);
    expect(withEither, "every row should have evidence from a required source").not.toContain(
      false
    );
  });

  test("setting a data source's weight to zero re-scores the table, and the chip restores it", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { weights: "1" });
    const total = (await aotf.displayedRange()).total;
    const defaultOrder = await aotf.rowNames();
    const slider = aotf.weightSlider("clinical_precedence");

    const requested = page.waitForRequest((request) => {
      const overrides = associationsVariables(request)?.datasourcePolicyOverrides as
        | PolicyOverride[]
        | undefined;
      return !!overrides?.some(
        ({ id, policy }) => id === "clinical_precedence" && policy.weight === 0
      );
    });
    await slider.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    const overrides = associationsVariables(await requested)
      ?.datasourcePolicyOverrides as PolicyOverride[];
    expect(
      overrides.filter(({ id }) => id !== "clinical_precedence").map(({ policy }) => policy.weight),
      "the other weights keep their defaults"
    ).toEqual(
      DATA_SOURCE_COLUMNS.filter(({ id }) => id !== "clinical_precedence").map(
        ({ weight }) => weight
      )
    );

    await aotf.expectRowsToDifferFrom(defaultOrder);
    await aotf.expectSortedBy("score");
    expect((await aotf.displayedRange()).total, "a weight does not filter").toBe(total);
    await expect(aotf.filterChip("column-options")).toBeVisible();

    await aotf.removeFilterChip("column-options");
    await expect(slider).toHaveAttribute("aria-valuenow", "1");
    await aotf.expectRowNames(defaultOrder);
  });

  test("an aggregation bar requires every data source of its group and opens the panel", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;
    const somatic = DATA_SOURCE_COLUMNS.filter(
      (column) => column.aggregation === "Somatic mutations"
    );

    await aotf.aggregationButton("Somatic mutations").click();
    await expect(aotf.weightsPanel).toBeVisible();
    await aotf.expectUrlParam("weights", "1");
    for (const column of DATA_SOURCE_COLUMNS) {
      const checkbox = aotf.requiredCheckbox(column.id);
      if (column.aggregation === "Somatic mutations") await expect(checkbox).toBeChecked();
      else await expect(checkbox).not.toBeChecked();
    }
    const withSomatic = await aotf.expectTotalBelow(total);
    const rowsWithSomatic = await aotf.rows().evaluateAll(
      (rows, ids) =>
        rows.map((row) =>
          ids.some((id) => !!row.querySelector(`[data-testid='score-cell-${id}']`))
        ),
      somatic.map((column) => column.id)
    );
    expect(rowsWithSomatic).toHaveLength(Math.min(withSomatic, 25));
    expect(rowsWithSomatic, "every row should have somatic evidence").not.toContain(false);
    await expect(aotf.filterChip("column-options")).toBeVisible();

    await test.step("clicking the bar again releases the group", async () => {
      await aotf.aggregationButton("Somatic mutations").click();
      for (const column of somatic)
        await expect(aotf.requiredCheckbox(column.id)).not.toBeChecked();
      await aotf.expectTotal(total);
      await expect(aotf.filterChip("column-options")).toHaveCount(0);
    });
  });
});

test.describe("Disease associations: applied filters", () => {
  test("the reset button clears a single applied filter", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { sort: "europepmc:desc" });
    await aotf.expectSortedBy("europepmc");
    await expect(aotf.activeFilters.getByText("Applied filters:")).toBeVisible();
    await expect(aotf.filterChips).toHaveText(["Europe PMC"]);

    await aotf.clearAllFiltersButton.hover();
    await expect(page.getByRole("tooltip", { name: "Reset all filters" })).toBeVisible();
    await aotf.clearAllFiltersButton.click();

    await expect(aotf.filterChips).toHaveCount(0);
    await expect(aotf.clearAllFiltersButton).toHaveCount(0);
    await expect(aotf.activeFilters.getByText("Applied filters:")).toHaveCount(0);
    await aotf.expectUrlParam("sort", "");
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await aotf.expectSortedBy("score");
  });

  test("lists every applied filter and the reset button clears them all", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { sort: "europepmc:desc", weights: "1" });
    const total = (await aotf.displayedRange()).total;

    await aotf.openFacets();
    await pickFacet(aotf, KINASE);
    await aotf.dismissOverlay(aotf.facetsPopover);
    const kinases = await aotf.expectTotalBelow(total);
    await aotf.requiredCheckbox("europepmc").check();
    await expect(aotf.filterChip("column-options")).toBeVisible();
    await aotf.expectTotalBelow(kinases + 1);
    await aotf.pinRow(aotf.row(0));

    await expect(aotf.activeFilters.getByText("Applied filters:")).toBeVisible();
    await expect(aotf.filterChips).toHaveText(["Kinase", "Column options", "Europe PMC", "Pinned"]);

    await aotf.clearAllFiltersButton.click();

    await expect(aotf.filterChips, "no filter should survive the reset").toHaveCount(0);
    await expect(aotf.clearAllFiltersButton).toHaveCount(0);
    await aotf.expectUrlParam("facets", "");
    await aotf.expectUrlParam("sort", "");
    await aotf.expectUrlParam("pinned", "");
    await expect(aotf.rows("pinning")).toHaveCount(0);
    await expect(aotf.requiredCheckbox("europepmc")).not.toBeChecked();
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await aotf.expectTotal(total);
    await aotf.expectSortedBy("score");
  });
});

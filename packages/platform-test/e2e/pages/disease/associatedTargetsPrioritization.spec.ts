import { expect, test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
import {
  aggregationTestId,
  DATA_SOURCE_COLUMNS,
  PRIORITISATION_AGGREGATIONS,
  PRIORITISATION_COLUMNS,
} from "../../../POM/objects/widgets/AOTF/columns";
import { expectedAssociationsFor } from "../../../POM/objects/widgets/AOTF/expectedAssociations";

const PRIORITISATION_DOCS = /^https:\/\/platform-docs\.opentargets\.org\/web-interface\/target-prioritisation#[a-z-]+$/;
const PRIORITISATION_IDS = PRIORITISATION_COLUMNS.map((column) => column.id);

/**
 * The tooltip every factor header shows (opentargets/issues#4391: harmonise all columns of
 * the target prioritisation view with tooltips that increase interpretability). Written out
 * here on purpose: a header whose tooltip is dropped, left empty or copied from another
 * factor fails.
 */
const FACTOR_TOOLTIPS: Record<string, string> = {
  maxClinicalStage: "Target is in clinical trials for any indication",
  isInMembrane: "Target is annotated to be located in the cell membrane",
  isSecreted: "Target is annotated to be secreted",
  hasLigand: "Target binds a specific ligand",
  hasSmallMoleculeBinder: "Target binds a small molecule",
  hasPocket: "Target has predicted pockets",
  mouseOrthologMaxIdentityPercentage: "Mouse orthologue maximum identity percentage",
  hasHighQualityChemicalProbes: "Availability of high quality chemical probes for the target",
  geneticConstraint: "Relative genetic constraint in natural populations derived from GnomAD",
  mouseKOScore: "Availability of mouse knockout models for the target",
  geneEssentiality: "Gene is defined as core essential by the DepMap portal",
  hasSafetyEvent: "Target associated with a curated adverse event",
  isCancerDriverGene: "Target is classified as an Oncogene and/or Tumor Suppressor Gene",
  paralogMaxIdentityPercentage: "Paralog maximum identity percentage",
  tissueSpecificity: "CELLEX calculation of tissue-specific target expression",
  tissueDistribution: "Distribution of any detectable baseline expression for the target across tissues",
  celltypeSpecificity: "CELLEX calculation of cell type-specific target expression",
  celltypeDistribution: "Distribution of any detectable baseline expression for the target across cell types",
};

/**
 * The target prioritisation view of the associations table: the second view of the
 * display switch, kept in the `table` URL parameter. Same rows (targets of the disease,
 * ranked by association score), but the columns are prioritisation factors.
 */
test.describe("Disease associations: target prioritisation view", () => {
  test("the view switch replaces the data source columns with the prioritisation factors, and back", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const associationsRows = await aotf.rowNames();

    await test.step("switch to prioritisation", async () => {
      await aotf.switchToPrioritisation();
      await expect(aotf.associationsViewButton).toHaveAttribute("aria-pressed", "false");
      await aotf.expectLoaded(25);
      await expect(aotf.headerLabels).toHaveText([
        "Target",
        "Association Score",
        ...PRIORITISATION_COLUMNS.map((column) => column.label),
      ]);
      await expect(aotf.rows()).toHaveCount(25);
      expect(await aotf.rowNames(), "the same targets are ranked the same way").toEqual(associationsRows);
      for (const column of DATA_SOURCE_COLUMNS) {
        await expect(aotf.headerLabel(column.id), `${column.label} is not a prioritisation factor`).toHaveCount(0);
      }
    });

    await test.step("switch back to associations", async () => {
      await aotf.switchToAssociations();
      await expect(aotf.prioritisationViewButton).toHaveAttribute("aria-pressed", "false");
      await expect(aotf.headerLabels).toHaveText([
        "Target",
        "Association Score",
        ...DATA_SOURCE_COLUMNS.map((column) => column.label),
      ]);
      await aotf.expectRowNames(associationsRows);
      for (const id of PRIORITISATION_IDS) {
        await expect(aotf.headerLabel(id)).toHaveCount(0);
      }
    });
  });

  test("groups the factors under four aggregations, and each header documents its factor", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    expect(PRIORITISATION_AGGREGATIONS).toEqual(["precedence", "tractability", "doability", "safety"]);
    const buttonIds = await aotf.aggregationButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-testid"))
    );
    expect(buttonIds).toEqual(PRIORITISATION_AGGREGATIONS.map(aggregationTestId));

    for (const column of PRIORITISATION_COLUMNS) {
      const link = aotf.docsLink(column.id);
      await expect(link, `${column.label} docs link`).toHaveAttribute("href", PRIORITISATION_DOCS);
      await expect(link, `${column.label} docs link`).toHaveAttribute("target", "_blank");
      await expect(link, `${column.label} docs link`).toHaveAttribute("rel", /noreferrer/);
    }
    await expect(aotf.docsLink("maxClinicalStage")).toHaveAttribute("href", /#target-in-clinic$/);

    // Hovering a header explains the factor.
    await aotf.headerLabel("maxClinicalStage").hover();
    await expect(
      page.getByRole("tooltip").filter({ hasText: "Target is in clinical trials for any indication" })
    ).toBeVisible();
  });

  test("every row has a cell for every factor, and the cells carry a score between -1 and 1 or No data", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    for (const index of [0, 12, 24]) {
      const row = aotf.row(index);
      const cells = row.locator(
        "[data-testid^='score-cell-']:not([data-testid='score-cell-score']), [data-testid^='empty-cell-']"
      );
      await expect(cells, `row ${index} should have one cell per factor`).toHaveCount(PRIORITISATION_IDS.length);
      await expect(aotf.dataCell(row, "score")).toHaveAttribute("aria-label", /^Score: \d\.\d{2}$/);
    }

    const scores = await aotf.rows().locator("[data-testid^='score-cell-'][data-score]").evaluateAll((cells) =>
      cells.map((cell) => Number.parseFloat(cell.getAttribute("data-score") ?? "NaN"))
    );
    expect(scores.length, "the table should have scored cells").toBeGreaterThan(25);
    for (const score of scores) {
      expect(Number.isNaN(score)).toBe(false);
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    }
    // Some factors are favourable (positive) and some unfavourable (negative) for the top targets.
    expect(scores.some((score) => score > 0), "some factor should be favourable").toBe(true);
    expect(scores.some((score) => score < 0), "some factor should be unfavourable").toBe(true);

    await expect(aotf.rows().first().getByTestId("name-cell")).not.toBeEmpty();
    const first = aotf.row(0);
    const hasScore = first.locator("[data-testid^='score-cell-'][data-score]").nth(1);
    const label = await hasScore.getAttribute("aria-label");
    await hasScore.hover();
    await expect(page.getByRole("tooltip", { name: label as string })).toBeVisible();
  });

  test("every factor header explains its factor in a tooltip", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    expect(Object.keys(FACTOR_TOOLTIPS).sort(), "a tooltip is expected for every factor").toEqual(
      [...PRIORITISATION_IDS].sort()
    );
    for (const column of PRIORITISATION_COLUMNS) {
      await aotf.headerLabel(column.id).hover();
      // The aggregation bar opens its own tooltip (the group name) beside the factor's.
      await expect(
        page.getByRole("tooltip").filter({ hasText: FACTOR_TOOLTIPS[column.id] }),
        `${column.label} header tooltip`
      ).toHaveText(FACTOR_TOOLTIPS[column.id]);
      // Moving off the header closes the tooltip before the next one opens.
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toHaveCount(0);
    }
  });

  test("a cell tooltip gives the score it shows, and an empty cell says No data", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    const row = aotf.row(0);
    const factorCells = aotf.dataCells(row);
    await expect(factorCells.first(), "the top target should have scored factors").toBeVisible();
    const cells = await factorCells.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute("data-testid") ?? "",
        score: node.getAttribute("data-score") ?? "",
      }))
    );
    expect(cells.length).toBeGreaterThan(1);
    for (const { id, score } of cells.slice(0, 3)) {
      const cell = row.getByTestId(id);
      await cell.hover();
      await expect(page.getByRole("tooltip"), `${id} tooltip`).toHaveText(`Score: ${score}`);
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toHaveCount(0);
    }

    const empty = aotf.rows().locator("[data-testid^='empty-cell-']").first();
    await expect(empty, "some factor of the first 25 targets has no data").toBeVisible();
    await empty.hover();
    await expect(page.getByRole("tooltip")).toHaveText("No data");
  });

  test("descendant-disease evidence is counted at full weight: the scores shown are the API's, none is down-weighted by the app", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    // opentargets/issues#3457: evidence from descendant (inherited) terms can be down-weighted
    // with the API's `indirectWeight` (0 to 1, default 1). The app has no control for it and
    // must not send one, so the table shows the default, full-weight scores. A change that
    // sent a weight, or re-scored client side, would make the cells differ from the API.
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);
    await graphqlMonitor.settle();

    const firstPage = graphqlMonitor
      .named("DiseaseAssociationsQuery")
      .filter((request) => request.variables.index === 0 && request.data !== undefined);
    expect(firstPage.length, "the first page of associations should have been requested").toBeGreaterThan(0);
    const query = firstPage[0];
    expect(query.variables, "the app should leave indirectWeight to the API default").not.toHaveProperty(
      "indirectWeight"
    );
    type Row = { target: { approvedSymbol: string }; score: number };
    const rows = (query.data as { disease: { associatedTargets: { rows: Row[] } } }).disease.associatedTargets.rows;
    expect(rows.length).toBeGreaterThan(0);

    const names = await aotf.rowNames();
    for (const [index, { target, score }] of rows.slice(0, 25).entries()) {
      expect(names[index], `row ${index} is the API's row ${index}`).toBe(target.approvedSymbol);
      await expect(aotf.dataCell(aotf.row(index), "score"), `${target.approvedSymbol} association score`).toHaveAttribute(
        "data-score",
        score.toFixed(2)
      );
    }
  });

  test("the footer legend switches to the prioritisation indicator scale", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    await expect(aotf.legend).toContainText("Unfavourable");
    await expect(aotf.legend).toContainText("Favourable");
    await expect(aotf.legend).toContainText("Prioritisation indicator");
    await expect(aotf.legend).not.toContainText("Association score");
    await expect(aotf.legendNoDataCell).toBeVisible();

    await aotf.switchToAssociations();
    await expect(aotf.legend).toContainText("Association score");
    await expect(aotf.legend).not.toContainText("Prioritisation indicator");
  });

  test("the factor columns are not sortable, the association score is", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);
    const order = await aotf.rowNames();
    await expect(aotf.sortIndicators).toHaveCount(1);
    await expect(aotf.sortIndicator("score")).toBeVisible();

    await aotf.headerLabel("hasPocket").click();
    await aotf.headerLabel("geneticConstraint").click();
    await aotf.headerLabel("score").click();
    // The table is already sorted by score. Had a factor header sorted, the score click would
    // have set "score:desc"; it only returns to the default order (empty) if they did nothing.
    await aotf.expectUrlParam("sort", "");
    await expect(aotf.sortIndicators).toHaveCount(1);
    await expect(aotf.sortIndicator("score")).toBeVisible();
    await aotf.expectLoaded(25);
    expect(await aotf.rowNames()).toEqual(order);
    await expect(aotf.filterChip("sort")).toHaveCount(0);
  });

  test("the view is in the URL: a deep link, a reload and back/forward keep it", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);
    await expect(aotf.prioritisationViewButton, "a deep link opens the view").toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(aotf.headerLabel("hasLigand")).toHaveText("Ligand binder");
    const rows = await aotf.rowNames();

    await page.reload();
    await aotf.expectLoaded(25);
    await aotf.expectUrlParam("table", "prioritisations");
    await expect(aotf.prioritisationViewButton).toHaveAttribute("aria-pressed", "true");
    await expect(aotf.headerLabel("hasLigand")).toBeVisible();
    await aotf.expectRowNames(rows);

    await aotf.switchToAssociations();
    await aotf.expectUrlParam("table", "associations");
    await page.goBack();
    await aotf.expectUrlParam("table", "prioritisations");
    await expect(aotf.prioritisationViewButton).toHaveAttribute("aria-pressed", "true");
    await expect(aotf.headerLabel("hasLigand")).toBeVisible();
    await expect(aotf.headerLabel("europepmc")).toHaveCount(0);

    await page.goForward();
    await aotf.expectUrlParam("table", "associations");
    await expect(aotf.associationsViewButton).toHaveAttribute("aria-pressed", "true");
    await expect(aotf.headerLabel("europepmc")).toBeVisible();
    await expect(aotf.headerLabel("hasLigand")).toHaveCount(0);
  });

  test("search and pagination work in the view and keep it", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations" });
    await aotf.expectLoaded(25);

    await test.step("next page", async () => {
      await aotf.goToNextPage();
      expect((await aotf.displayedRange()).from).toBe(26);
      await aotf.expectUrlParam("table", "prioritisations");
      await expect(aotf.headerLabel("hasLigand")).toBeVisible();
      await expect(aotf.row(0).locator("[data-testid^='score-cell-'], [data-testid^='empty-cell-']")).toHaveCount(
        PRIORITISATION_IDS.length + 1
      );
    });

    await test.step("search narrows the rows to matching targets", async () => {
      await aotf.searchByName("IL6");
      const total = await aotf.expectTotalBelow(6000);
      expect(total).toBeLessThan(25);
      await aotf.expectLoaded(1);
      const names = await aotf.rowNames();
      expect(names).toContain("IL6");
      for (const name of names) expect(name.toLowerCase()).toContain("il6");
      await expect(aotf.headerLabel("hasLigand")).toBeVisible();
    });

    await test.step("a term matching nothing shows the empty state", async () => {
      await aotf.searchByName("zzzzqqqq");
      await expect(aotf.noResults).toBeVisible();
      await expect(aotf.rows()).toHaveCount(0);
    });
  });

  test("pinned targets show prioritisation cells too", async ({ page, testConfig }) => {
    const diseaseId = testConfig.disease.primary;
    const genes = expectedAssociationsFor(diseaseId).genes;
    const symbols = Object.keys(genes);
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, {
      table: "prioritisations",
      pinned: symbols.map((symbol) => genes[symbol].id).join(","),
    });
    await aotf.expectLoaded(symbols.length, "pinning");
    await expect(aotf.rows("pinning")).toHaveCount(symbols.length);
    for (const symbol of symbols) {
      const row = aotf.rowByName(symbol, "pinning");
      await expect(row).toHaveCount(1);
      await expect(
        row.locator("[data-testid^='score-cell-']:not([data-testid='score-cell-score']), [data-testid^='empty-cell-']"),
        `${symbol} should have a cell per factor`
      ).toHaveCount(PRIORITISATION_IDS.length);
    }
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  type CellValue,
  EXPRESSION_COLUMNS,
  type ExpressionColumnSlug,
  type ExpressionData,
  type ExpressionRow,
  ExpressionSection,
  groupForView,
  STUBBED_GTEX_TISSUES,
  stubGtexPortal,
} from "../../../../POM/objects/widgets/shared/expressionSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";

type Opened = { expression: ExpressionSection; rows: ExpressionRow[]; count: number };

const slugOf = (datatype: string): ExpressionColumnSlug => {
  const column = EXPRESSION_COLUMNS.find((candidate) => candidate.datatype === datatype);
  if (!column) throw new Error(`Unknown expression datatype "${datatype}"`);
  return column.slug;
};

/** Sort key of a cell: bars by width, then "N/A", then cells with no data. */
const rank = (value: CellValue): number => (value === null ? -2 : value === "N/A" ? -1 : value);

// The name header also holds the "Collapse all" control, hidden until a row is expanded.
const TISSUE_HEADER = /^Tissue\?(Collapse all)?$/;
const CELL_TYPE_HEADER = /^Cell Type\?(Collapse all)?$/;

const isNonIncreasing = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1] >= v);
const isNonDecreasing = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1] <= v);

/** Open the target page; return the loaded section and the API rows behind it. */
async function openExpression(page: Page, targetId: string | undefined): Promise<Opened> {
  expect(targetId, "the test config should name a target for this test").toBeTruthy();
  const expression = new ExpressionSection(page);
  const response = waitForOperation<ExpressionData>(page, ExpressionSection.operation);
  await page.goto(`/target/${targetId}`);
  const { data, variables } = await response;
  expect(variables).toEqual({ ensemblId: targetId });
  const { rows, count } = data.target.baselineExpression;
  expect(rows.length, "the API should return baseline expression rows").toBeGreaterThan(0);
  await expression.expectLoaded();
  return { expression, rows, count };
}

/**
 * Target profile > Baseline Expression (packages/sections/src/target/BaselineExpression):
 * a Summary tab with a three-level heatmap (tissue or cell type view) and a
 * "Variation (GTEx)" tab with a box plot fed by the GTEx Portal API.
 */
test.describe("Target baseline expression section", () => {
  // Other sections of the page query Europe PMC from the browser; keep that third party
  // out of these tests (see stubEuropePmc).
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows its title, description, source links, tabs and controls", async ({
    page,
    testConfig,
  }) => {
    const { expression } = await openExpression(page, testConfig.target?.primary);

    await expect(expression.header).toHaveText("Baseline Expression");
    await expect(expression.description).toHaveText(
      "RNA and protein baseline expression for BRAF (see our documentation for more information). Source: Tabula Sapiens, GTEx, PRIDE (OTAR3091) and DICE."
    );
    for (const [name, href] of [
      ["our documentation", "https://platform-docs.opentargets.org/target/baseline-expression"],
      ["Tabula Sapiens", "https://tabula-sapiens.sf.czbiohub.org/"],
      ["GTEx", "https://www.gtexportal.org/home/"],
      ["PRIDE (OTAR3091)", "https://home.opentargets.org/OTAR3091"],
      ["DICE", "https://dice-database.org/"],
    ]) {
      await expect(expression.description.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    await expect(expression.section.getByRole("tab")).toHaveText(["Summary", "Variation (GTEx)"]);
    await expect(expression.summaryTab).toHaveAttribute("aria-selected", "true");
    await expect(expression.gtexTab).toHaveAttribute("aria-selected", "false");

    await expect(expression.viewButton("tissue")).toHaveText("Tissue");
    await expect(expression.viewButton("celltype")).toHaveText("Cell type");
    await expect(expression.viewButton("tissue")).toHaveAttribute("aria-pressed", "true");
    await expect(expression.viewButton("celltype")).toHaveAttribute("aria-pressed", "false");

    await expect(expression.heatmap.getByRole("heading", { name: "Specificity" })).toBeVisible();
    await expect(expression.heatmap.getByText("high", { exact: true })).toBeVisible();
    await expect(expression.heatmap.getByText("low", { exact: true })).toBeVisible();
    await expect(expression.heatmap.getByRole("heading", { name: "Median expression" })).toBeVisible();
    await expect(expression.controls.exportButton).toHaveText("Export");
    await expect(expression.controls.apiQueryButton).toBeVisible();
  });

  test("tissue view: one row per parent tissue, three data columns with scales", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const tissue = groupForView(rows, "tissue");
    expect(tissue.parents.length, "BRAF is measured in many tissues").toBeGreaterThan(10);

    await expect(expression.headers).toHaveText([
      TISSUE_HEADER,
      ...EXPRESSION_COLUMNS.map(({ label }) => label),
    ]);
    await expect(expression.rows(1)).toHaveCount(tissue.parents.length);
    await expect(expression.rows(2), "nothing is expanded on load").toHaveCount(0);
    await expect(expression.collapseAll).toBeHidden();

    const snapshot = await expression.snapshot();
    expect(snapshot.map(({ name }) => name).sort()).toEqual([...tissue.parents].sort());

    for (const { slug, datatype, axisUnit } of EXPRESSION_COLUMNS) {
      await test.step(`${datatype} column`, async () => {
        expect(tissue.datatypes.has(datatype), `BRAF has ${datatype} data by tissue`).toBe(true);
        // the scale sits above the first row only, from 0 to the column's maximum
        await expect(expression.axis(slug)).toHaveCount(1);
        await expect(expression.axis(slug)).toHaveText(new RegExp(`^0 ${axisUnit}\\d`));
        await expect(expression.cell(expression.rows(1).first(), slug).getByTestId(
          `baseline-expression-axis-${slug}`
        )).toBeVisible();

        const widths = snapshot.map((row) => row[slug]).filter((value) => typeof value === "number");
        expect(widths.length, `${datatype} should have bars`).toBeGreaterThan(1);
        expect(Math.max(...widths), "bars are normalised: the largest fills its track").toBe(100);
        expect(Math.min(...widths)).toBeGreaterThanOrEqual(0);
        expect(new Set(widths).size, "the bars should not all be the same").toBeGreaterThan(1);
      });
    }
  });

  test("sorts by the most specific datatype on load, largest median first", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const { mostSpecific } = groupForView(rows, "tissue");
    expect(mostSpecific, "BRAF should have specificity scores by tissue").not.toBeNull();
    const sorted = slugOf(mostSpecific?.datatypeId ?? "");

    await expect(expression.columnHeader(sorted)).toHaveAttribute("data-sort", "desc");
    for (const { slug } of EXPRESSION_COLUMNS.filter((column) => column.slug !== sorted)) {
      await expect(expression.columnHeader(slug)).toHaveAttribute("data-sort", "none");
    }
    await expect(expression.nameHeader).toHaveAttribute("data-sort", "none");

    const ranks = (await expression.snapshot()).map((row) => rank(row[sorted]));
    expect(ranks[0], "the first row holds the column's largest median").toBe(100);
    expect(isNonIncreasing(ranks), `rows should be in descending ${sorted} order: ${ranks}`).toBe(true);
  });

  test("clicking a column header sorts by it, descending then ascending", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const { mostSpecific } = groupForView(rows, "tissue");
    const initial = slugOf(mostSpecific?.datatypeId ?? "");
    await expect(expression.columnHeader(initial)).toHaveAttribute("data-sort", "desc");
    const other = EXPRESSION_COLUMNS.find((column) => column.slug !== initial)?.slug ?? initial;
    const before = (await expression.snapshot()).map(({ name }) => name);

    await test.step("descending", async () => {
      await expression.sortBy(other, "desc");
      await expect(expression.columnHeader(initial)).toHaveAttribute("data-sort", "none");
      await expect
        .poll(async () => (await expression.snapshot()).map((row) => rank(row[other]))[0])
        .toBe(100);
      const snapshot = await expression.snapshot();
      const ranks = snapshot.map((row) => rank(row[other]));
      expect(isNonIncreasing(ranks), `descending ${other}: ${ranks}`).toBe(true);
      expect(snapshot.map(({ name }) => name), "the row order should change").not.toEqual(before);
      expect(snapshot.map(({ name }) => name).sort()).toEqual([...before].sort());
      // the scale stays above whichever row is now first
      await expect(
        expression.cell(expression.rows(1).first(), other).getByTestId(`baseline-expression-axis-${other}`)
      ).toBeVisible();
    });

    await test.step("ascending", async () => {
      await expression.sortBy(other, "asc");
      await expect
        .poll(async () => {
          const ranks = (await expression.snapshot()).map((row) => rank(row[other]));
          return ranks[ranks.length - 1];
        })
        .toBe(100);
      const ranks = (await expression.snapshot()).map((row) => rank(row[other]));
      expect(isNonDecreasing(ranks), `ascending ${other}: ${ranks}`).toBe(true);
    });
  });

  test("clicking the name header sorts the rows alphabetically, both ways", async ({
    page,
    testConfig,
  }) => {
    const { expression } = await openExpression(page, testConfig.target?.primary);
    const names = (await expression.snapshot()).map(({ name }) => name);
    const alphabetical = [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    expect(names, "the default order is by expression, not by name").not.toEqual(alphabetical);

    await expression.sortBy("name", "asc");
    await expect
      .poll(async () => (await expression.snapshot()).map(({ name }) => name))
      .toEqual(alphabetical);

    await expression.sortBy("name", "desc");
    await expect
      .poll(async () => (await expression.snapshot()).map(({ name }) => name))
      .toEqual([...alphabetical].reverse());
  });

  test("expanding a tissue lists its sub-tissues; collapsing hides them", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const { children } = groupForView(rows, "tissue");
    const [[parent, subTissues], [otherParent, otherSubTissues]] = [...children.entries()]
      .filter(([, names]) => names.size > 1)
      .sort((a, b) => b[1].size - a[1].size);
    expect(subTissues.size, "BRAF should have a tissue with several sub-tissues").toBeGreaterThan(2);

    await test.step("expand one tissue", async () => {
      await expression.expand(parent);
      await expect(expression.rows(2)).toHaveCount(subTissues.size);
      const names = (await expression.snapshot(2)).map(({ name }) => name);
      expect(names.sort()).toEqual([...subTissues].sort());
      await expect(expression.collapseAll).toBeVisible();
      await expect(expression.collapseAll).toHaveText("Collapse all");
      // sub-tissue bars are normalised on the same scale as their parent
      for (const row of await expression.snapshot(2)) {
        for (const { slug } of EXPRESSION_COLUMNS) {
          expect(rank(row[slug])).toBeLessThanOrEqual(100);
        }
      }
    });

    await test.step("expand a second tissue as well", async () => {
      await expression.expand(otherParent);
      await expect(expression.rows(2)).toHaveCount(subTissues.size + otherSubTissues.size);
    });

    await test.step("collapse the first by clicking it again", async () => {
      await expression.collapse(parent);
      await expect(expression.rows(2)).toHaveCount(otherSubTissues.size);
      await expect(expression.collapseAll).toBeVisible();
    });

    await test.step("collapse all", async () => {
      await expression.expand(parent);
      await expression.collapseAll.click();
      await expect(expression.rows(2)).toHaveCount(0);
      await expect(expression.row(1, parent)).toHaveAttribute("data-expanded", "false");
      await expect(expression.row(1, otherParent)).toHaveAttribute("data-expanded", "false");
      await expect(expression.collapseAll).toBeHidden();
    });
  });

  test("a sub-tissue with single-cell data opens a plot of its cell types", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const { children, details } = groupForView(rows, "tissue");
    // a parent tissue with a sub-tissue that has cell-type measurements, and one without
    const candidates = [...children.entries()].map(([parent, names]) => ({
      parent,
      withDetail: [...names].filter((name) => details.has(name)),
      withoutDetail: [...names].filter((name) => !details.has(name)),
    }));
    const chosen = candidates.find(
      ({ withDetail, withoutDetail }) => withDetail.length > 0 && withoutDetail.length > 0
    );
    expect(chosen, "BRAF should have a tissue with both kinds of sub-tissue").toBeDefined();
    const { parent, withDetail, withoutDetail } = chosen as (typeof candidates)[number];
    const subTissue = withDetail[0];
    const cellTypes = details.get(subTissue) ?? 0;
    expect(cellTypes).toBeGreaterThan(0);

    await expression.expand(parent);
    const row = expression.row(2, subTissue);
    await expect(row).toHaveCount(1);
    await expect(expression.detailPlots).toHaveCount(0);

    await test.step("only sub-tissues with cell-type data can be opened", async () => {
      await expect(row.getByTestId("baseline-expression-expand-detail")).toBeVisible();
      await expect(
        expression.row(2, withoutDetail[0]).getByTestId("baseline-expression-expand-detail")
      ).toBeHidden();
      await expression.nameCell(expression.row(2, withoutDetail[0])).click();
      await expect(expression.detailPlots, "a sub-tissue without detail opens nothing").toHaveCount(0);
    });

    await test.step("open the cell-type plot", async () => {
      await expression.nameCell(row).click();
      await expect(row).toHaveAttribute("data-expanded", "true");
      await expect(expression.detailPlots).toHaveCount(1);
      const plot = expression.detailPlots;
      await expect(plot).toContainText("Cell Type");
      // one label and one bar per cell type measured in this sub-tissue
      await expect(plot.locator("svg g[aria-label='text'] text")).toHaveCount(cellTypes);
      await expect(plot.locator("svg g[aria-label='bar']")).toHaveCount(2);
      await expect(plot.locator("svg g[aria-label='bar']").last().locator("rect")).toHaveCount(
        cellTypes
      );
    });

    await test.step("close it again", async () => {
      await expression.nameCell(row).click();
      await expect(row).toHaveAttribute("data-expanded", "false");
      await expect(expression.detailPlots).toHaveCount(0);
    });

    await test.step("collapsing the parent closes an open plot too", async () => {
      await expression.nameCell(row).click();
      await expect(expression.detailPlots).toHaveCount(1);
      await expression.collapse(parent);
      await expect(expression.detailPlots).toHaveCount(0);
      await expression.expand(parent);
      await expect(expression.detailPlots, "re-expanding the parent starts closed").toHaveCount(0);
    });
  });

  test("cell type view: regroups by cell type, with no proteomics column", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const tissue = groupForView(rows, "tissue");
    const cellType = groupForView(rows, "celltype");
    expect(cellType.parents.length, "BRAF is measured in many cell types").toBeGreaterThan(5);
    expect(cellType.datatypes.has("mass-spectrometry proteomics")).toBe(false);

    // expand something first: switching view must reset it
    await expression.expand(tissue.parents[0]);
    await expect(expression.collapseAll).toBeVisible();

    await expression.switchView("celltype");
    await expect(expression.viewButton("tissue")).toHaveAttribute("aria-pressed", "false");
    await expect(expression.headers).toHaveText([
      CELL_TYPE_HEADER,
      "Single-cell RNA-seq",
      "Bulk RNA-seq",
      "",
    ]);
    await expect(expression.rows(1)).toHaveCount(cellType.parents.length);
    await expect(expression.rows(2)).toHaveCount(0);
    await expect(expression.collapseAll).toBeHidden();
    const snapshot = await expression.snapshot();
    expect(snapshot.map(({ name }) => name).sort()).toEqual([...cellType.parents].sort());
    expect(
      snapshot.every((row) => row["mass-spectrometry-proteomics"] === null),
      "there is no proteomics data by cell type"
    ).toBe(true);
    await expect(expression.axis("scrna-seq")).toHaveText(/^0 CPM\d/);
    await expect(expression.axis("bulk-rna-seq")).toHaveText(/^0 TPM\d/);
    await expect(expression.axis("mass-spectrometry-proteomics")).toHaveCount(0);

    await test.step("sorted by the most specific datatype of this view", async () => {
      const sorted = slugOf(cellType.mostSpecific?.datatypeId ?? "");
      await expect(expression.columnHeader(sorted)).toHaveAttribute("data-sort", "desc");
      const ranks = (await expression.snapshot()).map((row) => rank(row[sorted]));
      expect(ranks[0]).toBe(100);
      expect(isNonIncreasing(ranks), `descending ${sorted}: ${ranks}`).toBe(true);
    });

    await test.step("a cell type expands to its sub-types, whose plot is by tissue", async () => {
      const withDetail = [...cellType.children.entries()]
        .map(([parent, names]) => ({
          parent,
          names,
          detailed: [...names].find((name) => cellType.details.has(name)),
        }))
        .find(({ detailed }) => detailed);
      expect(withDetail, "BRAF should have a cell type measured across tissues").toBeDefined();
      const { parent, names, detailed } = withDetail as {
        parent: string;
        names: Set<string>;
        detailed: string;
      };

      await expression.expand(parent);
      await expect(expression.rows(2)).toHaveCount(names.size);
      await expression.nameCell(expression.row(2, detailed)).click();
      await expect(expression.detailPlots).toHaveCount(1);
      await expect(expression.detailPlots).toContainText("Tissue");
      await expect(expression.detailPlots.locator("svg g[aria-label='text'] text")).toHaveCount(
        cellType.details.get(detailed) ?? 0
      );
    });

    await test.step("back to the tissue view", async () => {
      await expression.switchView("tissue");
      await expect(expression.headers).toHaveText([
        TISSUE_HEADER,
        ...EXPRESSION_COLUMNS.map(({ label }) => label),
      ]);
      await expect(expression.rows(1)).toHaveCount(tissue.parents.length);
      await expect(expression.rows(2)).toHaveCount(0);
      await expect(expression.detailPlots).toHaveCount(0);
    });
  });

  test("tooltips explain the legend, the ontology and a bar's median", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const { mostSpecific } = groupForView(rows, "tissue");
    const sorted = slugOf(mostSpecific?.datatypeId ?? "");

    await test.step("specificity legend", async () => {
      await expression.helpIcon("Specificity").hover();
      await expect(expression.tooltip.filter({ hasText: "Specificity score threshold" })).toHaveText(
        "Specificity score threshold: 75%A high value indicates BRAF is in the top 25% of specifically expressed genes in the tissue."
      );
    });

    await test.step("median expression legend", async () => {
      await expression.helpIcon("Median expression").hover();
      await expect(expression.tooltip.filter({ hasText: "normalised" })).toHaveText(
        "Median expression normalised within columns"
      );
    });

    await test.step("tissue ontology", async () => {
      await expression.nameHeaderHelpIcon.hover();
      const tooltip = expression.tooltip.filter({ hasText: "Mapped to" });
      await expect(tooltip).toHaveText("Mapped to Uber-anatomy ontology (UBERON)");
      await expect(
        tooltip.getByRole("link", { name: "Uber-anatomy ontology (UBERON)" })
      ).toHaveAttribute("href", "https://www.ebi.ac.uk/ols4/ontologies/uberon");
    });

    await test.step("a bar shows the tissue and its median with a unit", async () => {
      const first = expression.rows(1).first();
      const name = (await expression.snapshot())[0].name;
      // the bar itself ignores the pointer; the hover lands on its tooltip wrapper
      await expression.bar(first, sorted).hover({ force: true });
      const tooltip = expression.tooltip.filter({ hasText: "Median expression" });
      await expect(tooltip).toContainText(`Tissue:${name}`);
      await expect(tooltip).toHaveText(/Median expression:[\d,.]+ \S+/);
    });

    await test.step("a specificity dot shows the score as a percentage", async () => {
      const dot = expression.rows(1).first().getByTestId("baseline-expression-specificity-low").first();
      await dot.hover();
      await expect(expression.tooltip.filter({ hasText: /Specificity score:/ })).toHaveText(
        /Specificity score:(\d+(\.\d)?%|N\/A)$/
      );
    });

    await test.step("cell type view explains its own ontology and legend", async () => {
      await expression.switchView("celltype");
      await expression.nameHeaderHelpIcon.hover();
      const tooltip = expression.tooltip.filter({ hasText: "Mapped to" });
      await expect(tooltip).toHaveText("Mapped to Cell Ontology (CL)");
      await expect(tooltip.getByRole("link", { name: "Cell Ontology (CL)" })).toHaveAttribute(
        "href",
        "https://www.ebi.ac.uk/ols4/ontologies/cl"
      );
      await expression.helpIcon("Specificity").hover();
      await expect(
        expression.tooltip.filter({ hasText: "Specificity score threshold" })
      ).toContainText("specifically expressed genes in the cell type.");
    });
  });

  test("a tissue measured without detectable protein shows N/A and says why", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    const undetected = rows.filter(
      (row) =>
        row.datatypeId === "mass-spectrometry proteomics" &&
        row.median === null &&
        row.tissueBiosample &&
        !row.celltypeBiosample
    );
    expect(
      undetected.length,
      "BRAF should have a tissue where no protein was detected"
    ).toBeGreaterThan(0);

    const cells = expression.heatmap.getByTestId("baseline-expression-na");
    await expect(cells.first()).toHaveText("N/A");
    const snapshot = await expression.snapshot();
    const naRows = snapshot.filter((row) => row["mass-spectrometry-proteomics"] === "N/A");
    expect(naRows.length).toBeGreaterThan(0);
    // "N/A" only ever stands for "measured, nothing detected", which only proteomics reports
    expect(snapshot.some((row) => row["scrna-seq"] === "N/A" || row["bulk-rna-seq"] === "N/A")).toBe(
      false
    );

    await cells.first().hover();
    await expect(expression.tooltip.filter({ hasText: "No protein detected" })).toHaveText(
      "No protein detected in the measured tissue sample"
    );
  });

  test("the view buttons say whether a view has a highly specific biosample", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.primary);
    expect(
      groupForView(rows, "tissue").mostSpecific?.specificity_score,
      "BRAF is broadly expressed: no tissue reaches the 0.75 specificity threshold"
    ).toBeLessThan(0.75);

    await expect(expression.viewSpecificityDot("tissue", "low")).toBeVisible();
    await expect(expression.viewSpecificityDot("celltype", "low")).toBeVisible();
    await expect(expression.heatmap.getByTestId("baseline-expression-specificity-high")).toHaveCount(0);

    await expression.viewButton("tissue").hover();
    await expect(expression.tooltip.filter({ hasText: "tissue" })).toHaveText(
      "No tissues have a high specificity score"
    );
  });

  test("a tissue-specific target is flagged as highly specific, with the reason", async ({
    page,
    testConfig,
  }) => {
    const { expression, rows } = await openExpression(page, testConfig.target?.withSpecificExpression);
    const tissue = groupForView(rows, "tissue");
    const cellType = groupForView(rows, "celltype");
    expect(tissue.mostSpecific?.specificity_score).toBeGreaterThanOrEqual(0.75);
    expect(cellType.mostSpecific?.specificity_score).toBeGreaterThanOrEqual(0.75);

    await expect(expression.description).toContainText("RNA and protein baseline expression for ALB");
    await expect(expression.viewSpecificityDot("tissue", "high")).toBeVisible();
    await expect(expression.viewSpecificityDot("celltype", "high")).toBeVisible();

    await test.step("view button tooltip", async () => {
      await expression.viewButton("tissue").hover();
      await expect(expression.tooltip.filter({ hasText: "tissue" })).toHaveText(
        "At least one tissue has a high specificity score"
      );
    });

    await test.step("sorted by the datatype of the most specific tissue", async () => {
      await expect(
        expression.columnHeader(slugOf(tissue.mostSpecific?.datatypeId ?? ""))
      ).toHaveAttribute("data-sort", "desc");
    });

    await test.step("the most specific tissue carries a green dot that explains itself", async () => {
      const parent = tissue.mostSpecific?.tissueBiosampleParent?.biosampleName ?? "";
      const slug = slugOf(tissue.mostSpecific?.datatypeId ?? "");
      const dot = expression
        .cell(expression.row(1, parent), slug)
        .getByTestId("baseline-expression-specificity-high");
      await expect(dot).toHaveCount(1);
      await expect(expression.heatmap.getByTestId("baseline-expression-specificity-low").first()).toBeVisible();

      await dot.hover();
      const tooltip = expression.tooltip.filter({ hasText: /Specificity score:/ });
      await expect(tooltip).toContainText(`Tissue:${parent}`);
      await expect(tooltip).toContainText(/Specificity score:\d+(\.\d)?%/);
      await expect(tooltip).toContainText(
        /ALB is in the top \d+(\.\d)?% of specifically expressed genes for \S+/
      );
    });
  });

  test("exports every measurement as JSON and TSV", async ({ page, testConfig }) => {
    const { expression, rows, count } = await openExpression(page, testConfig.target?.primary);
    expect(rows.length, "the widget's query should fetch every measurement the API counts").toBe(
      count
    );
    const columns = [
      "tissueBiosampleName",
      "tissueBiosampleId",
      "tissueBiosampleFromSource",
      "celltypeBiosampleName",
      "celltypeBiosampleId",
      "celltypeBiosampleFromSource",
      "median",
      "unit",
      "datasourceId",
      "datatypeId",
      "specificityScore",
      "distributionScore",
    ];

    await test.step("JSON", async () => {
      const { filename, rows: exported } = await expression.controls.downloadJson();
      expect(filename).toBe("BRAF-baseline-expression.json");
      expect(exported).toHaveLength(rows.length);
      expect(Object.keys(exported[0])).toEqual(columns);
      expect(exported.map((row) => row.median)).toEqual(rows.map((row) => row.median));
      expect(exported.map((row) => row.datatypeId)).toEqual(rows.map((row) => row.datatypeId));
      expect(exported.map((row) => row.tissueBiosampleName)).toEqual(
        rows.map((row) => row.tissueBiosample?.biosampleName ?? null)
      );
      expect(exported.map((row) => row.specificityScore)).toEqual(
        rows.map((row) => row.specificity_score)
      );
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await expression.controls.downloadTsv();
      expect(filename).toBe("BRAF-baseline-expression.tsv");
      expect(header).toEqual(columns);
      expect(lines).toHaveLength(rows.length);
      expect(lines.every((line) => line.length === columns.length)).toBe(true);
    });
  });

  test("the API query drawer shows the section's query and variables", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary ?? "";
    const { expression } = await openExpression(page, targetId);

    const drawer = await expression.controls.openApiQuery(ExpressionSection.operation, targetId);
    await expect(drawer).toContainText("baselineExpression");
    await expression.controls.closeApiQuery();
    await expect(expression.heatmap, "the heatmap is still there after the drawer closes").toBeVisible();
  });

  test("the GTEx tab draws the variation box plot and the Summary tab comes back", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary ?? "";
    const requested = await stubGtexPortal(page);
    const { expression, rows } = await openExpression(page, targetId);
    const tissueRows = groupForView(rows, "tissue").parents.length;

    await expression.gtexTab.click();
    await expect(
      expression.gtexPlot,
      "the GTEx tab should draw its box plot (if the whole section is gone, the tab switch removed it)"
    ).toBeVisible();
    await expect(expression.section).toBeVisible();
    await expect(expression.gtexTab).toHaveAttribute("aria-selected", "true");

    await test.step("box plot", async () => {
      await expect(expression.gtexPlot).toBeVisible();
      await expect(expression.gtexPlot).toContainText("Normalised expression (RPKM)");
      for (const tissue of STUBBED_GTEX_TISSUES) {
        await expect(
          expression.gtexPlot.getByText(tissue.replace(/_/g, " "), { exact: true })
        ).toBeVisible();
      }
      // one box per tissue, and one outlier each in the stubbed data
      await expect(expression.gtexPlot.locator("g.boxplot rect")).toHaveCount(
        STUBBED_GTEX_TISSUES.length
      );
      await expect(expression.gtexPlot.locator("g.boxplot circle")).toHaveCount(
        STUBBED_GTEX_TISSUES.length
      );
      await expect(expression.heatmap).toHaveCount(0);
      expect(requested.some((url) => url.includes(`/reference/gene?geneId=${targetId}`))).toBe(true);
      expect(
        requested.some((url) => url.includes("/expression/geneExpression?datasetId=gtex_v10"))
      ).toBe(true);
    });

    await test.step("SVG download", async () => {
      const downloadStarted = page.waitForEvent("download");
      await expression.section.getByRole("button", { name: "SVG" }).click();
      expect((await downloadStarted).suggestedFilename()).toBe("BRAF-gtex.svg");
    });

    await test.step("back to Summary", async () => {
      await expression.summaryTab.click();
      await expect(expression.summaryTab).toHaveAttribute("aria-selected", "true");
      await expect(expression.gtexPlot).toHaveCount(0);
      await expect(expression.rows(1)).toHaveCount(tissueRows);
    });
  });
});

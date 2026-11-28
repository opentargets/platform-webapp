import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import {
  log10PValue,
  P_VALUE_PATTERN,
  TARGET_QTL_COLUMNS,
  TARGET_QTL_OPERATION,
  TargetQtlCredibleSetsSection,
} from "../../../../POM/objects/widgets/Target/targetQtlCredibleSetsSection";
import {
  requireTarget,
  TargetPage,
  targetIdentity,
  targetWidget,
} from "../../../../POM/page/target";
import { expectSections } from "../../../../utils/sections";

const CREDIBLE_SET_HREF = /^\/credible-set\/[0-9a-f]{32}$/;
const VARIANT_HREF = /^\/variant\/(\d{1,2}|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/;
/** Long alleles are abbreviated to DEL / INS in the cell; the link keeps the full id. */
const VARIANT_LABEL = /^(\d{1,2}|X|Y|MT)_\d+_(DEL|[ACGT]+)_(INS|[ACGT]+)$/;
const CONFIDENCE_LABELS =
  /^(SuSiE fine-mapped credible set with (in|out-of)-sample LD|PICS fine-mapped credible set (extracted from summary statistics|based on reported top hit)|Unknown confidence)$/;

function expectSorted(values: number[], direction: "ascending" | "descending", what: string): void {
  const sorted = [...values].sort((a, b) => (direction === "ascending" ? a - b : b - a));
  expect(values, `${what} should be in ${direction} order`).toEqual(sorted);
}

const toNumber = (text: string): number => Number(text.replace(/,/g, ""));

/**
 * Target profile > molQTL Credible Sets (packages/sections/src/target/QTLCredibleSets).
 * TargetQTLCredibleSetsQuery is paginated by the server, but the table is sorted by
 * p-value and the API cannot sort, so the table downloads every credible set, sorts and
 * searches them in the browser, and pages through the result ten at a time.
 */
test.describe("Target molQTL credible sets section", () => {
  test("the section is loaded with its title, description and source link", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();

    await expect(qtl.title).toHaveText("molQTL Credible Sets");
    await expect(qtl.description).toHaveText(
      `95% credible sets fine-mapped from quantitative trait loci associated with molecular traits affecting ${symbol}. Source Open Targets`
    );
    await expect(qtl.description.locator("strong")).toHaveText(symbol);
    await expect(qtl.descriptionLink("Open Targets")).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/target"
    );
  });

  test("each row links its credible set, lead variant and study, and shows the statistics", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    await qtl.table.expectHeaders(TARGET_QTL_COLUMNS);
    const total = await qtl.table.total();
    expect(
      total,
      "the primary target should have more than two pages of credible sets"
    ).toBeGreaterThan(20);
    await expect(qtl.table.rows).toHaveCount(10);
    await qtl.table.expectPosition(1, 10, total);

    for (let row = 0; row < 10; row++) {
      const credibleSet = qtl.cell(row, "credibleSet").getByRole("link");
      await expect(credibleSet).toHaveText("View");
      await expect(credibleSet).toHaveAttribute("href", CREDIBLE_SET_HREF);

      const variant = qtl.cell(row, "leadVariant").getByRole("link");
      await expect(variant).toHaveText(VARIANT_LABEL);
      await expect(variant).toHaveAttribute("href", VARIANT_HREF);

      const study = qtl.cell(row, "study").getByRole("link");
      await expect(study).toHaveText(/^\S{5,}$/);
      const studyId = (await study.innerText()).trim();
      await expect(study).toHaveAttribute("href", `/study/${studyId}`);

      await expect(qtl.cell(row, "type")).toHaveText(/^\s*[a-z]+QTL(\s+trans)?\s*$/);
      await expect(qtl.cell(row, "condition")).toHaveText(/\S/);
      await expect(qtl.cell(row, "pValue")).toHaveText(P_VALUE_PATTERN);
      await expect(qtl.cell(row, "beta")).toHaveText(/^-?\d+(\.\d+)?(e[+-]\d+)?$/);
      await expect(
        qtl.cell(row, "confidence").locator("svg[data-icon='star']"),
        "confidence is shown out of four stars"
      ).toHaveCount(4);
      await expect(qtl.cell(row, "method")).toHaveText(/^(PICS|SuSiE|SuSiE-inf)$/);
      await expect(qtl.cell(row, "size")).toHaveText(/^[1-9][\d,]*$/);
    }

    const credibleSets = await qtl
      .column("credibleSet")
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(new Set(credibleSets).size, "each credible set should be listed once").toBe(10);
  });

  test("the lead variant of the first row lies on the target's chromosome", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { chromosome } = targetIdentity(ensgId);
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    // the strongest associations with a gene's expression are in cis
    await expect(qtl.cell(0, "leadVariant").getByRole("link")).toHaveAttribute(
      "href",
      new RegExp(`^/variant/${chromosome}_\\d+_[ACGT]+_[ACGT]+$`)
    );
  });

  test("rows are sorted by p-value across pages, strongest first", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
    const total = await qtl.table.total();

    const firstPage = (await qtl.columnTexts("pValue")).map(log10PValue);
    expect(firstPage).toHaveLength(10);
    expectSorted(firstPage, "ascending", "p-values on the first page");
    expect(
      firstPage[0],
      "the strongest association should be genome-wide significant"
    ).toBeLessThan(-7);

    await qtl.table.nextPageButton.click();
    await qtl.table.expectPosition(11, 20, total);
    const secondPage = (await qtl.columnTexts("pValue")).map(log10PValue);
    expectSorted(secondPage, "ascending", "p-values on the second page");
    expect(
      secondPage[0],
      "the second page should continue where the first ended: the sort covers every row, not one page"
    ).toBeGreaterThanOrEqual(firstPage[9]);

    await qtl.table.lastPageButton.click();
    await qtl.table.expectLastPage();
    const lastPage = (await qtl.columnTexts("pValue")).map(log10PValue);
    expectSorted(lastPage, "ascending", "p-values on the last page");
    expect(lastPage[lastPage.length - 1]).toBeGreaterThan(firstPage[0]);
  });

  test("sorting by another column reorders every row, in both directions", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
    const total = await qtl.table.total();
    const byPValue = await qtl.table.rowTexts();

    await test.step("credible set size, largest first", async () => {
      await qtl.header("size").getByText("Credible set size", { exact: true }).click();
      await expect
        .poll(() => qtl.table.rowTexts(), { message: "the rows should be reordered" })
        .not.toEqual(byPValue);
      await qtl.table.expectPosition(1, 10, total);
      const sizes = (await qtl.columnTexts("size")).map(toNumber);
      expectSorted(sizes, "descending", "credible set sizes");
      const largest = sizes[0];

      await qtl.table.lastPageButton.click();
      await qtl.table.expectLastPage();
      const smallest = (await qtl.columnTexts("size")).map(toNumber);
      expectSorted(smallest, "descending", "credible set sizes on the last page");
      expect(
        smallest[smallest.length - 1],
        "the last page should hold the smallest sets"
      ).toBeLessThan(largest);
    });

    await test.step("credible set size, smallest first", async () => {
      await qtl.header("size").getByText("Credible set size", { exact: true }).click();
      // changing the sort returns to the first page
      await qtl.table.expectPosition(1, 10, total);
      await expect
        .poll(
          async () => {
            const sizes = (await qtl.columnTexts("size")).map(toNumber);
            return (
              sizes.length === 10 &&
              sizes.every((size, index) => index === 0 || sizes[index - 1] <= size)
            );
          },
          { message: "sizes should now be in ascending order" }
        )
        .toBe(true);
    });

    await test.step("beta", async () => {
      await qtl.header("beta").getByText(/^Beta/).click();
      await expect
        .poll(
          async () => {
            const betas = (await qtl.columnTexts("beta")).map(Number);
            return (
              betas.length === 10 &&
              betas.every((beta, index) => index === 0 || betas[index - 1] >= beta)
            );
          },
          { message: "betas should be in descending order" }
        )
        .toBe(true);
      const betas = (await qtl.columnTexts("beta")).map(Number);
      expect(betas[0], "the largest beta should be positive").toBeGreaterThan(0);
    });
  });

  test("the page size changes the rows shown and resets to the first page", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
    const total = await qtl.table.total();
    expect(total).toBeGreaterThan(25);
    const firstPage = await qtl.table.rowTexts();

    await expect(qtl.table.pageSizeSelect).toHaveValue("10");
    await expect(qtl.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    await qtl.table.expectFirstPage();

    await qtl.table.nextPageButton.click();
    await qtl.table.expectPosition(11, 20, total);

    await qtl.table.setPageSize(25);
    await qtl.table.expectPosition(1, 25, total);
    await expect(qtl.table.rows).toHaveCount(25);
    expect((await qtl.table.rowTexts()).slice(0, 10)).toEqual(firstPage);
    expectSorted(
      (await qtl.columnTexts("pValue")).map(log10PValue),
      "ascending",
      "p-values at 25 rows per page"
    );
  });

  test("searching looks through every credible set, and a term with no match empties the table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
    const total = await qtl.table.total();

    // take a study that is not on the first page
    await qtl.table.lastPageButton.click();
    await qtl.table.expectLastPage();
    const studyId = (await qtl.cell(0, "study").innerText()).trim();
    expect(studyId).toMatch(/^\S{5,}$/);

    await qtl.table.search(studyId);
    await expect(qtl.table.pagePosition, "the search should narrow the table").not.toHaveText(
      new RegExp(` of ${total}$`)
    );
    await expect(qtl.cell(0, "study")).toHaveText(studyId);
    const matching = await qtl.table.total();
    expect(matching).toBeGreaterThan(0);
    expect(matching, "one study should account for only a few of the credible sets").toBeLessThan(
      total / 2
    );
    await expect(qtl.table.rows).toHaveCount(Math.min(matching, 10));
    await expect(qtl.column("study")).toHaveText(Array(Math.min(matching, 10)).fill(studyId));

    await qtl.table.search("no credible set matches this");
    await expect(qtl.table.rows).toHaveCount(0);
    await expect(qtl.table.pagePosition).toHaveText(/ of 0$/);

    await qtl.table.search("");
    await qtl.table.expectPosition(1, 10, total);
    await expect(qtl.table.rows).toHaveCount(10);
    await expect(qtl.cell(0, "pValue")).toHaveText(P_VALUE_PATTERN);
  });

  test("header help icons and the confidence stars explain themselves on hover", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    // a tooltip fades out while the next one opens, so each is picked by its text
    await qtl.header("beta").getByText("?", { exact: true }).hover();
    await expect(
      qtl.tooltip.filter({ hasText: "Beta with respect to the ALT allele" })
    ).toBeVisible();

    await qtl.header("confidence").getByText("?", { exact: true }).hover();
    const confidenceHelp = qtl.tooltip.filter({
      hasText:
        "Fine-mapping confidence based on the suitability of the linkage-disequilibrium information and fine-mapping method.",
    });
    await expect(confidenceHelp).toBeVisible();
    await expect(confidenceHelp.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
    );

    await qtl.cell(0, "confidence").locator("svg[data-icon='star']").first().hover();
    await expect(qtl.tooltip.filter({ hasText: CONFIDENCE_LABELS })).toBeVisible();
  });

  test("hovering a study link previews that study", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    const study = qtl.cell(0, "study").getByRole("link");
    const studyId = (await study.innerText()).trim();
    await study.hover();
    await expect(qtl.tooltip).toContainText(`study/${studyId}`);
  });

  test("View opens the credible set page", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    const link = qtl.cell(0, "credibleSet").getByRole("link");
    const href = (await link.getAttribute("href")) ?? "";
    expect(href).toMatch(CREDIBLE_SET_HREF);
    const variantId = (
      (await qtl.cell(0, "leadVariant").getByRole("link").getAttribute("href")) ?? ""
    ).replace("/variant/", "");

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
    await expect(
      page
        .getByRole("link", {
          name: variantId.slice(0, variantId.indexOf("_", variantId.indexOf("_") + 1)),
        })
        .first(),
      "the credible set page should be about the same lead variant"
    ).toBeVisible();
  });

  test("the lead variant opens the variant page, and back returns to the target", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const qtl = new TargetQtlCredibleSetsSection(page);
    const target = new TargetPage(page);

    await target.goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    const link = qtl.cell(0, "leadVariant").getByRole("link");
    const href = (await link.getAttribute("href")) ?? "";
    expect(href).toMatch(VARIANT_HREF);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
    await expect(page.getByTestId("profile-page-header-text")).not.toHaveText(symbol);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/target/${ensgId}`));
    await expect(target.symbol).toHaveText(symbol);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
  });

  test("the study opens the study page", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    const link = qtl.cell(0, "study").getByRole("link");
    const studyId = (await link.innerText()).trim();

    await link.click();
    await expect(page).toHaveURL(new RegExp(`/study/${studyId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(studyId);
  });

  test("columns can be hidden and shown, except the credible set and the lead variant", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    const picker = await qtl.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(TARGET_QTL_COLUMNS.length);
    await expect(
      picker.getByRole("checkbox", { name: "Credible set", exact: true })
    ).toBeDisabled();
    await expect(
      picker.getByRole("checkbox", { name: "Lead variant", exact: true })
    ).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Condition", exact: true }).uncheck();
    await picker.getByRole("checkbox", { name: "Fine-mapping method", exact: true }).uncheck();
    await expect(qtl.table.headers).toHaveCount(TARGET_QTL_COLUMNS.length - 2);
    await expect(qtl.table.headers.filter({ hasText: /^Condition$/ })).toHaveCount(0);
    await expect(qtl.table.rows.first().locator("td")).toHaveCount(TARGET_QTL_COLUMNS.length - 2);

    await picker.getByRole("checkbox", { name: "Condition", exact: true }).check();
    await picker.getByRole("checkbox", { name: "Fine-mapping method", exact: true }).check();
    await qtl.table.expectHeaders(TARGET_QTL_COLUMNS);
    await qtl.table.closeColumnPicker(qtl.title);
  });

  test("the export downloads every credible set, not just the page shown", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();
    const total = await qtl.table.total();

    const file = await qtl.table.download("TSV");
    expect(file.filename).toBe(`${ensgId}-qtl-credible-sets-target.tsv`);
    const { header, rows } = parseTsv(file.text);
    expect(header).toEqual([
      "credibleSet",
      "leadVariant",
      "study",
      "type",
      "condition",
      "pValue",
      "beta",
      "fineMappingConfidence",
      "fineMappingMethod",
      "credibleSetSize",
    ]);
    expect(rows).toHaveLength(total);
    for (const row of rows) {
      expect(row).toHaveLength(10);
      expect(row[0]).toMatch(/^[0-9a-f]{32}$/);
      expect(row[1]).toMatch(/^(\d{1,2}|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/);
      expect(row[3]).toMatch(/^[a-z]+QTL, isTrans:(true|false)$/);
      expect(row[5]).toMatch(/^\d(\.\d+)?x10-?\d+$/);
      expect(Number(row[9])).toBeGreaterThan(0);
    }
    expect(
      new Set(rows.map((row) => row[0])).size,
      "each credible set should be exported once"
    ).toBe(total);
  });

  test("the API query drawer shows the query behind the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const qtl = new TargetQtlCredibleSetsSection(page);

    await new TargetPage(page).goto(ensgId);
    await qtl.expectLoaded();
    await qtl.table.expectLoaded();

    await qtl.table.expectApiQuery(TARGET_QTL_OPERATION);
  });

  test("a target without molQTL credible sets does not render the section", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withoutLiteratureOrQtl");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const qtl = new TargetQtlCredibleSetsSection(page);
    const target = new TargetPage(page);

    expect(
      sectionsWithData,
      "the manifest should record this target as having no credible sets"
    ).not.toContain("qtl-credible-sets");
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(qtl.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("qtl-credible-sets"))).toHaveCSS("cursor", "auto");
  });
});

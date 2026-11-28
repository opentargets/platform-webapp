import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  allowSwissBioPicsCors,
  MOUSE_PHENOTYPES_COLUMNS,
  MOUSE_PHENOTYPES_OPERATION,
  MousePhenotypesSection,
} from "../../../../POM/objects/widgets/shared/mousePhenotypesSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import {
  requireTarget,
  TargetPage,
  targetIdentity,
  targetWidget,
} from "../../../../POM/page/target";
import { expectSections } from "../../../../utils/sections";

const MGI_GENE_URL = /^https:\/\/identifiers\.org\/MGI:\d+$/;
const MP_TERM_URL = /^https:\/\/identifiers\.org\/MP:\d{7}$/;

/**
 * Target profile > Mouse Phenotypes (packages/sections/src/target/MousePhenotypes).
 * TargetMousePhenotypesQuery is paginated by the server, ten rows at a time; searching
 * downloads every row and filters them in the browser.
 */
test.describe("Target mouse phenotypes section", () => {
  test.beforeEach(async ({ page }) => {
    await allowSwissBioPicsCors(page);
  });

  test("the section is loaded with its title, description and source link", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();

    await expect(phenotypes.title).toHaveText("Mouse Phenotypes");
    await expect(phenotypes.description).toHaveText(
      `Phenotypes associated with ${symbol} murine homologue(s). Source: MGI.`
    );
    await expect(phenotypes.description.locator("strong")).toHaveText(symbol);
    await expect(phenotypes.descriptionLink("MGI")).toHaveAttribute(
      "href",
      "http://www.informatics.jax.org/phenotypes.shtml"
    );
  });

  test("each row links the mouse gene and the phenotype, and shows categories and models", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    await phenotypes.table.expectHeaders(MOUSE_PHENOTYPES_COLUMNS);
    const total = await phenotypes.table.total();
    expect(
      total,
      "the primary target should have more than one page of mouse phenotypes"
    ).toBeGreaterThan(10);
    await expect(phenotypes.table.rows).toHaveCount(10);
    await phenotypes.table.expectPosition(1, 10, total);

    for (let row = 0; row < 10; row++) {
      const gene = phenotypes.cell(row, "gene").getByRole("link");
      await expect(gene).toHaveText(/^[A-Z][A-Za-z0-9-]+$/);
      await expect(gene).toHaveAttribute("href", MGI_GENE_URL);

      const phenotype = phenotypes.cell(row, "phenotype").getByRole("link");
      await expect(phenotype).toHaveText(/\S.{3,}/);
      await expect(phenotype).toHaveAttribute("href", MP_TERM_URL);

      // one category is a link to the term; several open a drawer
      await expect(phenotypes.cell(row, "category")).toHaveText(
        /^\s*(\d+ categories|[a-z][a-z /,-]+)\s*$/
      );
      await expect(phenotypes.cell(row, "models")).toHaveText(/^\s*([1-9]\d* models?|N\/A)\s*$/);
    }

    const phenotypeNames = await phenotypes.column("phenotype").allInnerTexts();
    expect(new Set(phenotypeNames).size, "each phenotype should be listed once").toBe(10);
    await expect(
      phenotypes.column("category").getByRole("link").first(),
      "a row with a single category should link to its term"
    ).toHaveAttribute("href", MP_TERM_URL);
  });

  test("pagination walks through every page and disables the buttons at both ends", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();
    const total = await phenotypes.table.total();
    expect(total).toBeGreaterThan(20);
    const lastPageStart = Math.floor((total - 1) / 10) * 10 + 1;

    await phenotypes.table.expectFirstPage();
    const firstPage = await phenotypes.table.rowTexts();

    await test.step("next", async () => {
      await phenotypes.table.nextPageButton.click();
      await phenotypes.table.expectPosition(11, 20, total);
      await expect(phenotypes.table.rows).toHaveCount(10);
      await expect(phenotypes.table.firstPageButton).toBeEnabled();
      await expect(phenotypes.table.previousPageButton).toBeEnabled();
      await expect(phenotypes.table.nextPageButton).toBeEnabled();
      await phenotypes.table.expectRowsChangedFrom(firstPage);
      const secondPage = await phenotypes.table.rowTexts();
      for (const row of secondPage)
        expect(firstPage, "page 2 should not repeat page 1").not.toContain(row);
    });

    await test.step("last", async () => {
      await phenotypes.table.lastPageButton.click();
      await phenotypes.table.expectPosition(lastPageStart, total, total);
      await expect(phenotypes.table.rows).toHaveCount(total - lastPageStart + 1);
      await phenotypes.table.expectLastPage();
      await expect(phenotypes.cell(0, "phenotype").getByRole("link")).toHaveAttribute(
        "href",
        MP_TERM_URL
      );
    });

    await test.step("previous", async () => {
      await phenotypes.table.previousPageButton.click();
      await phenotypes.table.expectPosition(lastPageStart - 10, lastPageStart - 1, total);
      await expect(phenotypes.table.rows).toHaveCount(10);
    });

    await test.step("first", async () => {
      await phenotypes.table.firstPageButton.click();
      await phenotypes.table.expectPosition(1, 10, total);
      await phenotypes.table.expectFirstPage();
      await phenotypes.table.expectRowTexts(firstPage);
    });
  });

  test("the page size changes how many rows are fetched and resets to the first page", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();
    const total = await phenotypes.table.total();
    expect(total).toBeGreaterThan(25);
    const firstPage = await phenotypes.table.rowTexts();

    await expect(phenotypes.table.pageSizeSelect).toHaveValue("10");
    await expect(phenotypes.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);

    await phenotypes.table.nextPageButton.click();
    await phenotypes.table.expectPosition(11, 20, total);

    await phenotypes.table.setPageSize(25);
    await phenotypes.table.expectPosition(1, 25, total);
    await expect(phenotypes.table.rows).toHaveCount(25);
    await expect
      .poll(async () => (await phenotypes.table.rowTexts()).slice(0, 10))
      .toEqual(firstPage);

    await phenotypes.table.setPageSize(100);
    await phenotypes.table.expectPosition(1, Math.min(100, total), total);
    await expect(phenotypes.table.rows).toHaveCount(Math.min(100, total));
  });

  test("searching looks through every page, and a term with no match empties the table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();
    const total = await phenotypes.table.total();
    const firstPage = await phenotypes.table.rowTexts();

    // take a phenotype that is not on the first page, and search for its MP id
    await phenotypes.table.nextPageButton.click();
    await phenotypes.table.expectPosition(11, 20, total);
    await phenotypes.table.expectRowsChangedFrom(firstPage);
    const link = phenotypes.cell(0, "phenotype").getByRole("link");
    const { name, href } = await link.evaluate((a: HTMLAnchorElement) => ({
      name: (a.textContent ?? "").trim(),
      href: a.href,
    }));
    const termId = href.replace("https://identifiers.org/", "");
    expect(termId).toMatch(/^MP:\d{7}$/);

    await phenotypes.table.search(termId);
    await expect(phenotypes.table.rows).toHaveCount(1);
    await expect(phenotypes.cell(0, "phenotype").getByRole("link")).toHaveText(name);
    await expect(phenotypes.cell(0, "phenotype").getByRole("link")).toHaveAttribute(
      "href",
      `https://identifiers.org/${termId}`
    );
    await phenotypes.table.expectPosition(1, 1, 1);
    await phenotypes.table.expectFirstPage(true);

    await phenotypes.table.search("no phenotype matches this");
    await expect(phenotypes.table.rows).toHaveCount(0);
    await expect(phenotypes.table.pagePosition).toHaveText(/ of 0$/);

    await phenotypes.table.search("");
    await phenotypes.table.expectPosition(1, 10, total);
    await expect(phenotypes.table.rows).toHaveCount(10);
    await expect(phenotypes.cell(0, "phenotype").getByRole("link")).toHaveAttribute(
      "href",
      MP_TERM_URL
    );
  });

  test("several categories open in a drawer that lists each one with its link", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    const trigger = phenotypes.categoryDrawerTriggers.first();
    await expect(trigger).toHaveText(/^\s*\d+ categories\s*$/);
    const count = Number.parseInt((await trigger.innerText()).trim(), 10);
    expect(count).toBeGreaterThan(1);

    await trigger.click();
    const drawer = phenotypes.categoryDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Category");
    await expect(drawer).toContainText(`${count} Category`);
    const categories = drawer.getByRole("listitem").getByRole("link");
    await expect(categories).toHaveCount(count);
    for (const category of await categories.all()) {
      await expect(category).toHaveText(/^[a-z][a-z /,-]+$/);
      await expect(category).toHaveAttribute("href", MP_TERM_URL);
    }

    await phenotypes.closeDrawer(drawer);
    await expect(trigger).toBeVisible();
  });

  test("the allelic composition opens a drawer with one card per mouse model", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    const trigger = phenotypes.modelsDrawerTriggers.first();
    await expect(trigger).toHaveText(/^\s*[1-9]\d* models?\s*$/);
    const count = Number.parseInt((await trigger.innerText()).trim(), 10);
    await expect(trigger, "one model is singular, several are plural").toHaveText(
      count === 1 ? /1 model\s*$/ : /\d+ models\s*$/
    );

    await trigger.click();
    const drawer = phenotypes.modelsDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Allelic composition");
    await expect(phenotypes.modelCards).toHaveCount(count);
    for (const card of await phenotypes.modelCards.all()) {
      const model = card.getByRole("link").first();
      await expect(model, "each model should name its alleles and genetic background").toHaveText(
        /\S.{3,}/
      );
      await expect(model).toHaveAttribute("href", MGI_GENE_URL);
      // the literature behind the model: a count that opens the publications, or N/A
      await expect(card).toContainText(/\d+ publications?|N\/A/);
    }

    await phenotypes.closeDrawer(drawer);
    await expect(phenotypes.modelCards).toHaveCount(0);
  });

  test("columns can be hidden and shown, except the mouse gene and the allelic composition", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    const picker = await phenotypes.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(MOUSE_PHENOTYPES_COLUMNS.length);
    await expect(picker.getByRole("checkbox", { name: "Mouse gene", exact: true })).toBeDisabled();
    await expect(
      picker.getByRole("checkbox", { name: "Allelic composition", exact: true })
    ).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Phenotype", exact: true })).toBeEnabled();

    await picker.getByRole("checkbox", { name: "Category", exact: true }).uncheck();
    await phenotypes.table.expectHeaders(["Mouse gene", "Phenotype", "Allelic composition"]);
    await expect(phenotypes.table.rows.first().locator("td")).toHaveCount(3);

    await picker.getByRole("checkbox", { name: "Category", exact: true }).check();
    await phenotypes.table.expectHeaders(MOUSE_PHENOTYPES_COLUMNS);
    await phenotypes.table.closeColumnPicker(phenotypes.title);
  });

  test("the export downloads every phenotype, not just the page shown", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();
    const total = await phenotypes.table.total();
    const firstPhenotype = (await phenotypes.cell(0, "phenotype").innerText()).trim();

    const file = await phenotypes.table.download("TSV");
    expect(file.filename).toBe(`${symbol}-mouse-phenotypes.tsv`);
    const { header, rows } = parseTsv(file.text);
    expect(header).toEqual(["mouseGene", "phenotype", "category", "allelicComposition"]);
    expect(rows).toHaveLength(total);
    expect(rows[0][1]).toBe(firstPhenotype);
    for (const row of rows) {
      expect(row).toHaveLength(4);
      expect(row[0]).toMatch(/^[A-Z][A-Za-z0-9-]+$/);
      expect(row[2], "every phenotype should export its categories").toMatch(/^[a-z][a-z /,-]+$/);
    }
  });

  test("the API query drawer shows the query behind the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    await phenotypes.table.expectApiQuery(MOUSE_PHENOTYPES_OPERATION);
  });

  test("a target with a single page of phenotypes shows them all and cannot be paged", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const phenotypes = new MousePhenotypesSection(page);

    await new TargetPage(page).goto(ensgId);
    await phenotypes.expectLoaded();
    await phenotypes.table.expectLoaded();

    const total = await phenotypes.table.total();
    expect(total, "this target should have fewer than ten mouse phenotypes").toBeLessThan(10);
    expect(total).toBeGreaterThan(0);
    await expect(phenotypes.table.rows).toHaveCount(total);
    await phenotypes.table.expectPosition(1, total, total);
    await phenotypes.table.expectFirstPage(true);
    await expect(phenotypes.column("phenotype").getByRole("link")).toHaveCount(total);
  });

  test("a target without mouse phenotypes does not render the section", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "nonCoding");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const phenotypes = new MousePhenotypesSection(page);
    const target = new TargetPage(page);

    expect(
      sectionsWithData,
      "the manifest should record this target as having no mouse phenotypes"
    ).not.toContain("mousephenotypes");
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(phenotypes.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("mousephenotypes"))).toHaveCSS("cursor", "auto");
  });
});

import { expect, test } from "../../../fixtures";
import { closeDrawer, expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  DRUG_WARNINGS_COLUMNS,
  DrugWarningsSection,
  WARNING_COLUMN,
} from "../../../POM/objects/widgets/shared/drugWarningsSection";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";

const WARNING_TYPES = ["Black Box Warning", "Withdrawn"];
const DISEASE_HREF = /^\/disease\/[A-Za-z]+_\d+$/;

test.describe("Drug page: Drug Warnings", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, columns and well-formed warnings", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const warnings = new DrugWarningsSection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, DrugWarningsSection.id);

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(DrugWarningsSection.id)).toHaveText("Drug Warnings");
      await expect(warnings.description).toHaveText(
        `Manually curated withdrawn and black box warnings for ${drugFacts(primary).name}. Source: ChEMBL`
      );
      await expectExternalLink(
        warnings.description.getByRole("link", { name: "ChEMBL" }),
        "https://www.ebi.ac.uk/chembl"
      );
    });

    await test.step("columns", async () => {
      await warnings.table.expectHeaders(DRUG_WARNINGS_COLUMNS);
    });

    const total = await warnings.table.total();
    expect(total, "trastuzumab has a handful of warnings, all on one page").toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(10);
    await warnings.table.expectRows(total);
    await warnings.table.expectPosition(1, total, total);
    await warnings.table.expectPaginationState("only");

    await test.step("every row has a known warning type, a class and a country", async () => {
      for (const type of await warnings.table.columnTexts(WARNING_COLUMN.type)) {
        expect(WARNING_TYPES).toContain(type);
      }
      for (const country of await warnings.table.columnTexts(WARNING_COLUMN.country)) {
        expect(country).toMatch(/^[A-Z][A-Za-z ,.-]+$/);
      }
      for (const year of await warnings.table.columnTexts(WARNING_COLUMN.year)) {
        expect(year).toMatch(/^(N\/A|(19|20)\d{2})$/);
      }
      const classes = await warnings.table.columnTexts(WARNING_COLUMN.warningClass);
      expect(classes).toContain("cardiotoxicity");
      expect(new Set(classes).size, "each warning class of this drug is listed once").toBe(total);
    });

    await test.step("every warning class links to its disease page", async () => {
      await expect(warnings.warningClassLinks).toHaveCount(total);
      for (const link of await warnings.warningClassLinks.all()) {
        await expect(link).toHaveAttribute("href", DISEASE_HREF);
      }
    });

    await test.step("page size options", async () => {
      await expect(warnings.table.pageSizeSelect).toHaveValue("10");
      await expect(warnings.table.pageSizeSelect.getByRole("option")).toHaveText([
        "10",
        "25",
        "100",
      ]);
    });
  });

  test("a row's references open in a drawer grouped by source, rows without any say N/A", async ({
    page,
    testConfig,
  }) => {
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugWarningsSection.id);
    const total = await warnings.table.total();
    await warnings.table.expectRows(total);

    const referenced = warnings.table.rows.filter({ has: page.getByTestId("table-drawer") });
    const unreferenced = warnings.table.rows.filter({ hasNot: page.getByTestId("table-drawer") });
    await expect(referenced.first()).toBeVisible();
    await expect(unreferenced.first().locator("td").nth(WARNING_COLUMN.references)).toHaveText(
      "N/A"
    );

    const button = referenced.first().getByTestId("table-drawer");
    const sources = (await button.innerText()).trim().split(", ");
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(source).toMatch(/^[A-Z][\w ]+$/);

    await button.click();
    const drawer = warnings.referencesDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Records");
    for (const source of sources) await expect(drawer).toContainText(source);
    await expect(drawer.getByText(/^\d+ Records$/)).toHaveCount(sources.length);

    const links = drawer.getByRole("listitem").getByRole("link");
    await expect(links.first()).toBeVisible();
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", /^https?:\/\/\S+$/);
      await expect(link).not.toBeEmpty();
    }

    await closeDrawer(drawer);
  });

  test("paginates a drug with more than one page of warnings", async ({ page, testConfig }) => {
    const { withManyWarnings: chemblId } = drugIds(testConfig);
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, DrugWarningsSection.id);

    const total = await warnings.table.total();
    expect(total, "the drug needs more than one page of warnings").toBeGreaterThan(10);
    expect(total).toBeLessThanOrEqual(20);
    await warnings.table.expectRows(10);
    await warnings.table.expectPosition(1, 10, total);
    await warnings.table.expectPaginationState("first");
    const firstPage = await warnings.table.rows.allInnerTexts();

    await test.step("next page shows the remaining warnings", async () => {
      await warnings.table.nextPageButton.click();
      await warnings.table.expectPosition(11, total, total);
      await warnings.table.expectRows(total - 10);
      await warnings.table.expectPaginationState("last");
      for (const type of await warnings.table.columnTexts(WARNING_COLUMN.type)) {
        expect(WARNING_TYPES).toContain(type);
      }
    });

    await test.step("previous page returns to the first rows", async () => {
      await warnings.table.previousPageButton.click();
      await warnings.table.expectPosition(1, 10, total);
      await warnings.table.expectRows(10);
      expect(await warnings.table.rows.allInnerTexts()).toEqual(firstPage);
    });

    await test.step("last and first buttons jump to the ends", async () => {
      await warnings.table.lastPageButton.click();
      await warnings.table.expectPosition(11, total, total);
      await warnings.table.expectPaginationState("last");
      await warnings.table.firstPageButton.click();
      await warnings.table.expectPosition(1, 10, total);
      await warnings.table.expectPaginationState("first");
    });

    await test.step("page size 25 shows every warning on one page", async () => {
      await warnings.table.pageSizeSelect.selectOption("25");
      await warnings.table.expectPosition(1, total, total);
      await warnings.table.expectRows(total);
      await warnings.table.expectPaginationState("only");
      expect((await warnings.table.rows.allInnerTexts()).slice(0, 10)).toEqual(firstPage);
    });
  });

  test("a withdrawn drug shows year, adverse event links and their description", async ({
    page,
    testConfig,
  }) => {
    const { withManyWarnings: chemblId } = drugIds(testConfig);
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, DrugWarningsSection.id);
    await warnings.table.expectRows(10);

    const withdrawn = warnings.table.rows.filter({ hasText: "Withdrawn" });
    await expect(withdrawn.first()).toBeVisible();
    const row = withdrawn.first();
    await expect(row.locator("td").nth(WARNING_COLUMN.year)).toHaveText(/^(19|20)\d{2}$/);
    await expect(row.locator("td").nth(WARNING_COLUMN.country)).not.toHaveText("N/A");

    const eventLink = row.locator("td").nth(WARNING_COLUMN.adverseEvent).getByRole("link");
    await expect(eventLink).toHaveAttribute("href", DISEASE_HREF);
    await expect(eventLink).not.toBeEmpty();

    await test.step("the help icon explains the adverse event", async () => {
      await row.locator("td").nth(WARNING_COLUMN.adverseEvent).locator("sup").hover();
      await expect(page.getByRole("tooltip").filter({ hasText: "Description:" })).toHaveText(
        /^Description: \S.+/
      );
    });

    await test.step("a warning without class or event falls back to N/A", async () => {
      const blackBox = warnings.table.rows.filter({ hasText: "Black Box Warning" }).first();
      await expect(blackBox.locator("td").nth(WARNING_COLUMN.adverseEvent)).toHaveText("N/A");
      await expect(blackBox.locator("td").nth(WARNING_COLUMN.warningClass)).toHaveText("N/A");
      await expect(blackBox.locator("td").nth(WARNING_COLUMN.year)).toHaveText("N/A");
    });
  });

  test("search filters the whole list, not just the page shown", async ({ page, testConfig }) => {
    const { withManyWarnings: chemblId } = drugIds(testConfig);
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, DrugWarningsSection.id);
    const total = await warnings.table.total();
    await warnings.table.expectRows(10);

    // The term is a warning class taken from the last page, and the expected number of
    // matches is counted over both pages, so a search of only the visible page fails.
    const firstPageClasses = await warnings.table.columnTexts(WARNING_COLUMN.warningClass);
    await warnings.table.lastPageButton.click();
    await warnings.table.expectPosition(11, total, total);
    await warnings.table.expectRows(total - 10);
    const lastPageClasses = await warnings.table.columnTexts(WARNING_COLUMN.warningClass);
    const term = lastPageClasses[lastPageClasses.length - 1];
    expect(term).toMatch(/^[a-z][a-z ]+$/);
    const expected = [...firstPageClasses, ...lastPageClasses].filter((c) => c === term).length;
    expect(expected, "the term must not match every warning").toBeLessThan(total);

    await warnings.table.search(term, total);
    await warnings.table.expectPosition(1, expected, expected);
    await warnings.table.expectRows(expected);
    for (const warningClass of await warnings.table.columnTexts(WARNING_COLUMN.warningClass)) {
      expect(warningClass).toBe(term);
    }

    await test.step("no match", async () => {
      await warnings.table.search("zzz-no-such-warning", total);
      await warnings.table.expectRows(0);
      await expect(warnings.table.position).toHaveText(/ of 0$/);
    });

    await warnings.table.clearSearch(total);
    await warnings.table.expectRows(10);
  });

  for (const { column, links } of [
    { column: "ChEMBL warning class", links: "warningClassLinks" },
    { column: "Adverse event", links: "adverseEventLinks" },
  ] as const) {
    test(`a link in the "${column}" column opens the disease page it names`, async ({
      page,
      testConfig,
    }) => {
      const { withManyWarnings: chemblId } = drugIds(testConfig);
      const drugPage = new DrugPage(page);
      const warnings = new DrugWarningsSection(page);
      await drugPage.goto(chemblId);
      await expectSectionLoaded(page, DrugWarningsSection.id);
      await warnings.table.expectRows(10);

      const link = warnings[links].first();
      const name = (await link.innerText()).trim();
      const href = (await link.getAttribute("href")) ?? "";
      expect(href).toMatch(DISEASE_HREF);

      await link.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(
        page.getByTestId("profile-page-header-text"),
        `"${name}" should open the disease page of ${href}`
      ).toHaveText(name);

      // Finish on the page under test rather than in the middle of the disease page's queries.
      await page.goBack();
      await expect(drugPage.title).toHaveText(drugFacts(chemblId).name);
      await expectSectionLoaded(page, DrugWarningsSection.id);
      await warnings.table.expectRows(10);
    });
  }

  test("the column picker keeps the warning class and hides the rest on demand", async ({
    page,
    testConfig,
  }) => {
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugWarningsSection.id);
    const total = await warnings.table.total();
    await warnings.table.expectRows(total);

    const picker = await warnings.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(DRUG_WARNINGS_COLUMNS.length);
    await expect(picker.getByRole("checkbox", { name: "ChEMBL warning class" })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Year" }).uncheck();
    await picker.getByRole("checkbox", { name: "Country / region" }).uncheck();
    await warnings.table.expectHeaders([
      "Warning type",
      "Adverse event",
      "ChEMBL warning class",
      "References",
    ]);
    await expect(warnings.table.row(0)).not.toContainText("United States");

    await picker.getByRole("checkbox", { name: "Country / region" }).check();
    await picker.getByRole("checkbox", { name: "Year" }).check();
    await warnings.table.expectHeaders(DRUG_WARNINGS_COLUMNS);
    await expect(warnings.table.cell(0, WARNING_COLUMN.country)).toHaveText("United States");
  });

  test("exports every warning, across pages, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const { withManyWarnings: chemblId } = drugIds(testConfig);
    const warnings = new DrugWarningsSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, DrugWarningsSection.id);
    const total = await warnings.table.total();
    await warnings.table.expectRows(10);

    await test.step("JSON holds all rows, not only the ten on screen", async () => {
      const { filename, rows } = await warnings.table.exportJson();
      expect(filename).toBe(`${chemblId}-drug-warning.json`);
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toEqual([
          "warningType",
          "adverseEvent",
          "chEmblWarningClass",
          "countryRegion",
          "year",
          "references",
        ]);
        expect(WARNING_TYPES).toContain(row.warningType);
      }
    });

    await test.step("TSV has a header and one line per warning", async () => {
      const { filename, header, lines } = await warnings.table.exportTsv();
      expect(filename).toBe(`${chemblId}-drug-warning.tsv`);
      expect(header).toHaveLength(DRUG_WARNINGS_COLUMNS.length);
      expect(lines).toHaveLength(total);
    });

    await warnings.table.expectApiQuery("DrugWarningsQuery", chemblId);
  });
});

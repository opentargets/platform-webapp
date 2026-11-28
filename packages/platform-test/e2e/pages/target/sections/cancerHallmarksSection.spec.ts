import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CANCER_HALLMARKS_COLUMNS,
  CANCER_HALLMARKS_OPERATION,
  CancerHallmarksSection,
} from "../../../../POM/objects/widgets/shared/cancerHallmarksSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import {
  requireTarget,
  TargetPage,
  targetIdentity,
  targetWidget,
} from "../../../../POM/page/target";
import { expectSections } from "../../../../utils/sections";

const EUROPE_PMC_SEARCH = /^http:\/\/europepmc\.org\/search\?query=EXT_ID:(\d+)$/;

/**
 * Target profile > Cancer Hallmarks (packages/sections/src/target/CancerHallmarks).
 * One query (TargetHallmarksQuery) feeds the "Role in cancer" chips and a client-side
 * table with a publication drawer per row.
 */
test.describe("Target cancer hallmarks section", () => {
  test("the section is loaded with its title, description and source link", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();

    await expect(hallmarks.title).toHaveText("Cancer Hallmarks");
    await expect(hallmarks.description).toHaveText(
      `Role of ${symbol} in essential alterations in cell physiology that dictate malignant growth. Source: COSMIC.`
    );
    await expect(hallmarks.description.locator("strong")).toHaveText(symbol);
    await expect(hallmarks.descriptionLink("COSMIC")).toHaveAttribute(
      "href",
      "https://cancer.sanger.ac.uk/cosmic"
    );
  });

  test("the role in cancer is shown as chips that link to their publication", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();

    await expect(hallmarks.roleInCancer).toContainText("Role in cancer:");
    await expect(hallmarks.roleInCancerChips.first()).toBeVisible();
    const chips = await hallmarks.roleInCancerChips.all();
    for (const chip of chips) {
      await expect(chip).toHaveText(/^(oncogene|TSG|fusion)$/);
      await expect(chip).toHaveAttribute("href", EUROPE_PMC_SEARCH);
      await expect(chip).toHaveAttribute("target", "_blank");
    }
    const roles = await hallmarks.roleInCancerChips.allInnerTexts();
    expect(new Set(roles).size, "each role should be listed once").toBe(roles.length);
  });

  test("the table lists each hallmark with its effect, description and PubMed id", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    await hallmarks.table.expectHeaders(CANCER_HALLMARKS_COLUMNS);
    const total = await hallmarks.table.total();
    expect(total).toBeGreaterThan(0);
    const shown = Math.min(total, 10);
    await expect(hallmarks.table.rows).toHaveCount(shown);
    await hallmarks.table.expectPosition(1, shown, total);

    for (let row = 0; row < shown; row++) {
      await expect(hallmarks.cell(row, "hallmark")).toHaveText(/^[a-z][a-z ,/-]+$/);
      await expect(hallmarks.cell(row, "effect")).toHaveText(/^(promotes|suppresses)$/);
      await expect(hallmarks.cell(row, "description")).toHaveText(/\S.{5,}/);
      await expect(hallmarks.publicationButton(row)).toHaveText(/^\s*\d{6,9}\s*$/);
    }
  });

  test("searching filters the rows and a term with no match empties the table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();
    const total = await hallmarks.table.total();
    expect(total, "the search test needs more than one row to narrow down").toBeGreaterThan(1);

    // a PubMed id identifies one row: digits cannot fuzzy-match the text columns
    const pubmedId = (await hallmarks.publicationButton(total > 1 ? 1 : 0).innerText()).trim();
    await hallmarks.table.search(pubmedId);
    await expect(hallmarks.table.rows).toHaveCount(1);
    await expect(hallmarks.publicationButton(0)).toHaveText(pubmedId);
    await hallmarks.table.expectPosition(1, 1, 1);

    await hallmarks.table.search("no hallmark matches this");
    await expect(hallmarks.table.rows).toHaveCount(0);
    await expect(hallmarks.table.pagePosition).toHaveText(/ of 0$/);

    await hallmarks.table.search("");
    await expect(hallmarks.table.rows).toHaveCount(Math.min(total, 10));
    await hallmarks.table.expectPosition(1, Math.min(total, 10), total);
  });

  test("the search also matches the hallmark name, across pages", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withManyCancerHallmarks");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();
    const total = await hallmarks.table.total();
    expect(total, "the test target should have more than one page of hallmarks").toBeGreaterThan(
      10
    );

    await hallmarks.table.setPageSize(100);
    await expect(hallmarks.table.rows).toHaveCount(total);
    const names = (await hallmarks.column("hallmark").allInnerTexts()).map((name) => name.trim());
    // the hallmark of the last row is beyond the first page of ten
    const term = names[names.length - 1];
    const withTerm = names.filter((name) => name === term).length;
    expect(
      new Set(names).size,
      "the test target should have more than one distinct hallmark"
    ).toBeGreaterThan(1);

    await hallmarks.table.setPageSize(10);
    await hallmarks.table.search(term);
    await expect(hallmarks.table.pagePosition, "the search should narrow the table").not.toHaveText(
      new RegExp(` of ${total}$`)
    );
    // the search is fuzzy, so it may keep a few other rows; it must keep every row of this hallmark
    await expect(
      hallmarks.column("hallmark").filter({ hasText: new RegExp(`^${term}$`) })
    ).toHaveCount(withTerm);
    const matching = await hallmarks.table.total();
    expect(matching, "the search should narrow the table").toBeLessThan(total);
    expect(matching).toBeGreaterThanOrEqual(withTerm);
  });

  test("a single page of hallmarks cannot be paged", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    const total = await hallmarks.table.total();
    expect(total, "the primary target should fit its hallmarks on one page").toBeLessThanOrEqual(
      10
    );
    await expect(hallmarks.table.rows).toHaveCount(total);
    await hallmarks.table.expectFirstPage(true);
  });

  test("more than ten hallmarks are paged, and the page size changes the rows shown", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withManyCancerHallmarks");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    const total = await hallmarks.table.total();
    expect(total, "the test target should have more than one page of hallmarks").toBeGreaterThan(
      10
    );
    expect(total).toBeLessThanOrEqual(20);

    await test.step("first page", async () => {
      await expect(hallmarks.table.pageSizeSelect).toHaveValue("10");
      await expect(hallmarks.table.rows).toHaveCount(10);
      await hallmarks.table.expectPosition(1, 10, total);
      await hallmarks.table.expectFirstPage();
    });
    const firstPage = await hallmarks.table.rowTexts();

    await test.step("next goes to the last page with the remaining rows", async () => {
      await hallmarks.table.nextPageButton.click();
      await hallmarks.table.expectPosition(11, total, total);
      await expect(hallmarks.table.rows).toHaveCount(total - 10);
      await hallmarks.table.expectLastPage();
      const lastPage = await hallmarks.table.rowTexts();
      for (const row of lastPage)
        expect(firstPage, "page 2 should not repeat page 1").not.toContain(row);
    });

    await test.step("previous, last and first move between the same two pages", async () => {
      await hallmarks.table.previousPageButton.click();
      await hallmarks.table.expectPosition(1, 10, total);
      expect(await hallmarks.table.rowTexts()).toEqual(firstPage);
      await hallmarks.table.lastPageButton.click();
      await hallmarks.table.expectPosition(11, total, total);
      await hallmarks.table.firstPageButton.click();
      await hallmarks.table.expectPosition(1, 10, total);
      await hallmarks.table.expectFirstPage();
    });

    await test.step("page size", async () => {
      await expect(hallmarks.table.pageSizeSelect.locator("option")).toHaveText([
        "5",
        "10",
        "25",
        "100",
      ]);
      await hallmarks.table.setPageSize(5);
      await expect(hallmarks.table.rows).toHaveCount(5);
      await hallmarks.table.expectPosition(1, 5, total);
      expect(await hallmarks.table.rowTexts()).toEqual(firstPage.slice(0, 5));

      await hallmarks.table.setPageSize(25);
      await expect(hallmarks.table.rows).toHaveCount(total);
      await hallmarks.table.expectPosition(1, total, total);
      await hallmarks.table.expectFirstPage(true);
    });
  });

  test("columns can be hidden and shown, except the hallmark itself", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    const picker = await hallmarks.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(CANCER_HALLMARKS_COLUMNS.length);
    for (const column of CANCER_HALLMARKS_COLUMNS) {
      await expect(picker.getByRole("checkbox", { name: column, exact: true })).toBeChecked();
    }
    await expect(picker.getByRole("checkbox", { name: "Hallmark", exact: true })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Effect", exact: true }).uncheck();
    await hallmarks.table.expectHeaders(["Hallmark", "Description", "Publications"]);
    await expect(hallmarks.table.rows.first().locator("td")).toHaveCount(3);

    await picker.getByRole("checkbox", { name: "Effect", exact: true }).check();
    await hallmarks.table.expectHeaders(CANCER_HALLMARKS_COLUMNS);
    await hallmarks.table.closeColumnPicker(hallmarks.title);
  });

  test("the export downloads every hallmark as TSV and as JSON", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withManyCancerHallmarks");
    const { symbol } = targetIdentity(ensgId);
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();
    const total = await hallmarks.table.total();

    await test.step("TSV", async () => {
      const file = await hallmarks.table.download("TSV");
      expect(file.filename).toBe(`${symbol}-hallmarks.tsv`);
      const { header, rows } = parseTsv(file.text);
      expect(header).toEqual(["hallmark", "effect", "description", "literaturePubMedId"]);
      expect(rows, "the export should hold every row, not just the page shown").toHaveLength(total);
      for (const row of rows) {
        expect(row).toHaveLength(4);
        expect(row[1]).toMatch(/^(promotes|suppresses)$/);
        expect(row[3]).toMatch(/^\d+$/);
      }
    });

    await test.step("JSON", async () => {
      const file = await hallmarks.table.download("Json");
      expect(file.filename).toBe(`${symbol}-hallmarks.json`);
      const rows = JSON.parse(file.text) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      expect(Object.keys(rows[0])).toEqual([
        "hallmark",
        "effect",
        "description",
        "literaturePubMedId",
      ]);
      expect(typeof rows[0].literaturePubMedId).toBe("number");
    });
  });

  test("the API query drawer shows the query behind the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    await hallmarks.table.expectApiQuery(CANCER_HALLMARKS_OPERATION);
  });

  test("a PubMed id opens the publication from Europe PMC in a drawer", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const hallmarks = new CancerHallmarksSection(page);
    const drawer = hallmarks.publicationsDrawer;

    await new TargetPage(page).goto(ensgId);
    await hallmarks.expectLoaded();
    await hallmarks.table.expectLoaded();

    const pubmedId = (await hallmarks.publicationButton(0).innerText()).trim();
    expect(pubmedId).toMatch(/^\d+$/);
    await hallmarks.publicationButton(0).click();
    // Europe PMC answers in 10 to 30 seconds at times: wait for the real response, beyond the default timeout
    await expect(
      drawer.root.getByText("Loading Europe PMC search results"),
      "Europe PMC should answer the publication search"
    ).toHaveCount(0, { timeout: 60_000 });
    await drawer.expectOpen("Publications");

    await expect(
      drawer.entries,
      "the drawer should list the one publication of the row"
    ).toHaveCount(1);
    const publication = drawer.entry(pubmedId);
    await expect(publication).toBeVisible();
    const titleLink = publication.getByRole("link").first();
    await expect(titleLink).toHaveText(/\S.{10,}/);
    await expect(titleLink).toHaveAttribute(
      "href",
      `https://europepmc.org/abstract/med/${pubmedId}`
    );

    await test.step("the abstract can be shown and hidden", async () => {
      await publication.getByRole("button", { name: "Show abstract" }).click();
      await expect(publication.getByText("Abstract", { exact: true })).toBeVisible();
      await publication.getByRole("button", { name: "Hide abstract" }).click();
      await expect(publication.getByText("Abstract", { exact: true })).toHaveCount(0);
    });

    await drawer.close();
    await expect(hallmarks.publicationButton(0)).toHaveText(pubmedId);
  });

  test("a target without cancer hallmarks does not render the section", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const hallmarks = new CancerHallmarksSection(page);
    const target = new TargetPage(page);

    expect(
      sectionsWithData,
      "the manifest should record this target as having no hallmarks"
    ).not.toContain("cancerhallmarks");
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(hallmarks.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("cancerhallmarks"))).toHaveCSS("cursor", "auto");
  });
});

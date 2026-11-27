import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { PathwaysSection } from "../../../../POM/objects/widgets/shared/pathwaysSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

const REACTOME_ID = /^R-HSA-\d+$/;

test.describe("Target profile: Pathways section", () => {
  test("shows its title, description and source link", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const pathways = new PathwaysSection(page);

    await page.goto(`/target/${targetId}`);
    await pathways.expectLoaded();

    await expect(pathways.title).toHaveText("Pathways");
    await expect(pathways.description).toHaveText(
      `Biological pathways where ${symbol} is present. Source: Reactome.`
    );
    await expect(pathways.descriptionLink("Reactome")).toHaveAttribute(
      "href",
      "https://reactome.org/"
    );
  });

  test("lists pathways with Reactome links that carry the pathway id and the target symbol", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${targetId}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();

    await controls.expectHeaders(PathwaysSection.COLUMNS);
    await expect(controls.rows, "the first page should be full").toHaveCount(10);
    const total = await controls.total();
    expect(total, "the primary target should have more than one page of pathways").toBeGreaterThan(
      10
    );
    await controls.expectPosition(1, 10, total);

    const seenIds = new Set<string>();
    for (let row = 0; row < 10; row++) {
      await test.step(`row ${row + 1}`, async () => {
        await expect(pathways.pathwayLink(row)).toHaveText(/\S/);
        const href = await pathways.pathwayLink(row).getAttribute("href");
        expect(href).toMatch(/^https:\/\/identifiers\.org\/reactome:R-HSA-\d+$/);
        const pathwayId = (href as string).split("reactome:")[1];
        expect(pathwayId).toMatch(REACTOME_ID);
        seenIds.add(pathwayId);

        await expect(pathways.topLevelPathway(row)).toHaveText(/\S/);
        await expect(pathways.browserLink(row)).toHaveText("Reactome pathway browser");
        await expect(
          pathways.browserLink(row),
          "the browser link should open the same pathway with the target flagged"
        ).toHaveAttribute(
          "href",
          `https://reactome.org/PathwayBrowser/#/${pathwayId}&FLG=${symbol}`
        );
      });
    }
    expect(seenIds.size, "each row should be a different pathway").toBe(10);
  });

  test("paginates: next, previous, last and first change the rows and the enabled buttons", async ({
    page,
    testConfig,
  }) => {
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(10);
    expect(total, "this test assumes exactly two pages of ten").toBeLessThanOrEqual(20);

    await controls.expectFirstPage();
    await expect(controls.rows).toHaveCount(10);
    const firstPage = await controls.rowTexts();

    await controls.nextPageButton.click();
    await controls.expectPosition(11, total, total);
    await expect(controls.rows).toHaveCount(total - 10);
    await controls.expectLastPage();
    const secondPage = await controls.rowTexts();
    for (const row of secondPage) {
      expect(firstPage, "page 2 should not repeat a row of page 1").not.toContain(row);
    }

    await controls.previousPageButton.click();
    await controls.expectPosition(1, 10, total);
    await controls.expectFirstPage();
    expect(await controls.rowTexts()).toEqual(firstPage);

    await controls.lastPageButton.click();
    await controls.expectPosition(11, total, total);
    expect(await controls.rowTexts()).toEqual(secondPage);

    await controls.firstPageButton.click();
    await controls.expectPosition(1, 10, total);
    expect(await controls.rowTexts()).toEqual(firstPage);
  });

  test("page size changes how many rows are shown", async ({ page, testConfig }) => {
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThanOrEqual(25);

    await expect(controls.pageSizeSelect).toHaveValue("10");
    await expect(controls.pageSizeSelect.getByRole("option")).toHaveText(["5", "10", "25", "100"]);

    await controls.setPageSize(5);
    await expect(controls.rows).toHaveCount(5);
    await controls.expectPosition(1, 5, total);
    await controls.expectFirstPage();

    await controls.setPageSize(25);
    await expect(controls.rows).toHaveCount(total);
    await controls.expectPosition(1, total, total);
    await controls.expectFirstPage(true);
  });

  test("search finds a pathway on another page by name and by Reactome id, and clears", async ({
    page,
    testConfig,
  }) => {
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(10);

    // Pick a pathway from page 2, so finding it proves the search covers every page.
    await controls.nextPageButton.click();
    await controls.expectPosition(11, total, total);
    const name = (await pathways.pathwayLink(0).innerText()).trim();
    const href = (await pathways.pathwayLink(0).getAttribute("href")) as string;
    const pathwayId = href.split("reactome:")[1];
    expect(name).not.toBe("");
    expect(pathwayId).toMatch(REACTOME_ID);

    await test.step("by pathway name", async () => {
      await controls.search(name);
      await expect(controls.rows).toHaveCount(1);
      await expect(pathways.pathwayLink(0)).toHaveText(name);
      await controls.expectPosition(1, 1, 1);
      await controls.expectFirstPage(true);
    });

    await test.step("a term nothing matches empties the table", async () => {
      await controls.search("zzqxjv-no-such-pathway");
      await expect(controls.rows).toHaveCount(0);
      await expect(controls.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("by Reactome id, which is only in the links", async () => {
      await controls.search(pathwayId);
      await expect(controls.rows).toHaveCount(1);
      await expect(pathways.pathwayLink(0)).toHaveAttribute("href", href);
    });

    await test.step("clearing the search restores every row", async () => {
      await controls.search("");
      await expect(controls.rows).toHaveCount(10);
      await controls.expectPosition(1, 10, total);
    });
  });

  test("column picker hides and restores a column, and the pathway column cannot be hidden", async ({
    page,
    testConfig,
  }) => {
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();

    const picker = await controls.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(3);
    await expect(picker.getByRole("checkbox", { name: "Pathway", exact: true })).toBeDisabled();
    const topLevel = picker.getByRole("checkbox", { name: "Top-level parent pathway" });
    await expect(topLevel).toBeChecked();

    await topLevel.uncheck();
    await controls.expectHeaders(["Pathway", "View target and pathway"]);
    await expect(controls.table.row(0).locator("td")).toHaveCount(2);

    await topLevel.check();
    await controls.expectHeaders(PathwaysSection.COLUMNS);
    await controls.closeColumnPicker(pathways.title);
  });

  test("exports every pathway as JSON and TSV, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${targetId}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    const firstName = (await pathways.pathwayLink(0).innerText()).trim();

    await test.step("JSON", async () => {
      const file = await controls.download("Json");
      expect(file.filename).toBe(`${targetId}-pathway-target.json`);
      const rows = JSON.parse(file.text) as Record<string, string>[];
      expect(rows, "the export should hold every pathway, not just the page shown").toHaveLength(
        total
      );
      for (const row of rows) {
        expect(Object.keys(row)).toEqual([
          "pathway",
          "topLevelParentPathway",
          "viewTargetAndPathway",
        ]);
        expect(row.pathway).toMatch(/\S/);
        expect(row.topLevelParentPathway).toMatch(/\S/);
        expect(row.viewTargetAndPathway).toMatch(REACTOME_ID);
      }
      expect(rows[0].pathway).toBe(firstName);
    });

    await test.step("TSV", async () => {
      const file = await controls.download("TSV");
      expect(file.filename).toBe(`${targetId}-pathway-target.tsv`);
      const { header, rows } = parseTsv(file.text);
      expect(header).toEqual(["pathway", "topLevelParentPathway", "viewTargetAndPathway"]);
      expect(rows).toHaveLength(total);
      expect(rows[0][0]).toBe(firstName);
      for (const row of rows) expect(row[2]).toMatch(REACTOME_ID);
    });

    await test.step("API query", async () => {
      await controls.expectApiQuery("TargetPathwaysQuery");
    });
  });

  test("a target with a single pathway shows one row and no further page", async ({ page }) => {
    const targetId = EDGE_TARGETS.sparse;
    const { symbol } = targetFacts(targetId);
    const pathways = new PathwaysSection(page);
    const { controls } = pathways;

    await page.goto(`/target/${targetId}`);
    await pathways.expectLoaded();
    await controls.expectLoaded();

    await expect(pathways.description).toContainText(
      `Biological pathways where ${symbol} is present`
    );
    await expect(controls.rows).toHaveCount(1);
    await controls.expectPosition(1, 1, 1);
    await controls.expectFirstPage(true);
    await expect(pathways.browserLink(0)).toHaveAttribute(
      "href",
      new RegExp(`^https://reactome\\.org/PathwayBrowser/#/R-HSA-\\d+&FLG=${symbol}$`)
    );
  });

  test("is not rendered for a target without pathways", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(expected, "the manifest should record that this target has no pathways").not.toContain(
      "pathways"
    );
    const pathways = new PathwaysSection(page);

    await page.goto(`/target/${targetId}`);
    // The rest of the profile has to be there, or "absent" could just mean "page broken".
    await expectSections(page, expected);
    await expect(pathways.section).toHaveCount(0);
  });
});

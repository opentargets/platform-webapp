import { readFile } from "node:fs/promises";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  MolecularStructureSection,
  STRUCTURE_SERVICES,
} from "../../../../POM/objects/widgets/Target/molecularStructureSection";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

/**
 * The structures come from UniProt, AlphaFold and PDBe, not from the platform API. Most
 * tests here use the live services, because that is what breaks in production (a changed
 * AlphaFold file version already did once). The tests of loading and failure states
 * intercept those requests to produce the state on purpose.
 */
test.describe("Target profile: Molecular Structure section", () => {
  test("shows its title, description and source link", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();

    await expect(structure.title).toHaveText("Molecular Structure");
    await expect(structure.description).toHaveText(
      `Structural protein information for ${symbol}. Source: UniProt.`
    );
    await expect(structure.descriptionLink("UniProt")).toHaveAttribute(
      "href",
      "https://www.uniprot.org/"
    );
  });

  test("lists the AlphaFold prediction first and the experimental structures with PDBe links", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    await controls.expectHeaders(MolecularStructureSection.COLUMNS);
    await expect(controls.rows).toHaveCount(10);
    const total = await controls.total();
    expect(total, "the primary target should have several pages of structures").toBeGreaterThan(25);
    await controls.expectPosition(1, 10, total);

    await test.step("the prediction", async () => {
      await expect(structure.alphaFoldRows).toHaveCount(1);
      await expect(controls.table.row(0).locator("td")).toHaveText([
        `AF-${uniprotId}-F1`,
        "Prediction",
        "N/A",
        "A",
        /^1-\d+$/,
        "AlphaFold",
      ]);
      await expect(controls.table.cell(0, 5).getByRole("link")).toHaveAttribute(
        "href",
        `https://www.alphafold.ebi.ac.uk/entry/${uniprotId}`
      );
    });

    await test.step("the experimental structures", async () => {
      await expect(structure.pdbRows).toHaveCount(9);
      for (let row = 1; row < 10; row++) {
        const cells = controls.table.row(row).locator("td");
        const id = (await cells.nth(0).innerText()).trim();
        expect(id).toMatch(/^[0-9][A-Z0-9]{3}$/);
        await expect(cells.nth(1), "method").toHaveText(/^[A-Za-z][A-Za-z -]*$/);
        await expect(cells.nth(2), "resolution in ångström, or none").toHaveText(
          /^(\d+(\.\d+)? [\u00C5\u212B]|-)$/
        );
        await expect(cells.nth(3), "chains").toHaveText(/^[A-Za-z0-9]+([/,] ?[A-Za-z0-9]+)*$/);
        await expect(cells.nth(4), "residue range").toHaveText(/\d+-\d+/);
        await expect(cells.nth(5).getByRole("link")).toHaveText("PDB");
        await expect(cells.nth(5).getByRole("link")).toHaveAttribute(
          "href",
          `https://www.ebi.ac.uk/pdbe/entry/pdb/${id}`
        );
      }
    });

    await test.step("longest structures come first", async () => {
      const lengths = (await controls.table.columnTexts(4)).map((positions) => {
        const [from, to] = positions.split(",")[0].replace(/^.*=/, "").split("-").map(Number);
        return to - from;
      });
      const longest = lengths[0];
      for (const length of lengths) expect(length).toBeLessThanOrEqual(longest);
    });
  });

  test("draws the AlphaFold prediction in the 3D viewer on load, with its confidence legend", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);

    const model = page.waitForResponse((response) =>
      STRUCTURE_SERVICES.alphaFoldModel.test(response.url())
    );
    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    const response = await model;
    expect(response.url()).toContain(`AF-${uniprotId}-F1-model_`);
    expect(response.status(), "the AlphaFold coordinates should download").toBe(200);

    await expect(structure.structureTitle).toHaveText(`AF-${uniprotId}-F1:AlphaFold prediction`);
    await structure.expectStructureDrawn();
    await expect(structure.confidenceLegend).toBeVisible();
    await expect(structure.section).toContainText(/AlphaFold model confidence:\s*low/);
    await expect(structure.modelPicker).toHaveCount(0);
  });

  test("selecting an experimental structure loads it into the viewer", async ({
    page,
    testConfig,
  }) => {
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    await structure.expectStructureDrawn();
    await expect(structure.structureTitle).toContainText("AlphaFold prediction");
    const prediction = await structure.canvasFingerprint();

    // X-ray structures are small files; cryo-EM maps of complexes can be very large.
    await controls.search("X-ray");
    await expect(structure.rowsWithMethod("X-ray").first()).toBeVisible();
    const row = structure.rowsWithMethod("X-ray").first();
    const id = (await row.locator("td").first().innerText()).trim();
    expect(id).toMatch(/^[0-9][A-Z0-9]{3}$/);

    const model = page.waitForResponse((response) =>
      STRUCTURE_SERVICES.pdbModel.test(response.url())
    );
    await row.locator("td").first().click();
    const response = await model;
    expect(response.url()).toContain(`/${id.toLowerCase()}.cif`);
    expect(response.status(), "the PDBe coordinates should download").toBe(200);

    await expect(structure.structureTitle).toHaveText(new RegExp(`^${id}:\\S.*`));
    await expect(structure.structureTitle).not.toContainText("AlphaFold prediction");
    await structure.expectStructureDrawn();
    await expect(
      structure.confidenceLegend,
      "the confidence legend is for predictions"
    ).toHaveCount(0);
    await expect
      .poll(async () => structure.canvasFingerprint(), {
        message: "the viewer should show a different structure",
      })
      .not.toBe(prediction);

    await test.step("selecting the prediction again brings it back", async () => {
      await controls.search("AlphaFold");
      await expect(structure.alphaFoldRows).toHaveCount(1);
      await structure.alphaFoldRows.locator("td").first().click();
      await expect(structure.structureTitle).toContainText("AlphaFold prediction");
      await structure.expectStructureDrawn();
      await expect(structure.confidenceLegend).toBeVisible();
    });
  });

  test("an NMR ensemble gets a model picker that steps through its models and wraps around", async ({
    page,
    testConfig,
  }) => {
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    await structure.expectStructureDrawn();
    await expect(structure.modelPicker).toHaveCount(0);

    await controls.search("NMR");
    await expect(
      structure.rowsWithMethod("NMR").first(),
      "the primary target should have an NMR structure"
    ).toBeVisible();
    const row = structure.rowsWithMethod("NMR").first();
    const id = (await row.locator("td").first().innerText()).trim();
    await expect(row.locator("td").nth(2), "NMR structures have no resolution").toHaveText("-");

    await row.locator("td").first().click();
    await expect(structure.structureTitle).toHaveText(new RegExp(`^${id}`));
    await structure.expectStructureDrawn();

    await expect(structure.modelPicker).toHaveText(/^Model 1\/\d+$/);
    const last = Number((await structure.modelPicker.innerText()).split("/")[1]);
    expect(last, "an ensemble has more than one model").toBeGreaterThan(1);

    await structure.nextModelButton.click();
    await expect(structure.modelPicker).toHaveText(`Model 2/${last}`);
    await structure.previousModelButton.click();
    await expect(structure.modelPicker).toHaveText(`Model 1/${last}`);
    await structure.previousModelButton.click();
    await expect(
      structure.modelPicker,
      "going back from the first model wraps to the last"
    ).toHaveText(`Model ${last}/${last}`);
    await structure.nextModelButton.click();
    await expect(structure.modelPicker).toHaveText(`Model 1/${last}`);
    await structure.expectStructureDrawn();
  });

  test("an experimental structure with a long title shows that title above the viewer", async ({
    page,
    testConfig,
  }) => {
    // The PDB writes long titles as multi-line text fields; NMR entries of BRAF have one:
    // "Solution NMR Structure of the Ras-binding domain of Serine/threonine-protein kinase B-raf ...".
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    await controls.search("NMR");
    await expect(structure.rowsWithMethod("NMR").first()).toBeVisible();
    const row = structure.rowsWithMethod("NMR").first();
    const id = (await row.locator("td").first().innerText()).trim();
    await row.locator("td").first().click();
    await structure.expectStructureDrawn();

    await expect(
      structure.structureTitle,
      "the heading should be '<id>: <title of the structure>'"
    ).toHaveText(new RegExp(`^${id}:\\s*\\S.{10,}`));
  });

  test("sorts by ID in both directions", async ({ page, testConfig }) => {
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    const total = await controls.total();
    const initial = await controls.table.columnTexts(0);

    await structure.sortHeader("ID").click();
    await expect
      .poll(async () => controls.table.columnTexts(0), {
        message: "sorting should reorder the rows",
      })
      .not.toEqual(initial);
    const ascending = await controls.table.columnTexts(0);
    expect(new Set(ascending).size).toBe(10);
    await controls.lastPageButton.click();
    await controls.expectLastPage();
    const lastAscending = (await controls.table.columnTexts(0)).at(-1);

    // Changing the sort order returns to the first page.
    await structure.sortHeader("ID").click();
    await controls.expectPosition(1, 10, total);
    await controls.expectFirstPage();
    await expect
      .poll(async () => (await controls.table.columnTexts(0))[0], {
        message: "descending order should start with the last row of ascending order",
      })
      .toBe(lastAscending);
    await controls.lastPageButton.click();
    await controls.expectLastPage();
    expect((await controls.table.columnTexts(0)).at(-1)).toBe(ascending[0]);
  });

  test("sorts by resolution: worst first on the first click, best first on the second", async ({
    page,
    testConfig,
  }) => {
    // Numeric columns sort descending first. Rows without a number sit at the ends: the AlphaFold
    // prediction shows "N/A" and NMR structures show "-".
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;
    const NUMERIC = /^\d+(\.\d+)? [\u00C5\u212B]$/;
    const numbersOf = (texts: string[]) => {
      const numbers = texts.filter((text) => NUMERIC.test(text));
      for (const text of texts)
        expect(NUMERIC.test(text) || ["N/A", "-"].includes(text), text).toBe(true);
      return numbers.map((text) => Number.parseFloat(text));
    };

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    const initial = await controls.table.columnTexts(2);

    await test.step("first click: descending, the worst resolution first", async () => {
      await structure.sortHeader("Resolution").click();
      await expect
        .poll(async () => controls.table.columnTexts(2), {
          message: "sorting should reorder the rows",
        })
        .not.toEqual(initial);
      const values = numbersOf(await controls.table.columnTexts(2));
      expect(
        values.length,
        "the first page should reach structures with a resolution"
      ).toBeGreaterThan(3);
      expect(values).toEqual([...values].sort((a, b) => b - a));
      await controls.lastPageButton.click();
      await controls.expectLastPage();
      const lastPage = await controls.table.columnTexts(2);
      expect(lastPage.at(-1), "structures without a resolution end the list").toBe("-");
      await controls.firstPageButton.click();
      await controls.expectFirstPage();
    });

    await test.step("second click: ascending, the best resolution first", async () => {
      const descending = await controls.table.columnTexts(2);
      await structure.sortHeader("Resolution").click();
      await expect
        .poll(async () => controls.table.columnTexts(2), {
          message: "sorting should reorder the rows",
        })
        .not.toEqual(descending);
      const texts = await controls.table.columnTexts(2);
      const values = numbersOf(texts);
      expect(values.length).toBeGreaterThan(3);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(texts[0], "structures without a resolution come first").toBe("-");
      await controls.lastPageButton.click();
      await controls.expectLastPage();
      expect((await controls.table.columnTexts(2)).at(-1)).toBe("N/A");
    });
  });

  test("search finds a structure by ID and by method, and paginates what is left", async ({
    page,
    testConfig,
  }) => {
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(25);

    await test.step("pagination and page size", async () => {
      const firstPage = await controls.rowTexts();
      await controls.expectFirstPage();
      await controls.nextPageButton.click();
      await controls.expectPosition(11, 20, total);
      expect(await controls.rowTexts()).not.toEqual(firstPage);
      await controls.setPageSize(25);
      await controls.expectPosition(1, 25, total);
      await expect(controls.rows).toHaveCount(25);
      await controls.setPageSize(10);
      await controls.expectPosition(1, 10, total);
    });

    // A structure from the last page, so finding it proves the search covers every page.
    await controls.lastPageButton.click();
    await controls.expectLastPage();
    const id = (await controls.table.cell(0, 0).innerText()).trim();
    expect(id).toMatch(/^[0-9][A-Z0-9]{3}$/);

    await test.step("by ID", async () => {
      await controls.search(id);
      await expect(controls.table.cell(0, 0)).toHaveText(id);
      await expect
        .poll(async () => controls.total(), { message: "the search should narrow the list" })
        .toBeLessThan(total);
    });

    await test.step("a term nothing matches", async () => {
      await controls.search("zzqxjv-no-such-structure");
      await expect(controls.rows).toHaveCount(0);
      // The viewer keeps showing the structure that was selected.
      await structure.expectStructureDrawn();
    });

    await test.step("by method", async () => {
      await controls.search("Prediction");
      await expect(controls.rows).toHaveCount(1);
      await expect(structure.alphaFoldRows).toHaveCount(1);
    });

    await test.step("clearing the search restores every structure", async () => {
      await controls.search("");
      await controls.expectPosition(1, 10, total);
    });
  });

  test("the info button shows the viewer controls on hover and pins them on click", async ({
    page,
    testConfig,
  }) => {
    const structure = new MolecularStructureSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    await structure.expectStructureDrawn();
    await expect(structure.infoContent).toHaveCount(0);

    await test.step("hover", async () => {
      await structure.infoButton.hover();
      await expect(structure.infoContent).toBeVisible();
      await expect(structure.infoContent.locator("tr")).toHaveText([
        /^Rotate:\s*Drag$/,
        /^Move:\s*Ctrl \+ Drag$/,
        /^Zoom:\s*Ctrl \+ Scroll$/,
        /^Reset:\s*Double click$/,
      ]);
      await structure.title.hover();
      await expect(structure.infoContent).toBeHidden();
    });

    await test.step("click pins it open until clicked again", async () => {
      await structure.infoButton.click();
      await structure.title.hover();
      await expect(structure.infoContent).toBeVisible();
      await structure.infoButton.click();
      await structure.title.hover();
      await expect(structure.infoContent).toBeHidden();
    });
  });

  test("the screenshot button downloads a PNG of the viewer", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const structure = new MolecularStructureSection(page);

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    await structure.expectStructureDrawn();

    await structure.screenshotButton.hover();
    await expect(structure.tooltip.filter({ hasText: "Screenshot" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await structure.screenshotButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${targetId}-molecular-structure.png`);
    const image = await readFile(await download.path());
    expect(image.subarray(0, 8).toString("hex"), "the file should be a PNG").toBe(
      "89504e470d0a1a0a"
    );
    expect(image.length, "the image should not be empty").toBeGreaterThan(5_000);
  });

  test("says it is fetching while the structure services have not answered", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);
    let release = (): void => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    for (const service of [
      STRUCTURE_SERVICES.alphaFoldPrediction,
      STRUCTURE_SERVICES.uniprotEntry,
    ]) {
      await page.route(service, async (route) => {
        await held;
        await route.continue();
      });
    }

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();
    await expect(structure.status).toHaveText(`Fetching structure data for ${uniprotId}`);
    await expect(structure.controls.table.root).toHaveCount(0);

    release();
    await structure.expectTableLoaded();
    await structure.expectStructureDrawn();
  });

  test("shows a loading message over the viewer until the coordinates arrive", async ({
    page,
    testConfig,
  }) => {
    const structure = new MolecularStructureSection(page);
    let release = (): void => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(STRUCTURE_SERVICES.alphaFoldModel, async (route) => {
      await held;
      await route.continue();
    });

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();
    await expect(structure.viewerMessage).toHaveText("Loading structure ...");
    await expect(structure.infoButton, "viewer buttons wait for the structure").toHaveCount(0);
    await expect(structure.screenshotButton).toHaveCount(0);

    release();
    await structure.expectStructureDrawn();
  });

  test("says so when the coordinates cannot be downloaded, and recovers on another structure", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /Response status \(CIF request\): 503/,
      "this test makes the AlphaFold coordinates download fail",
      "console-error"
    );
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;
    await page.route(STRUCTURE_SERVICES.alphaFoldModel, (route) =>
      route.fulfill({ status: 503, contentType: "text/plain", body: "model store down" })
    );

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    await expect(structure.viewerMessage).toHaveText("Failed to download structure data");
    await expect(structure.screenshotButton).toHaveCount(0);
    // The table is still usable.
    await expect(controls.rows).toHaveCount(10);

    await controls.search("X-ray");
    await expect(structure.rowsWithMethod("X-ray").first()).toBeVisible();
    await structure.rowsWithMethod("X-ray").first().locator("td").first().click();
    await structure.expectStructureDrawn();
  });

  test("lists only experimental structures when AlphaFold has no prediction", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /Response status \(AlphaFold request\): 404/,
      "this test makes AlphaFold answer that it has no prediction",
      "console-error"
    );
    const structure = new MolecularStructureSection(page);
    await page.route(STRUCTURE_SERVICES.alphaFoldPrediction, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: '{"detail":"Not found"}',
      })
    );

    await page.goto(`/target/${testConfig.target?.primary}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    await expect(structure.alphaFoldRows).toHaveCount(0);
    await expect(structure.pdbRows).toHaveCount(10);
    const firstId = (await structure.controls.table.cell(0, 0).innerText()).trim();
    await expect(structure.structureTitle).toHaveText(new RegExp(`^${firstId}:`), {
      timeout: 60_000,
    });
    await expect(structure.confidenceLegend).toHaveCount(0);
  });

  test("says no structure is available when neither service has one", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /Response status \((AlphaFold|PDB) request\): 404/,
      "this test makes both structure services answer that they have nothing",
      "console-error"
    );
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);
    for (const service of [
      STRUCTURE_SERVICES.alphaFoldPrediction,
      STRUCTURE_SERVICES.uniprotEntry,
    ]) {
      await page.route(service, (route) =>
        route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      );
    }

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();

    await expect(structure.status).toHaveText(`No structure available for ${uniprotId}`);
    await expect(structure.controls.table.root).toHaveCount(0);
    await expect(structure.viewer).toHaveCount(0);
  });

  test("a target with only a prediction lists and draws just that", async ({ page }) => {
    const targetId = EDGE_TARGETS.sparse;
    const { symbol, uniprotId } = targetFacts(targetId);
    const structure = new MolecularStructureSection(page);
    const { controls } = structure;

    await page.goto(`/target/${targetId}`);
    await structure.expectLoaded();
    await structure.expectTableLoaded();

    await expect(structure.description).toContainText(
      `Structural protein information for ${symbol}`
    );
    await expect(controls.rows).toHaveCount(1);
    await controls.expectPosition(1, 1, 1);
    await controls.expectFirstPage(true);
    await expect(controls.table.cell(0, 0)).toHaveText(`AF-${uniprotId}-F1`);
    await expect(structure.pdbRows).toHaveCount(0);
    await expect(structure.structureTitle).toHaveText(`AF-${uniprotId}-F1:AlphaFold prediction`);
    await structure.expectStructureDrawn();
    await expect(structure.confidenceLegend).toBeVisible();
  });

  test("is not rendered for a target without a protein", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(expected, "the manifest should record that this target has no structure").not.toContain(
      "molecularstructure"
    );
    const structure = new MolecularStructureSection(page);

    await page.goto(`/target/${targetId}`);
    await expectSections(page, expected);
    await expect(structure.section).toHaveCount(0);
  });
});

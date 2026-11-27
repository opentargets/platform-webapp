import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CHEMICAL_PROBES_COLUMN_LABELS,
  CHEMICAL_PROBES_COLUMNS,
  type ChemicalProbe,
  type ChemicalProbesData,
  ChemicalProbesSection,
  inDisplayOrder,
  QUALITY_HEADER_TOOLTIP,
} from "../../../../POM/objects/widgets/shared/chemicalProbesSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

const mechanismText = (probe: ChemicalProbe) => probe.mechanismOfAction.join(", ") || "N/A";
const originText = (probe: ChemicalProbe) => probe.origin.join(", ") || "N/A";
const scoreText = (probe: ChemicalProbe) =>
  probe.probesDrugsScore ? String(probe.probesDrugsScore) : "N/A";

/** Open the target page; return the loaded section and its probes in display order. */
async function openProbes(
  page: Page,
  targetId: string | undefined
): Promise<{ probes: ChemicalProbesSection; data: ChemicalProbe[] }> {
  expect(targetId, "the test config should name a target for this test").toBeTruthy();
  const probes = new ChemicalProbesSection(page);
  const response = waitForOperation<ChemicalProbesData>(page, ChemicalProbesSection.operation);
  await page.goto(`/target/${targetId}`);
  const { data, variables } = await response;
  expect(variables).toEqual({ ensemblId: targetId });
  await probes.expectLoaded();
  return { probes, data: inDisplayOrder(data.target.chemicalProbes) };
}

/**
 * Target profile > Chemical Probes (packages/sections/src/target/ChemicalProbes).
 *
 * BRAF has two probes (one linked to a drug page, one not). BRD4 has 13: two pages, probes
 * with a control compound, a low-quality probe and a probe with no mechanism of action.
 */
test.describe("Target chemical probes section", () => {
  // Other sections of the page query Europe PMC from the browser; keep that third party
  // out of these tests (see stubEuropePmc).
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows its title, description, source link, columns and controls", async ({
    page,
    testConfig,
  }) => {
    const { probes } = await openProbes(page, testConfig.target?.primary);

    await expect(probes.header).toHaveText("Chemical Probes");
    await expect(probes.description).toHaveText(
      "Potent, selective and cell-permeable chemical modulators for BRAF. Source: Probes & Drugs"
    );
    await expect(probes.description.getByRole("link", { name: "Probes & Drugs" })).toHaveAttribute(
      "href",
      "https://www.probes-drugs.org/"
    );
    await expect(probes.table.headers).toHaveText([...CHEMICAL_PROBES_COLUMNS]);
    await expect(probes.table.searchInput).toHaveAttribute("placeholder", "Search all columns...");
    await expect(probes.table.columnsButton).toBeVisible();
    await expect(probes.controls.exportButton).toHaveText("Export");
    await expect(probes.controls.apiQueryButton).toBeVisible();
  });

  test("lists BRAF's probes, linking a probe to its drug page only when it has one", async ({
    page,
    testConfig,
  }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.primary);
    expect(data.length, "the API should return chemical probes for BRAF").toBeGreaterThan(0);

    await probes.table.expectRowCount(data.length);
    await expect(probes.table.column(0)).toHaveText(data.map(({ id }) => id));
    await probes.table.expectPosition(`1 - ${data.length} of ${data.length}`, {
      canGoBack: false,
      canGoForward: false,
    });

    const linked = data.find(({ drugId }) => drugId);
    const unlinked = data.find(({ drugId }) => !drugId);
    expect(linked, "BRAF should have a probe that is also a drug").toBeDefined();
    expect(unlinked, "BRAF should have a probe that is not a drug").toBeDefined();

    const linkedCell = probes.idCell(probes.rowForProbe(linked?.id ?? ""));
    await expect(linkedCell.getByRole("link", { name: linked?.id })).toHaveAttribute(
      "href",
      `/drug/${linked?.drugId}`
    );
    expect(linked?.drugId).toMatch(/^CHEMBL\d+$/);

    const unlinkedCell = probes.idCell(probes.rowForProbe(unlinked?.id ?? ""));
    await expect(unlinkedCell).toHaveText(unlinked?.id ?? "");
    await expect(unlinkedCell.getByRole("link")).toHaveCount(0);
  });

  test("renders every probe the API returns, in score order, cell by cell", async ({
    page,
    testConfig,
  }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    expect(
      data.length,
      "this target is in the config because it has more than one page of probes"
    ).toBeGreaterThan(10);
    const { table } = probes;

    await table.pageSizeSelect.selectOption("100");
    await table.expectRowCount(data.length);

    await test.step("probe ids, ordered by descending score", async () => {
      await expect(table.column(0)).toHaveText(
        data.map(({ id, control }) => (control ? `${id}?` : id))
      );
      const scores = data.map(({ probesDrugsScore }) => probesDrugsScore ?? -1);
      expect(scores, "the display order should be by descending score").toEqual(
        [...scores].sort((a, b) => b - a)
      );
      expect(new Set(scores).size, "the scores should not all be the same").toBeGreaterThan(1);
    });

    await test.step("links to the drug page", async () => {
      for (const [index, { id, drugId }] of data.entries()) {
        const cell = probes.idCell(table.row(index));
        if (drugId) {
          await expect(cell.getByRole("link", { name: id, exact: true })).toHaveAttribute(
            "href",
            `/drug/${drugId}`
          );
        } else {
          await expect(cell.getByRole("link")).toHaveCount(0);
        }
      }
    });

    await test.step("quality stars", async () => {
      for (const [index, { isHighQuality }] of data.entries()) {
        const cell = probes.qualityCell(table.row(index));
        await expect(
          cell.getByTestId(`probe-quality-${isHighQuality ? "high" : "low"}`)
        ).toHaveCount(1);
        // a solid star for high quality, an outlined one for low
        await expect(
          cell.locator(`svg[data-icon='star'][data-prefix='${isHighQuality ? "fas" : "far"}']`)
        ).toHaveCount(1);
      }
      expect(data.some(({ isHighQuality }) => isHighQuality)).toBe(true);
      expect(data.some(({ isHighQuality }) => !isHighQuality)).toBe(true);
    });

    await test.step("mechanism of action, origin and score", async () => {
      await expect(table.column(2)).toHaveText(data.map(mechanismText));
      await expect(table.column(3)).toHaveText(data.map(originText));
      await expect(table.column(4)).toHaveText(data.map(scoreText));
      expect(
        data.some(({ mechanismOfAction }) => mechanismOfAction.length === 0),
        "the target should have a probe without a mechanism of action, shown as N/A"
      ).toBe(true);
      expect(data.some(({ mechanismOfAction }) => mechanismOfAction.length > 1)).toBe(true);
    });
  });

  test("tooltips explain the quality column, a probe's quality and its control", async ({
    page,
    testConfig,
  }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    const { table } = probes;
    await table.pageSizeSelect.selectOption("100");
    await table.expectRowCount(data.length);

    await test.step("quality column header", async () => {
      await probes.qualityHeaderHelpIcon.hover();
      await expect(probes.tooltip.filter({ hasText: "Chemical probes selection" })).toHaveText(
        QUALITY_HEADER_TOOLTIP
      );
    });

    await test.step("high and low quality stars", async () => {
      const high = data.findIndex(({ isHighQuality }) => isHighQuality);
      const low = data.findIndex(({ isHighQuality }) => !isHighQuality);
      expect(high).toBeGreaterThan(-1);
      expect(low).toBeGreaterThan(-1);

      await probes.qualityCell(table.row(high)).getByTestId("probe-quality-high").hover();
      await expect(probes.tooltip.filter({ hasText: /^High quality$/ })).toBeVisible();
      await probes.qualityCell(table.row(low)).getByTestId("probe-quality-low").hover();
      await expect(probes.tooltip.filter({ hasText: /^Low quality$/ })).toBeVisible();
    });

    await test.step("control compound", async () => {
      const withControl = data.filter(({ control }) => control);
      expect(withControl.length, "the target should have probes with a control").toBeGreaterThan(0);
      // only probes with a control carry the help icon
      await expect(table.rows.locator("td:nth-child(1) sup")).toHaveCount(withControl.length);

      for (const { id, control } of withControl) {
        await probes.controlHelpIcon(probes.rowForProbe(id)).hover();
        await expect(probes.tooltip.filter({ hasText: "Control:" })).toHaveText(
          `Control: ${control}`
        );
        // leave the icon so the next probe's tooltip is not confused with this one
        await probes.header.hover();
        await expect(probes.tooltip.filter({ hasText: "Control:" })).toHaveCount(0);
      }
    });
  });

  test("paginates over more than one page of probes", async ({ page, testConfig }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    const total = data.length;
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThanOrEqual(20);
    const ids = data.map(({ id }) => id);
    const { table } = probes;

    await expect(table.pageSizeSelect).toHaveValue("10");
    await table.expectRowCount(10);
    await table.expectPosition(`1 - 10 of ${total}`, { canGoBack: false, canGoForward: true });
    for (const id of ids.slice(0, 10)) await expect(probes.rowForProbe(id)).toHaveCount(1);

    await table.nextPageButton.click();
    await table.expectRowCount(total - 10);
    await table.expectPosition(`11 - ${total} of ${total}`, {
      canGoBack: true,
      canGoForward: false,
    });
    for (const id of ids.slice(10)) await expect(probes.rowForProbe(id)).toHaveCount(1);
    await expect(probes.rowForProbe(ids[0]), "page 2 must not repeat page 1").toHaveCount(0);

    await table.firstPageButton.click();
    await table.expectPosition(`1 - 10 of ${total}`, { canGoBack: false, canGoForward: true });
    await expect(probes.rowForProbe(ids[0])).toHaveCount(1);

    await table.lastPageButton.click();
    await table.expectPosition(`11 - ${total} of ${total}`, {
      canGoBack: true,
      canGoForward: false,
    });

    await table.previousPageButton.click();
    await table.expectPosition(`1 - 10 of ${total}`, { canGoBack: false, canGoForward: true });

    await table.pageSizeSelect.selectOption("25");
    await table.expectRowCount(total);
    await table.expectPosition(`1 - ${total} of ${total}`, {
      canGoBack: false,
      canGoForward: false,
    });

    await table.pageSizeSelect.selectOption("5");
    await table.expectRowCount(5);
    await table.expectPosition(`1 - 5 of ${total}`, { canGoBack: false, canGoForward: true });
  });

  test("search narrows the probes, shows nothing for a term with no match, and resets", async ({
    page,
    testConfig,
  }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    const { table } = probes;
    await table.pageSizeSelect.selectOption("100");
    await table.expectRowCount(data.length);

    await test.step("a mechanism of action leaves only the probes with it", async () => {
      const degraders = data.filter(
        ({ id, mechanismOfAction }) =>
          mechanismOfAction.includes("degrader") || id.toLowerCase().includes("degrader")
      );
      expect(degraders.length).toBeGreaterThan(1);
      expect(degraders.length).toBeLessThan(data.length);

      await table.search("degrader");
      await table.expectRowCount(degraders.length);
      for (const { id } of degraders) await expect(probes.rowForProbe(id)).toHaveCount(1);
      for (const text of await table.rows.allInnerTexts()) {
        expect(text.toLowerCase()).toContain("degrader");
      }
    });

    await test.step("a probe id leaves that probe", async () => {
      const target = data[data.length - 1];
      await table.search(target.id);
      await expect(probes.rowForProbe(target.id)).toHaveCount(1);
      for (const text of await table.columnTexts(0)) {
        expect(text.toLowerCase()).toContain(target.id.toLowerCase());
      }
    });

    await test.step("a term nothing matches empties the table", async () => {
      await table.search("zzzz-no-such-probe");
      await table.expectRowCount(0);
      await table.expectPosition("1 - 0 of 0", { canGoBack: false, canGoForward: false });
    });

    await test.step("clearing the search restores every probe", async () => {
      await table.search("");
      await table.expectRowCount(data.length);
    });
  });

  test("the column picker hides and restores columns, except the probe id", async ({
    page,
    testConfig,
  }) => {
    const { probes } = await openProbes(page, testConfig.target?.withChemicalProbes);
    const { table } = probes;

    const picker = await table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(CHEMICAL_PROBES_COLUMN_LABELS.length);
    for (const column of CHEMICAL_PROBES_COLUMN_LABELS) {
      await expect(picker.getByRole("checkbox", { name: column })).toBeChecked();
    }
    await expect(
      picker.getByRole("checkbox", { name: "Probe ID" }),
      "the identifying column cannot be hidden"
    ).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Quality" }).uncheck();
    await picker.getByRole("checkbox", { name: "Score" }).uncheck();
    await expect(table.headers).toHaveText(["Probe ID", "Mechanism of action", "Probe origin"]);
    await expect(table.row(0).locator("td")).toHaveCount(3);

    await picker.getByRole("checkbox", { name: "Quality" }).check();
    await picker.getByRole("checkbox", { name: "Score" }).check();
    await expect(table.headers).toHaveText([...CHEMICAL_PROBES_COLUMNS]);
  });

  test("the probe link opens the drug page of that probe", async ({ page, testConfig }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.primary);
    const linked = data.find(({ drugId }) => drugId);
    expect(linked, "BRAF should have a probe that is also a drug").toBeDefined();

    await probes
      .idCell(probes.rowForProbe(linked?.id ?? ""))
      .getByRole("link", { name: linked?.id })
      .click();
    await expect(page).toHaveURL(new RegExp(`/drug/${linked?.drugId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
    await expect(page.getByTestId("profile-page-header-text")).not.toHaveText("BRAF");
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("exports every probe as JSON, in display order", async ({ page, testConfig }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    expect(data.length).toBeGreaterThan(10);

    const { filename, rows } = await probes.controls.downloadJson();
    expect(filename).toBe("BRD4-chemical-probes.json");
    expect(rows, "the export holds every probe, not only the visible page").toEqual(
      data.map((probe) => ({
        probeId: probe.id,
        quality: probe.isHighQuality ? "high" : "low",
        mechanismOfAction: probe.mechanismOfAction.join(", "),
        probeOrigin: probe.origin.join(", "),
        score: probe.probesDrugsScore || "N/A",
      }))
    );
  });

  test("exports every probe as TSV", async ({ page, testConfig }) => {
    const { probes, data } = await openProbes(page, testConfig.target?.withChemicalProbes);
    expect(data.length).toBeGreaterThan(10);

    const { filename, header, lines } = await probes.controls.downloadTsv();
    expect(filename).toBe("BRD4-chemical-probes.tsv");
    expect(header).toEqual(["probeId", "quality", "mechanismOfAction", "probeOrigin", "score"]);
    expect(lines).toEqual(
      data.map((probe) => [
        probe.id,
        probe.isHighQuality ? "high" : "low",
        probe.mechanismOfAction.join(", "),
        probe.origin.join(", "),
        String(probe.probesDrugsScore || "N/A"),
      ])
    );
  });

  test("the API query drawer shows the section's query and variables", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.withChemicalProbes ?? "";
    const { probes } = await openProbes(page, targetId);

    const drawer = await probes.controls.openApiQuery(ChemicalProbesSection.operation, targetId);
    await expect(drawer).toContainText("chemicalProbes");
    await probes.controls.closeApiQuery();
    await expect(
      probes.table.table,
      "the table is still there after the drawer closes"
    ).toBeVisible();
  });

  test("is absent for a target with no chemical probes", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.withoutDrugsSafetyOrProbes ?? "";
    expect(expectedSectionsFor(targetId)).not.toContain(ChemicalProbesSection.id);
    // Sections render in page order from one summary query: the ones before and after
    // where Chemical Probes would be are there, so its absence is final.
    expect(expectedSectionsFor(targetId)).toEqual(
      expect.arrayContaining(["tractability", "baselineexpression"])
    );

    await page.goto(`/target/${targetId}`);
    await expectSectionLoaded(page, "tractability");
    await expectSectionLoaded(page, "baselineexpression");
    await expect(sectionLocator(page, ChemicalProbesSection.id)).toHaveCount(0);
  });
});

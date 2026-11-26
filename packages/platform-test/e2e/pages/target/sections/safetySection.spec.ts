import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  SAFETY_COLUMNS,
  type SafetyData,
  type SafetyLiability,
  SafetySection,
} from "../../../../POM/objects/widgets/shared/safetySection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

const ACTIVATION = "Activation/Increase/Upregulation";
const INHIBITION = "Inhibition/Decrease/Downregulation";

/** What the Biosystems cell shows for a liability (see Safety/Body.tsx). */
function biosystemsText({ biosamples }: SafetyLiability): string {
  if (biosamples.length === 0) return "N/A";
  if (biosamples.length > 1) return `${biosamples.length} biosystems`;
  const [{ cellFormat, cellLabel, tissueLabel }] = biosamples;
  if (cellFormat) return cellLabel ? `${cellFormat} (${cellLabel})` : cellFormat;
  return tissueLabel ?? "N/A";
}

/** Open the target page and return the loaded safety section showing every row. */
async function openSafety(page: Page, targetId: string | undefined): Promise<SafetySection> {
  expect(targetId, "the test config should name a target for this test").toBeTruthy();
  const safety = new SafetySection(page);
  await page.goto(`/target/${targetId}`);
  await safety.expectLoaded();
  return safety;
}

/**
 * Target profile > Safety (packages/sections/src/target/Safety).
 *
 * BRAF has a single safety liability; ADRB2 has 26 of every kind (with and without an
 * ontology term, 0/1/many biosystems, both dosing directions, literature and
 * non-literature sources), which is what the table interactions need.
 */
test.describe("Target safety section", () => {
  // Other sections of the page query Europe PMC from the browser; keep that third party
  // out of these tests (see stubEuropePmc).
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows its title, description, documentation link and columns", async ({
    page,
    testConfig,
  }) => {
    const safety = await openSafety(page, testConfig.target?.primary);

    await expect(safety.header).toHaveText("Safety");
    await expect(safety.description).toHaveText(
      "Reported safety effects and risk information for BRAF. Source: Open Targets."
    );
    await expect(safety.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/target/safety"
    );
    await expect(safety.table.headers).toHaveText([...SAFETY_COLUMNS]);
    await expect(safety.table.searchInput).toHaveAttribute("placeholder", "Search all columns...");
    await expect(safety.table.columnsButton).toBeVisible();
    await expect(safety.controls.exportButton).toHaveText("Export");
    await expect(safety.controls.apiQueryButton).toBeVisible();
  });

  test("a target with one liability shows that row and a single, exhausted page", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.primary);
    const { data, variables } = await response;

    expect(variables).toEqual({ ensemblId: testConfig.target?.primary });
    const liabilities = data.target.safetyLiabilities;
    expect(liabilities.length, "the API should return safety liabilities for BRAF").toBeGreaterThan(
      0
    );
    await safety.table.expectRowCount(liabilities.length);
    await expect(safety.table.column(0)).toHaveText(liabilities.map(({ event }) => event ?? "N/A"));

    const row = safety.rowsForEvent("heart disease");
    await expect(row).toHaveCount(1);
    await expect(safety.eventCell(row).getByRole("link", { name: "heart disease" })).toHaveAttribute(
      "href",
      "/disease/MONDO_0005267"
    );
    await expect(
      safety.biosystemsCell(row).getByRole("link", { name: "cardiovascular system" })
    ).toHaveAttribute("href", "https://identifiers.org/UBERON:0004535");
    await expect(safety.studiesCell(row).getByTestId("safety-studies-drawer")).toHaveText(
      /^\d+ studies$/
    );
    await expect(safety.sourceCell(row)).toHaveText("Force et al. (2011)");

    await safety.table.expectPosition(`1 - ${liabilities.length} of ${liabilities.length}`, {
      canGoBack: false,
      canGoForward: false,
    });
  });

  test("renders every liability the API returns, cell by cell", async ({ page, testConfig }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    expect(
      liabilities.length,
      "this target is in the config because it has more than two pages of liabilities"
    ).toBeGreaterThan(20);

    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    await test.step("safety events, linked to the disease page when they have an ontology id", async () => {
      await expect(safety.table.column(0)).toHaveText(liabilities.map(({ event }) => event ?? "N/A"));
      for (const [index, { event, eventId }] of liabilities.entries()) {
        const cell = safety.eventCell(safety.table.row(index));
        if (eventId) {
          await expect(cell.getByRole("link")).toHaveAttribute("href", `/disease/${eventId}`);
          await expect(cell.getByRole("link")).toHaveText(event ?? "N/A");
        } else {
          await expect(cell.getByRole("link"), `"${event}" has no ontology id to link to`).toHaveCount(
            0
          );
        }
      }
      expect(liabilities.some(({ eventId }) => eventId)).toBe(true);
      expect(liabilities.some(({ eventId }) => !eventId)).toBe(true);
    });

    await test.step("biosystems", async () => {
      await expect(safety.table.column(1)).toHaveText(liabilities.map(biosystemsText));
    });

    await test.step("dosing effects", async () => {
      for (const [index, { effects }] of liabilities.entries()) {
        const row = safety.table.row(index);
        const up = effects.some(({ direction }) => direction === ACTIVATION);
        const down = effects.some(({ direction }) => direction === INHIBITION);
        await expect(safety.effectIcon(row, "up", up ? "active" : "inactive")).toHaveCount(1);
        await expect(safety.effectIcon(row, "up", up ? "inactive" : "active")).toHaveCount(0);
        await expect(safety.effectIcon(row, "down", down ? "active" : "inactive")).toHaveCount(1);
        await expect(safety.effectIcon(row, "down", down ? "inactive" : "active")).toHaveCount(0);
      }
      expect(liabilities.some(({ effects }) => effects.some((e) => e.direction === ACTIVATION))).toBe(
        true
      );
      expect(liabilities.some(({ effects }) => effects.some((e) => e.direction === INHIBITION))).toBe(
        true
      );
    });

    await test.step("experimental studies and sources", async () => {
      await expect(safety.table.column(3)).toHaveText(
        liabilities.map(({ studies }) => (studies.length === 0 ? "N/A" : `${studies.length} studies`))
      );
      await expect(safety.table.column(4)).toHaveText(liabilities.map(({ datasource }) => datasource));
    });
  });

  test("paginates: each page shows different rows and the end buttons disable", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const events = (await response).data.target.safetyLiabilities.map(({ event }) => event ?? "N/A");
    const total = events.length;
    expect(total).toBeGreaterThan(20);
    const lastPageStart = Math.floor((total - 1) / 10) * 10;
    const { table } = safety;

    await test.step("first page", async () => {
      await expect(table.pageSizeSelect).toHaveValue("10");
      await expect(table.column(0)).toHaveText(events.slice(0, 10));
      await table.expectPosition(`1 - 10 of ${total}`, { canGoBack: false, canGoForward: true });
    });

    await test.step("next page", async () => {
      await table.nextPageButton.click();
      await expect(table.column(0)).toHaveText(events.slice(10, 20));
      await table.expectPosition(`11 - 20 of ${total}`, { canGoBack: true, canGoForward: true });
    });

    await test.step("last page", async () => {
      await table.lastPageButton.click();
      await expect(table.column(0)).toHaveText(events.slice(lastPageStart));
      await table.expectPosition(`${lastPageStart + 1} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
    });

    await test.step("previous page", async () => {
      await table.previousPageButton.click();
      await expect(table.column(0)).toHaveText(events.slice(lastPageStart - 10, lastPageStart));
    });

    await test.step("first page again", async () => {
      await table.firstPageButton.click();
      await expect(table.column(0)).toHaveText(events.slice(0, 10));
      await table.expectPosition(`1 - 10 of ${total}`, { canGoBack: false, canGoForward: true });
    });
  });

  test("changes the number of rows per page", async ({ page, testConfig }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const total = (await response).data.target.safetyLiabilities.length;
    expect(total).toBeGreaterThan(25);
    const { table } = safety;

    await expect(table.pageSizeSelect.getByRole("option")).toHaveText(["5", "10", "25", "100"]);

    await table.pageSizeSelect.selectOption("5");
    await table.expectRowCount(5);
    await table.expectPosition(`1 - 5 of ${total}`, { canGoBack: false, canGoForward: true });

    await table.pageSizeSelect.selectOption("25");
    await table.expectRowCount(25);
    await table.expectPosition(`1 - 25 of ${total}`, { canGoBack: false, canGoForward: true });

    await table.pageSizeSelect.selectOption("100");
    await table.expectRowCount(total);
    await table.expectPosition(`1 - ${total} of ${total}`, {
      canGoBack: false,
      canGoForward: false,
    });
  });

  test("search narrows the rows, shows nothing for a term with no match, and resets", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    const total = liabilities.length;
    const { table } = safety;
    await table.pageSizeSelect.selectOption("100");
    await table.expectRowCount(total);

    await test.step("an event name leaves only that event", async () => {
      await table.search("bronchospasm");
      await expect(table.column(0)).toHaveText(["bronchospasm"]);
      await expect(table.position).toHaveText("1 - 1 of 1");
    });

    await test.step("the search is case-insensitive", async () => {
      await table.search("BRONCHOSPASM");
      await expect(table.column(0)).toHaveText(["bronchospasm"]);
    });

    await test.step("a source name leaves only the rows from that source", async () => {
      const fromClinPgx = liabilities.filter(({ datasource }) => datasource === "ClinPGx");
      expect(fromClinPgx.length).toBeGreaterThan(1);
      expect(fromClinPgx.length).toBeLessThan(total);
      await table.search("ClinPGx");
      await expect(table.column(4)).toHaveText(fromClinPgx.map(() => "ClinPGx"));
      await expect(table.column(0)).toHaveText(fromClinPgx.map(({ event }) => event ?? "N/A"));
    });

    await test.step("a term nothing matches empties the table", async () => {
      await table.search("zzzz-no-such-safety-event");
      await table.expectRowCount(0);
      await table.expectPosition("1 - 0 of 0", { canGoBack: false, canGoForward: false });
    });

    await test.step("clearing the search restores every row", async () => {
      await table.search("");
      await table.expectRowCount(total);
    });
  });

  test("search treats regular-expression characters as plain text", async ({ page, testConfig }) => {
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const { table } = safety;
    await table.expectRowCount(10);

    // "Lynch et al. (2017)" is a source in this table; a user pasting it types "(".
    await table.search("Lynch et al. (");
    await expect(
      safety.section,
      "typing an unbalanced bracket must not crash the section"
    ).toBeVisible();
    await expect(table.column(4).first()).toHaveText(/^Lynch et al\. \(\d{4}\)$/);
    for (const source of await table.columnTexts(4)) {
      expect(source).toMatch(/^Lynch et al\. \(\d{4}\)$/);
    }
  });

  test("the column picker hides and restores columns, except the safety event", async ({
    page,
    testConfig,
  }) => {
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const { table } = safety;

    const picker = await table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(SAFETY_COLUMNS.length);
    for (const column of SAFETY_COLUMNS) {
      await expect(picker.getByRole("checkbox", { name: column })).toBeChecked();
    }
    await expect(
      picker.getByRole("checkbox", { name: "Safety event" }),
      "the identifying column cannot be hidden"
    ).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Biosystems" }).uncheck();
    await picker.getByRole("checkbox", { name: "Source" }).uncheck();
    await expect(table.headers).toHaveText(["Safety event", "Dosing effects", "Experimental studies"]);
    await expect(table.row(0).locator("td")).toHaveCount(3);

    await picker.getByRole("checkbox", { name: "Biosystems" }).check();
    await picker.getByRole("checkbox", { name: "Source" }).check();
    await expect(table.headers).toHaveText([...SAFETY_COLUMNS]);
    await expect(table.row(0).locator("td")).toHaveCount(SAFETY_COLUMNS.length);
  });

  test("dosing arrows explain the direction and dosing on hover", async ({ page, testConfig }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const increased = liabilities.findIndex(
      ({ effects }) => effects.length === 1 && effects[0].direction === ACTIVATION && effects[0].dosing
    );
    const decreased = liabilities.findIndex(
      ({ effects }) => effects.length === 1 && effects[0].direction === INHIBITION && effects[0].dosing
    );
    expect(increased, "the target should have an activation effect with dosing").toBeGreaterThan(-1);
    expect(decreased, "the target should have an inhibition effect with dosing").toBeGreaterThan(-1);

    await test.step("activation", async () => {
      await safety.effectIcon(safety.table.row(increased), "up", "active").hover();
      await expect(safety.tooltip.filter({ hasText: ACTIVATION })).toHaveText(
        `Direction:${ACTIVATION}Dosing:${liabilities[increased].effects[0].dosing}`
      );
    });

    await test.step("inhibition", async () => {
      await safety.effectIcon(safety.table.row(decreased), "down", "active").hover();
      // The previous tooltip may still be fading out, so pick this one by its direction.
      await expect(safety.tooltip.filter({ hasText: INHIBITION })).toHaveText(
        `Direction:${INHIBITION}Dosing:${liabilities[decreased].effects[0].dosing}`
      );
    });
  });

  test("the experimental studies drawer lists the studies of the row clicked", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const index = liabilities.findIndex(({ studies }) => studies.length > 1);
    expect(index, "the target should have a liability with several studies").toBeGreaterThan(-1);
    const { studies } = liabilities[index];

    const cards = await safety.openStudies(safety.table.row(index));
    await expect(cards).toHaveCount(studies.length);
    for (const [cardIndex, study] of studies.entries()) {
      await expect(cards.nth(cardIndex)).toHaveText(
        `Study:${study.name ?? ""}Type:${study.type ?? ""}Description:${study.description ?? ""}`
      );
    }

    await safety.closeDrawer(safety.studiesDrawer);

    // A different row opens its own studies, not the previous ones.
    const other = liabilities.findIndex(
      ({ studies: otherStudies }, otherIndex) =>
        otherIndex !== index &&
        otherStudies.length === 1 &&
        otherStudies[0].description !== studies[0].description
    );
    expect(other).toBeGreaterThan(-1);
    const otherCards = await safety.openStudies(safety.table.row(other));
    await expect(otherCards).toHaveCount(1);
    await expect(otherCards).toContainText(liabilities[other].studies[0].description ?? "");

    await page.keyboard.press("Escape");
    await expect(safety.studiesDrawer, "Escape should close the drawer").toBeHidden();
  });

  test("biosystems show as N/A, a single link, plain text, or a drawer of grouped links", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const find = (predicate: (liability: SafetyLiability) => boolean, what: string): number => {
      const index = liabilities.findIndex(predicate);
      expect(index, `the target should have a liability with ${what}`).toBeGreaterThan(-1);
      return index;
    };

    await test.step("no biosystem", async () => {
      const index = find(({ biosamples }) => biosamples.length === 0, "no biosystem");
      await expect(safety.biosystemsCell(safety.table.row(index))).toHaveText("N/A");
    });

    await test.step("one tissue links to its ontology term", async () => {
      const index = find(
        ({ biosamples }) => biosamples.length === 1 && !biosamples[0].cellFormat && !!biosamples[0].tissueId,
        "one tissue"
      );
      const [{ tissueLabel, tissueId }] = liabilities[index].biosamples;
      await expect(
        safety.biosystemsCell(safety.table.row(index)).getByRole("link", { name: tissueLabel ?? "" })
      ).toHaveAttribute("href", `https://identifiers.org/${tissueId?.replace("_", ":")}`);
    });

    await test.step("one assay is plain text", async () => {
      const index = find(
        ({ biosamples }) => biosamples.length === 1 && !!biosamples[0].cellFormat,
        "one cell-based assay"
      );
      const cell = safety.biosystemsCell(safety.table.row(index));
      await expect(cell).toHaveText(biosystemsText(liabilities[index]));
      await expect(cell.getByRole("link")).toHaveCount(0);
    });

    await test.step("several biosystems open a drawer listing each one", async () => {
      const index = find(({ biosamples }) => biosamples.length > 1, "several biosystems");
      const { biosamples } = liabilities[index];
      const drawer = await safety.openBiosystems(safety.table.row(index));

      await expect(drawer).toContainText("Biosystems");
      await expect(drawer).toContainText("Organ system");
      await expect(drawer).toContainText(`${biosamples.length} Biosystems`);
      await expect(drawer.getByRole("listitem")).toHaveText(
        biosamples.map(({ tissueLabel }) => tissueLabel ?? "N/A")
      );
      for (const { tissueLabel, tissueId } of biosamples) {
        await expect(
          drawer.getByRole("link", { name: tissueLabel ?? "", exact: true })
        ).toHaveAttribute("href", `https://identifiers.org/${tissueId?.replace("_", ":")}`);
      }
      await safety.closeDrawer(drawer);
    });
  });

  test("a source with a publication opens the publications drawer for that publication", async ({
    page,
    testConfig,
  }) => {
    const searches = await stubEuropePmc(page);
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const index = liabilities.findIndex(({ literature }) => literature);
    expect(index, "the target should have a liability backed by a publication").toBeGreaterThan(-1);
    const { literature, datasource } = liabilities[index];
    expect(literature).toMatch(/^\d+$/);

    const row = safety.table.row(index);
    await expect(safety.sourceCell(row).getByTestId("publications-drawer-trigger")).toHaveText(
      datasource
    );
    const drawer = await safety.openPublications(row);
    await expect(drawer.getByTestId(`literature-entry-${literature}`)).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: `Stubbed publication ${literature}` })
    ).toHaveAttribute("href", new RegExp(`europepmc\\.org/.*${literature}$`));
    await expect(
      drawer.locator("[data-testid^='literature-entry-']"),
      "the drawer lists the row's publication and nothing else"
    ).toHaveCount(1);
    // Other sections search Europe PMC too; this row's search asks for its one id.
    expect(searches).toContainEqual([literature]);

    await safety.closeDrawer(drawer);
  });

  test("a ClinPGx source links to the ClinPGx search for the target", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const index = liabilities.findIndex(({ datasource }) => datasource === "ClinPGx");
    expect(index, "the target should have a ClinPGx liability").toBeGreaterThan(-1);
    await expect(
      safety.sourceCell(safety.table.row(index)).getByRole("link", { name: "ClinPGx" })
    ).toHaveAttribute("href", "https://www.clinpgx.org/search?query=ADRB2");
  });

  test("a source that is not ClinPGx does not link to the ClinPGx search", async ({
    page,
    testConfig,
  }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    await safety.table.pageSizeSelect.selectOption("100");
    await safety.table.expectRowCount(liabilities.length);

    const otherSources = liabilities
      .map((liability, index) => ({ ...liability, index }))
      .filter(({ datasource, literature }) => datasource !== "ClinPGx" && !literature);
    expect(
      otherSources.length,
      "the target should have liabilities from a source that is neither ClinPGx nor a publication"
    ).toBeGreaterThan(0);

    for (const { index, datasource } of otherSources) {
      const cell = safety.sourceCell(safety.table.row(index));
      await expect(cell).toHaveText(datasource);
      await expect(
        cell.locator("a[href*='clinpgx.org']"),
        `"${datasource}" is not ClinPGx, so it must not link to clinpgx.org`
      ).toHaveCount(0);
    }
  });

  test("the event link opens the disease page of that event", async ({ page, testConfig }) => {
    const safety = await openSafety(page, testConfig.target?.primary);
    const row = safety.rowsForEvent("heart disease");

    await safety.eventCell(row).getByRole("link", { name: "heart disease" }).click();
    await expect(page).toHaveURL(/\/disease\/MONDO_0005267$/);
    // MONDO_0005267 is named "heart disorder" in the ontology; the event label is the source's.
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("heart disorder");
  });

  test("exports every liability as JSON", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.withSafetyLiabilities;
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, targetId);
    const liabilities = (await response).data.target.safetyLiabilities;
    expect(liabilities.length).toBeGreaterThan(20);

    const { filename, rows } = await safety.controls.downloadJson();
    expect(filename).toBe(`${targetId}-safety-target.json`);
    expect(rows, "the export holds every row, not only the visible page").toHaveLength(
      liabilities.length
    );
    expect(Object.keys(rows[0])).toEqual([
      "safetyEvent",
      "biosystems",
      "dosingEffects",
      "experimentalStudies",
      "source",
    ]);
    expect(rows.map((row) => row.safetyEvent)).toEqual(liabilities.map(({ event }) => event));
    expect(rows.map((row) => row.source)).toEqual(liabilities.map(({ datasource }) => datasource));
    expect(rows.map((row) => row.experimentalStudies)).toEqual(
      liabilities.map(({ studies }) => studies)
    );
  });

  test("the export includes the dosing effects shown in the table", async ({ page, testConfig }) => {
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, testConfig.target?.withSafetyLiabilities);
    const liabilities = (await response).data.target.safetyLiabilities;
    const withEffects = liabilities.findIndex(({ effects }) => effects.length > 0);
    expect(withEffects).toBeGreaterThan(-1);

    const { rows } = await safety.controls.downloadJson();
    expect(
      JSON.stringify(rows[withEffects].dosingEffects),
      `the "${liabilities[withEffects].event}" row has a dosing effect in the table, so the export should carry it`
    ).toContain(liabilities[withEffects].effects[0].direction);
  });

  test("exports every liability as TSV with readable cells", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.withSafetyLiabilities;
    const response = waitForOperation<SafetyData>(page, SafetySection.operation);
    const safety = await openSafety(page, targetId);
    const liabilities = (await response).data.target.safetyLiabilities;
    expect(liabilities.length).toBeGreaterThan(20);

    const { filename, header, lines } = await safety.controls.downloadTsv();
    expect(filename).toBe(`${targetId}-safety-target.tsv`);
    expect(header).toEqual([
      "safetyEvent",
      "biosystems",
      "dosingEffects",
      "experimentalStudies",
      "source",
    ]);
    expect(lines).toHaveLength(liabilities.length);
    expect(lines.map((line) => line[0])).toEqual(liabilities.map(({ event }) => event));
    expect(lines.map((line) => line[4])).toEqual(liabilities.map(({ datasource }) => datasource));
    expect(
      lines.filter((line) => line.some((cell) => cell.includes("[object Object]"))).length,
      `no cell of the TSV may be a stringified object; first line is: ${lines[1]?.join(" | ")}`
    ).toBe(0);
  });

  test("the API query drawer shows the section's query and variables", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.withSafetyLiabilities ?? "";
    const safety = await openSafety(page, targetId);

    const drawer = await safety.controls.openApiQuery(SafetySection.operation, targetId);
    await expect(drawer).toContainText("safetyLiabilities");
    await safety.controls.closeApiQuery();
    await expect(safety.table.table, "the table is still there after the drawer closes").toBeVisible();
  });

  test("is absent for a target with no safety liabilities", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.withoutDrugsSafetyOrProbes ?? "";
    expect(expectedSectionsFor(targetId)).not.toContain(SafetySection.id);
    // Sections render in page order from one summary query: the ones before and after
    // where Safety would be are there, so its absence is final, not a loading state.
    expect(expectedSectionsFor(targetId)).toEqual(
      expect.arrayContaining(["tractability", "baselineexpression"])
    );

    await page.goto(`/target/${targetId}`);
    await expectSectionLoaded(page, "tractability");
    await expectSectionLoaded(page, "baselineexpression");
    await expect(sectionLocator(page, SafetySection.id)).toHaveCount(0);
  });
});

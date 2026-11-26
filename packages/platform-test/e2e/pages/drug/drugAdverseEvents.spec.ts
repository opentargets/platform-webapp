import { expect, test } from "../../../fixtures";
import { expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  ADVERSE_EVENT_COLUMN,
  ADVERSE_EVENTS_COLUMNS,
  AdverseEventsSection,
  LLR_HEADER,
} from "../../../POM/objects/widgets/shared/adverseEventsSection";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";

const toNumbers = (texts: string[]): number[] => texts.map((text) => Number(text));

/** Read the critical value the log-likelihood-ratio header states. */
async function criticalValue(adverseEvents: AdverseEventsSection): Promise<number> {
  await expect(adverseEvents.llrHeader).toHaveText(LLR_HEADER);
  const match = LLR_HEADER.exec((await adverseEvents.llrHeader.innerText()).trim());
  if (!match) throw new Error("the critical value header changed while it was being read");
  return Number(match[1]);
}

/** Assert the rows on screen are well formed, significant and ordered by decreasing LLR. */
async function expectSignificantRows(
  adverseEvents: AdverseEventsSection,
  cv: number
): Promise<number[]> {
  for (const name of await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name)) {
    expect(name, "event names start with a capital letter").toMatch(/^[A-Z0-9].+/);
  }
  for (const count of await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.count)) {
    expect(count, "the number of reports is a positive integer").toMatch(/^[1-9]\d*$/);
  }
  const llrTexts = await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.llr);
  for (const llr of llrTexts) expect(llr, "LLR has two decimals").toMatch(/^\d+\.\d{2}$/);
  const llrs = toNumbers(llrTexts);
  expect(llrs, "rows are ordered by decreasing LLR").toEqual([...llrs].sort((a, b) => b - a));
  for (const llr of llrs) {
    expect(llr, "only events above the critical value are listed").toBeGreaterThanOrEqual(cv);
  }
  return llrs;
}

test.describe("Drug page: Pharmacovigilance (adverse events)", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, columns and significant events by decreasing LLR", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const adverseEvents = new AdverseEventsSection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, AdverseEventsSection.id);

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(AdverseEventsSection.id)).toHaveText("Pharmacovigilance");
      await expect(adverseEvents.description).toHaveText(
        `Significant post-marketing adverse events for ${drugFacts(primary).name} estimated from reports submitted to the FDA Adverse Event Reporting database by healthcare professionals. Source: Open Targets.`
      );
      await expectExternalLink(
        adverseEvents.description.getByRole("link", { name: "Open Targets" }),
        "https://platform-docs.opentargets.org/drug/pharmacovigilence"
      );
    });

    await test.step("columns, with the critical value in the third header", async () => {
      await adverseEvents.table.expectHeaders([...ADVERSE_EVENTS_COLUMNS, LLR_HEADER]);
    });

    const cv = await criticalValue(adverseEvents);
    expect(cv, "the critical value is a positive number").toBeGreaterThan(0);

    const total = await adverseEvents.table.total();
    expect(total, "trastuzumab has more than one page of adverse events").toBeGreaterThan(10);
    await adverseEvents.table.expectRows(10);
    await adverseEvents.table.expectPosition(1, 10, total);
    await adverseEvents.table.expectPaginationState("first");
    await expectSignificantRows(adverseEvents, cv);

    await test.step("page size options", async () => {
      await expect(adverseEvents.table.pageSizeSelect).toHaveValue("10");
      await expect(adverseEvents.table.pageSizeSelect.getByRole("option")).toHaveText([
        "10",
        "25",
        "50",
        "100",
      ]);
    });
  });

  test("pagination continues the LLR ranking and stops at the last event", async ({
    page,
    testConfig,
  }) => {
    const adverseEvents = new AdverseEventsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, AdverseEventsSection.id);
    const cv = await criticalValue(adverseEvents);
    const total = await adverseEvents.table.total();
    expect(total).toBeGreaterThan(20);
    expect(total).toBeLessThanOrEqual(30);
    await adverseEvents.table.expectRows(10);
    const firstNames = await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name);
    const firstLlrs = await expectSignificantRows(adverseEvents, cv);

    await test.step("page 2 holds different, lower-ranked events", async () => {
      await adverseEvents.table.nextPageButton.click();
      await adverseEvents.table.expectPosition(11, 20, total);
      await adverseEvents.table.expectRows(10);
      await adverseEvents.table.expectPaginationState("middle");
      const names = await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name);
      for (const name of names) expect(firstNames).not.toContain(name);
      const llrs = await expectSignificantRows(adverseEvents, cv);
      expect(llrs[0]).toBeLessThanOrEqual(firstLlrs[firstLlrs.length - 1]);
    });

    await test.step("the last page holds the remainder", async () => {
      await adverseEvents.table.lastPageButton.click();
      await adverseEvents.table.expectPosition(21, total, total);
      await adverseEvents.table.expectRows(total - 20);
      await adverseEvents.table.expectPaginationState("last");
      await expectSignificantRows(adverseEvents, cv);
    });

    await test.step("first page button returns to the top-ranked events", async () => {
      await adverseEvents.table.firstPageButton.click();
      await adverseEvents.table.expectPosition(1, 10, total);
      await adverseEvents.table.expectRows(10);
      expect(await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name)).toEqual(firstNames);
    });

    await test.step("page size 25 shows every event at once, still ranked", async () => {
      await adverseEvents.table.pageSizeSelect.selectOption("25");
      await adverseEvents.table.expectPosition(1, total, total);
      await adverseEvents.table.expectRows(total);
      await adverseEvents.table.expectPaginationState("only");
      const names = await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name);
      expect(names.slice(0, 10)).toEqual(firstNames);
      expect(new Set(names).size, "no event is listed twice").toBe(total);
      await expectSignificantRows(adverseEvents, cv);
    });
  });

  test("a drug with hundreds of events pages to the very last one", async ({ page, testConfig }) => {
    const { withManyWarnings: chemblId } = drugIds(testConfig);
    const adverseEvents = new AdverseEventsSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, AdverseEventsSection.id);
    const cv = await criticalValue(adverseEvents);
    const total = await adverseEvents.table.total();
    expect(total, "rofecoxib has more than a hundred adverse events").toBeGreaterThan(100);
    await adverseEvents.table.expectRows(10);
    const topLlrs = await expectSignificantRows(adverseEvents, cv);

    await adverseEvents.table.pageSizeSelect.selectOption("100");
    await adverseEvents.table.expectPosition(1, 100, total);
    await adverseEvents.table.expectRows(100);
    await adverseEvents.table.expectPaginationState("first");
    await expectSignificantRows(adverseEvents, cv);

    await adverseEvents.table.lastPageButton.click();
    const lastPageStart = Math.floor((total - 1) / 100) * 100 + 1;
    await adverseEvents.table.expectPosition(lastPageStart, total, total);
    await adverseEvents.table.expectRows(total - lastPageStart + 1);
    await adverseEvents.table.expectPaginationState("last");
    const lastLlrs = await expectSignificantRows(adverseEvents, cv);
    expect(lastLlrs[lastLlrs.length - 1]).toBeLessThan(topLlrs[0]);
  });

  test("search filters across pages by event name and empties on no match", async ({
    page,
    testConfig,
  }) => {
    const adverseEvents = new AdverseEventsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, AdverseEventsSection.id);
    const total = await adverseEvents.table.total();
    await adverseEvents.table.expectRows(10);

    await adverseEvents.table.search("metastases", total);
    const matches = await adverseEvents.table.total();
    expect(matches).toBeGreaterThan(1);
    expect(matches).toBeLessThan(total);
    await adverseEvents.table.expectRows(matches);
    for (const name of await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.name)) {
      expect(name.toLowerCase()).toContain("metastases");
    }

    await test.step("no match", async () => {
      await adverseEvents.table.search("zzz-no-such-event", total);
      await adverseEvents.table.expectRows(0);
      await expect(adverseEvents.table.position).toHaveText(/ of 0$/);
    });

    await adverseEvents.table.clearSearch(total);
    await adverseEvents.table.expectRows(10);
  });

  test("the column picker hides the report count and restores it", async ({ page, testConfig }) => {
    const adverseEvents = new AdverseEventsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, AdverseEventsSection.id);
    await adverseEvents.table.expectRows(10);

    const picker = await adverseEvents.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(3);
    await picker.getByRole("checkbox", { name: "Number of reported events" }).uncheck();
    await adverseEvents.table.expectHeaders(["Adverse event (MedDRA)", LLR_HEADER]);
    await expect(adverseEvents.table.row(0).locator("td")).toHaveCount(2);

    await picker.getByRole("checkbox", { name: "Number of reported events" }).check();
    await adverseEvents.table.expectHeaders([...ADVERSE_EVENTS_COLUMNS, LLR_HEADER]);
    await expect(adverseEvents.table.cell(0, ADVERSE_EVENT_COLUMN.count)).toHaveText(/^[1-9]\d*$/);
  });

  test("exports every event with its count and LLR, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const adverseEvents = new AdverseEventsSection(page);
    await new DrugPage(page).goto(primary);
    await expectSectionLoaded(page, AdverseEventsSection.id);
    const total = await adverseEvents.table.total();
    await adverseEvents.table.expectRows(10);
    const shownLlrs = await adverseEvents.table.columnTexts(ADVERSE_EVENT_COLUMN.llr);

    await test.step("JSON", async () => {
      const { filename, rows } = await adverseEvents.table.exportJson();
      expect(filename).toBe(`${drugFacts(primary).name}-adverse-events.json`);
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toHaveLength(3);
        expect(typeof row.adverseEventMedDra).toBe("string");
        expect(row.adverseEventMedDra).not.toBe("");
        expect(Number.isInteger(row.numberOfReportedEvents)).toBe(true);
      }
      const llrKey = Object.keys(rows[0]).find((key) => key.startsWith("logLikelihoodRatio"));
      expect(llrKey, "the LLR column is exported").toBeTruthy();
      expect(rows.slice(0, 10).map((row) => row[llrKey as string])).toEqual(shownLlrs);
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await adverseEvents.table.exportTsv();
      expect(filename).toBe(`${drugFacts(primary).name}-adverse-events.tsv`);
      expect(header).toHaveLength(3);
      expect(lines).toHaveLength(total);
    });

    await adverseEvents.table.expectApiQuery("AdverseEventsQuery", primary);
  });
});

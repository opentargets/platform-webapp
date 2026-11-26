import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CLINICAL_STAGES,
  DRUGS_PAGE_SIZE,
  type ClinicalRecord,
  type ClinicalRecordsData,
  type ClinicalStageKey,
  reportsLabel,
  stageIndex,
  stageLabel,
  type TargetDrugRow,
  type TargetDrugsData,
  TargetDrugsSection,
} from "../../../../POM/objects/widgets/KnownDrugs/targetDrugsSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

type Opened = {
  drugs: TargetDrugsSection;
  /** The drug rows of the first page of the API response, in the API's order. */
  rows: TargetDrugRow[];
  /** `drugAndClinicalCandidates.count`: how many drugs the target has in total. */
  count: number;
  /** The clinical reports of the drug selected on load. */
  records: ClinicalRecord[];
};

function byStage(records: ClinicalRecord[]): Map<ClinicalStageKey, ClinicalRecord[]> {
  const grouped = new Map<ClinicalStageKey, ClinicalRecord[]>();
  for (const record of records) {
    grouped.set(record.clinicalStage, [...(grouped.get(record.clinicalStage) ?? []), record]);
  }
  return grouped;
}

const recordTitle = (record: ClinicalRecord) => record.title ?? "";

/** Open the target page and wait for the drugs section and the first drug's reports. */
async function openDrugs(page: Page, targetId: string | undefined): Promise<Opened> {
  expect(targetId, "the test config should name a target for this test").toBeTruthy();
  const drugs = new TargetDrugsSection(page);
  const drugsResponse = waitForOperation<TargetDrugsData>(page, TargetDrugsSection.operation);
  const recordsResponse = waitForOperation<ClinicalRecordsData>(
    page,
    TargetDrugsSection.recordsOperation
  );
  await page.goto(`/target/${targetId}`);
  const { data, variables } = await drugsResponse;
  // the cards are a server-paged table: the first page, most advanced stage first
  expect(variables).toEqual({
    ensemblId: targetId,
    index: 0,
    size: DRUGS_PAGE_SIZE,
    sort: [
      { key: "MAX_CLINICAL_STAGE", direction: "DESCENDING" },
      { key: "CLINICAL_REPORT_COUNT", direction: "DESCENDING" },
    ],
  });
  const { rows, count } = data.target.drugAndClinicalCandidates;
  expect(rows.length, "the API should return a page of drugs for this target").toBe(
    Math.min(DRUGS_PAGE_SIZE, count)
  );
  expect(count, "the target should have more than one page of drugs").toBeGreaterThan(
    DRUGS_PAGE_SIZE
  );
  const records = (await recordsResponse).data.clinicalReports;
  expect(records.length, "the API should return the selected drug's reports").toBeGreaterThan(0);
  await drugs.expectLoaded();
  return { drugs, rows, count, records };
}

/**
 * Target profile > Drugs and Clinical Candidates (packages/sections/src/target/Drugs),
 * with the shared clinical-reports master/detail (packages/ui ClinicalReports).
 */
test.describe("Target drugs and clinical candidates section", () => {
  // Other sections of the page query Europe PMC from the browser; keep that third party
  // out of these tests (see stubEuropePmc).
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows its title, description and source links", async ({ page, testConfig }) => {
    const { drugs } = await openDrugs(page, testConfig.target?.primary);

    await expect(drugs.header).toHaveText("Drugs and Clinical Candidates");
    await expect(drugs.description).toHaveText(
      "Investigational and approved drugs for BRAF curated from clinical trial records and post-marketing package inserts. Source: Open Targets and ChEMBL."
    );
    await expect(drugs.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/target/drugs"
    );
    await expect(drugs.description.getByRole("link", { name: "ChEMBL" })).toHaveAttribute(
      "href",
      "https://www.ebi.ac.uk/chembl/"
    );
    await expect(drugs.searchInput).toHaveAttribute("placeholder", "Search drugs...");
    await expect(drugs.cardsControls.exportButton).toHaveText("Export");
    await expect(drugs.recordsControls.exportButton).toHaveText("Export");
  });

  test("shows a card per drug with its name, link, max stage and report count", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows } = await openDrugs(page, testConfig.target?.primary);

    await expect(drugs.cards).toHaveCount(rows.length);
    for (const row of rows) {
      await test.step(row.drug.name, async () => {
        const card = drugs.card(row.drug.name);
        await expect(card).toHaveCount(1);
        expect(row.drug.id).toMatch(/^CHEMBL\d+$/);
        await expect(drugs.cardLink(card)).toHaveAttribute("href", `/drug/${row.drug.id}`);
        await expect(card).toHaveText(
          `${row.drug.name}Max stage:${stageLabel(row.maxClinicalStage)}${reportsLabel(row.clinicalReports.length)}`
        );
      });
    }
  });

  test("orders the cards by most advanced stage, then by number of reports, across pages", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, count } = await openDrugs(page, testConfig.target?.primary);
    const byName = new Map(rows.map((row) => [row.drug.name, row]));
    await expect(drugs.cards).toHaveCount(rows.length);

    // the server sorts; the cards of the first page are in the order of its response
    const names = await drugs.cards.getByRole("link").allInnerTexts();
    expect(names).toEqual(rows.map(({ drug }) => drug.name));
    const shown = names.map((name) => byName.get(name) as TargetDrugRow);
    const expectInOrder = (sequence: { stage: string; reports: number; name: string }[]) => {
      for (let index = 1; index < sequence.length; index++) {
        const previous = sequence[index - 1];
        const current = sequence[index];
        const stageDifference = stageIndex(previous.stage) - stageIndex(current.stage);
        expect(
          stageDifference > 0 || (stageDifference === 0 && previous.reports >= current.reports),
          `"${previous.name}" (${previous.stage}, ${previous.reports} reports) should come before "${current.name}" (${current.stage}, ${current.reports} reports)`
        ).toBe(true);
      }
    };
    const firstPage = shown.map((row) => ({
      stage: row.maxClinicalStage,
      reports: row.clinicalReports.length,
      name: row.drug.name,
    }));
    expectInOrder(firstPage);

    // the order continues on the next page: its cards are read back from the screen
    await drugs.cardsPagination.nextPageButton.click();
    await drugs.cardsPagination.expectPosition(`11 - ${Math.min(20, count)} of ${count}`, {
      canGoBack: true,
      canGoForward: count > 20,
    });
    const secondPage = await drugs.cardDetails();
    expect(secondPage.length).toBe(Math.min(10, count - 10));
    expectInOrder([firstPage[firstPage.length - 1], ...secondPage]);
    expect(
      new Set([...firstPage, ...secondPage].map(({ stage }) => stage)).size,
      "the drugs should span several stages, or the order proves nothing"
    ).toBeGreaterThan(1);
  });

  test("pages the drugs ten cards at a time and selects the first card of each page", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, count } = await openDrugs(page, testConfig.target?.primary);
    const { cardsPagination: pagination } = drugs;
    const pageCount = Math.ceil(count / DRUGS_PAGE_SIZE);
    const lastPageSize = count - (pageCount - 1) * DRUGS_PAGE_SIZE;

    await test.step("first page", async () => {
      await pagination.expectPosition(`1 - ${DRUGS_PAGE_SIZE} of ${count}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect(drugs.cards).toHaveCount(DRUGS_PAGE_SIZE);
      await expect(drugs.card(rows[0].drug.name)).toHaveAttribute("data-selected", "true");
    });
    const firstPage = await drugs.cards.getByRole("link").allInnerTexts();

    await test.step("next page shows other drugs and selects the first of them", async () => {
      await pagination.nextPageButton.click();
      await pagination.expectPosition(
        `${DRUGS_PAGE_SIZE + 1} - ${Math.min(2 * DRUGS_PAGE_SIZE, count)} of ${count}`,
        { canGoBack: true, canGoForward: pageCount > 2 }
      );
      await expect(drugs.cards).toHaveCount(Math.min(DRUGS_PAGE_SIZE, count - DRUGS_PAGE_SIZE));
      const secondPage = await drugs.cards.getByRole("link").allInnerTexts();
      for (const name of secondPage) expect(firstPage, `"${name}" is on page 1`).not.toContain(name);
      await expect(drugs.selectedCards).toHaveCount(1);
      await expect(drugs.cards.first()).toHaveAttribute("data-selected", "true");
      await expect(drugs.recordsSummary).toContainText(`for ${secondPage[0]}`);
    });

    await test.step("last page", async () => {
      await pagination.lastPageButton.click();
      await pagination.expectPosition(
        `${(pageCount - 1) * DRUGS_PAGE_SIZE + 1} - ${count} of ${count}`,
        { canGoBack: true, canGoForward: false }
      );
      await expect(drugs.cards).toHaveCount(lastPageSize);
    });

    await test.step("first page again", async () => {
      await pagination.firstPageButton.click();
      await pagination.expectPosition(`1 - ${DRUGS_PAGE_SIZE} of ${count}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect(drugs.cards.getByRole("link")).toHaveText(firstPage);
    });
  });

  test("selects the first drug on load and shows its reports by clinical stage", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, records } = await openDrugs(page, testConfig.target?.primary);

    await expect(drugs.selectedCards).toHaveCount(1);
    await expect(drugs.cards.first()).toHaveAttribute("data-selected", "true");
    const selectedName = await drugs.cardLink(drugs.selectedCards).innerText();
    const selected = rows.find(({ drug }) => drug.name === selectedName);
    expect(selected, `the selected card "${selectedName}" should be a drug of the API`).toBeDefined();
    const row = selected as TargetDrugRow;

    await test.step("summary line", async () => {
      expect(records).toHaveLength(row.clinicalReports.length);
      await expect(drugs.recordsSummary).toHaveText(
        `${reportsLabel(records.length)} for ${row.drug.name}`
      );
      await expect(
        drugs.recordsSummary.getByRole("link", { name: row.drug.name })
      ).toHaveAttribute("href", `/drug/${row.drug.id}`);
    });

    const grouped = byStage(records);
    await test.step("stage filter", async () => {
      await expect(drugs.recordsTable.headers).toHaveCount(1);
      for (const { label } of CLINICAL_STAGES) {
        await expect(drugs.recordsTable.headers.getByText(label, { exact: true })).toBeVisible();
      }
      for (const { key } of CLINICAL_STAGES) {
        const stageRecords = grouped.get(key) ?? [];
        // a stage with reports is a button showing how many; an empty stage is inert
        await expect(drugs.stage(key)).toHaveText(
          stageRecords.length > 0 ? String(stageRecords.length) : ""
        );
        await expect(drugs.records.getByRole("button").and(drugs.stage(key))).toHaveCount(
          stageRecords.length > 0 ? 1 : 0
        );
      }
      expect(grouped.size, "the drug should have reports at several stages").toBeGreaterThan(1);
    });

    await test.step("the drug's max stage is selected and its reports are listed", async () => {
      expect(
        grouped.has(row.maxClinicalStage),
        "this drug has reports at its max stage, so that stage is the one selected"
      ).toBe(true);
      await expect(drugs.selectedStages).toHaveCount(1);
      await expect(drugs.stage(row.maxClinicalStage)).toHaveAttribute("data-selected", "true");

      const stageRecords = grouped.get(row.maxClinicalStage) ?? [];
      const onFirstPage = Math.min(10, stageRecords.length);
      await expect(drugs.recordItems).toHaveCount(onFirstPage);
      await expect(drugs.recordsTable.position).toHaveText(
        `1 - ${onFirstPage} of ${stageRecords.length}`
      );
      const titles = stageRecords.map(recordTitle);
      for (const title of await drugs.recordItems
        .getByTestId("clinical-record-drawer-trigger")
        .allInnerTexts()) {
        expect(titles, `"${title}" should be a ${row.maxClinicalStage} report of the drug`).toContain(
          title
        );
      }
    });
  });

  test("each report shows its title, source, status and start year", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, records } = await openDrugs(page, testConfig.target?.primary);
    const stage = rows[0].maxClinicalStage;
    const stageRecords = byStage(records).get(stage) ?? [];
    expect(stageRecords.length).toBeGreaterThan(0);
    await expect(drugs.stage(stage)).toHaveAttribute("data-selected", "true");
    await expect(drugs.recordItems).toHaveCount(Math.min(10, stageRecords.length));

    for (const item of await drugs.recordItems.all()) {
      const title = await drugs.recordTitle(item).innerText();
      const record = stageRecords.find((candidate) => recordTitle(candidate) === title);
      expect(record, `the report "${title}" should be one the API returned`).toBeDefined();
      const { source, trialOverallStatus, trialStartDate, year } = record as ClinicalRecord;

      await expect(item).toContainText(`Source:${source}`);
      const status = trialOverallStatus ? `Status:${trialOverallStatus.toLowerCase()}` : "";
      const start = trialStartDate ? `Start:${trialStartDate.slice(0, 4)}` : "";
      const published = year ? `Year:${year}` : "";
      // the "?" is the help icon shown when the source has a longer name
      await expect(item).toHaveText(
        new RegExp(
          `^${escapeRegExp(title)}Source:${escapeRegExp(source)}\\??${escapeRegExp(status)}${start}${published}$`
        )
      );
      expect(`${start}${published}`, "a report has a start date or a year").toMatch(
        /^(Start|Year):\d{4}/
      );
    }
  });

  test("choosing a stage lists that stage's reports and paginates them", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, records } = await openDrugs(page, testConfig.target?.primary);
    const grouped = byStage(records);
    const initial = rows[0].maxClinicalStage;
    await expect(drugs.stage(initial)).toHaveAttribute("data-selected", "true");

    const [bigStage, bigRecords] = [...grouped.entries()]
      .filter(([stage]) => stage !== initial)
      .sort((a, b) => b[1].length - a[1].length)[0];
    expect(
      bigRecords.length,
      "the first drug should have a stage with more than two pages of reports"
    ).toBeGreaterThan(20);
    const titles = bigRecords.map(recordTitle);
    const { recordsTable } = drugs;

    await drugs.selectStage(bigStage);
    await expect(drugs.stage(initial)).toHaveAttribute("data-selected", "false");

    await test.step("first page", async () => {
      await expect(drugs.recordItems).toHaveCount(10);
      await recordsTable.expectPosition(`1 - 10 of ${bigRecords.length}`, {
        canGoBack: false,
        canGoForward: true,
      });
    });
    const firstPage = await drugs.recordItems
      .getByTestId("clinical-record-drawer-trigger")
      .allInnerTexts();
    for (const title of firstPage) expect(titles).toContain(title);

    await test.step("next page shows other reports of the same stage", async () => {
      await recordsTable.nextPageButton.click();
      await recordsTable.expectPosition(`11 - 20 of ${bigRecords.length}`, {
        canGoBack: true,
        canGoForward: true,
      });
      await expect(drugs.recordItems).toHaveCount(10);
      const secondPage = await drugs.recordItems
        .getByTestId("clinical-record-drawer-trigger")
        .allInnerTexts();
      for (const title of secondPage) expect(titles).toContain(title);
      expect(secondPage, "page 2 should not repeat page 1").not.toEqual(firstPage);
    });

    await test.step("last page", async () => {
      await recordsTable.lastPageButton.click();
      const lastPageStart = Math.floor((bigRecords.length - 1) / 10) * 10;
      await recordsTable.expectPosition(
        `${lastPageStart + 1} - ${bigRecords.length} of ${bigRecords.length}`,
        { canGoBack: true, canGoForward: false }
      );
      await expect(drugs.recordItems).toHaveCount(bigRecords.length - lastPageStart);
    });

    await test.step("another stage starts again from its first page", async () => {
      const initialRecords = grouped.get(initial) ?? [];
      await drugs.selectStage(initial);
      const onFirstPage = Math.min(10, initialRecords.length);
      await expect(drugs.recordItems).toHaveCount(onFirstPage);
      await expect(recordsTable.position).toHaveText(`1 - ${onFirstPage} of ${initialRecords.length}`);
    });
  });

  test("choosing another drug shows that drug's reports", async ({ page, testConfig }) => {
    const { drugs, rows } = await openDrugs(page, testConfig.target?.primary);
    const firstName = await drugs.cardLink(drugs.selectedCards).innerText();
    const other = rows.find(
      ({ drug, maxClinicalStage }) =>
        drug.name !== firstName && maxClinicalStage !== rows[0].maxClinicalStage
    );
    expect(other, "the target should have a drug at another max stage").toBeDefined();
    const row = other as TargetDrugRow;

    const recordsResponse = waitForOperation<ClinicalRecordsData>(
      page,
      TargetDrugsSection.recordsOperation
    );
    await drugs.selectDrug(row);
    const { data, variables } = await recordsResponse;

    expect(variables.clinicalReportsIds).toEqual(row.clinicalReports.map(({ id }) => id));
    expect(data.clinicalReports).toHaveLength(row.clinicalReports.length);
    await expect(drugs.card(firstName)).toHaveAttribute("data-selected", "false");
    await expect(
      drugs.recordsSummary.getByRole("link", { name: row.drug.name })
    ).toHaveAttribute("href", `/drug/${row.drug.id}`);

    const grouped = byStage(data.clinicalReports);
    for (const { key } of CLINICAL_STAGES) {
      const stageRecords = grouped.get(key) ?? [];
      await expect(drugs.stage(key)).toHaveText(
        stageRecords.length > 0 ? String(stageRecords.length) : ""
      );
    }
    expect(grouped.has(row.maxClinicalStage)).toBe(true);
    await expect(drugs.stage(row.maxClinicalStage)).toHaveAttribute("data-selected", "true");
    const stageRecords = grouped.get(row.maxClinicalStage) ?? [];
    await expect(drugs.recordItems).toHaveCount(Math.min(10, stageRecords.length));
    const titles = stageRecords.map(recordTitle);
    for (const title of await drugs.recordItems
      .getByTestId("clinical-record-drawer-trigger")
      .allInnerTexts()) {
      expect(titles).toContain(title);
    }
  });

  test("a report opens a drawer with the details of that report", async ({ page, testConfig }) => {
    type RecordDetail = {
      clinicalReport: {
        id: string;
        title: string | null;
        url: string;
        source: string;
        clinicalStage: ClinicalStageKey;
        trialStartDate: string | null;
      };
    };
    const { drugs, records } = await openDrugs(page, testConfig.target?.primary);
    await expect(drugs.selectedStages).toHaveCount(1);
    const item = drugs.recordItems.first();
    const title = await drugs.recordTitle(item).innerText();
    const record = records.find((candidate) => recordTitle(candidate) === title);
    expect(record, `the report "${title}" should be one the API returned`).toBeDefined();

    const detailResponse = waitForOperation<RecordDetail>(
      page,
      TargetDrugsSection.recordDetailOperation
    );
    const drawer = await drugs.openRecord(item);
    const { data, variables } = await detailResponse;
    const detail = data.clinicalReport;

    expect(variables).toEqual({ clinicalReportId: record?.id });
    expect(detail.title).toBe(title);
    await expect(drawer.getByText(title, { exact: true })).toBeVisible();
    expect(detail.url).toMatch(/^https?:\/\//);
    await expect(drawer.getByRole("link", { name: detail.url })).toHaveAttribute("href", detail.url);
    await expect(drawer).toContainText("Source");
    await expect(drawer).toContainText(`Stage${stageLabel(detail.clinicalStage)}`);
    expect(detail.clinicalStage).toBe(record?.clinicalStage);

    await drugs.closeRecordDrawer();
    await expect(drugs.recordItems.first(), "the list is still there after closing").toBeVisible();

    await test.step("Escape also closes the drawer", async () => {
      await drugs.openRecord(item);
      await expect(drawer.getByText(title, { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drugs.recordDrawer).toBeHidden();
    });
  });

  test("search asks the server for drugs by name, and resets", async ({ page, testConfig }) => {
    const { drugs, rows, count } = await openDrugs(page, testConfig.target?.primary);
    await expect(drugs.cards).toHaveCount(rows.length);

    await test.step("a drug name", async () => {
      const term = rows[0].drug.name.toLowerCase();
      const searched = drugs.waitForPage((variables) => variables.search?.text === term);
      await drugs.searchInput.fill(term);
      const { data, variables } = await searched;
      // only the drug name is searched, and the search starts again from the first page
      expect(variables.search).toEqual({ text: term, fields: ["DRUG_NAME"] });
      expect(variables.index).toBe(0);
      const found = data.target.drugAndClinicalCandidates;
      expect(found.count, "the term is a drug of the target").toBeGreaterThan(0);
      expect(found.count, "the search should narrow the drugs").toBeLessThan(count);
      expect(found.rows.map(({ drug }) => drug.name.toLowerCase())).toContain(term);
      for (const { drug } of found.rows) expect(drug.name.toLowerCase()).toContain(term);

      await expect(drugs.cards).toHaveCount(found.rows.length);
      for (const { drug } of found.rows) await expect(drugs.card(drug.name)).toHaveCount(1);
      await expect(drugs.cardsPagination.position).toHaveText(
        `1 - ${found.rows.length} of ${found.count}`
      );
    });

    await test.step("a stage label is not searched", async () => {
      const searched = drugs.waitForPage((variables) => variables.search?.text === "Approval");
      await drugs.searchInput.fill("Approval");
      const { data } = await searched;
      expect(
        rows.some(({ maxClinicalStage }) => maxClinicalStage === "APPROVAL"),
        "the target has drugs at the Approval stage, so only the name is being searched"
      ).toBe(true);
      expect(data.target.drugAndClinicalCandidates.count).toBe(0);
      await expect(drugs.cards).toHaveCount(0);
    });

    await test.step("a term nothing matches leaves no card", async () => {
      const searched = drugs.waitForPage((variables) => variables.search?.text === "zzzz-no-such-drug");
      await drugs.searchInput.fill("zzzz-no-such-drug");
      expect((await searched).data.target.drugAndClinicalCandidates.count).toBe(0);
      await expect(drugs.cards).toHaveCount(0);
    });

    await test.step("clearing the search restores the first page", async () => {
      await drugs.searchInput.fill("");
      await expect(drugs.cards).toHaveCount(rows.length);
      await expect(drugs.cards.getByRole("link")).toHaveText(rows.map(({ drug }) => drug.name));
      await expect(drugs.cardsPagination.position).toHaveText(`1 - ${DRUGS_PAGE_SIZE} of ${count}`);
    });
  });

  test("the drug name on a card opens that drug's page", async ({ page, testConfig }) => {
    const { drugs, rows } = await openDrugs(page, testConfig.target?.primary);
    // a drug other than the selected one: following the link must not need a selection first
    const row = rows.find(({ drug }) => drug.name === "VEMURAFENIB") ?? rows[1];

    await drugs.cardLink(drugs.card(row.drug.name)).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${row.drug.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(row.drug.name);
  });

  test("exports every drug of the target as JSON and TSV, not only the page shown", async ({
    page,
    testConfig,
  }) => {
    const { drugs, rows, count } = await openDrugs(page, testConfig.target?.primary);
    const expected = rows.map((row) => ({
      drugName: row.drug.name,
      drugId: row.drug.id,
      maxClinicalStage: row.maxClinicalStage,
      reportCount: row.clinicalReports.length,
    }));
    const byDrugId = (a: { drugId: unknown }, b: { drugId: unknown }) =>
      String(a.drugId).localeCompare(String(b.drugId));

    await test.step("JSON", async () => {
      const { filename, rows: exported } = await drugs.cardsControls.downloadJson();
      expect(filename).toBe("drugs-and-clinical-candidates.json");
      expect(exported, "the export covers every page of drugs").toHaveLength(count);
      expect(new Set(exported.map(({ drugId }) => drugId)).size).toBe(count);
      const exportedById = new Map(exported.map((row) => [row.drugId, row]));
      for (const row of [...expected].sort(byDrugId)) {
        expect(exportedById.get(row.drugId)).toEqual(row);
      }
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await drugs.cardsControls.downloadTsv();
      expect(filename).toBe("drugs-and-clinical-candidates.tsv");
      expect(header).toEqual(["drugName", "drugId", "maxClinicalStage", "reportCount"]);
      expect(lines).toHaveLength(count);
      const drugIds = lines.map(([, drugId]) => drugId);
      expect(new Set(drugIds).size).toBe(count);
      for (const { drugId } of expected) expect(drugIds).toContain(drugId);
    });
  });

  test("exports every report of the selected drug, whatever stage is shown", async ({
    page,
    testConfig,
  }) => {
    const { drugs, records } = await openDrugs(page, testConfig.target?.primary);
    await expect(drugs.selectedStages).toHaveCount(1);

    const { filename, rows: exported } = await drugs.recordsControls.downloadJson();
    expect(filename).toBe("clinical-records.json");
    expect(exported).toHaveLength(records.length);
    expect(Object.keys(exported[0])).toEqual([
      "id",
      "title",
      "clinicalStage",
      "source",
      "trialOverallStatus",
      "trialStartDate",
      "year",
    ]);
    expect(exported.map(({ id }) => id).sort()).toEqual(records.map(({ id }) => id).sort());
    expect(
      new Set(exported.map(({ clinicalStage }) => clinicalStage)).size,
      "the export covers all stages, not only the selected one"
    ).toBe(byStage(records).size);
  });

  test("the API query drawers show the drug query and the reports query", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary ?? "";
    const { drugs, records } = await openDrugs(page, targetId);

    await test.step("drug list", async () => {
      const drawer = await drugs.cardsControls.openApiQuery(TargetDrugsSection.operation, targetId);
      await expect(drawer).toContainText("drugAndClinicalCandidates");
      await drugs.cardsControls.closeApiQuery();
    });

    await test.step("clinical reports", async () => {
      const drawer = await drugs.recordsControls.openApiQuery(
        TargetDrugsSection.recordsOperation,
        records[0].id
      );
      await expect(drawer).toContainText("clinicalReportsIds");
      await drugs.recordsControls.closeApiQuery();
    });
  });

  test("is absent for a target with no drugs", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.withoutDrugsSafetyOrProbes ?? "";
    expect(expectedSectionsFor(targetId)).not.toContain(TargetDrugsSection.id);
    // Drugs is the first section; the ones that follow it are there, so its absence is final.
    expect(expectedSectionsFor(targetId)).toEqual(
      expect.arrayContaining(["tractability", "baselineexpression"])
    );

    await page.goto(`/target/${targetId}`);
    await expectSectionLoaded(page, "tractability");
    await expectSectionLoaded(page, "baselineexpression");
    await expect(sectionLocator(page, TargetDrugsSection.id)).toHaveCount(0);
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

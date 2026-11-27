import { expect, test } from "../../../fixtures";
import { closeDrawer, expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import { IndicationsSection } from "../../../POM/objects/widgets/shared/indicationsSection";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import {
  CLINICAL_STAGE_KEYS,
  CLINICAL_STAGE_LABELS,
  drugFacts,
  drugIds,
} from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";

const PAGE_SIZE = 10;
const stageRank = (label: string): number =>
  CLINICAL_STAGE_LABELS.indexOf(label as (typeof CLINICAL_STAGE_LABELS)[number]);
const stageLabel = (key: string): string =>
  CLINICAL_STAGE_LABELS[CLINICAL_STAGE_KEYS.indexOf(key as (typeof CLINICAL_STAGE_KEYS)[number])];

/** Open the primary drug and wait for the indications list and the first detail. */
async function openIndications(
  drugPage: DrugPage,
  indications: IndicationsSection,
  chemblId: string
): Promise<void> {
  await drugPage.goto(chemblId);
  await expectSectionLoaded(drugPage.page, IndicationsSection.id);
}

test.describe("Drug page: Indications", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description and the list of indications, most advanced first", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const indications = new IndicationsSection(page);
    await openIndications(drugPage, indications, primary);

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(IndicationsSection.id)).toHaveText("Indications");
      await expect(indications.description).toHaveText(
        `Investigational and approved indications for ${drugFacts(primary).name} curated from clinical trial records and post-marketing package inserts. Source: Open Targets and ChEMBL.`
      );
      await expectExternalLink(
        indications.description.getByRole("link", { name: "Open Targets" }),
        "https://platform-docs.opentargets.org/drug/indications"
      );
      await expectExternalLink(
        indications.description.getByRole("link", { name: "ChEMBL" }),
        "https://www.ebi.ac.uk/chembl/"
      );
    });

    await indications.expectCards(PAGE_SIZE);
    const total = await indications.master.total();
    expect(total, "trastuzumab has several pages of indications").toBeGreaterThan(2 * PAGE_SIZE);
    await indications.master.expectPosition(1, PAGE_SIZE, total);
    await indications.master.expectPaginationState("first");

    const cards = await indications.allCards();
    await test.step("every card has a disease link, a known stage and a report count", async () => {
      expect(cards).toHaveLength(PAGE_SIZE);
      expect(new Set(cards.map((card) => card.diseaseId)).size, "no disease is listed twice").toBe(
        PAGE_SIZE
      );
      for (const card of cards) {
        expect(card.name).not.toBe("");
        expect(card.diseaseId).toMatch(/^[A-Za-z]+_\d+$/);
        expect(stageRank(card.stage), `"${card.stage}" is a clinical stage`).toBeGreaterThanOrEqual(
          0
        );
        expect(card.reports).toBeGreaterThan(0);
      }
      expect(cards.map((card) => card.name)).toContain("breast cancer");
    });

    await test.step("ordered by stage, then by number of reports, both descending", async () => {
      const sorted = [...cards].sort(
        (a, b) => stageRank(b.stage) - stageRank(a.stage) || b.reports - a.reports
      );
      expect(cards.map((card) => `${card.stage}/${card.reports}`)).toEqual(
        sorted.map((card) => `${card.stage}/${card.reports}`)
      );
      expect(cards[0].stage, "the list starts at the drug's maximum stage").toBe(
        drugFacts(primary).maxStage
      );
    });

    await test.step("the list has a search box, no column picker, no page size and no header row", async () => {
      await expect(indications.master.searchInput).toHaveAttribute(
        "placeholder",
        "Search indications..."
      );
      await expect(indications.section.getByRole("button", { name: "Columns" })).toHaveCount(0);
      await expect(indications.section.getByRole("combobox")).toHaveCount(0);
      await expect(indications.master.headers.first()).toBeHidden();
    });
  });

  test("the first indication is selected and its reports fill the detail panel", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);

    const first = await indications.cardInfo(0);
    await expect(indications.selectedCard).toHaveCount(1);
    await expect(indications.card(0)).toHaveAttribute("data-selected", "true");
    await indications.expectDetailFor(first);

    await test.step("the stage filter has a slot per stage and a button per stage with reports", async () => {
      await expect(indications.stageSlots).toHaveCount(CLINICAL_STAGE_KEYS.length);
      const order = await indications.stageSlots.evaluateAll((slots) =>
        slots.map((slot) => (slot.getAttribute("data-testid") ?? "").replace("stage-filter-", ""))
      );
      expect(order).toEqual([...CLINICAL_STAGE_KEYS]);
      for (const label of CLINICAL_STAGE_LABELS) {
        await expect(
          indications.recordsPanel.locator("thead").getByText(label, { exact: true })
        ).toBeVisible();
      }
    });

    const counts = await indications.stageCounts();
    await test.step("the stage counts add up to the indication's report count", async () => {
      const sum = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(sum).toBe(first.reports);
      for (const count of Object.values(counts)) expect(count).toBeGreaterThan(0);
    });

    await test.step("the indication's maximum stage is the one selected", async () => {
      const selected = await indications.selectedStageKey();
      expect(stageLabel(selected)).toBe(first.stage);
      const shown = counts[selected];
      await indications.records.expectPosition(1, Math.min(PAGE_SIZE, shown), shown);
      await expect(indications.recordRows).toHaveCount(Math.min(PAGE_SIZE, shown));
    });

    await test.step("every report shows a title and its source", async () => {
      const rows = await indications.recordRows.all();
      for (const [index, row] of rows.entries()) {
        await expect(indications.recordTitle(index)).not.toBeEmpty();
        await expect(row).toContainText(/Source:\s*\S+/);
      }
    });
  });

  test("the stage filter switches the reports to the stage clicked", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    await indications.expectDetailFor(await indications.cardInfo(0));

    const counts = await indications.stageCounts();
    const initial = await indications.selectedStageKey();
    const others = Object.keys(counts).filter((key) => key !== initial);
    expect(others.length, "the first indication has reports at several stages").toBeGreaterThan(1);
    const initialTitles = await indications.recordRows.allInnerTexts();

    // The stage with most reports spans several pages; the one with fewest fits on one.
    const largest = others.reduce((a, b) => (counts[a] >= counts[b] ? a : b));
    const smallest = others.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    expect(counts[largest]).toBeGreaterThan(PAGE_SIZE);

    await test.step(`a stage with ${counts[largest]} reports paginates`, async () => {
      await indications.stage(largest).click();
      await expect(indications.stage(largest)).toHaveAttribute("data-selected", "true");
      await expect(indications.selectedStage).toHaveCount(1);
      await indications.records.expectPosition(1, PAGE_SIZE, counts[largest]);
      await expect(indications.recordRows).toHaveCount(PAGE_SIZE);
      await indications.records.expectPaginationState("first");
      const firstPage = await indications.recordRows.allInnerTexts();
      expect(firstPage).not.toEqual(initialTitles);

      await indications.records.nextPageButton.click();
      await indications.records.expectPosition(
        PAGE_SIZE + 1,
        Math.min(2 * PAGE_SIZE, counts[largest]),
        counts[largest]
      );
      expect(await indications.recordRows.allInnerTexts()).not.toEqual(firstPage);

      await indications.records.lastPageButton.click();
      const lastStart = Math.floor((counts[largest] - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
      await indications.records.expectPosition(lastStart, counts[largest], counts[largest]);
      await expect(indications.recordRows).toHaveCount(counts[largest] - lastStart + 1);
      await indications.records.expectPaginationState("last");
    });

    await test.step(`a stage with ${counts[smallest]} report(s) shows them all`, async () => {
      await indications.stage(smallest).click();
      await expect(indications.stage(smallest)).toHaveAttribute("data-selected", "true");
      await expect(indications.stage(largest)).toHaveAttribute("data-selected", "false");
      const shown = Math.min(PAGE_SIZE, counts[smallest]);
      await indications.records.expectPosition(1, shown, counts[smallest]);
      await expect(indications.recordRows).toHaveCount(shown);
    });

    await test.step("going back to the first stage restores its reports", async () => {
      await indications.stage(initial).click();
      await expect(indications.stage(initial)).toHaveAttribute("data-selected", "true");
      await expect(indications.recordRows).toHaveCount(initialTitles.length);
      expect(await indications.recordRows.allInnerTexts()).toEqual(initialTitles);
    });
  });

  test("selecting another indication replaces the reports in the detail panel", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const first = await indications.cardInfo(0);
    await indications.expectDetailFor(first);

    for (const index of [2, PAGE_SIZE - 1]) {
      const card = await indications.cardInfo(index);
      expect(card.diseaseId).not.toBe(first.diseaseId);

      // Click the card body: the disease name is a link to the disease page.
      await indications.card(index).getByText("Max stage:").click();
      await expect(indications.card(index)).toHaveAttribute("data-selected", "true");
      await expect(indications.selectedCard).toHaveCount(1);
      await indications.expectDetailFor(card);

      const counts = await indications.stageCounts();
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(card.reports);
      const selected = await indications.selectedStageKey();
      expect(counts[selected], "the selected stage has reports").toBeGreaterThan(0);
      await expect(indications.recordRows).toHaveCount(Math.min(PAGE_SIZE, counts[selected]));
    }

    await test.step("clicking the selected card again keeps it selected", async () => {
      await indications
        .card(PAGE_SIZE - 1)
        .getByText("Max stage:")
        .click();
      await expect(indications.card(PAGE_SIZE - 1)).toHaveAttribute("data-selected", "true");
      await expect(indications.recordRows.first()).toBeVisible();
    });
  });

  test("the list paginates and each page selects its first indication", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const total = await indications.master.total();
    const firstPage = await indications.allCards();
    await indications.expectDetailFor(firstPage[0]);

    await test.step("page 2", async () => {
      await indications.master.nextPageButton.click();
      await indications.master.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await indications.expectCards(PAGE_SIZE);
      await indications.master.expectPaginationState("middle");
      const secondPage = await indications.allCards();
      const firstIds = new Set(firstPage.map((card) => card.diseaseId));
      for (const card of secondPage) expect(firstIds.has(card.diseaseId)).toBe(false);
      expect(
        stageRank(secondPage[0].stage),
        "page 2 continues the descending stage order"
      ).toBeLessThanOrEqual(stageRank(firstPage[PAGE_SIZE - 1].stage));

      await expect(indications.card(0)).toHaveAttribute("data-selected", "true");
      await indications.expectDetailFor(secondPage[0]);
    });

    await test.step("last page", async () => {
      await indications.master.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
      await indications.master.expectPosition(lastStart, total, total);
      await indications.expectCards(total - lastStart + 1);
      await indications.master.expectPaginationState("last");
      await indications.expectDetailFor(await indications.cardInfo(0));
    });

    await test.step("back to the first page", async () => {
      await indications.master.firstPageButton.click();
      await indications.master.expectPosition(1, PAGE_SIZE, total);
      await indications.expectCards(PAGE_SIZE);
      await indications.master.expectPaginationState("first");
      expect(await indications.allCards()).toEqual(firstPage);
      await indications.expectDetailFor(firstPage[0]);
    });
  });

  test("search filters the indications on the server by disease name", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const total = await indications.master.total();

    const searchRequest = page.waitForRequest((request) => {
      const body = request.postDataJSON?.() as {
        operationName?: string;
        variables?: { search?: { text?: string } };
      } | null;
      return (
        body?.operationName === "IndicationsQuery" && body.variables?.search?.text === "gastric"
      );
    });
    await indications.master.search("gastric", total);
    const variables = (
      (await searchRequest).postDataJSON() as {
        variables: { search: { fields: string[] } };
      }
    ).variables;
    expect(variables.search.fields).toEqual(["DISEASE_NAME"]);

    const matches = await indications.master.total();
    expect(matches).toBeGreaterThan(1);
    expect(matches).toBeLessThanOrEqual(PAGE_SIZE);
    await indications.expectCards(matches);
    const cards = await indications.allCards();
    for (const card of cards) expect(card.name.toLowerCase()).toContain("gastric");

    await test.step("the detail panel follows the first match", async () => {
      await expect(indications.card(0)).toHaveAttribute("data-selected", "true");
      await indications.expectDetailFor(cards[0]);
    });

    await test.step("no match empties the list", async () => {
      await indications.master.search("zzz-no-such-disease", matches);
      await indications.expectCards(0);
      await expect(indications.master.position).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores the full list", async () => {
      await indications.master.clearSearch(total);
      await indications.expectCards(PAGE_SIZE);
      await indications.master.expectPosition(1, PAGE_SIZE, total);
    });
  });

  test("a report opens in a drawer with its details and closes again", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const first = await indications.cardInfo(0);
    await indications.expectDetailFor(first);
    const stage = stageLabel(await indications.selectedStageKey());

    const titleButton = indications.recordTitle(0);
    const title = (await titleButton.innerText()).trim();
    expect(title).not.toBe("");
    const rowText = await indications.recordRows.first().innerText();
    const source = (/Source:\s*([^\n?]+)/.exec(rowText) ?? [])[1]?.trim() ?? "";
    expect(source, "the report row names its source").not.toBe("");
    await expect(indications.recordDrawer).toHaveCount(0);

    await titleButton.click();
    const drawer = indications.recordDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Report");
    await expect(
      drawer.getByText(title, { exact: true }),
      "the drawer shows the report that was clicked"
    ).toBeVisible();

    await test.step("source, type and stage of the report", async () => {
      await expect(drawer).toContainText(new RegExp(`Source\\s*.*${source.split(" ")[0]}`));
      await expect(drawer).toContainText(/Type\s*\S+/);
      await expect(drawer).toContainText(new RegExp(`Stage\\s*${stage.replace("/", "\\/")}`));
    });

    await test.step("a link to the report at its source", async () => {
      const link = drawer.getByRole("link").first();
      await expect(link).toHaveAttribute("href", /^https?:\/\/\S+$/);
      await expect(link, "the link text is the URL itself").toHaveText(/^https?:\/\/\S+$/);
    });

    await test.step("the indication is among the report's diseases", async () => {
      await expect(drawer).toContainText(/Diseases\s*\S+/);
      await expect(drawer.getByRole("link", { name: first.name, exact: true })).toHaveAttribute(
        "href",
        `/disease/${first.diseaseId}`
      );
    });

    await closeDrawer(drawer);
    await expect(indications.recordRows.first()).toBeVisible();

    await test.step("another report replaces the content, and Escape closes it", async () => {
      const second = indications.recordTitle(1);
      const secondTitle = (await second.innerText()).trim();
      await second.click();
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText(secondTitle, { exact: true }).first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });
  });

  test("a clinical trial report shows its status, start date and sponsor", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    await indications.expectDetailFor(await indications.cardInfo(0));

    // Phase III reports of a marketed drug are clinical trials.
    await indications.stage("phase-3").click();
    await expect(indications.stage("phase-3")).toHaveAttribute("data-selected", "true");
    await expect(indications.recordRows).toHaveCount(PAGE_SIZE);

    const trial = indications.recordRows.filter({ hasText: "Status:" }).first();
    await expect(trial).toContainText(/Source:\s*\S+/);
    await expect(trial).toContainText(/Status:\s*[a-z_, ]+/);
    await expect(trial).toContainText(/Start:\s*(19|20)\d{2}/);

    await test.step("reports are ordered by start year, most recent first", async () => {
      const texts = await indications.recordRows.allInnerTexts();
      const years = texts.map((text) => Number((/Start:\s*(\d{4})/.exec(text) ?? [])[1]));
      expect(
        years.every((year) => Number.isInteger(year)),
        "every trial has a start year"
      ).toBe(true);
      expect(years).toEqual([...years].sort((a, b) => b - a));
    });

    await trial.getByTestId("clinical-record-drawer-trigger").click();
    const drawer = indications.recordDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/Stage\s*Phase III/);
    await expect(drawer).toContainText(/Start\s*(19|20)\d{2}-\d{2}-\d{2}/);
    await expect(drawer).toContainText(/Status\s*\S+/);
    await expect(drawer).toContainText(/Type\s*\S+/);
    await expect(drawer).toContainText(/Drugs\s*\S+/);
    await expect(drawer.getByRole("link").first()).toHaveAttribute(
      "href",
      /^https?:\/\/(www\.)?clinicaltrials\.gov\/\S+$/
    );
    await closeDrawer(drawer);
  });

  test("the disease link of a card opens the disease page without selecting the card", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const indications = new IndicationsSection(page);
    await openIndications(drugPage, indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const card = await indications.cardInfo(1);

    await indications.card(1).getByRole("link", { name: card.name }).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${card.diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(card.name);

    // Finish on the page under test rather than in the middle of the disease page's queries.
    await page.goBack();
    await expect(drugPage.title).toHaveText(drugFacts(primary).name);
    await expectSectionLoaded(page, IndicationsSection.id);
    await indications.expectCards(PAGE_SIZE);
    await expect(indications.card(0)).toHaveAttribute("data-selected", "true");
  });

  test("a drug with a single indication and a single report", async ({ page, testConfig }) => {
    const { sparse } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, sparse);

    await indications.expectCards(1);
    await indications.master.expectPosition(1, 1, 1);
    await indications.master.expectPaginationState("only");
    const card = await indications.cardInfo(0);
    expect(card).toEqual({
      name: "neoplasm",
      diseaseId: "MONDO_0005070",
      stage: drugFacts(sparse).maxStage,
      reports: 1,
    });
    await expect(indications.card(0), "one report is singular").toHaveText(/\D1 report$/);
    await expect(indications.card(0)).toHaveAttribute("data-selected", "true");

    await expect(indications.recordsSummary).toHaveText("1 report for neoplasm");
    await indications.expectDetailFor(card);
    expect(await indications.stageCounts()).toEqual({ unknown: 1 });
    expect(await indications.selectedStageKey()).toBe("unknown");
    await expect(indications.recordRows).toHaveCount(1);
    await indications.records.expectPosition(1, 1, 1);
    await indications.records.expectPaginationState("only");
  });

  test("exports the indications and the reports of the selected one, and shows the API queries", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, primary);
    await indications.expectCards(PAGE_SIZE);
    const total = await indications.master.total();
    const cards = await indications.allCards();
    await indications.expectDetailFor(cards[0]);

    await test.step("indications as JSON: every indication, across pages", async () => {
      const { filename, rows } = await indications.master.exportJson();
      expect(filename).toBe("clinical-indications.json");
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toEqual([
          "diseaseName",
          "diseaseId",
          "maxClinicalStage",
          "reportCount",
        ]);
        expect(String(row.diseaseId)).toMatch(/^[A-Za-z]+_\d+$/);
        expect(Number(row.reportCount)).toBeGreaterThan(0);
      }
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.diseaseName)).toEqual(
        cards.map((card) => card.name)
      );
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.reportCount)).toEqual(
        cards.map((card) => card.reports)
      );
    });

    await test.step("indications as TSV", async () => {
      const { filename, header, lines } = await indications.master.exportTsv();
      expect(filename).toBe("clinical-indications.tsv");
      expect(header).toEqual(["diseaseName", "diseaseId", "maxClinicalStage", "reportCount"]);
      expect(lines).toHaveLength(total);
    });

    await test.step("reports as JSON: every report of the indication, at every stage", async () => {
      const { filename, rows } = await indications.records.exportJson();
      expect(filename).toBe("clinical-records.json");
      expect(rows).toHaveLength(cards[0].reports);
      for (const row of rows) {
        expect(Object.keys(row)).toEqual([
          "id",
          "title",
          "clinicalStage",
          "source",
          "trialOverallStatus",
          "trialStartDate",
          "year",
        ]);
        expect(String(row.id), "every report has an id").not.toBe("");
      }
      expect(new Set(rows.map((row) => row.id)).size, "no report is exported twice").toBe(
        rows.length
      );
      const counts = await indications.stageCounts();
      expect(new Set(rows.map((row) => row.clinicalStage)).size).toBe(Object.keys(counts).length);
    });

    await test.step("API queries of both tables", async () => {
      await indications.master.expectApiQuery("IndicationsQuery", primary);
      await indications.records.expectApiQuery("ClinicalRecordsQuery", "clinicalReportsIds");
    });
  });

  test("a trial report lists the literature of every reference type, each with its Europe PMC link", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    // opentargets/issues#4489: `trialLiterature` is no longer a list of ids but of
    // `{ id, referenceType }` (BACKGROUND, RESULT, DERIVED). The drawer must still list one
    // publication per reference, whatever its type. WARFARIN / heart failure has a single
    // phase III trial (CSP #442) whose references are of two different types.
    const { smallMolecule } = drugIds(testConfig);
    const indications = new IndicationsSection(page);
    await openIndications(new DrugPage(page), indications, smallMolecule);
    await indications.expectCards(PAGE_SIZE);
    const total = await indications.master.total();
    await indications.master.search("heart failure", total);
    const card = indications.cards.filter({
      has: page.getByRole("link", { name: "heart failure", exact: true }),
    });
    await expect(card, "heart failure is one of the indications of the drug").toHaveCount(1);
    await card.click();
    await expect(card).toHaveAttribute("data-selected", "true");
    await indications.stage("phase-3").click();
    await expect(indications.stage("phase-3")).toHaveAttribute("data-selected", "true");

    const report = indications.recordRows.filter({ hasText: "CSP #442" });
    await expect(report, "the phase III trial CSP #442 is listed").toHaveCount(1);
    await report.getByTestId("clinical-record-drawer-trigger").click();
    const drawer = indications.recordDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("CSP #442");

    type Reference = { id: string; type: string };
    await expect
      .poll(
        async () => {
          await graphqlMonitor.settle();
          return graphqlMonitor
            .named("RecordDetailQuery")
            .filter((request) => request.data !== undefined).length;
        },
        { message: "the report details should be requested and answered" }
      )
      .toBeGreaterThan(0);
    const detail = graphqlMonitor
      .named("RecordDetailQuery")
      .filter((request) => request.data !== undefined)[0];
    const references = (detail.data as { clinicalReport: { trialLiterature: Reference[] } })
      .clinicalReport.trialLiterature;

    await test.step("the API returns references with a type", async () => {
      expect(references.length, "the trial has references").toBeGreaterThan(1);
      for (const reference of references) {
        expect(reference.id, "a reference has a publication id").toMatch(/^\d+$/);
        expect(["BACKGROUND", "RESULT", "DERIVED"], "a reference has a known type").toContain(
          reference.type
        );
      }
      expect(
        new Set(references.map((reference) => reference.type)).size,
        "of more than one type"
      ).toBeGreaterThan(1);
    });

    await test.step("the drawer lists one publication per reference, linked to Europe PMC", async () => {
      await expect(drawer.getByText("Literature", { exact: true })).toBeVisible();
      await expect(drawer.getByTestId(/^literature-entry-/), "one entry per reference").toHaveCount(
        references.length
      );
      for (const { id, type } of references) {
        const entry = drawer.getByTestId(`literature-entry-${id}`);
        await expect(entry, `the ${type} reference ${id}`).toBeVisible();
        await expect(entry.getByRole("link").first()).toHaveAttribute(
          "href",
          `https://europepmc.org/abstract/med/${id}`
        );
      }
    });

    await closeDrawer(drawer);
  });
});

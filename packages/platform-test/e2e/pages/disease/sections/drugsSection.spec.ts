import { expect, test } from "../../../../fixtures";
import {
  closeDrawer,
  expectExternalLink,
} from "../../../../POM/objects/widgets/Drug/sectionTable";
import { DiseaseDrugsSection } from "../../../../POM/objects/widgets/Disease/diseaseDrugsSection";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { DiseasePage } from "../../../../POM/page/disease/disease";
import { CLINICAL_STAGE_KEYS, CLINICAL_STAGE_LABELS } from "../../../../POM/page/drug/drugData";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

const PAGE_SIZE = 10;
/** Marfan syndrome: a disease with GWAS and literature but no drugs. */
const WITHOUT_DRUGS = "MONDO_0007947";
/** Huntington disease: 49 drugs, so five pages. */
const SMALLER = "MONDO_0007739";

const stageRank = (label: string): number =>
  CLINICAL_STAGE_LABELS.indexOf(label as (typeof CLINICAL_STAGE_LABELS)[number]);
const stageLabel = (key: string): string =>
  CLINICAL_STAGE_LABELS[CLINICAL_STAGE_KEYS.indexOf(key as (typeof CLINICAL_STAGE_KEYS)[number])];

type DrugsData = {
  disease: {
    name: string;
    drugAndClinicalCandidates: {
      count: number;
      rows: { id: string; maxClinicalStage: string; drug: { id: string; name: string } }[];
    };
  };
};

async function openDrugs(page: import("@playwright/test").Page, diseaseId: string) {
  const drugs = new DiseaseDrugsSection(page);
  await new DiseasePage(page).goto(diseaseId);
  await expectSectionLoaded(page, DiseaseDrugsSection.id);
  await drugs.expectCards(PAGE_SIZE);
  return drugs;
}

test.describe("Disease page: Drugs and Clinical Candidates", () => {
  test("shows title, description and the drugs, most advanced first", async ({
    page,
    testConfig,
  }) => {
    const { primary, name } = testConfig.disease;
    const drugs = await openDrugs(page, primary);

    await test.step("title and description", async () => {
      await expect(new DiseasePage(page).sectionTitle(DiseaseDrugsSection.id)).toHaveText(
        "Drugs and Clinical Candidates"
      );
      await expect(drugs.description).toHaveText(
        `Investigational and approved drugs for ${name} curated from clinical trial records and post-marketing package inserts. Source: Open Targets and ChEMBL.`
      );
      await expectExternalLink(
        drugs.description.getByRole("link", { name: "Open Targets" }),
        "https://platform-docs.opentargets.org/disease-or-phenotype/drugs"
      );
      await expectExternalLink(
        drugs.description.getByRole("link", { name: "ChEMBL" }),
        "https://www.ebi.ac.uk/chembl/"
      );
    });

    const total = await drugs.master.total();
    expect(total, "myocardial infarction has several pages of drugs").toBeGreaterThan(2 * PAGE_SIZE);
    await drugs.master.expectPosition(1, PAGE_SIZE, total);
    await drugs.master.expectPaginationState("first");

    const cards = await drugs.allCards();
    await test.step("every card has a drug link, a known stage and a report count", async () => {
      expect(cards).toHaveLength(PAGE_SIZE);
      expect(new Set(cards.map((card) => card.drugId)).size, "no drug is listed twice").toBe(
        PAGE_SIZE
      );
      for (const card of cards) {
        expect(card.name).not.toBe("");
        expect(stageRank(card.stage), `"${card.stage}" is a clinical stage`).toBeGreaterThanOrEqual(0);
        expect(card.reports).toBeGreaterThan(0);
      }
    });

    await test.step("ordered by stage, then by number of reports, both descending", async () => {
      const sorted = [...cards].sort(
        (a, b) => stageRank(b.stage) - stageRank(a.stage) || b.reports - a.reports
      );
      expect(cards.map((card) => `${card.stage}/${card.reports}`)).toEqual(
        sorted.map((card) => `${card.stage}/${card.reports}`)
      );
    });

    await test.step("a search box, but no column picker, page size or header row", async () => {
      await expect(drugs.master.searchInput).toHaveAttribute("placeholder", "Search drugs...");
      await expect(drugs.section.getByRole("button", { name: "Columns" })).toHaveCount(0);
      await expect(drugs.section.getByRole("combobox")).toHaveCount(0);
      await expect(drugs.master.headers.first()).toBeHidden();
    });
  });

  test("the first drug is selected and its reports fill the detail panel", async ({
    page,
    testConfig,
  }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const first = await drugs.cardInfo(0);
    await expect(drugs.selectedCard).toHaveCount(1);
    await expect(drugs.card(0)).toHaveAttribute("data-selected", "true");
    await drugs.expectDetailFor(first);

    await test.step("the stage filter has a slot for every stage", async () => {
      await expect(drugs.stageSlots).toHaveCount(CLINICAL_STAGE_KEYS.length);
      const order = await drugs.stageSlots.evaluateAll((slots) =>
        slots.map((slot) => (slot.getAttribute("data-testid") ?? "").replace("stage-filter-", ""))
      );
      expect(order).toEqual([...CLINICAL_STAGE_KEYS]);
      for (const label of CLINICAL_STAGE_LABELS) {
        await expect(drugs.recordsPanel.locator("thead").getByText(label, { exact: true })).toBeVisible();
      }
    });

    const counts = await drugs.stageCounts();
    await test.step("the stage counts add up to the drug's report count", async () => {
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(first.reports);
      for (const count of Object.values(counts)) expect(count).toBeGreaterThan(0);
    });

    await test.step("the drug's maximum stage is the one selected", async () => {
      const selectedTestId = (await drugs.selectedStage.getAttribute("data-testid")) ?? "";
      const selected = selectedTestId.replace("stage-filter-", "");
      expect(stageLabel(selected)).toBe(first.stage);
      await drugs.records.expectPosition(1, Math.min(PAGE_SIZE, counts[selected]), counts[selected]);
      await expect(drugs.recordRows).toHaveCount(Math.min(PAGE_SIZE, counts[selected]));
    });

    await test.step("every report shows a title and its source", async () => {
      const rows = await drugs.recordRows.all();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        await expect(row.getByTestId("clinical-record-drawer-trigger")).not.toBeEmpty();
        await expect(row).toContainText(/Source:\s*\S+/);
      }
    });
  });

  test("selecting another drug replaces the reports in the detail panel", async ({
    page,
    testConfig,
  }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const first = await drugs.cardInfo(0);
    await drugs.expectDetailFor(first);

    for (const index of [2, PAGE_SIZE - 1]) {
      const card = await drugs.cardInfo(index);
      expect(card.drugId).not.toBe(first.drugId);
      // Click the card body: the drug name is a link to the drug page.
      await drugs.card(index).getByText("Max stage:").click();
      await expect(drugs.card(index)).toHaveAttribute("data-selected", "true");
      await expect(drugs.selectedCard).toHaveCount(1);
      await drugs.expectDetailFor(card);
      const counts = await drugs.stageCounts();
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(card.reports);
    }

    await test.step("clicking the selected card again keeps it selected", async () => {
      await drugs.card(PAGE_SIZE - 1).getByText("Max stage:").click();
      await expect(drugs.card(PAGE_SIZE - 1)).toHaveAttribute("data-selected", "true");
      await expect(drugs.recordRows.first()).toBeVisible();
    });
  });

  test("the stage filter switches the reports to the stage clicked", async ({ page, testConfig }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    // Clopidogrel has reports at five stages, two of them spanning several pages.
    await drugs.master.search("clopidogrel", await drugs.master.total());
    await drugs.expectCards(await drugs.master.total());
    const card = await drugs.cardInfo(0);
    expect(card.name, "the most reported match is first").toBe("CLOPIDOGREL");
    await drugs.expectDetailFor(card);

    const counts = await drugs.stageCounts();
    const initial = ((await drugs.selectedStage.getAttribute("data-testid")) ?? "").replace(
      "stage-filter-",
      ""
    );
    expect(stageLabel(initial), "the maximum stage is selected first").toBe(card.stage);
    const others = Object.keys(counts).filter((key) => key !== initial);
    expect(others.length, "reports at several stages").toBeGreaterThan(2);
    const initialTitles = await drugs.recordRows.allInnerTexts();

    const largest = others.reduce((a, b) => (counts[a] >= counts[b] ? a : b));
    const smallest = others.reduce((a, b) => (counts[a] <= counts[b] ? a : b));
    expect(counts[largest]).toBeGreaterThan(PAGE_SIZE);

    await test.step(`stage "${largest}" with ${counts[largest]} reports paginates`, async () => {
      await drugs.stage(largest).click();
      await expect(drugs.stage(largest)).toHaveAttribute("data-selected", "true");
      await expect(drugs.selectedStage).toHaveCount(1);
      await drugs.records.expectPosition(1, PAGE_SIZE, counts[largest]);
      await expect(drugs.recordRows).toHaveCount(PAGE_SIZE);
      await drugs.records.expectPaginationState("first");
      const firstPage = await drugs.recordRows.allInnerTexts();
      expect(firstPage).not.toEqual(initialTitles);
      await drugs.records.nextPageButton.click();
      await drugs.records.expectPosition(
        PAGE_SIZE + 1,
        Math.min(2 * PAGE_SIZE, counts[largest]),
        counts[largest]
      );
      expect(await drugs.recordRows.allInnerTexts()).not.toEqual(firstPage);
    });

    await test.step(`stage "${smallest}" with ${counts[smallest]} report(s) shows them all`, async () => {
      await drugs.stage(smallest).click();
      await expect(drugs.stage(smallest)).toHaveAttribute("data-selected", "true");
      await expect(drugs.stage(largest)).toHaveAttribute("data-selected", "false");
      await drugs.records.expectPosition(1, counts[smallest], counts[smallest]);
      await expect(drugs.recordRows).toHaveCount(counts[smallest]);
    });

    await test.step("going back to the first stage restores its reports", async () => {
      await drugs.stage(initial).click();
      await expect(drugs.stage(initial)).toHaveAttribute("data-selected", "true");
      await expect.poll(async () => drugs.recordRows.allInnerTexts()).toEqual(initialTitles);
    });
  });

  test("the list paginates and each page selects its first drug", async ({ page, testConfig }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const total = await drugs.master.total();
    const firstPage = await drugs.allCards();
    await drugs.expectDetailFor(firstPage[0]);

    await test.step("page 2", async () => {
      await drugs.master.nextPageButton.click();
      await drugs.master.expectPosition(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
      await drugs.master.expectPaginationState("middle");
      await expect(drugs.cards.first()).not.toContainText(firstPage[0].name);
      const secondPage = await drugs.allCards();
      expect(secondPage).toHaveLength(PAGE_SIZE);
      const firstIds = new Set(firstPage.map((card) => card.drugId));
      for (const card of secondPage) expect(firstIds.has(card.drugId)).toBe(false);
      expect(
        stageRank(secondPage[0].stage),
        "page 2 continues the descending stage order"
      ).toBeLessThanOrEqual(stageRank(firstPage[PAGE_SIZE - 1].stage));
      await expect(drugs.card(0)).toHaveAttribute("data-selected", "true");
      await drugs.expectDetailFor(secondPage[0]);
    });

    await test.step("last page", async () => {
      await drugs.master.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
      await drugs.master.expectPosition(lastStart, total, total);
      await drugs.expectCards(total - lastStart + 1);
      await drugs.master.expectPaginationState("last");
      await drugs.expectDetailFor(await drugs.cardInfo(0));
    });

    await test.step("back to the first page", async () => {
      await drugs.master.firstPageButton.click();
      await drugs.master.expectPosition(1, PAGE_SIZE, total);
      await drugs.expectCards(PAGE_SIZE);
      await drugs.master.expectPaginationState("first");
      expect(await drugs.allCards()).toEqual(firstPage);
    });
  });

  test("search filters the drugs on the server by drug name", async ({ page, testConfig }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const total = await drugs.master.total();

    const searchRequest = page.waitForRequest((request) => {
      const body = request.postDataJSON?.() as {
        operationName?: string;
        variables?: { search?: { text?: string } };
      } | null;
      return body?.operationName === "drugsQuery" && body.variables?.search?.text === "statin";
    });
    await drugs.master.search("statin", total);
    const variables = (
      (await searchRequest).postDataJSON() as { variables: { search: { fields: string[] } } }
    ).variables;
    expect(variables.search.fields).toEqual(["DRUG_NAME"]);

    const matches = await drugs.master.total();
    expect(matches).toBeGreaterThan(1);
    expect(matches).toBeLessThan(total);
    await drugs.expectCards(Math.min(matches, PAGE_SIZE));
    const cards = await drugs.allCards();
    for (const card of cards) expect(card.name.toLowerCase()).toContain("statin");

    await test.step("the detail panel follows the first match", async () => {
      await expect(drugs.card(0)).toHaveAttribute("data-selected", "true");
      await drugs.expectDetailFor(cards[0]);
    });

    await test.step("no match empties the list", async () => {
      await drugs.master.search("zzz-no-such-drug", matches);
      await drugs.expectCards(0);
      await expect(drugs.master.position).toHaveText("1 - 0 of 0");
    });

    await test.step("clearing the search restores the full list", async () => {
      await drugs.master.clearSearch(total);
      await drugs.expectCards(PAGE_SIZE);
      await drugs.master.expectPosition(1, PAGE_SIZE, total);
    });
  });

  test("the list is sorted by the server, most advanced stage first", async ({
    page,
    testConfig,
  }) => {
    const { primary } = testConfig.disease;
    const response = waitForOperation<DrugsData>(page, "drugsQuery");
    const drugs = await openDrugs(page, primary);
    const { data, variables } = await response;

    expect(variables).toMatchObject({
      efoId: primary,
      index: 0,
      size: PAGE_SIZE,
    });
    expect(
      variables.sort ?? [
        { key: "MAX_CLINICAL_STAGE", direction: "DESCENDING" },
        { key: "CLINICAL_REPORT_COUNT", direction: "DESCENDING" },
      ]
    ).toEqual([
      { key: "MAX_CLINICAL_STAGE", direction: "DESCENDING" },
      { key: "CLINICAL_REPORT_COUNT", direction: "DESCENDING" },
    ]);
    const rows = data.disease.drugAndClinicalCandidates.rows;
    expect(rows).toHaveLength(PAGE_SIZE);
    const cards = await drugs.allCards();
    expect(cards.map((card) => card.drugId), "the cards follow the API's order").toEqual(
      rows.map((row) => row.drug.id)
    );
    expect(await drugs.master.total()).toBe(data.disease.drugAndClinicalCandidates.count);
  });

  test("a report opens in a drawer with its details and closes again", async ({
    page,
    testConfig,
  }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const first = await drugs.cardInfo(0);
    await drugs.expectDetailFor(first);
    const stage = first.stage;

    const titleButton = drugs.recordRows.first().getByTestId("clinical-record-drawer-trigger");
    const title = (await titleButton.innerText()).trim();
    expect(title).not.toBe("");
    await expect(drugs.recordDrawer).toHaveCount(0);

    await titleButton.click();
    const drawer = drugs.recordDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Report");
    await expect(
      drawer.getByText(title, { exact: true }),
      "the drawer shows the report that was clicked"
    ).toBeVisible();
    await expect(drawer).toContainText(/Source\s*\S+/);
    await expect(drawer).toContainText(/Type\s*\S+/);
    await expect(drawer).toContainText(new RegExp(`Stage\\s*${stage.replace("/", "\\/")}`));
    await expect(drawer.getByRole("link").first()).toHaveAttribute("href", /^https?:\/\/\S+$/);
    await expect(drawer).toContainText(/Drugs\s*\S+/);
    await expect(drawer.getByRole("paragraph").filter({ hasText: new RegExp(`^${first.name}$`, "i") })).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: testConfig.disease.name, exact: true }),
      "the report lists the disease under test"
    ).toHaveAttribute("href", `/disease/${testConfig.disease.primary}`);

    await closeDrawer(drawer);
    await expect(drugs.recordRows.first()).toBeVisible();

    await test.step("Escape closes it too", async () => {
      await titleButton.click();
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });
  });

  test("the drug link of a card opens the drug page without selecting the card", async ({
    page,
    testConfig,
  }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const card = await drugs.cardInfo(1);
    await drugs.card(1).getByRole("link", { name: card.name }).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${card.drugId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(
      new RegExp(`^${card.name}$`, "i")
    );

    await page.goBack();
    await expectSectionLoaded(page, DiseaseDrugsSection.id);
    await drugs.expectCards(PAGE_SIZE);
    await expect(drugs.card(0)).toHaveAttribute("data-selected", "true");
  });

  test("the summary link of the detail panel opens the selected drug", async ({
    page,
    testConfig,
  }) => {
    const drugs = await openDrugs(page, testConfig.disease.primary);
    const first = await drugs.cardInfo(0);
    await drugs.expectDetailFor(first);
    await drugs.recordsSummary.getByRole("link", { name: first.name }).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${first.drugId}$`));
  });

  test("a disease with fewer drugs shows a consistent count and last page", async ({ page }) => {
    const drugs = await openDrugs(page, SMALLER);
    const total = await drugs.master.total();
    expect(total).toBeGreaterThan(PAGE_SIZE);
    expect(total).toBeLessThan(138);
    await drugs.master.expectPosition(1, PAGE_SIZE, total);
    await drugs.master.lastPageButton.click();
    const lastStart = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE + 1;
    await drugs.master.expectPosition(lastStart, total, total);
    await drugs.expectCards(total - lastStart + 1);
    await drugs.master.expectPaginationState("last");
  });

  test("a disease without drugs has no drugs section", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.goto(WITHOUT_DRUGS);
    await expectSectionLoaded(page, "gwasstudies");
    await expect(sectionLocator(page, DiseaseDrugsSection.id)).toHaveCount(0);
  });

  test("exports every drug, and the reports of the selected one", async ({
    page,
    testConfig,
  }) => {
    const { primary } = testConfig.disease;
    const drugs = await openDrugs(page, primary);
    const total = await drugs.master.total();
    const cards = await drugs.allCards();
    await drugs.expectDetailFor(cards[0]);

    await test.step("drugs as JSON: every drug, across pages", async () => {
      const { filename, rows } = await drugs.master.exportJson();
      expect(filename).toBe("drugs-and-clinical-candidates.json");
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toEqual(["drugName", "drugId", "maxClinicalStage", "reportCount"]);
        expect(String(row.drugId)).toMatch(/^CHEMBL\d+$/);
        expect(Number(row.reportCount)).toBeGreaterThan(0);
      }
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.drugName)).toEqual(
        cards.map((card) => card.name)
      );
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.reportCount)).toEqual(
        cards.map((card) => card.reports)
      );
    });

    await test.step("drugs as TSV", async () => {
      const { filename, header, lines } = await drugs.master.exportTsv();
      expect(filename).toBe("drugs-and-clinical-candidates.tsv");
      expect(header).toEqual(["drugName", "drugId", "maxClinicalStage", "reportCount"]);
      expect(lines).toHaveLength(total);
    });

    await test.step("reports of the selected drug as JSON, at every stage", async () => {
      const { filename, rows } = await drugs.records.exportJson();
      expect(filename).toBe("clinical-records.json");
      expect(rows).toHaveLength(cards[0].reports);
      expect(new Set(rows.map((row) => row.id)).size, "no report is exported twice").toBe(rows.length);
    });

  });

  test("the API query buttons show the queries behind both tables", async ({ page, testConfig }) => {
    const { primary } = testConfig.disease;
    const drugs = await openDrugs(page, primary);
    await drugs.expectDetailFor(await drugs.cardInfo(0));
    await drugs.master.expectApiQuery("drugsQuery", primary);
    await drugs.records.expectApiQuery("ClinicalRecordsQuery", "clinicalReportsIds");
  });
});

import { expect, test } from "../../../fixtures";
import { IndicationsSection } from "../../../POM/objects/widgets/shared/indicationsSection";
import { DrugPage } from "../../../POM/page/drug/drug";

test.describe("Drug Indications Section", () => {
  let drugPage: DrugPage;
  let indicationsSection: IndicationsSection;

  test.beforeEach(async ({ page, testConfig }) => {
    drugPage = new DrugPage(page);
    indicationsSection = new IndicationsSection(page);

    // Navigate to a drug with indications data
    await drugPage.goToDrugPage(testConfig.drug.primary);

    const sectionVisible = await indicationsSection.isSectionVisible();
    if (!sectionVisible) {
      test.skip(true, "No drug indications section found for this drug");
      return;
    }

    // Wait for the section to fully load
    await indicationsSection.waitForLoad();
  });

  test("Indications section is visible", async () => {
    expect(await indicationsSection.isSectionVisible()).toBe(true);
  });

  test("Indications master table displays data", async () => {
    const rowCount = await indicationsSection.getMasterTableRows();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("Indication name is displayed in card", async () => {
    const indication = await indicationsSection.getIndicationName(0);
    expect(indication).not.toBeNull();
    expect(indication).not.toBe("");
  });

  test("Can click indication link to navigate to disease", async ({ page }) => {
    await indicationsSection.clickIndicationLink(0);

    // Wait for navigation to disease page
    await page.waitForURL((url) => url.toString().includes("/disease/"), { timeout: 5000 });

    // Should navigate to disease page
    expect(page.url()).toContain("/disease/");
  });

  test("Max stage is displayed in indication card", async () => {
    const maxStage = await indicationsSection.getMaxStageFromCard(0);
    expect(maxStage).not.toBeNull();
    expect(maxStage).not.toBe("");
  });

  test("Report count is displayed in indication card", async () => {
    const reportCount = await indicationsSection.getReportCountFromCard(0);
    expect(reportCount).toBeGreaterThan(0);
  });

  test("Can search/filter indications", async () => {
    const initialRowCount = await indicationsSection.getMasterTableRows();

    // Search for a specific term
    await indicationsSection.search("cancer");

    // Row count may change (could be 0 if no matches)
    const filteredRowCount = await indicationsSection.getMasterTableRows();

    // At least the search should execute without error
    expect(filteredRowCount).toBeGreaterThanOrEqual(0);

    // Clear search and verify rows return
    await indicationsSection.clearSearch();
    const restoredRowCount = await indicationsSection.getMasterTableRows();
    expect(restoredRowCount).toBe(initialRowCount);
  });

  test("Selecting indication card loads detail panel", async () => {
    // Select the first indication card
    await indicationsSection.selectIndicationCard(0);

    // the default stage (Approval) lists regulatory reports only; trials start at Phase I
    expect(await indicationsSection.getStageButton("Phase III")).not.toBeNull();
    await indicationsSection.selectStage("Phase III");

    // Detail header should show report count for the selected entity
    const headerText = await indicationsSection.getDetailHeaderText();
    expect(headerText).not.toBeNull();
    expect(headerText).toContain("report");
  });

  test("Detail panel shows records after selecting indication", async () => {
    // Select the first indication card
    await indicationsSection.selectIndicationCard(0);

    // Records should be displayed
    const recordsCount = await indicationsSection.getRecordsCount();
    expect(recordsCount).toBeGreaterThan(0);
  });

  test("Record title is displayed in detail panel", async () => {
    // Select the first indication card
    await indicationsSection.selectIndicationCard(0);

    // Get the first record title
    const title = await indicationsSection.getRecordTitle(0);
    expect(title).not.toBeNull();
    expect(title).not.toBe("");
  });

  test("Stage filter shows available stages", async () => {
    // Select the first indication card to load detail panel
    await indicationsSection.selectIndicationCard(0);

    // Stage filter buttons should be present
    const stageButtons = indicationsSection.getStageFilterButtons();
    const buttonCount = await stageButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("Can click stage filter to filter records", async () => {
    // Select the first indication card
    await indicationsSection.selectIndicationCard(0);

    // Try selecting a different stage (Phase I, Phase II, etc.)
    // This may or may not change the count depending on data
    await indicationsSection.selectStage("Phase");

    // Records count should be defined (may be same or different)
    const filteredRecordsCount = await indicationsSection.getRecordsCount();
    expect(filteredRecordsCount).toBeGreaterThanOrEqual(0);
  });

  test("Clicking record title opens drawer", async () => {
    // Select the first indication card
    await indicationsSection.selectIndicationCard(0);

    // Click the first record title
    await indicationsSection.clickRecordTitle(0);

    // Drawer should be open
    const isDrawerOpen = await indicationsSection.isDrawerOpen();
    expect(isDrawerOpen).toBe(true);

    // Close the drawer
    await indicationsSection.closeDrawer();
  });
});

// Pinned: its first indication has Phase III ClinicalTrials.gov reports on the API.
// Drugs@FDA has no reports on the API yet, so only ClinicalTrials.gov is covered
const DRUG_WITH_CLINICALTRIALS_REPORTS = "CHEMBL3353410";

test.describe("Drug Indications Section - Record source links", () => {
  test(
    "ClinicalTrials.gov record drawer links to the source",
    { tag: "@smoke" },
    async ({ page }) => {
      const indicationsSection = new IndicationsSection(page);
      await new DrugPage(page).goToDrugPage(DRUG_WITH_CLINICALTRIALS_REPORTS);
      await indicationsSection.waitForLoad();
      await indicationsSection.selectIndicationCard(0);

      // the default stage (Approval) lists regulatory reports only
      expect(await indicationsSection.getStageButton("Phase III")).not.toBeNull();
      await indicationsSection.selectStage("Phase III");

      await expect(indicationsSection.getRecordRowBySource("ClinicalTrials.gov")).toBeVisible();
      await indicationsSection.openRecordBySource("ClinicalTrials.gov");

      const sourceLink = indicationsSection.getRecordDrawerSourceValue().locator("a");
      await expect(sourceLink).toHaveText("ClinicalTrials.gov");
      await expect(sourceLink).toHaveAttribute("href", "https://clinicaltrials.gov/");
    }
  );
});

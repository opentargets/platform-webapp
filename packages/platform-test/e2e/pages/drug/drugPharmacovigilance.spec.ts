import { expect, test } from "../../../fixtures";
import { PharmacovigilanceSection } from "../../../POM/objects/widgets/shared/adverseEventsSection";
import { DrugPage } from "../../../POM/page/drug/drug";

test.describe("Drug Pharmacovigilance Section", () => {
  let drugPage: DrugPage;
  let Pharmacovigilance: PharmacovigilanceSection;

  test.beforeEach(async ({ page, testConfig }) => {
    drugPage = new DrugPage(page);
    Pharmacovigilance = new PharmacovigilanceSection(page);
    // Navigate to a drug with pharmacovigilance data
    await drugPage.goToDrugPage(testConfig.drug.primary);

    // Check if pharmacovigilance section exists, skip if not
    const sectionVisible = await Pharmacovigilance.isSectionVisible();
    if (!sectionVisible) {
      test.skip(true, "No pharmacovigilance section found for this drug");
      return;
    }

    // Wait for the section to fully load
    await Pharmacovigilance.waitForLoad();
  });

  test("Adverse Events section is visible", async () => {
    expect(await Pharmacovigilance.isSectionVisible()).toBe(true);
  });

  test("Adverse Events table displays data", async () => {
    const rowCount = await Pharmacovigilance.getTableRows();

    expect(rowCount).toBeGreaterThan(0);
  });

  test("Adverse event name is displayed", async () => {
    const eventName = await Pharmacovigilance.getAdverseEventName(0);

    expect(eventName).not.toBeNull();
    expect(eventName).not.toBe("");
  });

  test("Can click adverse event link when available", async ({ page }) => {
    const hasLink = await Pharmacovigilance.hasAdverseEventLink(0);

    if (hasLink) {
      const initialUrl = page.url();
      await Pharmacovigilance.clickAdverseEventLink(0);

      // Wait for navigation
      await page.waitForURL((url) => url.toString() !== initialUrl, { timeout: 5000 });

      // Check that navigation occurred and URL is valid
      const url = page.url();
      expect(url).not.toBe(initialUrl);
      expect(url).toMatch(/^https?:\/\/.+/);
    }
  });

  test("Number of reported events is displayed", async () => {
    const count = await Pharmacovigilance.getReportedEventsCount(0);

    expect(count).not.toBeNull();
    expect(count).not.toBe("");
  });

  test("Log likelihood ratio is displayed", async () => {
    const llr = await Pharmacovigilance.getLogLikelihoodRatio(0);

    expect(llr).not.toBeNull();
    expect(llr).not.toBe("");
  });
});

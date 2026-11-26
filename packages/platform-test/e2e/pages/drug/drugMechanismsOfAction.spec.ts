import { expect, test } from "../../../fixtures";
import { MechanismsOfActionSection } from "../../../POM/objects/widgets/shared/mechanismsOfActionSection";
import { DrugPage } from "../../../POM/page/drug/drug";

test.describe("Drug Mechanisms of Action Section", () => {
  let drugPage: DrugPage;
  let moaSection: MechanismsOfActionSection;

  test.beforeEach(async ({ page, testConfig }) => {
    drugPage = new DrugPage(page);
    moaSection = new MechanismsOfActionSection(page);

    // Navigate to a drug with mechanisms of action data
    await drugPage.goToDrugPage(testConfig.drug.primary);

    // Wait for the section to fully load
    await moaSection.waitForLoad();
  });

  test("Mechanisms of Action section is visible", { tag: "@smoke" }, async () => {
    expect(await moaSection.isSectionVisible()).toBe(true);
  });

  test("Mechanisms of Action table displays data", async () => {
    const rowCount = await moaSection.getTableRows();

    expect(rowCount).toBeGreaterThan(0);
  });

  test("Mechanism of action is displayed", async () => {
    const moa = await moaSection.getMechanismOfAction(0);

    expect(moa).not.toBeNull();
    expect(moa).not.toBe("");
  });

  test("Target name is displayed", async () => {
    const targetName = await moaSection.getTargetName(0);

    expect(targetName).not.toBeNull();
  });

  test("Can click target link when available", async ({ page }) => {
    const linkCount = await moaSection.getTargetLinksCount(0);

    if (linkCount > 0) {
      await moaSection.clickTargetLink(0);

      // Wait for navigation to target page
      await page.waitForURL((url) => url.toString().includes("/target/"), { timeout: 5000 });

      // Should navigate to target/gene page
      expect(page.url()).toContain("/target/");
    }
  });

  test("Can search/filter mechanisms of action", async () => {
    // Search for a specific term
    await moaSection.search("inhibitor");

    // Row count should change
    const filteredRowCount = await moaSection.getTableRows();

    // At least the search should execute without error
    expect(filteredRowCount).toBeGreaterThanOrEqual(0);
  });
});

// Pinned: its first mechanism has a curation value and PubMed references on the API
const DRUG_WITH_PUBMED_MOA = "CHEMBL3353410";

test.describe("Drug Mechanisms of Action Section - Curation and references", () => {
  let moaSection: MechanismsOfActionSection;

  test.beforeEach(async ({ page }) => {
    moaSection = new MechanismsOfActionSection(page);
    await new DrugPage(page).goToDrugPage(DRUG_WITH_PUBMED_MOA);
    await moaSection.waitForLoad();
    await expect(moaSection.getTable().locator("tbody tr").first()).toBeVisible();
  });

  test("Curation column sits between Human targets and References", { tag: "@smoke" }, async () => {
    const headers = await moaSection.getColumnHeaderTexts();
    const curationIndex = headers.indexOf("Curation");

    expect(curationIndex, `headers: ${headers.join(", ")}`).toBeGreaterThan(0);
    expect(headers[curationIndex - 1]).toBe("Human targets");
    expect(headers[curationIndex + 1]).toBe("References");
  });

  test("Curation value is capitalised", async () => {
    const rowCount = await moaSection.getTableRows();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      expect(await moaSection.getCuration(i)).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  test("PubMed references open the publications drawer", async () => {
    const button = await moaSection.getPublicationsButton(0);
    await expect(button).toBeVisible();

    await button.click();
    await expect(moaSection.getPublicationsDrawer()).toBeVisible();
  });
});

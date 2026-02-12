import { test } from "../../../fixtures";
import { AotfActions } from "../../../POM/objects/widgets/AOTF/aotfActions";
import { AotfTable } from "../../../POM/objects/widgets/AOTF/aotfTable";

test.describe("Disease Page - AOTF Prioritization", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}/associations`);
  });

  test("Can switch to target prioritisation view and see data", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    const aotfTable = new AotfTable(page);

    // Switch to prioritisation view
    await aotfActions.switchToPrioritisationView();
    await aotfTable.waitForTableLoad();

    // Verify table is visible
    await test.expect(aotfTable.getTable()).toBeVisible();

    // Verify rows are loaded
    const rowCount = await aotfTable.getRowCount();
    test.expect(rowCount).toBeGreaterThan(0);

    // Verify first row has data
    const firstRowName = await aotfTable.getEntityName(0);
    test.expect(firstRowName).toBeTruthy();
  });
});

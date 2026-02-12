import { test } from "../../../fixtures";
import { AotfActions } from "../../../POM/objects/widgets/AOTF/aotfActions";

test.describe("Disease Page - AOTF Actions", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}/associations`);
  });

  test("Can search through targets in the disease associations page", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    await aotfActions.searchByName("ADRB1");
    const filterValue = await aotfActions.getNameFilterValue();
    test.expect(filterValue).toBe("ADRB1");
  });

  test("Can toggle advance filters", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    await aotfActions.openFacetsSearch();
    const isOpen = await aotfActions.isFacetsPopoverOpen();
    test.expect(isOpen).toBe(true);
  });

  test("Can toggle column options", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    await aotfActions.openColumnOptions();
    const isActive = await aotfActions.isColumnOptionsActive();
    test.expect(isActive).toBe(true);
  });

  test("Can toggle export options", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    await aotfActions.openExportMenu();
    const isActive = await aotfActions.isExportMenuOpen();
    test.expect(isActive).toBe(true);
  });

  test("Can toggle between association and target prioritization options", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    await aotfActions.switchToAssociationsView();
    const currentView = await aotfActions.getCurrentDisplayMode();
    test.expect(currentView).toBe("associations");

    await aotfActions.switchToPrioritisationView();
    const newView = await aotfActions.getCurrentDisplayMode();
    test.expect(newView).toBe("prioritisations");
  });
});

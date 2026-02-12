import { test } from "../../../fixtures";
import { AotfActions } from "../../../POM/objects/widgets/AOTF/aotfActions";
import { AotfTable } from "../../../POM/objects/widgets/AOTF/aotfTable";

test.describe("Disease Page - AOTF Table", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}/associations`);
  });

  test("targets are displayed in the associations table", { tag: "@smoke" }, async ({ page }) => {
    const aotfTable = new AotfTable(page);

    // Wait for table to load
    await aotfTable.waitForTableLoad();

    // Verify table is visible
    await test.expect(aotfTable.getTable()).toBeVisible();

    // Verify header is present
    await test.expect(aotfTable.getTargetOrDiseaseHeader()).toBeVisible();
    const headerText = await aotfTable.getHeaderText("table-header-name");
    test.expect(headerText).toBe("Target");

    // Verify rows are loaded
    const rowCount = await aotfTable.getRowCount();
    test.expect(rowCount).toBeGreaterThan(0);

    // Verify first row has data
    const firstRowName = await aotfTable.getEntityName(0);
    test.expect(firstRowName).toBeTruthy();
  });

  test("can sort by GWAS score in the associations table", async ({ page }) => {
    const aotfTable = new AotfTable(page);
    const aotfActions = new AotfActions(page);
    await aotfTable.waitForTableLoad();

    // Verify no sort filter is active initially (default sort by Association Score)
    const initialSortActive = await aotfActions.hasSortFilter();
    test.expect(initialSortActive).toBe(false);

    // Click to sort by a different column (GWAS associations)
    await aotfTable.sortByColumn("GWAS associations");
    await page.waitForTimeout(1000); // Wait for sort to complete

    // Verify sort filter is now active in the ActiveFiltersPanel
    const sortActive = await aotfActions.hasSortFilter();
    test.expect(sortActive).toBe(true);

    // Verify the sort filter shows the correct column name
    const sortFilterText = await aotfActions.getSortFilterText();
    test.expect(sortFilterText).toContain("GWAS associations");
  });

  test("can paginate through the associations table", async ({ page }) => {
    const aotfTable = new AotfTable(page);
    await aotfTable.waitForTableLoad();

    // Get first page data
    const firstPageFirstRow = await aotfTable.getEntityName(0);

    // Go to next page
    await aotfTable.clickNextPage();
    await page.waitForTimeout(1000); // Wait for new data to load

    // Get second page data
    const secondPageFirstRow = await aotfTable.getEntityName(0);

    // First row on different pages should be different
    test.expect(firstPageFirstRow).not.toBe(secondPageFirstRow);

    // Go back to previous page
    await aotfTable.clickPreviousPage();
    await page.waitForTimeout(1000);

    const backToFirstRow = await aotfTable.getEntityName(0);
    test.expect(backToFirstRow).toBe(firstPageFirstRow);
  });

  test("can change page size", async ({ page }) => {
    const aotfTable = new AotfTable(page);
    await aotfTable.waitForTableLoad();

    // Change page size to 25
    await aotfTable.selectPageSize("25");
    await page.waitForTimeout(1000);

    // Verify more rows are displayed (up to 25)
    const rowCount = await aotfTable.getRowCount();
    test.expect(rowCount).toBeGreaterThanOrEqual(10); // Default is usually 10
  });

  test("can filter targets by name", async ({ page }) => {
    const aotfActions = new AotfActions(page);
    const aotfTable = new AotfTable(page);

    await aotfTable.waitForTableLoad();

    // Search for a specific target
    await aotfActions.searchByName("IL6");
    await page.waitForTimeout(1000); // Wait for filter + debounce

    // Verify filtered results contain the search term
    const firstRowName = await aotfTable.getEntityName(0);
    test.expect(firstRowName?.toLowerCase()).toContain("il6");
  });
});

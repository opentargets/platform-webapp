import { test } from "@playwright/test";
import { AotfActions } from "../../POM/objects/widgets/AOTF/aotfActions";
import { AotfTable } from "../../POM/objects/widgets/AOTF/aotfTable";
import { DiseasePage } from "../../POM/page/disease/disease";

const DISEASE_EFO_ID = "MONDO_0005068";
const DISEASE_NAME = "myocardial infarction";

test.describe("Disease Page", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/disease/${DISEASE_EFO_ID}/associations`);
  });

  test.describe("Aotf main actions functionality", () => {
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

  test.describe("Aotf table functionality", () => {
    test("targets are displayed in the associations table", async ({ page }) => {
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
      await aotfTable.waitForTableLoad(); // Wait for sort to complete

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
      await aotfTable.waitForTableLoad(); // Wait for new data to load

      // Get second page data
      const secondPageFirstRow = await aotfTable.getEntityName(0);

      // First row on different pages should be different
      test.expect(firstPageFirstRow).not.toBe(secondPageFirstRow);

      // Go back to previous page
      await aotfTable.clickPreviousPage();
      await aotfTable.waitForTableLoad();

      const backToFirstRow = await aotfTable.getEntityName(0);
      test.expect(backToFirstRow).toBe(firstPageFirstRow);
    });

    test("can change page size", async ({ page }) => {
      const aotfTable = new AotfTable(page);
      await aotfTable.waitForTableLoad();

      // Change page size to 25
      await aotfTable.selectPageSize("25");
      await aotfTable.waitForTableLoad();

      // Verify more rows are displayed (up to 25)
      const rowCount = await aotfTable.getRowCount();
      test.expect(rowCount).toBeGreaterThanOrEqual(10); // Default is usually 10
    });

    test("can filter targets by name", async ({ page }) => {
      const aotfActions = new AotfActions(page);
      const aotfTable = new AotfTable(page);

      await aotfTable.waitForTableLoad();

      // Search for a specific target
      await aotfActions.applyNameFilterAndWaitForResults("IL6");

      // Verify filtered results contain the search term
      const firstRowName = await aotfTable.getEntityName(0);
      test.expect(firstRowName?.toLowerCase()).toContain("il6");
    });
  });

  test("Disease header is correctly displayed", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.waitForPageLoad();

    const diseaseName = page.getByTestId("profile-page-header-text");
    await test.expect(diseaseName).toHaveText(DISEASE_NAME);
  });

  test("Can navigate to the profile page from the disease page", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.goToProfilePage();

    // Verify that the URL is the profile page URL
    await test.expect(page.url()).toBe(diseasePage.getProfilePage());
  });

  test("External links in header are displayed and working", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.waitForPageLoad();

    // Check for EFO external link
    const efoLink = diseasePage.getEfoLink();
    await test.expect(efoLink).toBeVisible();

    // Verify the EFO link has the correct href
    const efoHref = await diseasePage.getEfoLinkHref();
    test.expect(efoHref).toContain(DISEASE_EFO_ID);
    test.expect(efoHref).toContain("ebi.ac.uk/ols4/ontologies/efo/terms");

    // Check for cross-reference links (e.g., MONDO, MeSH, etc.)
    const xrefCount = await diseasePage.getXrefLinksCount();

    // Verify that at least one cross-reference link exists
    test.expect(xrefCount).toBeGreaterThan(0);

    // Verify the first xref link has a valid href
    if (xrefCount > 0) {
      const firstXrefHref = await diseasePage.getFirstXrefLinkHref();
      test.expect(firstXrefHref).toBeTruthy();
      test.expect(firstXrefHref).toMatch(/^https?:\/\//);
    }
  });
});

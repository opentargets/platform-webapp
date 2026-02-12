import { test } from "../../../fixtures";
import { EvidenceSection } from "../../../POM/objects/components/EvidenceSection/evidenceSection";
import { AotfActions } from "../../../POM/objects/widgets/AOTF/aotfActions";
import { AotfTable } from "../../../POM/objects/widgets/AOTF/aotfTable";

test.describe("Disease Page - AOTF Evidence Widgets", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}/associations`);
  });

  test("if a target has data, the corresponding widget is shown", async ({ page }) => {
    const aotfTable = new AotfTable(page);
    const evidenceSection = new EvidenceSection(page);
    await aotfTable.waitForTableLoad();

    // Find the first row that has data cells with score > 0
    const rowIndex = await aotfTable.findFirstRowWithData();
    test.expect(rowIndex).not.toBeNull();

    if (rowIndex === null) {
      test.skip(true, "No rows with data found");
      return;
    }

    // Get all data cells with scores in that row
    const dataCells = await aotfTable.getDataCellsWithScores(rowIndex);
    test.expect(dataCells.length).toBeGreaterThan(0);

    // Filter out non-evidence columns
    // 'score' = total association score (not an evidence section)
    // 'maxClinicalTrialPhase', 'tractability' = prioritization metrics (link to target page sections)
    const nonEvidenceColumns = ["score"];
    const cellsToTest = dataCells.filter((cell) => !nonEvidenceColumns.includes(cell.columnId));

    for (const cell of cellsToTest) {
      // Click on the data cell to open the evidence section
      await aotfTable.clickDataCell(rowIndex, cell.columnId);

      // Wait for section to load (no loader, no error)
      await evidenceSection.waitForSectionLoad(cell.columnId);

      // Verify that an evidence section is visible
      const hasSections = await evidenceSection.hasAnyEvidenceSection();
      test.expect(hasSections).toBe(true);

      // Verify the specific section for this data source is visible
      // The section ID is typically the data source ID (e.g., 'gwas', 'eva', etc.)
      const isVisible = await evidenceSection.isEvidenceSectionVisible(cell.columnId);
      test.expect(isVisible).toBe(true);

      // Verify no loader is visible
      const hasLoader = await evidenceSection.isLoaderVisible();
      test.expect(hasLoader).toBe(false);

      // Click the same cell again to close/toggle the section
      await aotfTable.clickDataCell(rowIndex, cell.columnId);
      await page.waitForTimeout(300);
    }
  });

  test("specified genes have correct evidence widgets for their data cells", async ({
    page,
    testConfig,
  }) => {
    const aotfTable = new AotfTable(page);
    const aotfActions = new AotfActions(page);
    const evidenceSection = new EvidenceSection(page);
    const genesToTest = testConfig.disease.aotfGenes || [];

    if (genesToTest.length === 0) {
      test.skip(true, "No genes specified in test config");
      return;
    }

    for (const geneSymbol of genesToTest) {
      // Search for the specific gene
      await aotfActions.applyNameFilterAndWaitForResults(geneSymbol);

      // Wait for table to load with filtered results
      await aotfTable.waitForTableLoad();

      // Find the row for this gene
      const rowIndex = await aotfTable.findRowIndexByGeneSymbol(geneSymbol);

      if (rowIndex === null) {
        test.fail(true, `Gene ${geneSymbol} not found in table`);
        continue;
      }

      // Get all data cells with scores for this gene
      const dataCells = await aotfTable.getDataCellsWithScores(rowIndex);

      if (dataCells.length === 0) {
        test.fail(true, `Gene ${geneSymbol} has no data cells with scores`);
        continue;
      }

      // Filter out non-evidence columns
      const nonEvidenceColumns = ["score"];
      const cellsToTest = dataCells.filter((cell) => !nonEvidenceColumns.includes(cell.columnId));

      if (cellsToTest.length === 0) {
        test.fail(true, `Gene ${geneSymbol} has no evidence data cells`);
        continue;
      }

      for (const cell of cellsToTest) {
        // Click on the data cell to open the evidence section
        await aotfTable.clickDataCell(rowIndex, cell.columnId);

        // Wait for section to load
        await evidenceSection.waitForSectionLoad(cell.columnId);

        // Verify that an evidence section is visible
        const hasSections = await evidenceSection.hasAnyEvidenceSection();
        test
          .expect(
            hasSections,
            `Gene ${geneSymbol} - ${cell.columnId}: Should have evidence sections`
          )
          .toBe(true);

        // Verify the specific section for this data source is visible
        const isVisible = await evidenceSection.isEvidenceSectionVisible(cell.columnId);
        test
          .expect(
            isVisible,
            `Gene ${geneSymbol} - ${cell.columnId}: Evidence section should be visible`
          )
          .toBe(true);

        // Verify no loader is visible
        const hasLoader = await evidenceSection.isLoaderVisible();
        test
          .expect(hasLoader, `Gene ${geneSymbol} - ${cell.columnId}: Loader should not be visible`)
          .toBe(false);

        // Click the same cell again to close/toggle the section
        await aotfTable.clickDataCell(rowIndex, cell.columnId);

        // Wait for evidence section to close
        await evidenceSection.waitForLoaderToDisappear();
      }

      // Clear the search filter for next gene
      await aotfActions.clearNameFilter();

      // Wait for table to reload with all results
      await aotfTable.waitForTableLoad();
    }
  });

  test("specified genes in target prioritization view have correct evidence widgets", async ({
    page,
    testConfig,
  }) => {
    const aotfTable = new AotfTable(page);
    const aotfActions = new AotfActions(page);
    const evidenceSection = new EvidenceSection(page);
    const genesToTest = testConfig.disease.aotfGenes || [];

    // Map prioritization column IDs to their section IDs
    const prioritizationColumnToSection: Record<string, string> = {
      maxClinicalTrialPhase: "knownDrugs",
      isInMembrane: "subcellularLocation",
      isSecreted: "subcellularLocation",
      hasLigand: "tractability",
      hasSmallMoleculeBinder: "tractability",
      hasPocket: "tractability",
      mouseOrthologMaxIdentityPercentage: "compGenomics",
      hasHighQualityChemicalProbes: "chemicalProbes",
      mouseKOScore: "mousePhenotypes",
      geneticConstraint: "geneticConstraint",
      geneEssentiality: "depMapEssentiality",
      hasSafetyEvent: "safety",
      isCancerDriverGene: "cancerHallmarks",
      paralogMaxIdentityPercentage: "compGenomics",
      tissueSpecificity: "expressions",
      tissueDistribution: "expressions",
    };

    if (genesToTest.length === 0) {
      test.skip(true, "No genes specified in test config");
      return;
    }

    // Switch to target prioritization view
    await aotfActions.switchToPrioritisationView();
    await aotfTable.waitForTableLoad();

    for (const geneSymbol of genesToTest) {
      // Search for the specific gene
      await aotfActions.applyNameFilterAndWaitForResults(geneSymbol);

      // Wait for table to load with filtered results
      await aotfTable.waitForTableLoad();

      // Find the row for this gene
      const rowIndex = await aotfTable.findRowIndexByGeneSymbol(geneSymbol);

      if (rowIndex === null) {
        test.fail(true, `Gene ${geneSymbol} not found in prioritization table`);
        continue;
      }

      // Get all data cells with scores for this gene
      const dataCells = await aotfTable.getDataCellsWithScores(rowIndex);

      if (dataCells.length === 0) {
        test.fail(true, `Gene ${geneSymbol} has no data cells with scores in prioritization view`);
        continue;
      }

      // Filter out non-evidence columns
      const nonEvidenceColumns = ["score"];
      const cellsToTest = dataCells.filter((cell) => !nonEvidenceColumns.includes(cell.columnId));

      if (cellsToTest.length === 0) {
        test.fail(true, `Gene ${geneSymbol} has no evidence data cells in prioritization view`);
        continue;
      }

      for (const cell of cellsToTest) {
        // Click on the data cell to open the evidence section
        await aotfTable.clickDataCell(rowIndex, cell.columnId);

        // Map the column ID to the section ID for prioritization columns
        const sectionId = prioritizationColumnToSection[cell.columnId] || cell.columnId;

        // Wait for section to load
        await evidenceSection.waitForSectionLoad(sectionId);

        // Verify that an evidence section is visible
        const hasSections = await evidenceSection.hasAnyEvidenceSection();
        test
          .expect(
            hasSections,
            `Prioritization - Gene ${geneSymbol} - ${cell.columnId} (section: ${sectionId}): Should have evidence sections`
          )
          .toBe(true);

        // Verify the specific section for this data source is visible
        const isVisible = await evidenceSection.isEvidenceSectionVisible(sectionId);
        test
          .expect(
            isVisible,
            `Prioritization - Gene ${geneSymbol} - ${cell.columnId} (section: ${sectionId}): Evidence section should be visible`
          )
          .toBe(true);

        // Verify no loader is visible
        const hasLoader = await evidenceSection.isLoaderVisible();
        test
          .expect(
            hasLoader,
            `Prioritization - Gene ${geneSymbol} - ${cell.columnId} (section: ${sectionId}): Loader should not be visible`
          )
          .toBe(false);

        // Click the same cell again to close/toggle the section
        await aotfTable.clickDataCell(rowIndex, cell.columnId);

        // Wait for evidence section to close
        await evidenceSection.waitForLoaderToDisappear();
      }

      // Clear the search filter for next gene
      await aotfActions.clearNameFilter();

      // Wait for table to reload with all results
      await aotfTable.waitForTableLoad();
    }
  });
});

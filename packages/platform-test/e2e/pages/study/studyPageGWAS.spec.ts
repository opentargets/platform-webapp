import { test } from "../../../fixtures";
import { StudyProfileHeader } from "../../../POM/objects/components/StudyProfileHeader/studyProfileHeader";
import { SharedTraitStudiesSection } from "../../../POM/objects/widgets/Study/sharedTraitStudiesSection";
import { GWASCredibleSetsSection } from "../../../POM/objects/widgets/shared/GWASCredibleSetsSection";
import { StudyPage } from "../../../POM/page/study/study";

test.describe("Study Page - GWAS Study", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const studyPage = new StudyPage(page);
    // await studyPage.goToStudyPageFromGWASWidgetOnDiseasePage(testConfig.disease.primary);
    await studyPage.goToStudyPage(baseURL ?? "", testConfig.study.gwas.primary);
    await studyPage.waitForStudyPageLoad();
  });

  test.describe("GWAS Study Profile Header", () => {
    test(
      "Profile header is visible and displays study information",
      { tag: "@smoke" },
      async ({ page }) => {
        const profileHeader = new StudyProfileHeader(page);
        await profileHeader.waitForProfileHeaderLoad();

        const isVisible = await profileHeader.isProfileHeaderVisible();
        test.expect(isVisible).toBe(true);
      }
    );

    test("Study type is displayed correctly as GWAS", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);

      const studyType = await profileHeader.getStudyType();
      test.expect(studyType).toContain("GWAS");
    });

    test("Reported trait is visible and has content", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);

      const isVisible = await profileHeader.isReportedTraitVisible();
      test.expect(isVisible).toBe(true);

      const reportedTrait = await profileHeader.getReportedTrait();
      test.expect(reportedTrait).toBeTruthy();
      test.expect(reportedTrait?.length).toBeGreaterThan(0);
    });

    test("Disease or phenotype field displays when disease data exists", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isDiseaseFieldVisible();

      if (isVisible) {
        const diseases = await profileHeader.getDiseases();
        test.expect(diseases.length).toBeGreaterThan(0);

        // Verify first disease has text
        test.expect(diseases[0]).toBeTruthy();
      }
    });

    test("Can click disease link and navigate to disease page", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isDiseaseFieldVisible();

      if (isVisible) {
        const diseases = await profileHeader.getDiseases();

        if (diseases.length > 0) {
          // Click on the disease link
          await profileHeader.clickDiseaseLink(0);

          // Wait for navigation to disease page
          await page.waitForURL("**/disease/**");

          // Verify we're on a disease page
          test.expect(page.url()).toContain("/disease/");
        }
      }
    });

    test("Background trait is displayed when available", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isBackgroundTraitVisible();

      if (isVisible) {
        const backgroundTraits = await profileHeader.getBackgroundTraits();
        test.expect(backgroundTraits.length).toBeGreaterThan(0);
      } else {
        test.skip(true, "No background traits available for this study");
      }
    });

    test("Publication information is displayed", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isPublicationVisible();
      console.log("isVisible:", isVisible);
      if (isVisible) {
        const publication = await profileHeader.getPublication();
        test.expect(publication).toBeTruthy();
      }
    });

    test("PubMed ID is displayed when available", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isPubMedVisible();

      if (isVisible) {
        const pubmedId = await profileHeader.getPubMedId();
        test.expect(pubmedId).toBeTruthy();
        test.expect(pubmedId).toMatch(/\d+/); // Should contain numbers
      }
    });

    test("Summary statistics availability is indicated", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const summaryStatsText = await profileHeader.getSummaryStatsText();
      test.expect(summaryStatsText).toBeTruthy();

      // Check if summary stats are available or not
      const isAvailable = await profileHeader.isSummaryStatsAvailable();
      if (isAvailable) {
        test.expect(summaryStatsText).not.toContain("Not Available");

        // Check if there's a popover for detailed stats
        const hasPopover = await profileHeader.hasSummaryStatsPopover();
        if (hasPopover) {
          await profileHeader.clickSummaryStatsPopover();
          await page.waitForTimeout(300);

          // Verify popover appeared
          const popover = page.locator("[data-testid='detail-popover-content']");
          const isPopoverVisible = await popover.isVisible().catch(() => false);
          test.expect(isPopoverVisible).toBe(true);
        }
      } else {
        test.expect(summaryStatsText).toContain("Not Available");
      }
    });

    test("QC warnings are displayed when present", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);

      const hasWarnings = await profileHeader.hasQCWarnings();

      if (hasWarnings) {
        await profileHeader.clickQCWarnings();
        await page.waitForTimeout(300);

        // Verify warnings popover appeared
        const popover = page.locator("[data-testid='detail-popover-content']");
        const isPopoverVisible = await popover.isVisible().catch(() => false);
        test.expect(isPopoverVisible).toBe(true);
      } else {
        test.skip(true, "No QC warnings available for this study");
      }
    });

    test("Sample size is displayed", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isSampleSizeVisible();

      if (isVisible) {
        const sampleSize = await profileHeader.getSampleSize();
        test.expect(sampleSize).toBeTruthy();
      }
    });

    test("N cases is displayed when available", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isNCasesVisible();

      if (isVisible) {
        const nCases = await profileHeader.getNCases();
        test.expect(nCases).toBeTruthy();
        test.expect(nCases).toMatch(/\d/); // Should contain at least one digit
      }
    });

    test("N controls is displayed when available", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isNControlsVisible();

      if (isVisible) {
        const nControls = await profileHeader.getNControls();
        test.expect(nControls).toBeTruthy();
        test.expect(nControls).toMatch(/\d/); // Should contain at least one digit
      }
    });

    test("Analysis flags are displayed when available", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isAnalysisVisible();

      if (isVisible) {
        const analysis = await profileHeader.getAnalysis();
        test.expect(analysis).toBeTruthy();
      }
    });

    test("Population chips display LD reference populations", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const chipCount = await profileHeader.getPopulationChipsCount();

      if (chipCount > 0) {
        // Check first population chip
        const label = await profileHeader.getPopulationChipLabel(0);
        const value = await profileHeader.getPopulationChipValue(0);

        test.expect(label).toBeTruthy();
        test.expect(value).toMatch(/\d+%/); // Should be a percentage

        // Hover to see tooltip
        await profileHeader.hoverPopulationChip(0);
        await page.waitForTimeout(300);
      }
    });

    test("QTL-specific fields are not visible for GWAS studies", async ({ page }) => {
      const profileHeader = new StudyProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      // QTL-specific fields should not be visible
      const projectVisible = await profileHeader.isProjectFieldVisible();
      const affectedGeneVisible = await profileHeader.isAffectedGeneVisible();
      const affectedCellVisible = await profileHeader.isAffectedCellTissueVisible();
      const conditionVisible = await profileHeader.isConditionVisible();

      test.expect(projectVisible).toBe(false);
      test.expect(affectedGeneVisible).toBe(false);
      test.expect(affectedCellVisible).toBe(false);
      test.expect(conditionVisible).toBe(false);
    });
  });

  test.describe("GWAS Credible Sets Section", () => {
    test("GWAS Credible Sets section is visible", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);

      const isVisible = await gwasCredibleSets.isSectionVisible();
      test.expect(isVisible).toBe(true);

      if (isVisible) {
        await gwasCredibleSets.waitForSectionLoad();

        const title = await gwasCredibleSets.getSectionTitle();
        test.expect(title).toBeTruthy();
      }
    });

    test("Credible sets link is clickable in the table", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);
      await gwasCredibleSets.waitForSectionLoad();

      const isTableVisible = await gwasCredibleSets.isTableVisible();

      if (isTableVisible) {
        const rowCount = await gwasCredibleSets.getRowCount();

        if (rowCount > 0) {
          const credibleSetId = await gwasCredibleSets.getCredibleSetId(0);
          test.expect(credibleSetId).toBeTruthy();

          // Click credible set link
          await gwasCredibleSets.clickCredibleSetLink(0);
          await page.waitForURL("**/credible-set/**");

          // Verify we're on the correct credible set page using URL
          test.expect(page.url()).toContain("/credible-set/");
          test.expect(page.url()).toContain(credibleSetId);
        }
      }
    });

    test("GWAS Credible Sets table displays data", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);
      await gwasCredibleSets.waitForSectionLoad();

      const isTableVisible = await gwasCredibleSets.isTableVisible();

      if (isTableVisible) {
        const rowCount = await gwasCredibleSets.getRowCount();
        test.expect(rowCount).toBeGreaterThan(0);

        // Check first row has data
        const firstCellText = await gwasCredibleSets.getCellText(0, 0);
        test.expect(firstCellText).toBeTruthy();
      }
    });

    test("Can click variant link in GWAS Credible Sets table", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);
      await gwasCredibleSets.waitForSectionLoad();

      const isTableVisible = await gwasCredibleSets.isTableVisible();

      if (isTableVisible) {
        const rowCount = await gwasCredibleSets.getRowCount();

        if (rowCount > 0) {
          const variantId = await gwasCredibleSets.getVariantId(0);
          test.expect(variantId).toBeTruthy();

          // Click variant link
          await gwasCredibleSets.clickVariantLink(0);
          await page.waitForURL("**/variant/**");

          // Verify we're on variant page
          test.expect(page.url()).toContain("/variant/");
        }
      }
    });

    test("Can paginate through GWAS Credible Sets table", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);
      await gwasCredibleSets.waitForSectionLoad();

      const isTableVisible = await gwasCredibleSets.isTableVisible();

      if (isTableVisible) {
        const isNextEnabled = await gwasCredibleSets.isNextPageEnabled();

        if (isNextEnabled) {
          // Get first page data
          const firstPageData = await gwasCredibleSets.getCellText(0, 1);

          // Go to next page
          await gwasCredibleSets.clickNextPage();
          await gwasCredibleSets.waitForSectionLoad();

          // Get second page data
          const secondPageData = await gwasCredibleSets.getCellText(0, 1);

          // Data should be different
          test.expect(firstPageData).not.toBe(secondPageData);

          // Go back
          const isPrevEnabled = await gwasCredibleSets.isPreviousPageEnabled();
          if (isPrevEnabled) {
            await gwasCredibleSets.clickPreviousPage();
            await gwasCredibleSets.waitForSectionLoad();
          }
        }
      }
    });

    test("Can search in GWAS Credible Sets table", async ({ page }) => {
      const gwasCredibleSets = new GWASCredibleSetsSection(page);
      await gwasCredibleSets.waitForSectionLoad();

      const isTableVisible = await gwasCredibleSets.isTableVisible();

      if (isTableVisible) {
        const rowCount = await gwasCredibleSets.getRowCount();

        if (rowCount > 0) {
          // Get a variant ID to search for
          const variantId = await gwasCredibleSets.getVariantId(0);

          if (variantId) {
            // Search for it
            await gwasCredibleSets.searchCredibleSet(variantId);
            await gwasCredibleSets.waitForSectionLoad();

            // Verify filtered results
            const filteredRowCount = await gwasCredibleSets.getRowCount();
            test.expect(filteredRowCount).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe("Shared Trait Studies Section", () => {
    test("Shared Trait Studies section is visible for GWAS studies", async ({ page }) => {
      const sharedTraitStudies = new SharedTraitStudiesSection(page);

      const isVisible = await sharedTraitStudies.isSectionVisible();

      if (isVisible) {
        await sharedTraitStudies.waitForSectionLoad();

        const title = await sharedTraitStudies.getSectionTitle();
        test.expect(title).toBeTruthy();
      }
    });

    test("Shared Trait Studies table displays related studies", async ({ page }) => {
      const sharedTraitStudies = new SharedTraitStudiesSection(page);

      const isVisible = await sharedTraitStudies.isSectionVisible();

      if (isVisible) {
        await sharedTraitStudies.waitForSectionLoad();

        const isTableVisible = await sharedTraitStudies.isTableVisible();

        if (isTableVisible) {
          const rowCount = await sharedTraitStudies.getRowCount();
          test.expect(rowCount).toBeGreaterThan(0);

          // Check first row has study ID
          const studyId = await sharedTraitStudies.getStudyId(0);
          test.expect(studyId).toBeTruthy();
        }
      }
    });

    test("Can navigate to another study from Shared Trait Studies table", async ({ page }) => {
      const sharedTraitStudies = new SharedTraitStudiesSection(page);

      const isVisible = await sharedTraitStudies.isSectionVisible();

      if (isVisible) {
        await sharedTraitStudies.waitForSectionLoad();

        const isTableVisible = await sharedTraitStudies.isTableVisible();

        if (isTableVisible) {
          const rowCount = await sharedTraitStudies.getRowCount();

          if (rowCount > 0) {
            // Click study link
            await sharedTraitStudies.clickStudyLink(0);
            await page.waitForURL("**/study/**");

            // Verify we're on a different study page
            test.expect(page.url()).toContain("/study/");
          }
        }
      }
    });

    test("Can navigate to disease from Shared Trait Studies table", async ({ page }) => {
      const sharedTraitStudies = new SharedTraitStudiesSection(page);

      const isVisible = await sharedTraitStudies.isSectionVisible();

      if (isVisible) {
        await sharedTraitStudies.waitForSectionLoad();

        const isTableVisible = await sharedTraitStudies.isTableVisible();

        if (isTableVisible) {
          const rowCount = await sharedTraitStudies.getRowCount();

          if (rowCount > 0) {
            const diseaseName = await sharedTraitStudies.getDiseaseName(0);

            if (diseaseName) {
              // Click disease link
              await sharedTraitStudies.clickDiseaseLink(0);
              await page.waitForURL("**/disease/**");

              // Verify we're on disease page
              test.expect(page.url()).toContain("/disease/");
            }
          }
        }
      }
    });
  });

  //   test.describe("Study Page Navigation", () => {
  //     test("Profile tab is active by default", async ({ page }) => {
  //       const studyPage = new StudyPage(page);

  //       const isActive = await studyPage.isProfileTabActive();
  //       test.expect(isActive).toBe(true);
  //     });

  //     // test("Study page displays correct study ID in header", async ({ page }) => {
  //     //   const studyPage = new StudyPage(page);

  //     //   const studyId = await studyPage.getStudyIdFromHeader();
  //     //   test.expect(studyId).toContain(GWAS_STUDY_ID);
  //     // });
  //   });
});

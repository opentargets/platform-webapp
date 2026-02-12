import { test } from "../../../fixtures";
import { ProfileHeader } from "../../../POM/objects/components/ProfileHeader/profileHeader";
import { BibliographySection } from "../../../POM/objects/widgets/Bibliography/bibliographySection";
import { GWASStudiesSection } from "../../../POM/objects/widgets/GWAS/gwasStudiesSection";
import { ClinicalPrecedenceSection } from "../../../POM/objects/widgets/KnownDrugs/knownDrugsSection";
import { OntologySection } from "../../../POM/objects/widgets/Ontology/ontologySection";
import { OTProjectsSection } from "../../../POM/objects/widgets/OTProjects/otProjectsSection";
import { PhenotypesSection } from "../../../POM/objects/widgets/Phenotypes/phenotypesSection";

test.describe("Disease Profile Page", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}`);
  });

  test.describe("Profile Header", () => {
    test("Profile header is visible", async ({ page }) => {
      const profileHeader = new ProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isVisible = await profileHeader.isProfileHeaderVisible();
      test.expect(isVisible).toBe(true);
    });

    test("Description section is visible and has content", async ({ page }) => {
      const profileHeader = new ProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isDescriptionVisible = await profileHeader.isDescriptionVisible();
      test.expect(isDescriptionVisible).toBe(true);

      const descriptionText = await profileHeader.getDescriptionText();
      test.expect(descriptionText).toBeTruthy();
      test.expect(descriptionText?.length).toBeGreaterThan(0);
    });

    test("Synonyms section displays when synonyms exist", async ({ page }) => {
      const profileHeader = new ProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      // Check if synonyms section exists
      const isSynonymsVisible = await profileHeader.isSynonymsSectionVisible();

      // If synonyms are visible, verify they have content
      if (isSynonymsVisible) {
        const synonymsCount = await profileHeader.getSynonymsCount();
        test.expect(synonymsCount).toBeGreaterThan(0);

        // Check first synonym has text
        const firstSynonymText = await profileHeader.getSynonymText(0);
        test.expect(firstSynonymText).toBeTruthy();
      }
    });

    test("Can interact with synonym chips", async ({ page }) => {
      const profileHeader = new ProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const isSynonymsVisible = await profileHeader.isSynonymsSectionVisible();

      if (isSynonymsVisible) {
        const synonymsCount = await profileHeader.getSynonymsCount();

        if (synonymsCount > 0) {
          // Hover over first synonym to trigger tooltip
          await profileHeader.hoverSynonymChip(0);
          await page.waitForTimeout(300); // Wait for tooltip

          // Verify chip is still visible after hover
          const chipVisible = await profileHeader.getSynonymChip(0).isVisible();
          test.expect(chipVisible).toBe(true);
        }
      }
    });

    test("Description contains disease-related information", async ({ page }) => {
      const profileHeader = new ProfileHeader(page);
      await profileHeader.waitForProfileHeaderLoad();

      const descriptionText = await profileHeader.getDescriptionText();

      // Check that description is not the default "No description available" message
      if (descriptionText) {
        test.expect(descriptionText.toLowerCase()).not.toContain("no description available");
      }
    });
  });

  test.describe("Profile Evidences are correctly rendered", () => {
    test("Ontology section is visible and contains data", async ({ page }) => {
      const ontologySection = new OntologySection(page);
      await ontologySection.waitForSectionLoad();

      const isVisible = await ontologySection.isSectionVisible();
      test.expect(isVisible).toBe(true);

      const title = await ontologySection.getSectionTitle();
      test.expect(title).toBeTruthy();
    });

    test("Known Drugs section is visible when disease has drug data", async ({ page }) => {
      const knownDrugsSection = new ClinicalPrecedenceSection(page);

      // Wait for section to potentially load
      const isVisible = await knownDrugsSection.isSectionVisible();

      // If the section is visible, verify it has data
      if (isVisible) {
        await knownDrugsSection.waitForSectionLoad();

        const title = await knownDrugsSection.getSectionTitle();
        test.expect(title).toBeTruthy();

        const isTableVisible = await knownDrugsSection.isTableVisible();
        if (isTableVisible) {
          const rowCount = await knownDrugsSection.getRowCount();
          test.expect(rowCount).toBeGreaterThan(0);
        }
      }
    });

    test("Phenotypes section is visible when disease has phenotype data", async ({ page }) => {
      const phenotypesSection = new PhenotypesSection(page);

      const isVisible = await phenotypesSection.isSectionVisible();

      if (isVisible) {
        await phenotypesSection.waitForSectionLoad();

        const title = await phenotypesSection.getSectionTitle();
        test.expect(title).toBeTruthy();

        const isTableVisible = await phenotypesSection.isTableVisible();
        if (isTableVisible) {
          const rowCount = await phenotypesSection.getRowCount();
          test.expect(rowCount).toBeGreaterThan(0);
        }
      }
    });

    test("OT Projects section is visible when disease has project data", async ({ page }) => {
      const otProjectsSection = new OTProjectsSection(page);

      const isVisible = await otProjectsSection.isSectionVisible();

      if (isVisible) {
        await otProjectsSection.waitForSectionLoad();

        const title = await otProjectsSection.getSectionTitle();
        test.expect(title).toBeTruthy();

        const projectCount = await otProjectsSection.getProjectCount();
        test.expect(projectCount).toBeGreaterThan(0);
      }
    });

    test("GWAS Studies section is visible when disease has GWAS data", async ({ page }) => {
      const gwasStudiesSection = new GWASStudiesSection(page);

      const isVisible = await gwasStudiesSection.isSectionVisible();

      if (isVisible) {
        await gwasStudiesSection.waitForSectionLoad();

        const title = await gwasStudiesSection.getSectionTitle();
        test.expect(title).toBeTruthy();

        const isTableVisible = await gwasStudiesSection.isTableVisible();
        if (isTableVisible) {
          const rowCount = await gwasStudiesSection.getRowCount();
          test.expect(rowCount).toBeGreaterThan(0);
        }
      }
    });

    test("Bibliography section is visible when disease has literature data", async ({ page }) => {
      const bibliographySection = new BibliographySection(page);

      const isVisible = await bibliographySection.isSectionVisible();

      if (isVisible) {
        await bibliographySection.waitForSectionLoad();

        const title = await bibliographySection.getSectionTitle();
        test.expect(title).toBeTruthy();

        const literatureCount = await bibliographySection.getLiteratureCount();
        test.expect(literatureCount).toBeGreaterThan(0);
      }
    });

    test("All visible sections have corresponding headers", async ({ page }) => {
      // Create instances of all section interactors
      const sections = [
        { name: "Ontology", interactor: new OntologySection(page) },
        { name: "Known Drugs", interactor: new ClinicalPrecedenceSection(page) },
        { name: "Phenotypes", interactor: new PhenotypesSection(page) },
        { name: "OT Projects", interactor: new OTProjectsSection(page) },
        { name: "GWAS Studies", interactor: new GWASStudiesSection(page) },
        { name: "Bibliography", interactor: new BibliographySection(page) },
      ];

      // Wait for page to stabilize
      await page.waitForLoadState("networkidle");

      // Check each section
      for (const section of sections) {
        const isVisible = await section.interactor.isSectionVisible();

        if (isVisible) {
          const title = await section.interactor.getSectionTitle();
          test.expect(title).toBeTruthy();
          console.log(`✓ ${section.name} section is visible with title: ${title}`);
        }
      }
    });
  });
});

import type { Locator, Page } from "@playwright/test";
import { GWASFields } from "./GWASFields";
import { PublicationFields } from "./PublicationFields";
import { QTLFields } from "./QTLFields";
import { SampleFields } from "./SampleFields";
import { StatisticsFields } from "./StatisticsFields";

/**
 * Main class for Study Profile Header interactions
 * Composed of specialized field classes for better organization
 */
export class StudyProfileHeader {
  page: Page;
  gwas: GWASFields;
  qtl: QTLFields;
  publication: PublicationFields;
  statistics: StatisticsFields;
  sample: SampleFields;

  constructor(page: Page) {
    this.page = page;
    this.gwas = new GWASFields(page);
    this.qtl = new QTLFields(page);
    this.publication = new PublicationFields(page);
    this.statistics = new StatisticsFields(page);
    this.sample = new SampleFields(page);
  }

  // Profile header container
  getProfileHeader(): Locator {
    return this.page.locator("[data-testid='profile-header']");
  }

  async isProfileHeaderVisible(): Promise<boolean> {
    return await this.getProfileHeader()
      .isVisible()
      .catch(() => false);
  }

  // Study type field
  async getStudyTypeField(): Promise<Locator> {
    return this.page.locator("[data-testid='field-study-type']");
  }

  async getStudyType(): Promise<string | null> {
    const studyTypeField = await this.getStudyTypeField();
    return await studyTypeField.textContent();
  }

  async isStudyTypeVisible(): Promise<boolean> {
    const studyTypeField = await this.getStudyTypeField();
    return await studyTypeField.isVisible().catch(() => false);
  }

  // Delegate GWAS-specific methods
  getReportedTraitField = () => this.gwas.getReportedTraitField();
  getReportedTrait = () => this.gwas.getReportedTrait();
  isReportedTraitVisible = () => this.gwas.isReportedTraitVisible();
  getDiseaseField = () => this.gwas.getDiseaseField();
  getDiseases = () => this.gwas.getDiseases();
  isDiseaseFieldVisible = () => this.gwas.isDiseaseFieldVisible();
  clickDiseaseLink = (index?: number) => this.gwas.clickDiseaseLink(index);
  getBackgroundTraitField = () => this.gwas.getBackgroundTraitField();
  getBackgroundTraits = () => this.gwas.getBackgroundTraits();
  isBackgroundTraitVisible = () => this.gwas.isBackgroundTraitVisible();

  // Delegate QTL-specific methods
  getProjectField = () => this.qtl.getProjectField();
  getProject = () => this.qtl.getProject();
  isProjectFieldVisible = () => this.qtl.isProjectFieldVisible();
  getAffectedGeneField = () => this.qtl.getAffectedGeneField();
  getAffectedGene = () => this.qtl.getAffectedGene();
  isAffectedGeneVisible = () => this.qtl.isAffectedGeneVisible();
  clickAffectedGeneLink = () => this.qtl.clickAffectedGeneLink();
  getAffectedCellTissueField = () => this.qtl.getAffectedCellTissueField();
  getAffectedCellTissue = () => this.qtl.getAffectedCellTissue();
  isAffectedCellTissueVisible = () => this.qtl.isAffectedCellTissueVisible();
  getConditionField = () => this.qtl.getConditionField();
  getCondition = () => this.qtl.getCondition();
  isConditionVisible = () => this.qtl.isConditionVisible();

  // Delegate publication methods
  getPublicationField = () => this.publication.getPublicationField();
  getPublication = () => this.publication.getPublication();
  isPublicationVisible = () => this.publication.isPublicationVisible();
  getPubMedField = () => this.publication.getPubMedField();
  getPubMedId = () => this.publication.getPubMedId();
  isPubMedVisible = () => this.publication.isPubMedVisible();
  clickPubMedLink = () => this.publication.clickPubMedLink();

  // Delegate statistics methods
  getSummaryStatsField = () => this.statistics.getSummaryStatsField();
  getSummaryStatsText = () => this.statistics.getSummaryStatsText();
  isSummaryStatsAvailable = () => this.statistics.isSummaryStatsAvailable();
  hasSummaryStatsPopover = () => this.statistics.hasSummaryStatsPopover();
  clickSummaryStatsPopover = () => this.statistics.clickSummaryStatsPopover();
  getQCWarningsField = () => this.statistics.getQCWarningsField();
  hasQCWarnings = () => this.statistics.hasQCWarnings();
  clickQCWarnings = () => this.statistics.clickQCWarnings();

  // Delegate sample methods
  getSampleSizeField = () => this.sample.getSampleSizeField();
  getSampleSize = () => this.sample.getSampleSize();
  isSampleSizeVisible = () => this.sample.isSampleSizeVisible();
  getNCasesField = () => this.sample.getNCasesField();
  getNCases = () => this.sample.getNCases();
  isNCasesVisible = () => this.sample.isNCasesVisible();
  getNControlsField = () => this.sample.getNControlsField();
  getNControls = () => this.sample.getNControls();
  isNControlsVisible = () => this.sample.isNControlsVisible();
  getAnalysisField = () => this.sample.getAnalysisField();
  getAnalysis = () => this.sample.getAnalysis();
  isAnalysisVisible = () => this.sample.isAnalysisVisible();
  getPopulationChips = () => this.sample.getPopulationChips();
  getPopulationChipsCount = () => this.sample.getPopulationChipsCount();
  getPopulationChipLabel = (index: number) => this.sample.getPopulationChipLabel(index);
  getPopulationChipValue = (index: number) => this.sample.getPopulationChipValue(index);
  hoverPopulationChip = (index: number) => this.sample.hoverPopulationChip(index);

  // Wait for profile header to load - check for loaders to disappear
  async waitForProfileHeaderLoad(): Promise<void> {
    // Wait for the profile header block to be visible
    await this.page.waitForSelector("[data-testid='profile-page-header-block']", {
      state: "visible",
      timeout: 20000,
    });

    // Wait for skeleton loaders within the header to disappear
    await this.page
      .waitForFunction(
        () => {
          const headerBlock = document.querySelector("[data-testid='profile-page-header-block']");
          if (!headerBlock) return false;
          const skeletons = headerBlock.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found, header already loaded
      });

    // Wait for header text to be populated (not empty)
    await this.page
      .waitForFunction(
        () => {
          const headerText = document.querySelector("[data-testid='profile-page-header-text']");
          return headerText?.textContent && headerText.textContent.trim().length > 0;
        },
        { timeout: 20000 }
      )
      .catch(() => {
        // Header text might not be available
      });
  }
}

import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for AOTF (Association On-The-Fly) table action controls.
 *
 * Provides methods to interact with the AOTF table's control panel including:
 * - Name filtering
 * - Advanced facets/filters
 * - Column options and weight controls
 * - Export functionality
 * - Display mode switching (Associations/Prioritisation view)
 *
 * @example
 * ```typescript
 * const actions = new AotfActions(page);
 * await actions.searchByName("BRAF");
 * await actions.switchToPrioritisationView();
 * await actions.openExportMenu();
 * ```
 *
 * @category AOTF
 */
export class AotfActions {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==================
  // Name Filter
  // ==================
  getNameFilterInput(): Locator {
    return this.page.locator("[data-testid='name-filter-input']");
  }

  async searchByName(name: string): Promise<void> {
    await this.getNameFilterInput().fill(name);
  }

  async clearNameFilter(): Promise<void> {
    await this.getNameFilterInput().clear();
  }

  async getNameFilterValue(): Promise<string> {
    return await this.getNameFilterInput().inputValue();
  }

  // ==================
  // Facets Search / Advanced Filters
  // ==================
  getFacetsSearchButton(): Locator {
    return this.page.locator("[data-testid='facets-search-button']");
  }

  async openFacetsSearch(): Promise<void> {
    await this.getFacetsSearchButton().click();
  }

  getFacetsPopover(): Locator {
    return this.page.locator("[data-testid='facets-popover']");
  }

  async isFacetsPopoverOpen(): Promise<boolean> {
    return await this.getFacetsPopover().isVisible();
  }

  // Data Uploader within Facets
  getDataUploaderButton(): Locator {
    return this.page.locator("[data-testid='data-uploader-button']");
  }

  async uploadData(filePath: string): Promise<void> {
    const fileInput = this.page.locator("input[type='file']");
    await fileInput.setInputFiles(filePath);
  }

  // Facet filter selections
  getFacetFilterOption(facetName: string): Locator {
    return this.page.locator(`[data-testid='facet-filter-${facetName}']`);
  }

  async selectFacetFilter(facetName: string, optionValue: string): Promise<void> {
    await this.getFacetFilterOption(facetName).click();
    await this.page.locator(`[data-value='${optionValue}']`).click();
  }

  async closeFacetsPopover(): Promise<void> {
    // Click outside the popover or use backdrop
    await this.page.keyboard.press("Escape");
  }

  // ==================
  // Column Options Menu
  // ==================
  getColumnOptionsButton(): Locator {
    return this.page.locator("[data-testid='column-options-button']");
  }

  async openColumnOptions(): Promise<void> {
    await this.getColumnOptionsButton().click();
  }

  getWeightsControlsContainer(): Locator {
    return this.page.locator(".weights-controlls");
  }

  async isColumnOptionsActive(): Promise<boolean> {
    return await this.getWeightsControlsContainer().isVisible();
  }

  async closeColumnOptions(): Promise<void> {
    const closeButton = this.page.locator(
      ".weights-controlls [data-testid='close-weights-button']"
    );
    await closeButton.click();
  }

  // Weight slider controls
  getWeightSlider(columnId: string): Locator {
    return this.page.locator(`[data-testid='weight-slider-${columnId}']`);
  }

  async setColumnWeight(columnId: string, weight: number): Promise<void> {
    const slider = this.getWeightSlider(columnId);
    await slider.fill(weight.toString());
  }

  // Required checkbox controls
  getRequiredCheckbox(columnId: string): Locator {
    return this.page.locator(`[data-testid='required-checkbox-${columnId}']`);
  }

  async toggleRequiredCheckbox(columnId: string): Promise<void> {
    await this.getRequiredCheckbox(columnId).click();
  }

  async isColumnRequired(columnId: string): Promise<boolean> {
    return await this.getRequiredCheckbox(columnId).isChecked();
  }

  getColumnToggle(columnName: string): Locator {
    return this.page.locator(`[data-testid='column-toggle-${columnName}']`);
  }

  async toggleColumn(columnName: string): Promise<void> {
    await this.getColumnToggle(columnName).click();
  }

  // ==================
  // Export Menu
  // ==================
  getExportButton(): Locator {
    return this.page.locator("[data-testid='export-button']");
  }

  async openExportMenu(): Promise<void> {
    await this.getExportButton().click();
  }

  getExportPopover(): Locator {
    return this.page.locator("[data-testid='export-popover']");
  }

  async isExportMenuOpen(): Promise<boolean> {
    return await this.getExportPopover().isVisible();
  }

  // Export options
  getDownloadDataOption(): Locator {
    return this.page.locator("[data-testid='download-data-option']");
  }

  getApiPlaygroundOption(): Locator {
    return this.page.locator("[data-testid='api-playground-option']");
  }

  async clickDownloadData(): Promise<void> {
    await this.getDownloadDataOption().click();
  }

  async clickApiPlayground(): Promise<void> {
    await this.getApiPlaygroundOption().click();
  }

  async closeExportMenu(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  // ==================
  // Display Mode Switch
  // ==================
  getDisplayModeSwitch(): Locator {
    return this.page.locator("[data-testid='display-mode-switch']");
  }

  getAssociationsViewButton(): Locator {
    return this.page.locator("[data-testid='associations-view-button']");
  }

  getPrioritisationViewButton(): Locator {
    return this.page.locator("[data-testid='prioritisation-view-button']");
  }

  async switchToAssociationsView(): Promise<void> {
    await this.getAssociationsViewButton().click();
  }

  async switchToPrioritisationView(): Promise<void> {
    await this.getPrioritisationViewButton().click();
  }

  async getCurrentDisplayMode(): Promise<string | null> {
    const associationsButton = this.getAssociationsViewButton();
    const ariaPressed = await associationsButton.getAttribute("aria-pressed");
    return ariaPressed === "true" ? "associations" : "prioritisations";
  }

  // ==================
  // Active Filters Panel
  // ==================
  getActiveFiltersPanel(): Locator {
    return this.page.locator("[data-testid='active-filters-panel']");
  }

  getActiveFilterChip(filterName: string): Locator {
    return this.page.locator(`[data-testid='active-filter-chip-${filterName}']`);
  }

  async removeActiveFilter(filterName: string): Promise<void> {
    const chip = this.getActiveFilterChip(filterName);
    const deleteButton = chip.locator("[data-testid='CancelIcon']");
    await deleteButton.click();
  }

  async clearAllFilters(): Promise<void> {
    const clearAllButton = this.page.locator("[data-testid='clear-all-filters-button']");
    await clearAllButton.click();
  }

  async getActiveFiltersCount(): Promise<number> {
    const chips = this.page.locator("[data-testid^='active-filter-chip-']");
    return await chips.count();
  }

  async hasSortFilter(): Promise<boolean> {
    const sortChip = this.page.locator("[data-testid='active-filter-chip-sort']");
    return await sortChip.isVisible().catch(() => false);
  }

  async getSortFilterText(): Promise<string | null> {
    const sortChip = this.page.locator("[data-testid='active-filter-chip-sort']");
    return await sortChip.textContent();
  }

  // ==================
  // Combined Actions
  // ==================
  async applyNameFilterAndWaitForResults(name: string): Promise<void> {
    await this.searchByName(name);
    // Wait for table to update
    await this.page.waitForTimeout(500); // Adjust based on debounce time
  }

  async openAndConfigureFacets(facetConfig: Record<string, string>): Promise<void> {
    await this.openFacetsSearch();
    for (const [facetName, optionValue] of Object.entries(facetConfig)) {
      await this.selectFacetFilter(facetName, optionValue);
    }
  }
}

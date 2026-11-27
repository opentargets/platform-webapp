import { expect, type Locator, type Page } from "@playwright/test";

/** The category filter chips of the Downloads toolbar, in the order the page lists them. */
export const DOWNLOADS_CATEGORIES = [
  "Target-Disease",
  "Target",
  "Ontology",
  "Drug",
  "Genetics",
  "Disease",
  "Literature",
] as const;
export type DownloadsCategory = (typeof DOWNLOADS_CATEGORIES)[number];

/** Script tools of the access dialogs and of the bag, by the id of their tab. */
export type ScriptTool = "aws" | "gcp" | "rsync" | "wget";
export const SCRIPT_TOOLS: ScriptTool[] = ["aws", "gcp", "rsync", "wget"];
/** Where a dataset can be browsed, by the id of the tab in the access dialog. */
export type LocationTab = "http-location" | "ftp-location" | "gcp-location" | "aws-location";

/** Where the page stores the bag between visits (see context/basketStorage.ts). */
export const BASKET_STORAGE_KEY = "ot.downloads.basket";
/** Set once the one-time "Added to your bag" coach mark has been shown. */
export const COACH_MARK_STORAGE_KEY = "ot.downloads.basketCoachSeen";

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * The data downloads page, /downloads: dataset cards, bag, network view and the dataset
 * dialogs. Everything is found by test id; datasets are addressed by their id
 * (`target`, `disease`...) so a test never depends on order or text.
 */
export class DownloadsPage {
  constructor(readonly page: Page) {}

  /** Open the page (optionally with a query string or as a dialog route) and wait for the datasets. */
  async goto(path = "/downloads"): Promise<void> {
    await this.page.goto(path);
    await expect(this.title, "the downloads page should show its title").toBeVisible();
    await expect(
      this.counter,
      "the dataset counter should show once the datasets have loaded"
    ).toBeVisible();
  }

  /** The Network view has no counter: wait for the graph instead. */
  async gotoNetwork(path = "/downloads?view=network"): Promise<void> {
    await this.page.goto(path);
    await expect(this.title).toBeVisible();
    await expect(this.graphNodes.first()).toBeVisible();
  }

  get title(): Locator {
    return this.page.getByTestId("downloads-title");
  }

  get description(): Locator {
    return this.page.getByTestId("downloads-description");
  }

  // ---- header tags ---------------------------------------------------------------------

  tag(name: "cite-us" | "croissant" | "parquet" | "version"): Locator {
    return this.page.getByTestId(`tag-${name}`);
  }

  /** The popover of the tag that is open. */
  get tagPopover(): Locator {
    return this.page.getByTestId("tag-popover");
  }

  get tagReadMoreLink(): Locator {
    return this.tagPopover.getByTestId("tag-read-more");
  }

  get croissantDownloadLink(): Locator {
    return this.tagPopover.getByTestId("croissant-download");
  }

  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }

  get publicationEntries(): Locator {
    return this.publicationsDrawer.getByTestId(/^literature-entry-/);
  }

  // ---- toolbar -------------------------------------------------------------------------

  get searchBox(): Locator {
    return this.page.getByTestId("search-input");
  }

  get clearSearchButton(): Locator {
    return this.page.getByTestId("search-clear");
  }

  get clearAllButton(): Locator {
    return this.page.getByTestId("clear-all-button");
  }

  /** "12 of 64": datasets shown of all datasets. */
  get counter(): Locator {
    return this.page.getByTestId("dataset-counter");
  }

  get categoryFilters(): Locator {
    return this.page.getByTestId("category-filters");
  }

  chip(category: string): Locator {
    return this.page.getByTestId(`category-filter-${slug(category)}`);
  }

  get chips(): Locator {
    return this.categoryFilters.getByTestId(/^category-filter-/);
  }

  chipCount(category: string): Locator {
    return this.chip(category).getByTestId("chip-count");
  }

  get chipTooltip(): Locator {
    return this.page.getByTestId("category-tooltip");
  }

  get cardsToggle(): Locator {
    return this.page.getByTestId("view-toggle-cards");
  }

  get networkToggle(): Locator {
    return this.page.getByTestId("view-toggle-network");
  }

  // ---- cards ---------------------------------------------------------------------------

  get cards(): Locator {
    return this.page.getByTestId(/^dataset-card-/);
  }

  card(id: string): Locator {
    return this.page.getByTestId(`dataset-card-${id}`);
  }

  cardName(id: string): Locator {
    return this.card(id).getByTestId("dataset-name");
  }

  cardId(id: string): Locator {
    return this.card(id).getByTestId("dataset-id");
  }

  cardDescription(id: string): Locator {
    return this.card(id).getByTestId("dataset-description");
  }

  cardCategories(id: string): Locator {
    return this.card(id).getByTestId("dataset-category");
  }

  cardSchemaLink(id: string): Locator {
    return this.card(id).getByTestId("dataset-schema-link");
  }

  cardAccessLink(id: string): Locator {
    return this.card(id).getByTestId("dataset-access-link");
  }

  /** The Add / In bag button of a card. */
  cardToggle(id: string): Locator {
    return this.card(id).getByTestId("basket-toggle");
  }

  /** The "more" / "hide" toggle of a long description. */
  cardDescriptionToggle(id: string): Locator {
    return this.card(id).getByTestId("long-text-toggle");
  }

  /** The id of every dataset card on the page, in page order. */
  async cardIds(): Promise<string[]> {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => (card.getAttribute("data-testid") ?? "").replace(/^dataset-card-/, ""))
    );
  }

  /** What every card on the page shows: name, id, categories, links and the amount of description text. */
  async cardFacts(): Promise<
    {
      testId: string;
      name: string;
      id: string;
      categories: string[];
      schemaHref: string;
      accessHref: string;
      descriptionLength: number;
    }[]
  > {
    return this.cards.evaluateAll((cards) =>
      cards.map((card) => {
        const text = (testId: string) =>
          card.querySelector(`[data-testid='${testId}']`)?.textContent ?? "";
        const href = (testId: string) =>
          card.querySelector(`[data-testid='${testId}']`)?.getAttribute("href") ?? "";
        return {
          testId: card.getAttribute("data-testid") ?? "",
          name: text("dataset-name"),
          id: text("dataset-id"),
          categories: [...card.querySelectorAll("[data-testid='dataset-category']")].map(
            (c) => c.textContent ?? ""
          ),
          schemaHref: href("dataset-schema-link"),
          accessHref: href("dataset-access-link"),
          descriptionLength: text("dataset-description").length,
        };
      })
    );
  }

  /** The categories named on the cards, and the ones the filter chips offer (lower case, dashes). */
  async categorySlugs(): Promise<{ onCards: string[]; onChips: string[] }> {
    const onCards = new Set<string>();
    for (const card of await this.cardFacts())
      for (const c of card.categories) onCards.add(slug(c));
    const onChips = await this.chips.evaluateAll((chips) =>
      chips.map((chip) => (chip.getAttribute("data-testid") ?? "").replace(/^category-filter-/, ""))
    );
    return { onCards: [...onCards], onChips };
  }

  /** The number of datasets the counter says are shown. */
  async shownCount(): Promise<number> {
    const text = (await this.counter.textContent()) ?? "";
    const match = /^(\d+) of (\d+)$/.exec(text);
    expect(match, `the counter "${text}" should read "<shown> of <all>"`).not.toBeNull();
    return Number(match?.[1]);
  }

  /** Wait until the counter says `shown of total` and exactly that many cards are on the page. */
  async expectShown(shown: number, total?: number): Promise<void> {
    if (total === undefined)
      await expect(this.counter).toHaveText(new RegExp(`^${shown} of \\d+$`));
    else await expect(this.counter).toHaveText(`${shown} of ${total}`);
    await expect(this.cards).toHaveCount(shown);
  }

  /** Total number of datasets, read from the counter. */
  async totalDatasets(): Promise<number> {
    const text = (await this.counter.textContent()) ?? "";
    const total = Number(/of (\d+)$/.exec(text)?.[1]);
    expect(total, `the counter "${text}" should end with the number of datasets`).toBeGreaterThan(
      0
    );
    return total;
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
    await expect(this.searchBox).toHaveValue(term);
  }

  // ---- empty states and results bar ---------------------------------------------------

  get emptyState(): Locator {
    return this.page.getByTestId("empty-state");
  }

  get emptyStateTitle(): Locator {
    return this.page.getByTestId("empty-state-title");
  }

  get emptyStateBody(): Locator {
    return this.page.getByTestId("empty-state-body");
  }

  get emptyStateAction(): Locator {
    return this.page.getByTestId("empty-state-action");
  }

  get resultsSummary(): Locator {
    return this.page.getByTestId("results-summary");
  }

  get addAllButton(): Locator {
    return this.page.getByTestId("add-all-button");
  }

  // ---- bag -----------------------------------------------------------------------------

  /** The toolbar's "Your data bundle" button; its accessible name carries the count. */
  get bagButton(): Locator {
    return this.page.getByTestId("basket-button");
  }

  get bagBadge(): Locator {
    return this.page.getByTestId("basket-count");
  }

  async expectBagCount(count: number): Promise<void> {
    // read from aria-label: while the drawer is open the page behind it is aria-hidden and has no computed name
    await expect(this.bagButton).toHaveAttribute(
      "aria-label",
      `Your data bundle, ${plural(count, "dataset")}`
    );
    if (count === 0) await expect(this.bagBadge).toHaveCount(0);
    else await expect(this.bagBadge).toHaveText(String(count));
  }

  get drawer(): Locator {
    return this.page.getByTestId("basket-drawer");
  }

  get drawerTitle(): Locator {
    return this.drawer.getByTestId("basket-drawer-title");
  }

  get drawerCount(): Locator {
    return this.drawer.getByTestId("basket-drawer-count");
  }

  get drawerListTitle(): Locator {
    return this.drawer.getByTestId("basket-list-title");
  }

  get drawerRows(): Locator {
    return this.drawer.getByTestId(/^basket-row-/);
  }

  drawerRow(id: string): Locator {
    return this.drawer.getByTestId(`basket-row-${id}`);
  }

  drawerRowName(id: string): Locator {
    return this.drawerRow(id).getByTestId("basket-item-name");
  }

  drawerRowSchemaLink(id: string): Locator {
    return this.drawerRow(id).getByTestId("basket-item-schema");
  }

  drawerRowRemove(id: string): Locator {
    return this.drawerRow(id).getByTestId("basket-item-remove");
  }

  get emptyBagButton(): Locator {
    return this.drawer.getByTestId("basket-empty-button");
  }

  get closeBagButton(): Locator {
    return this.drawer.getByTestId("basket-drawer-close");
  }

  get undoSnackbar(): Locator {
    return this.page.getByTestId("undo-snackbar");
  }

  get undoButton(): Locator {
    return this.page.getByTestId("undo-button");
  }

  /** Open the bag drawer and check it lists `count` datasets. */
  async openBag(count: number): Promise<void> {
    await this.bagButton.click();
    await expect(this.drawer).toBeVisible();
    await expect(this.drawerCount).toHaveText(plural(count, "dataset"));
    await expect(this.drawerRows).toHaveCount(count);
  }

  get coachMark(): Locator {
    return this.page.getByTestId("basket-coach-mark");
  }

  get coachMarkOpenButton(): Locator {
    return this.page.getByTestId("basket-coach-open");
  }

  get coachMarkDismissButton(): Locator {
    return this.page.getByTestId("basket-coach-dismiss");
  }

  // ---- access script of the bag --------------------------------------------------------

  get scriptTitle(): Locator {
    return this.drawer.getByTestId("access-script-title");
  }

  scriptTab(tool: ScriptTool): Locator {
    return this.drawer.getByTestId(`btn-group-tab-${tool}`);
  }

  /** The text of the access script currently shown in the drawer. */
  get scriptText(): Locator {
    return this.drawer.getByTestId("access-script-text");
  }

  get copyScriptButton(): Locator {
    return this.drawer.getByTestId("access-script-copy");
  }

  get copyTooltip(): Locator {
    return this.page.getByTestId("copy-tooltip");
  }

  /**
   * Check which datasets the script lists: it names them one per line,
   * `  target \` and `  disease |`, between `printf '%s\n' \` and the loop.
   */
  async expectScriptDatasets(ids: string[]): Promise<void> {
    await expect
      .poll(
        async () => {
          const text = (await this.scriptText.innerText()).replace(/ /g, " ");
          const lines = text.split("\n");
          const start = lines.findIndex((line) => line.startsWith("printf '%s"));
          const end = lines.findIndex((line) => line.startsWith("while read"));
          return lines
            .slice(start + 1, end)
            .map((line) => /^\s*([a-z0-9_]+) [\\|]$/.exec(line)?.[1])
            .filter((id): id is string => id !== undefined);
        },
        `the access script should list ${ids.join(", ")}`
      )
      .toEqual(ids);
  }

  // ---- schema / access dialog ---------------------------------------------------------

  get datasetDialog(): Locator {
    return this.page.getByTestId("dataset-dialog");
  }

  get dialogTitle(): Locator {
    return this.datasetDialog.getByTestId("dataset-dialog-title");
  }

  get dialogSwitchButton(): Locator {
    return this.datasetDialog.getByTestId("dataset-dialog-switch");
  }

  get dialogCloseButton(): Locator {
    return this.datasetDialog.getByTestId("dataset-dialog-close");
  }

  /** The columns of a schema dialog. */
  get schemaTable(): Locator {
    return this.datasetDialog.getByTestId("schema-table");
  }

  get schemaHeaders(): Locator {
    return this.schemaTable.getByTestId("schema-header");
  }

  get schemaRows(): Locator {
    return this.schemaTable.getByTestId(/^schema-row-/);
  }

  /** The foreign key mark of a schema row; hovering it names the dataset it points to. */
  schemaForeignKey(columnPath: string): Locator {
    return this.schemaRow(columnPath).getByTestId("schema-foreign-key");
  }

  /** The primary key mark of a schema row. */
  schemaPrimaryKey(columnPath: string): Locator {
    return this.schemaRow(columnPath).getByTestId("schema-primary-key");
  }

  /** The row of a column, by its dotted path: `id`, or `genomicLocation.chromosome` for a nested one. */
  schemaRow(columnPath: string): Locator {
    return this.schemaTable.getByTestId(`schema-row-${columnPath}`);
  }

  /** The name cell of a column's row: the name behind one `│⎯` per level of nesting. */
  schemaRowName(columnPath: string): Locator {
    return this.schemaRow(columnPath).getByTestId("schema-column-name");
  }

  schemaRowType(columnPath: string): Locator {
    return this.schemaRow(columnPath).getByTestId("schema-column-type");
  }

  get schemaKeyTooltip(): Locator {
    return this.page.getByTestId("schema-key-tooltip");
  }

  get accessLocations(): Locator {
    return this.datasetDialog.getByTestId("access-locations");
  }

  get accessScripts(): Locator {
    return this.datasetDialog.getByTestId("access-scripts");
  }

  locationTab(tab: LocationTab): Locator {
    return this.accessLocations.getByTestId(`btn-group-tab-${tab}`);
  }

  accessScriptTab(tool: ScriptTool): Locator {
    return this.accessScripts.getByTestId(`btn-group-tab-${tool}`);
  }

  /** The location currently shown in the dialog. */
  get locationCode(): Locator {
    return this.accessLocations.getByTestId("code-block");
  }

  /** The command currently shown in the dialog. */
  get scriptCode(): Locator {
    return this.accessScripts.getByTestId("code-block");
  }

  get browseLink(): Locator {
    return this.accessLocations.getByTestId("access-browse-link");
  }

  // ---- network view --------------------------------------------------------------------

  get networkView(): Locator {
    return this.page.getByTestId("network-view");
  }

  /** The canvas area that holds the graph and the details panel. */
  get canvas(): Locator {
    return this.page.getByTestId("network-canvas");
  }

  get graphNodes(): Locator {
    return this.page.getByTestId(/^graph-node-(?!box$)/);
  }

  /** The node of a dataset, by dataset id. */
  node(id: string): Locator {
    return this.page.getByTestId(`graph-node-${id}`);
  }

  /** The visible box of a node: the part of it that takes clicks and hovers. */
  nodeBox(id: string): Locator {
    return this.node(id).getByTestId("graph-node-box");
  }

  get scopeAll(): Locator {
    return this.page.getByTestId("network-scope-all");
  }

  get scopeBag(): Locator {
    return this.page.getByTestId("network-scope-basket");
  }

  /** The group that holds the scope switch: it is the only switch above the canvas. */
  get scopeSwitch(): Locator {
    return this.page.getByTestId("network-scope");
  }

  get hint(): Locator {
    return this.page.getByTestId("network-hint");
  }

  get legend(): Locator {
    return this.page.getByTestId("network-legend");
  }

  legendItem(category: string): Locator {
    return this.page.getByTestId(`legend-item-${slug(category)}`);
  }

  get legendItems(): Locator {
    return this.legend.getByTestId(/^legend-item-/);
  }

  get lanes(): Locator {
    return this.page.getByTestId("graph-lane");
  }

  /** For each node, the title of the lane band its position lies in (null when it lies in none). */
  async nodeLanes(): Promise<{ id: string; lane: string | null }[]> {
    return this.page.evaluate(() => {
      const lanes = [...document.querySelectorAll("[data-testid='graph-lane']")].map((g) => {
        const rect = g.querySelector("[data-testid='graph-lane-band']");
        return {
          title: g.querySelector("[data-testid='graph-lane-title']")?.textContent ?? "",
          x: Number(rect?.getAttribute("x")),
          y: Number(rect?.getAttribute("y")),
          w: Number(rect?.getAttribute("width")),
          h: Number(rect?.getAttribute("height")),
        };
      });
      return [
        ...document.querySelectorAll(
          "[data-testid^='graph-node-']:not([data-testid='graph-node-box'])"
        ),
      ].map((node) => {
        const m = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(node.getAttribute("transform") ?? "");
        const x = Number(m?.[1]);
        const y = Number(m?.[2]);
        const lane = lanes.find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
        return { id: node.getAttribute("data-testid") ?? "", lane: lane?.title ?? null };
      });
    });
  }

  get selectedChip(): Locator {
    return this.page.getByTestId("network-selected-chip");
  }

  get selectedChipClear(): Locator {
    return this.page.getByTestId("network-selected-clear");
  }

  get zoomIn(): Locator {
    return this.page.getByTestId("network-zoom-in");
  }

  get zoomOut(): Locator {
    return this.page.getByTestId("network-zoom-out");
  }

  get zoomFit(): Locator {
    return this.page.getByTestId("network-zoom-fit");
  }

  /** The zoom/pan transform of the whole canvas. */
  get zoomLayer(): Locator {
    return this.page.getByTestId("network-zoom-layer");
  }

  // ---- details panel of the selected node ---------------------------------------------

  /** The docked details panel of the selected node (there is at most one). */
  get panel(): Locator {
    return this.page.getByTestId("node-panel");
  }

  get panelName(): Locator {
    return this.panel.getByTestId("node-panel-name");
  }

  get panelId(): Locator {
    return this.panel.getByTestId("node-panel-id");
  }

  get panelType(): Locator {
    return this.panel.getByTestId("node-panel-type");
  }

  get panelClose(): Locator {
    return this.panel.getByTestId("node-panel-close");
  }

  get panelSchemaLink(): Locator {
    return this.panel.getByTestId("dataset-schema-link");
  }

  get panelAccessLink(): Locator {
    return this.panel.getByTestId("dataset-access-link");
  }

  /** The Add / In bag button of the selected node itself (the first in the panel). */
  get panelToggle(): Locator {
    return this.panel.getByTestId("basket-toggle").first();
  }

  get connectedTitle(): Locator {
    return this.panel.getByTestId("node-panel-connected-title");
  }

  get connectedRows(): Locator {
    return this.panel.getByTestId(/^connected-row-/);
  }

  connectedRow(id: string): Locator {
    return this.panel.getByTestId(`connected-row-${id}`);
  }

  connectedRowName(id: string): Locator {
    return this.connectedRow(id).getByTestId("connected-item-name");
  }

  /** The header button of a category group: it collapses and expands the group's rows. */
  connectedGroupToggle(group: Locator): Locator {
    return group.getByTestId("connected-header-toggle");
  }

  connectedRowSelect(id: string): Locator {
    return this.connectedRow(id).getByTestId("connected-item-select");
  }

  get connectedFilter(): Locator {
    return this.panel.getByTestId("connected-filter");
  }

  get connectedToggleAll(): Locator {
    return this.panel.getByTestId("connected-toggle-all");
  }

  connectedGroup(category: string): Locator {
    return this.panel.getByTestId(`connected-group-${slug(category)}`);
  }

  get connectedGroups(): Locator {
    return this.panel.getByTestId(/^connected-group-/);
  }

  /** The ids of the datasets the panel lists as connected, in list order. */
  async connectedIds(): Promise<string[]> {
    return this.connectedRows.evaluateAll((rows) =>
      rows.map((row) => (row.getAttribute("data-testid") ?? "").replace(/^connected-row-/, ""))
    );
  }

  /** Select a node by clicking it and wait for its details panel. */
  async selectNode(id: string, name: string): Promise<void> {
    await this.nodeBox(id).click();
    await expect(this.panel).toBeVisible();
    await expect(this.panelName).toHaveText(name);
    await expect(this.panelId).toHaveText(id);
  }

  // ---- hover preview ------------------------------------------------------------------

  get nodePopover(): Locator {
    return this.page.getByTestId("node-popover");
  }

  get popoverName(): Locator {
    return this.nodePopover.getByTestId("node-popover-name");
  }

  get popoverSchemaLink(): Locator {
    return this.nodePopover.getByTestId("dataset-schema-link");
  }

  get popoverAccessLink(): Locator {
    return this.nodePopover.getByTestId("dataset-access-link");
  }

  get popoverToggle(): Locator {
    return this.nodePopover.getByTestId("basket-toggle");
  }

  /** Hover a node and wait for its preview. */
  async previewNode(id: string, name: string): Promise<void> {
    await this.nodeBox(id).hover();
    await expect(this.nodePopover).toBeVisible();
    await expect(this.popoverName).toHaveText(name);
  }
}

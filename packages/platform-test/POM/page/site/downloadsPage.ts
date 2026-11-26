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

export type ScriptTab = "AWS CLI" | "Google Cloud CLI" | "Rsync" | "Wget";
export const SCRIPT_TABS: ScriptTab[] = ["AWS CLI", "Google Cloud CLI", "Rsync", "Wget"];

/** Where the page stores the bag between visits (see context/basketStorage.ts). */
export const BASKET_STORAGE_KEY = "ot.downloads.basket";

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** The data downloads page, /downloads: dataset cards, bag, network view and the dataset dialogs. */
export class DownloadsPage {
  constructor(readonly page: Page) {}

  /** Open the page (optionally with a query string or as a dialog route) and wait for the datasets. */
  async goto(path = "/downloads"): Promise<void> {
    await this.page.goto(path);
    await expect(this.heading, "the downloads page should show its title").toBeVisible();
    await expect(this.counter, "the dataset counter should show once the datasets have loaded").toBeVisible();
  }

  /** The Network view has no counter: wait for the graph instead. */
  async gotoNetwork(path = "/downloads?view=network"): Promise<void> {
    await this.page.goto(path);
    await expect(this.heading).toBeVisible();
    await expect(this.graphNodes.first()).toBeVisible();
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  // ---- header tags ---------------------------------------------------------------------

  tag(name: "Cite Us" | "Croissant" | "Parquet"): Locator {
    if (name === "Cite Us") return this.page.getByTestId("publications-drawer-trigger");
    return this.page.getByRole("button", { name });
  }

  /** The version chip, e.g. "26.12". */
  get versionTag(): Locator {
    return this.page.getByRole("button", { name: /^\d+\.\d+$/ });
  }

  // ---- toolbar -------------------------------------------------------------------------

  get searchBox(): Locator {
    return this.page.getByRole("searchbox", { name: "Search datasets" });
  }

  get clearSearchButton(): Locator {
    return this.page.getByRole("button", { name: "Clear search", exact: true });
  }

  get clearAllButton(): Locator {
    return this.page.getByRole("button", { name: "Clear all", exact: true });
  }

  /** "12 of 64": datasets shown of all datasets. */
  get counter(): Locator {
    return this.page.getByText(/^\d+ of \d+$/);
  }

  get categoryGroup(): Locator {
    return this.page.getByRole("group", { name: "Filter by category" });
  }

  chip(category: string): Locator {
    return this.categoryGroup.getByRole("checkbox", { name: new RegExp(`^${category} \\d+$`) });
  }

  get chips(): Locator {
    return this.categoryGroup.getByRole("checkbox");
  }

  get cardsToggle(): Locator {
    return this.page.getByRole("button", { name: "Cards", exact: true });
  }

  get networkToggle(): Locator {
    return this.page.getByRole("button", { name: "Network", exact: true });
  }

  // ---- cards ---------------------------------------------------------------------------

  get cards(): Locator {
    return this.page.getByRole("article");
  }

  card(name: string): Locator {
    return this.page.getByRole("article", { name, exact: true });
  }

  cardId(card: Locator): Locator {
    return card.locator("xpath=.//h3/following-sibling::div[1]");
  }

  schemaLink(card: Locator): Locator {
    return card.getByRole("link", { name: "Schema" });
  }

  accessLink(card: Locator): Locator {
    return card.getByRole("link", { name: "Access data" });
  }

  /** The Add / In bag button of a card or panel. */
  addButton(scope: Locator): Locator {
    return scope.getByRole("button", { name: /^(Add|Remove) .* (to|from) bag$/ });
  }

  /** "Associations 12" style numbers in the counter: how many datasets match right now. */
  async shownCount(): Promise<number> {
    const text = (await this.counter.textContent()) ?? "";
    const match = /^(\d+) of (\d+)$/.exec(text);
    expect(match, `the counter "${text}" should read "<shown> of <all>"`).not.toBeNull();
    return Number(match?.[1]);
  }

  /** Wait until the counter says `shown of total` and exactly that many cards are on the page. */
  async expectShown(shown: number, total?: number): Promise<void> {
    if (total === undefined) await expect(this.counter).toHaveText(new RegExp(`^${shown} of \\d+$`));
    else await expect(this.counter).toHaveText(`${shown} of ${total}`);
    await expect(this.cards).toHaveCount(shown);
  }

  /** Total number of datasets: read from the counter, and checked against the cards on an unfiltered page. */
  async totalDatasets(): Promise<number> {
    const text = (await this.counter.textContent()) ?? "";
    const total = Number(/of (\d+)$/.exec(text)?.[1]);
    expect(total, `the counter "${text}" should end with the number of datasets`).toBeGreaterThan(0);
    return total;
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
    await expect(this.searchBox).toHaveValue(term);
  }

  // ---- empty states and results bar ---------------------------------------------------

  get emptyState(): Locator {
    return this.page.getByRole("status").filter({ has: this.page.getByRole("heading", { level: 3 }) });
  }

  get resultsSummary(): Locator {
    return this.page.locator("p").filter({ has: this.page.locator("b") });
  }

  get addAllButton(): Locator {
    return this.page.getByRole("button", { name: /^(\+ Add all \d+ to bag|All in bag)$/ });
  }

  // ---- bag -----------------------------------------------------------------------------

  /** The toolbar's "Your data bag" button; its accessible name carries the count. */
  get bagButton(): Locator {
    return this.page.getByRole("button", { name: /^Your data bag, \d+ datasets?$/ });
  }

  async expectBagCount(count: number): Promise<void> {
    await expect(this.bagButton).toHaveAccessibleName(`Your data bag, ${plural(count, "dataset")}`);
  }

  get drawer(): Locator {
    // the drawer's dialog element carries no accessible name, so it is found by its heading
    return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Your data bag", level: 2 }) });
  }

  get drawerRows(): Locator {
    return this.drawer.getByRole("listitem");
  }

  drawerRow(name: string): Locator {
    return this.drawerRows.filter({ hasText: name });
  }

  get emptyBagButton(): Locator {
    return this.drawer.getByRole("button", { name: "Empty bag" });
  }

  get closeBagButton(): Locator {
    return this.drawer.getByRole("button", { name: "Close bag" });
  }

  get undoSnackbar(): Locator {
    return this.page.getByText("Bag emptied", { exact: true }).first();
  }

  get undoButton(): Locator {
    return this.page.getByRole("button", { name: "Undo", exact: true });
  }

  /** Open the bag drawer and check it lists `count` datasets. */
  async openBag(count: number): Promise<void> {
    await this.bagButton.click();
    await expect(this.drawer).toBeVisible();
    await expect(this.drawer.getByText(plural(count, "dataset"), { exact: true })).toBeVisible();
    await expect(this.drawerRows).toHaveCount(count);
  }

  get coachMark(): Locator {
    return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Added to your bag" }) });
  }

  scriptTab(name: ScriptTab): Locator {
    return this.drawer.getByRole("button", { name, exact: true });
  }

  /** The text of the access script currently shown in the drawer. */
  get scriptText(): Locator {
    return this.drawer.locator("pre");
  }

  copyScriptButton(name: ScriptTab): Locator {
    return this.drawer.getByRole("button", { name: `Copy ${name} script` });
  }

  // ---- schema / access dialog ---------------------------------------------------------

  get datasetDialog(): Locator {
    return this.page.getByRole("dialog", { name: /^Dataset: / });
  }

  get dialogSwitchButton(): Locator {
    return this.datasetDialog.getByRole("button", { name: /^(Show Schema|Access Data)$/ });
  }

  get dialogCloseButton(): Locator {
    return this.datasetDialog.getByRole("button", { name: "Close", exact: true });
  }

  /** The columns of a schema dialog. */
  get schemaTable(): Locator {
    return this.datasetDialog.getByRole("table");
  }

  // ---- network view --------------------------------------------------------------------

  get graphNodes(): Locator {
    return this.page.locator("g.graph-node");
  }

  /** The node of a dataset, by dataset id. */
  node(id: string): Locator {
    return this.page.getByTestId(`graph-node-${id}`);
  }

  /** The visible box of a node: the part of it that takes clicks and hovers. */
  nodeBox(id: string): Locator {
    return this.node(id).locator("rect.node-box");
  }

  scopeRadio(name: "All datasets" | RegExp): Locator {
    return this.page.getByRole("radiogroup", { name: "Datasets shown" }).getByRole("radio", { name });
  }

  layoutRadio(name: "Stacked" | "Radial"): Locator {
    return this.page.getByRole("radiogroup", { name: "Layout" }).getByRole("radio", { name });
  }

  get legend(): Locator {
    return this.page.getByRole("list", { name: "Legend" });
  }

  /** The docked details panel of the selected node. */
  panel(label: string): Locator {
    return this.page.getByRole("complementary", { name: `${label} details` });
  }

  get panels(): Locator {
    return this.page.getByRole("complementary");
  }

  get selectedChip(): Locator {
    return this.page.getByText(/^Selected: /);
  }

  /** Node ids and their transforms, to tell whether a layout change moved them. */
  async nodePositions(): Promise<Record<string, string>> {
    return this.graphNodes.evaluateAll((nodes) =>
      Object.fromEntries(
        nodes.map((node) => [node.getAttribute("data-testid"), node.getAttribute("transform") ?? ""])
      )
    );
  }

  /** The zoom/pan transform of the whole canvas. */
  get zoomLayer(): Locator {
    return this.page.locator("g.zoom-layer");
  }

  nodePopover(label: string): Locator {
    return this.page.getByRole("dialog", { name: `${label} preview` });
  }

  /** Select a node by clicking it and wait for its details panel. */
  async selectNode(id: string, label: string): Promise<Locator> {
    await this.nodeBox(id).click();
    const panel = this.panel(label);
    await expect(panel).toBeVisible();
    return panel;
  }
}

import { expect, type Locator, type Page } from "@playwright/test";

/** The /api page: documentation links, example query buttons and the GraphiQL playground. */
export class ApiPage {
  readonly title: Locator;
  readonly examples: Locator;
  readonly playground: Locator;
  readonly queryEditor: Locator;
  readonly result: Locator;
  readonly docExplorer: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId("api-page-title");
    this.examples = page.getByTestId("api-example-queries");
    this.playground = page.getByTestId("api-playground");
    this.queryEditor = this.playground.locator(".query-editor .CodeMirror");
    this.result = this.playground.locator(".result-window");
    this.docExplorer = this.playground.locator(".doc-explorer");
  }

  async goto(): Promise<void> {
    await this.page.goto("/api");
    await expect(this.title).toBeVisible();
    await expect(this.queryEditor).toBeVisible();
  }

  link(name: string): Locator {
    return this.page.getByRole("link", { name, exact: true });
  }

  /** The accordion header of one group of example queries. */
  group(name: string): Locator {
    return this.examples.getByRole("button", { name, exact: true });
  }

  async openGroup(name: string): Promise<void> {
    const header = this.group(name);
    await header.click();
    await expect(header).toHaveAttribute("aria-expanded", "true");
  }

  /** The "Run sample query" button below the example description with this text. */
  sampleButton(description: string): Locator {
    return this.examples
      .getByText(description, { exact: true })
      .locator("xpath=following-sibling::button[1]");
  }

  /** Load the example into the editor, and assert the editor now holds it. */
  async loadExample(group: string, description: string, operation: string): Promise<void> {
    await this.openGroup(group);
    await this.sampleButton(description).click();
    await expect(this.queryEditor).toContainText(`query ${operation}`);
  }

  /** Execute the query in the editor (the toolbar is hidden, so use the editor shortcut). */
  async run(): Promise<void> {
    await this.queryEditor.click();
    await this.page.keyboard.press("Control+Enter");
  }
}

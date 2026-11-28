import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { expectSectionLoaded, sectionLocator, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

/** The evidence page the somatic sections are tested on: BRAF in melanoma. */
export const BRAF = "ENSG00000157764";
export const MELANOMA = "MONDO_0005105";
export const PAGE_SIZE = 10;

/** An evidence page with none of the somatic sections (IL6R in myocardial infarction). */
export const NO_SOMATIC_EVIDENCE = { ensgId: "ENSG00000160712", efoId: "MONDO_0005068" };

export type RoleInCancer = {
  target: {
    hallmarks: { attributes: { name: string; description: string; pmid: number }[] } | null;
  };
};

/** The `{ count, rows }` the section's query returns under `disease.<alias>`. */
export type EvidenceList<Row> = { count: number; rows: Row[] };

/** Open /evidence/<ensg>/<efo> and wait until its header shows the page title. */
export async function gotoEvidence(page: Page, ensgId = BRAF, efoId = MELANOMA): Promise<void> {
  await page.goto(`/evidence/${ensgId}/${efoId}`);
  await expect(page.getByTestId("profile-page-header-text")).toContainText("Evidence for");
}

/**
 * Wait for the response of one GraphQL operation at one page index. Start it before the
 * click that asks for the page, and await it afterwards.
 */
export async function waitForPageOfOperation<Data>(
  page: Page,
  operationName: string,
  pageIndex: number,
  pageSize = PAGE_SIZE
): Promise<Data> {
  const isIt = (response: Response): boolean => {
    const request = response.request();
    if (request.method() !== "POST") return false;
    const body = request.postData();
    if (!body?.includes('"query"')) return false;
    const parsed = JSON.parse(body) as {
      operationName?: string;
      variables?: { index?: number; size?: number };
    };
    return (
      parsed.operationName === operationName &&
      parsed.variables?.index === pageIndex &&
      parsed.variables?.size === pageSize
    );
  };
  const response = await page.waitForResponse(isIt, { timeout: 60_000 });
  expect(response.status(), `${operationName} page ${pageIndex} should answer with HTTP 200`).toBe(
    200
  );
  const body = (await response.json()) as { data: Data; errors?: unknown[] };
  expect(body.errors, `${operationName} should not return GraphQL errors`).toBeUndefined();
  return body.data;
}

/** The percentage the section prints for a mutated / tested sample count. */
export function formatPercent(mutated: number, tested: number): string {
  const percent = (mutated / tested) * 100;
  return `${percent < 5 ? parseFloat(percent.toFixed(2)).toString() : Math.round(percent)}%`;
}

/**
 * A somatic-evidence section of the evidence page: a "role in cancer" line above a
 * server-paginated table, with no search box.
 */
export class SomaticEvidenceSection {
  readonly section: Locator;
  readonly table: OtTable;

  constructor(
    readonly page: Page,
    readonly id: string
  ) {
    this.section = sectionLocator(page, id);
    this.table = new OtTable(this.section);
  }

  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, this.id);
    await this.table.expectLoaded();
  }

  get title(): Locator {
    return this.section.getByTestId(`${sectionTestId(this.id)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The data type chip next to the title. */
  chip(text: string): Locator {
    return this.section.getByText(text, { exact: true });
  }

  /** The "<symbol> role in cancer:" label (absent on the biomarkers section). */
  get roleInCancerLabel(): Locator {
    return this.section.getByTestId("role-in-cancer").getByText("role in cancer:");
  }

  /** The chips after the label, one per "role in cancer" hallmark. */
  get roleInCancerChips(): Locator {
    return this.section.getByTestId("role-in-cancer").locator("[data-testid^='chip-item-']");
  }

  /** The literature cell of a row: a drawer trigger, or N/A when the row cites nothing. */
  literatureTrigger(row: number, column: number): Locator {
    return this.table.cell(row, column).getByTestId("publications-drawer-trigger");
  }

  /** The "?" help icon of a cell, which carries a tooltip. */
  helpIcon(row: number, column: number): Locator {
    return this.table.cell(row, column).locator("sup");
  }

  /**
   * Open the API query drawer and assert it holds the section's operation and variables,
   * and that the playground read the API's schema: its documentation explorer lists the
   * root types instead of reporting an invalid schema. Then close the drawer.
   */
  async expectApiQuery(operationName: string, ensgId: string, efoId: string): Promise<void> {
    const drawer = this.table.apiQueryDrawer;
    await this.table.apiQueryButton.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(drawer, `the playground should hold the ${operationName} query`).toContainText(
      operationName
    );
    await expect(drawer, "the playground should hold the section's variables").toContainText(
      ensgId
    );
    await expect(drawer).toContainText(efoId);
    await drawer.getByRole("button", { name: "Open Documentation Explorer" }).click();
    await expect(
      drawer.getByText("A GraphQL schema provides a root type for each kind of operation."),
      "the playground should have read the API schema"
    ).toBeVisible();
    await expect(drawer.getByText(/schema is invalid/i)).toHaveCount(0);
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }

  /** Assert the line above the table lists the target's roles in cancer, linked to Europe PMC. */
  async expectRoleInCancer(symbol: string, data: RoleInCancer): Promise<void> {
    const roles = (data.target.hallmarks?.attributes ?? []).filter(
      (attribute) => attribute.name === "role in cancer"
    );
    expect(roles.length, `${symbol} has roles in cancer`).toBeGreaterThan(0);
    await expect(this.roleInCancerLabel).toHaveText(`${symbol} role in cancer:`);
    await expect(this.roleInCancerChips).toHaveText(roles.map((role) => role.description));
    for (const [index, role] of roles.entries()) {
      const chip = this.roleInCancerChips.nth(index);
      await expect(chip).toHaveAttribute("href", `https://europepmc.org/article/MED/${role.pmid}`);
      await expect(chip).toHaveAttribute("target", "_blank");
    }
  }
}

import type { Locator, Page } from "@playwright/test";
import { OtTable } from "../../../../utils/table";
import { sectionLocator, sectionTestId } from "../../../../utils/sections";

/** Column positions of the credible sets table. */
export const GWAS_CS_COLUMNS = {
  credibleSet: 0,
  leadVariant: 1,
  pValue: 2,
  beta: 3,
  method: 4,
  confidence: 5,
  topL2G: 6,
  l2gScore: 7,
  size: 8,
} as const;

export type GwasCredibleSetRow = {
  credibleSetHref: string | null;
  leadVariant: string;
  leadVariantHref: string | null;
  /** mantissa x 10^exponent as a number, NaN when the cell shows no p-value. */
  pValue: number;
  beta: number;
  method: string;
  topL2G: string;
  topL2GHref: string | null;
  l2gScore: number;
  size: number;
};

/** The "GWAS Credible Sets" section of a GWAS study page (server-side table). */
export class GwasCredibleSetsSection {
  static readonly id = "gwas-credible-sets";
  readonly section: Locator;
  readonly table: OtTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, GwasCredibleSetsSection.id);
    this.table = new OtTable(this.section);
  }

  get title(): Locator {
    return this.page.getByTestId(`${sectionTestId(GwasCredibleSetsSection.id)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The empty-state message the table shows when a search matches nothing. */
  get noRows(): Locator {
    return this.section.getByText("No rows", { exact: false });
  }

  credibleSetLink(row: number): Locator {
    return this.table.cell(row, GWAS_CS_COLUMNS.credibleSet).getByRole("link");
  }

  leadVariantLink(row: number): Locator {
    return this.table.cell(row, GWAS_CS_COLUMNS.leadVariant).getByRole("link");
  }

  topL2GLink(row: number): Locator {
    return this.table.cell(row, GWAS_CS_COLUMNS.topL2G).getByRole("link");
  }

  /** Read every row on the current page. Call it once the table has settled. */
  async readRows(): Promise<GwasCredibleSetRow[]> {
    const rows = await this.table.rows.all();
    const result: GwasCredibleSetRow[] = [];
    for (const row of rows) {
      const cells = row.locator("td");
      const text = async (index: number) => (await cells.nth(index).innerText()).trim();
      const href = (index: number) => cells.nth(index).getByRole("link").getAttribute("href");
      const pCell = (await text(GWAS_CS_COLUMNS.pValue)).replace(/\s+/g, "");
      const p = /^(\d+(?:\.\d+)?)×10(-?\d+)$/.exec(pCell);
      result.push({
        credibleSetHref: await href(GWAS_CS_COLUMNS.credibleSet),
        leadVariant: await text(GWAS_CS_COLUMNS.leadVariant),
        leadVariantHref: await href(GWAS_CS_COLUMNS.leadVariant),
        pValue: p ? Number(`${p[1]}e${p[2]}`) : Number.NaN,
        beta: Number(await text(GWAS_CS_COLUMNS.beta)),
        method: await text(GWAS_CS_COLUMNS.method),
        topL2G: await text(GWAS_CS_COLUMNS.topL2G),
        topL2GHref: await cells.nth(GWAS_CS_COLUMNS.topL2G).getByRole("link").count()
          ? await href(GWAS_CS_COLUMNS.topL2G)
          : null,
        l2gScore: Number(await text(GWAS_CS_COLUMNS.l2gScore)),
        size: Number((await text(GWAS_CS_COLUMNS.size)).replace(/,/g, "")),
      });
    }
    return result;
  }
}

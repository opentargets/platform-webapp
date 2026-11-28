import type { Locator, Page } from "@playwright/test";
import { sectionLocator, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

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

  /**
   * Read every row on the current page in one snapshot, so a table that re-renders while
   * a poll is running cannot leave the read waiting on a row that is gone.
   */
  async readRows(): Promise<GwasCredibleSetRow[]> {
    const raw = await this.table.rows.evaluateAll(
      (rows, columns) =>
        rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          const text = (index: number) => (cells[index]?.innerText ?? "").trim();
          const href = (index: number) =>
            cells[index]?.querySelector("a")?.getAttribute("href") ?? null;
          return {
            credibleSetHref: href(columns.credibleSet),
            leadVariant: text(columns.leadVariant),
            leadVariantHref: href(columns.leadVariant),
            pValue: text(columns.pValue).replace(/\s+/g, ""),
            beta: text(columns.beta),
            method: text(columns.method),
            topL2G: text(columns.topL2G),
            topL2GHref: href(columns.topL2G),
            l2gScore: text(columns.l2gScore),
            size: text(columns.size),
          };
        }),
      GWAS_CS_COLUMNS
    );
    return raw.map((row) => {
      const p = /^(\d+(?:\.\d+)?)×10(-?\d+)$/.exec(row.pValue);
      return {
        ...row,
        pValue: p ? Number(`${p[1]}e${p[2]}`) : Number.NaN,
        beta: Number(row.beta),
        l2gScore: Number(row.l2gScore),
        size: Number(row.size.replace(/,/g, "")),
      };
    });
  }
}

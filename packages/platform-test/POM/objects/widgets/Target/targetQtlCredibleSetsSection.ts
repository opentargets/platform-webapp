import type { Locator, Page } from "@playwright/test";
import { ProfileSection, TableControls } from "./sectionWidgets";

/**
 * Column headers of the target molQTL credible sets table, in order. "Beta" and
 * "Fine-mapping confidence" carry a "?" help icon after the label.
 */
export const TARGET_QTL_COLUMNS = [
  "Credible set",
  "Lead variant",
  "Study",
  "Type",
  "Condition",
  "P-value",
  /^Beta\s*\?$/,
  /^Fine-mapping confidence\s*\?$/,
  "Fine-mapping method",
  "Credible set size",
] as const;

export const TARGET_QTL_COLUMN = {
  credibleSet: 0,
  leadVariant: 1,
  study: 2,
  type: 3,
  condition: 4,
  pValue: 5,
  beta: 6,
  confidence: 7,
  method: 8,
  size: 9,
} as const;

/** GraphQL operation behind the section (packages/sections/src/target/QTLCredibleSets). */
export const TARGET_QTL_OPERATION = "TargetQTLCredibleSetsQuery";

/** "4.78×10-65" as rendered by ScientificNotation: mantissa with two decimals, exponent as superscript. */
export const P_VALUE_PATTERN = /^(\d\.\d{2})×10(-?\d+)$/;

/** log10 of a rendered p-value, for comparing rows. Throws when the text is not a p-value. */
export function log10PValue(text: string): number {
  const match = P_VALUE_PATTERN.exec(text.replace(/\s+/g, ""));
  if (!match) throw new Error(`"${text}" is not a p-value in scientific notation`);
  return Math.log10(Number(match[1])) + Number(match[2]);
}

/**
 * Target profile > molQTL Credible Sets: a server-backed table, sorted by p-value. The
 * API has no sort or search input for it, so the table downloads every row to sort and
 * to search, and paginates the result itself.
 */
export class TargetQtlCredibleSetsSection extends ProfileSection {
  readonly table: TableControls;

  constructor(page: Page) {
    super(page, "qtl_credible_sets");
    this.table = new TableControls(page, this.section);
  }

  cell(row: number, column: keyof typeof TARGET_QTL_COLUMN): Locator {
    return this.table.rows.nth(row).locator("td").nth(TARGET_QTL_COLUMN[column]);
  }

  /** Every cell of one column on the current page. */
  column(column: keyof typeof TARGET_QTL_COLUMN): Locator {
    return this.table.rows.locator(`td:nth-child(${TARGET_QTL_COLUMN[column] + 1})`);
  }

  /** The header cell of a column; clicking its label sorts a sortable column. */
  header(column: keyof typeof TARGET_QTL_COLUMN): Locator {
    return this.table.headers.nth(TARGET_QTL_COLUMN[column]);
  }

  /** The trimmed text of one column for the rows on the current page. */
  async columnTexts(column: keyof typeof TARGET_QTL_COLUMN): Promise<string[]> {
    return (await this.column(column).allInnerTexts()).map((text) =>
      text.replace(/\s+/g, " ").trim()
    );
  }
}

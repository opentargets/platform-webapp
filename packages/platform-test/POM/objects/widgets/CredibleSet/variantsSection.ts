import type { Locator, Page } from "@playwright/test";
import { ServerTableSection, type SortableColumn } from "./serverTableSection";

/** The "Variants" section of the credible set page: the fine-mapped locus table. */
export class CredibleSetVariantsSection extends ServerTableSection {
  static readonly id = "variants";
  static readonly operation = "VariantsQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Variant",
    "P-value",
    "Beta?",
    "Standard error?",
    "LD (r²)?",
    "Posterior Probability?",
    "log(BF)?",
    "Predicted consequence?",
  ];
  /** Column positions in the table. */
  static readonly column = {
    variant: 0,
    pValue: 1,
    beta: 2,
    standardError: 3,
    ld: 4,
    posterior: 5,
    logBf: 6,
    consequence: 7,
  } as const;
  static readonly searchPlaceholder = "Search variant ID or consequence…";
  /** What the search box asks the server to look in. */
  static readonly searchFields = ["MOST_SEVERE_CONSEQUENCE_LABEL", "VARIANT_ID"];
  /** The sort the table opens with. */
  static readonly defaultSort = { key: "POSTERIOR_PROBABILITY", direction: "DESCENDING" } as const;
  /**
   * The columns the server can sort, with the sort key each one sends. Standard error is shown
   * to three decimals, where every variant of the test credible sets reads the same, and LD is
   * not available for them: neither can show its order, so their kind is "unreadable".
   */
  static readonly sortable: readonly SortableColumn[] = [
    { header: "Variant", key: "VARIANT", column: 0, kind: "text" },
    { header: "P-value", key: "P_VALUE", column: 1, kind: "pValue" },
    { header: "Beta", key: "REPORTED_BETA", column: 2, kind: "number" },
    { header: "Standard error", key: "REPORTED_STANDARD_ERROR", column: 3, kind: "unreadable" },
    { header: "LD (r²)", key: "R2_OVERALL", column: 4, kind: "unreadable" },
    { header: "Posterior Probability", key: "POSTERIOR_PROBABILITY", column: 5, kind: "number" },
    { header: "log(BF)", key: "LOG_BAYES_FACTOR", column: 6, kind: "number" },
  ];
  /** The columns with no sort field: their titles are not controls. */
  static readonly notSortable = ["Predicted consequence"];

  constructor(page: Page) {
    super(page, CredibleSetVariantsSection.id, CredibleSetVariantsSection.operation);
  }

  /** The variant link of a row. */
  variantLink(rowIndex: number): Locator {
    return this.link(rowIndex, CredibleSetVariantsSection.column.variant);
  }

  /** The "lead" chip, which only the lead variant's row carries. */
  get leadChips(): Locator {
    return this.rows.getByText("lead", { exact: true });
  }

  /** The ontology link of a row's predicted consequence. */
  consequenceLink(rowIndex: number): Locator {
    return this.link(rowIndex, CredibleSetVariantsSection.column.consequence);
  }

  /** The variant ids on this page, without the "lead" chip. */
  async variantIds(): Promise<string[]> {
    return (await this.columnTexts(CredibleSetVariantsSection.column.variant)).map((text) =>
      text.replace(/\s*lead$/, "")
    );
  }
}

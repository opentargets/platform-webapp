import type { Locator, Page } from "@playwright/test";
import { ServerTableSection, type SortableColumn } from "./serverTableSection";

/** The "GWAS Colocalisation" section of the credible set page. */
export class GWASColocSection extends ServerTableSection {
  static readonly id = "gwas-coloc";
  static readonly operation = "GWASColocQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Credible set",
    "Study",
    "Reported trait",
    "First author",
    "Lead Variant",
    "P-Value",
    "Colocalising Variants (n)",
    "Directionality?",
    "H3?",
    "H4?",
    "CLPP?",
  ];
  static readonly column = {
    credibleSet: 0,
    study: 1,
    trait: 2,
    author: 3,
    leadVariant: 4,
    pValue: 5,
    variants: 6,
    directionality: 7,
    h3: 8,
    h4: 9,
    clpp: 10,
  } as const;
  static readonly searchPlaceholder = "Search all columns...";
  /** What the search box asks the server to look in: the fields of the first column. */
  static readonly searchFields = ["STUDY_ID", "TRAIT_FROM_SOURCE", "PUBLICATION_FIRST_AUTHOR", "LEAD_VARIANT_ID"];
  /** The sort the table opens with. */
  static readonly defaultSort = { key: "H4", direction: "DESCENDING" } as const;
  /** The columns the server can sort, with the sort key each one sends. */
  static readonly sortable: readonly SortableColumn[] = [
    { header: "Lead Variant", key: "LEAD_VARIANT", column: 4, kind: "text" },
    { header: "P-Value", key: "P_VALUE", column: 5, kind: "pValue" },
    { header: "Colocalising Variants (n)", key: "NUMBER_COLOCALISING_VARIANTS", column: 6, kind: "number" },
    { header: "H3", key: "H3", column: 8, kind: "number" },
    { header: "H4", key: "H4", column: 9, kind: "number" },
    { header: "CLPP", key: "CLPP", column: 10, kind: "number" },
  ];
  /** The columns with no sort field: their titles are not controls. */
  static readonly notSortable = ["Credible set", "Study", "Reported trait", "First author", "Directionality"];

  constructor(page: Page) {
    super(page, GWASColocSection.id, GWASColocSection.operation);
  }

  /** The "View" link of a row to the other credible set. */
  credibleSetLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.credibleSet);
  }

  studyLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.study);
  }

  leadVariantLink(rowIndex: number): Locator {
    return this.link(rowIndex, GWASColocSection.column.leadVariant);
  }

  /** The cell of a row that shows Same / Opposite / Inconclusive. */
  directionality(rowIndex: number): Locator {
    return this.cell(rowIndex, GWASColocSection.column.directionality);
  }
}

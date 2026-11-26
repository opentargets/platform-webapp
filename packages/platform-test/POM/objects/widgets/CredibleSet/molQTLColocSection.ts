import type { Locator, Page } from "@playwright/test";
import { ServerTableSection, type SortableColumn } from "./serverTableSection";

/** The "MolQTL Colocalisation" section of the credible set page. */
export class MolQTLColocSection extends ServerTableSection {
  static readonly id = "molqtl-coloc";
  static readonly operation = "MolQTLColocQuery";
  /** The header cells as rendered: the "?" is the help icon of a column with a tooltip. */
  static readonly headers = [
    "Credible set",
    "Study",
    "Type",
    "Affected gene",
    "Affected tissue/cell",
    "Condition",
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
    type: 2,
    gene: 3,
    tissue: 4,
    condition: 5,
    leadVariant: 6,
    pValue: 7,
    variants: 8,
    directionality: 9,
    h3: 10,
    h4: 11,
    clpp: 12,
  } as const;
  /** The study types the query asks for: every molecular QTL type, no GWAS. */
  static readonly studyTypes = ["scsqtl", "sceqtl", "scpqtl", "sctuqtl", "sqtl", "eqtl", "pqtl", "tuqtl"];
  static readonly searchPlaceholder = "Search all columns...";
  /** What the search box asks the server to look in: the fields of the first column. */
  static readonly searchFields = ["STUDY_ID", "TARGET_APPROVED_SYMBOL", "BIOSAMPLE_NAME", "LEAD_VARIANT_ID"];
  /** The sort the table opens with. */
  static readonly defaultSort = { key: "H4", direction: "DESCENDING" } as const;
  /** The columns the server can sort, with the sort key each one sends. */
  static readonly sortable: readonly SortableColumn[] = [
    { header: "Lead Variant", key: "LEAD_VARIANT", column: 6, kind: "text" },
    { header: "P-Value", key: "P_VALUE", column: 7, kind: "pValue" },
    { header: "Colocalising Variants (n)", key: "NUMBER_COLOCALISING_VARIANTS", column: 8, kind: "number" },
    { header: "H3", key: "H3", column: 10, kind: "number" },
    { header: "H4", key: "H4", column: 11, kind: "number" },
    { header: "CLPP", key: "CLPP", column: 12, kind: "number" },
  ];
  /** The columns with no sort field: their titles are not controls. */
  static readonly notSortable = [
    "Credible set",
    "Study",
    "Type",
    "Affected gene",
    "Affected tissue/cell",
    "Condition",
    "Directionality",
  ];

  constructor(page: Page) {
    super(page, MolQTLColocSection.id, MolQTLColocSection.operation);
  }

  credibleSetLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.credibleSet);
  }

  studyLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.study);
  }

  leadVariantLink(rowIndex: number): Locator {
    return this.link(rowIndex, MolQTLColocSection.column.leadVariant);
  }

  directionality(rowIndex: number): Locator {
    return this.cell(rowIndex, MolQTLColocSection.column.directionality);
  }
}

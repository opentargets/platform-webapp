import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { SectionDataControls } from "./sectionDataControls";

/**
 * The data columns of the summary heatmap, in page order. `slug` is the column's test id
 * suffix, `datatype` its `datatypeId` in the API.
 */
export const EXPRESSION_COLUMNS = [
  { slug: "scrna-seq", datatype: "scrna-seq", label: "Single-cell RNA-seq", axisUnit: "CPM" },
  { slug: "bulk-rna-seq", datatype: "bulk rna-seq", label: "Bulk RNA-seq", axisUnit: "TPM" },
  {
    slug: "mass-spectrometry-proteomics",
    datatype: "mass-spectrometry proteomics",
    label: "MS proteomics",
    axisUnit: "PPB",
  },
] as const;

export type ExpressionColumnSlug = (typeof EXPRESSION_COLUMNS)[number]["slug"];
export type ExpressionView = "tissue" | "celltype";

type Biosample = { biosampleId: string; biosampleName: string } | null;

export type ExpressionRow = {
  tissueBiosample: Biosample;
  tissueBiosampleParent: Biosample;
  celltypeBiosample: Biosample;
  celltypeBiosampleParent: Biosample;
  median: number | null;
  datasourceId: string;
  datatypeId: string;
  specificity_score: number | null;
  unit: string;
};

export type ExpressionData = {
  target: { id: string; baselineExpression: { count: number; rows: ExpressionRow[] } };
};

/** A cell of the heatmap: bar width in percent, "N/A" (measured, nothing detected) or null (no data). */
export type CellValue = number | "N/A" | null;

export type RowSnapshot = { name: string } & Record<ExpressionColumnSlug, CellValue>;

/**
 * How the widget groups the API rows for one view (see BaselineExpression/processData.ts):
 * first level = parent biosamples, second level = biosamples measured on their own, third
 * level = the other dimension's biosamples measured within a second-level biosample.
 */
export function groupForView(rows: readonly ExpressionRow[], view: ExpressionView) {
  const top = view === "tissue" ? "tissue" : "celltype";
  const other = view === "tissue" ? "celltype" : "tissue";
  const secondLevelRows = rows.filter((row) => row[`${top}Biosample`] && !row[`${other}Biosample`]);
  const thirdLevelRows = rows.filter((row) => row[`${top}Biosample`] && row[`${other}Biosample`]);

  /** parent name -> names of its second-level biosamples */
  const children = new Map<string, Set<string>>();
  for (const row of secondLevelRows) {
    const parent = row[`${top}BiosampleParent`]?.biosampleName ?? "";
    const names = children.get(parent) ?? new Set<string>();
    names.add(row[`${top}Biosample`]?.biosampleName ?? "");
    children.set(parent, names);
  }

  /** second-level biosample name -> number of third-level measurements under it */
  const details = new Map<string, number>();
  for (const row of thirdLevelRows) {
    const name = row[`${top}Biosample`]?.biosampleName ?? "";
    details.set(name, (details.get(name) ?? 0) + 1);
  }

  const mostSpecific = secondLevelRows.reduce<ExpressionRow | null>(
    (best, row) =>
      row.specificity_score !== null &&
      (best === null || row.specificity_score > (best.specificity_score ?? -1))
        ? row
        : best,
    null
  );

  return {
    /** first-level row names */
    parents: [...children.keys()],
    children,
    details,
    /** the second-level row with the highest specificity: its datatype is the default sort */
    mostSpecific,
    datatypes: new Set(secondLevelRows.map(({ datatypeId }) => datatypeId)),
  };
}

/** The Baseline Expression widget of the target profile page. */
export class ExpressionSection {
  static readonly id = "baselineexpression";
  static readonly operation = "TargetExpressionQuery";

  readonly section: Locator;
  readonly header: Locator;
  readonly description: Locator;
  readonly summaryTab: Locator;
  readonly gtexTab: Locator;
  readonly heatmap: Locator;
  readonly controls: SectionDataControls;
  readonly collapseAll: Locator;
  readonly detailPlots: Locator;
  readonly gtexPlot: Locator;

  constructor(private readonly page: Page) {
    this.section = sectionLocator(page, ExpressionSection.id);
    this.header = this.section.getByTestId("section-baselineexpression-header");
    this.description = this.section.getByTestId("section-description");
    this.summaryTab = this.section.getByRole("tab", { name: "Summary" });
    this.gtexTab = this.section.getByRole("tab", { name: "Variation (GTEx)" });
    this.heatmap = this.section.getByTestId("baseline-expression-table");
    this.controls = new SectionDataControls(page, this.section);
    this.collapseAll = this.heatmap.getByTestId("baseline-expression-collapse-all");
    this.detailPlots = this.heatmap.getByTestId("baseline-expression-detail-plot");
    this.gtexPlot = this.section.getByTestId("gtex-variability-plot");
  }

  /** Assert the section is rendered with the summary heatmap loaded. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, ExpressionSection.id);
    await expect(this.summaryTab).toHaveAttribute("aria-selected", "true");
    await expect(this.heatmap).toBeVisible();
    await expect(this.rows(1).first()).toBeVisible();
  }

  /** The Tissue / Cell type toggle buttons. */
  viewButton(view: ExpressionView): Locator {
    return this.heatmap.getByRole("button", {
      name: view === "tissue" ? "tissue" : "cell type",
      exact: true,
    });
  }

  /** The dot on a view button: green when that view has a highly specific biosample. */
  viewSpecificityDot(view: ExpressionView, level: "high" | "low"): Locator {
    return this.viewButton(view).getByTestId(`baseline-expression-view-specificity-${level}`);
  }

  async switchView(view: ExpressionView): Promise<void> {
    await this.viewButton(view).click();
    await expect(this.viewButton(view)).toHaveAttribute("aria-pressed", "true");
    await expect(this.nameHeader).toContainText(view === "tissue" ? "Tissue" : "Cell Type");
  }

  get nameHeader(): Locator {
    return this.heatmap.getByTestId("baseline-expression-header-name");
  }

  columnHeader(slug: ExpressionColumnSlug): Locator {
    return this.heatmap.getByTestId(`baseline-expression-header-${slug}`);
  }

  /** Every header cell, in page order. */
  get headers(): Locator {
    return this.heatmap.locator("[data-testid^='baseline-expression-header-']");
  }

  /** The scale drawn above the first row of a column. */
  axis(slug: ExpressionColumnSlug): Locator {
    return this.heatmap.getByTestId(`baseline-expression-axis-${slug}`);
  }

  /** The "?" help icons of the legend and of the name column header. */
  helpIcon(label: "Specificity" | "Median expression"): Locator {
    return this.heatmap.getByRole("heading", { name: label }).locator("sup");
  }

  get nameHeaderHelpIcon(): Locator {
    return this.nameHeader.locator("sup");
  }

  /** Rows of one level: 1 = parent biosample, 2 = biosample under an expanded parent. */
  rows(level: 1 | 2): Locator {
    return this.heatmap.getByTestId(`baseline-expression-row-level-${level}`);
  }

  /** The row (of the given level) whose name is exactly `name`. */
  row(level: 1 | 2, name: string): Locator {
    return this.rows(level).filter({
      has: this.page.getByTestId("baseline-expression-cell-name").getByText(name, { exact: true }),
    });
  }

  nameCell(row: Locator): Locator {
    return row.getByTestId("baseline-expression-cell-name");
  }

  cell(row: Locator, slug: ExpressionColumnSlug): Locator {
    return row.getByTestId(`baseline-expression-cell-${slug}`);
  }

  bar(row: Locator, slug: ExpressionColumnSlug): Locator {
    return this.cell(row, slug).getByTestId("baseline-expression-bar");
  }

  /** The tooltip MUI renders in a portal while an element is hovered. */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  /**
   * Read the rows of one level as they are right now: name and, per data column, the bar
   * width in percent, "N/A" or null. Use inside `expect.poll` when the table is changing.
   */
  async snapshot(level: 1 | 2 = 1): Promise<RowSnapshot[]> {
    return this.rows(level).evaluateAll((rows) =>
      rows.map((row) => {
        const read = (slug: string): number | "N/A" | null => {
          const cell = row.querySelector(`[data-testid="baseline-expression-cell-${slug}"]`);
          if (!cell) return null;
          if (cell.querySelector('[data-testid="baseline-expression-na"]')) return "N/A";
          const bar = cell.querySelector('[data-testid="baseline-expression-bar"]');
          if (!bar?.parentElement?.parentElement) return null;
          // the bar's width is a percentage of its track (the grey container two levels up)
          const track = bar.parentElement.parentElement.getBoundingClientRect().width;
          return Math.round((bar.getBoundingClientRect().width / track) * 1000) / 10;
        };
        const name = row.querySelector('[data-testid="baseline-expression-cell-name"]');
        return {
          name: (name?.textContent ?? "").trim(),
          "scrna-seq": read("scrna-seq"),
          "bulk-rna-seq": read("bulk-rna-seq"),
          "mass-spectrometry-proteomics": read("mass-spectrometry-proteomics"),
        };
      })
    );
  }

  /** Click a column header label to cycle its sort, and wait for the expected state. */
  async sortBy(slug: ExpressionColumnSlug | "name", expected: "asc" | "desc"): Promise<void> {
    const header = slug === "name" ? this.nameHeader : this.columnHeader(slug);
    const label =
      slug === "name"
        ? header.getByText(/^(Tissue|Cell Type)/)
        : header.getByText(EXPRESSION_COLUMNS.find((column) => column.slug === slug)?.label ?? "");
    await label.click();
    await expect(header).toHaveAttribute("data-sort", expected);
  }

  /** Expand a first-level row and wait for its children to show. */
  async expand(name: string): Promise<void> {
    const row = this.row(1, name);
    await expect(row).toHaveAttribute("data-expanded", "false");
    await this.nameCell(row).click();
    await expect(row).toHaveAttribute("data-expanded", "true");
  }

  async collapse(name: string): Promise<void> {
    const row = this.row(1, name);
    await expect(row).toHaveAttribute("data-expanded", "true");
    await this.nameCell(row).click();
    await expect(row).toHaveAttribute("data-expanded", "false");
  }
}

/** A GTEx tissue of the stubbed GTEx API. */
export const STUBBED_GTEX_TISSUES = ["Stub_Tissue_Alpha", "Stub_Tissue_Beta", "Stub_Tissue_Gamma"];

/**
 * Answer the two GTEx Portal requests behind the "Variation (GTEx)" tab with a small,
 * deterministic data set, so the tab does not depend on a third-party service being up.
 * Returns the URLs that were requested.
 */
export async function stubGtexPortal(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route("https://gtexportal.org/api/v2/**", async (route) => {
    const url = route.request().url();
    requested.push(url);
    if (url.includes("/reference/gene")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [{ gencodeId: "ENSG00000000000.1" }] }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: STUBBED_GTEX_TISSUES.map((tissueSiteDetailId, index) => ({
          tissueSiteDetailId,
          // nine values around a median of (index + 1) * 10, plus one clear outlier
          data: [...Array.from({ length: 9 }, (_, i) => (index + 1) * 10 + i - 4), (index + 1) * 40],
        })),
      }),
    });
  });
  return requested;
}

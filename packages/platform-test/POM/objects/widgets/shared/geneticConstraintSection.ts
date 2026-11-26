import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** What the "Constraint metrics" cell of one row shows, parsed. */
export type ConstraintMetrics = {
  /** "Z" for synonymous and missense, "pLI" for a pLoF row that has an assessment. */
  scoreName: string;
  score: number;
  oe: number;
  oeLower: number;
  oeUpper: number;
};

const NUMBER = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
const METRICS = new RegExp(
  String.raw`^(Z|pLI) = (${NUMBER})\s*o/e = (${NUMBER}) \((${NUMBER}) - (${NUMBER})\)`
);

/** Genetic Constraint section of the target profile: gnomAD constraint per variant category. */
export class GeneticConstraintSection extends ProfileSection {
  static readonly COLUMNS = [
    "Category",
    /^Expected SNVs\s*\?$/,
    /^Observed SNVs\s*\?$/,
    "Constraint metrics",
  ];
  /** The rows gnomAD provides, in the order the table shows them. */
  static readonly CATEGORIES = ["Synonymous", "Missense", "pLoF"];
  /** The label the app gives each assessment score (filled circles out of five). */
  static readonly ASSESSMENT_LABELS: Record<number, string> = {
    5: "very high constraint",
    4: "high constraint",
    3: "medium constraint",
    2: "low constraint",
    1: "very low constraint",
    0: "very low constraint",
  };

  readonly controls: TableControls;

  constructor(page: Page) {
    super(page, "geneticconstraint");
    this.controls = new TableControls(page, this.section);
  }

  /** The row for a category ("Synonymous", "Missense" or "pLoF"). */
  row(category: string): Locator {
    return this.controls.rows.filter({
      has: this.page.locator("td:first-child", { hasText: new RegExp(`^${category}$`) }),
    });
  }

  expected(category: string): Locator {
    return this.row(category).locator("td").nth(1);
  }

  observed(category: string): Locator {
    return this.row(category).locator("td").nth(2);
  }

  metrics(category: string): Locator {
    return this.row(category).locator("td").nth(3);
  }

  /** The "?" in a column header; hovering it explains the column. */
  headerHelp(columnName: string): Locator {
    return this.controls.table.header(columnName).locator("sup");
  }

  /** The "N/5 <label>" link to the gene on gnomAD, shown in the pLoF row. */
  get assessmentLink(): Locator {
    return this.metrics("pLoF").getByRole("link");
  }

  get assessmentCircles(): Locator {
    return this.metrics("pLoF").getByTestId("constraint-assessment-circles");
  }

  get filledCircles(): Locator {
    return this.assessmentCircles.getByTestId("constraint-circle-filled");
  }

  get emptyCircles(): Locator {
    return this.assessmentCircles.getByTestId("constraint-circle-empty");
  }

  /** The "?" next to "Constraint assessment". */
  get assessmentHelp(): Locator {
    return this.metrics("pLoF").locator("sup");
  }

  /** Assert a metrics cell has the documented format and return its numbers. */
  async readMetrics(category: string): Promise<ConstraintMetrics> {
    await expect(
      this.metrics(category),
      `${category} metrics should read "<Z|pLI> = n  o/e = n (n - n)"`
    ).toHaveText(METRICS);
    const text = (await this.metrics(category).innerText()).replace(/\s+/g, " ").trim();
    const match = METRICS.exec(text) as RegExpExecArray;
    return {
      scoreName: match[1],
      score: Number(match[2]),
      oe: Number(match[3]),
      oeLower: Number(match[4]),
      oeUpper: Number(match[5]),
    };
  }
}

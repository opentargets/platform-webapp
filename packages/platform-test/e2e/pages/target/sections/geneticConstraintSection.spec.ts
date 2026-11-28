import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { GeneticConstraintSection } from "../../../../POM/objects/widgets/shared/geneticConstraintSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

const CATEGORIES = GeneticConstraintSection.CATEGORIES;

test.describe("Target profile: Genetic Constraint section", () => {
  test("shows its title, description and source link", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const constraint = new GeneticConstraintSection(page);

    await page.goto(`/target/${targetId}`);
    await constraint.expectLoaded();

    await expect(constraint.title).toHaveText("Genetic Constraint");
    await expect(constraint.description).toHaveText(
      `Mutational constraint observed in ${symbol} canonical transcript in natural populations. Source: gnomAD.`
    );
    await expect(constraint.descriptionLink("gnomAD")).toHaveAttribute(
      "href",
      "https://gnomad.broadinstitute.org"
    );
  });

  test("has one row per variant category with SNV counts and well-formed constraint metrics", async ({
    page,
    testConfig,
  }) => {
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();

    await controls.expectHeaders(GeneticConstraintSection.COLUMNS);
    await expect(controls.rows).toHaveCount(3);
    expect(await controls.table.columnTexts(0)).toEqual(CATEGORIES);
    await controls.expectPosition(1, 3, 3);
    await controls.expectFirstPage(true);

    for (const category of CATEGORIES) {
      await test.step(category, async () => {
        await expect(constraint.expected(category), "expected SNVs is a whole number").toHaveText(
          /^\d+$/
        );
        await expect(constraint.observed(category), "observed SNVs is a whole number").toHaveText(
          /^\d+$/
        );
        const metrics = await constraint.readMetrics(category);
        expect(metrics.scoreName).toBe(category === "pLoF" ? "pLI" : "Z");
        expect(metrics.oe).toBeGreaterThan(0);
        expect(metrics.oeLower, "the o/e interval should contain o/e").toBeLessThanOrEqual(
          metrics.oe
        );
        expect(metrics.oeUpper, "the o/e interval should contain o/e").toBeGreaterThanOrEqual(
          metrics.oe
        );
        if (category === "pLoF") {
          expect(metrics.score, "pLI is a probability").toBeGreaterThanOrEqual(0);
          expect(metrics.score, "pLI is a probability").toBeLessThanOrEqual(1);
        }
      });
    }

    await test.step("only the pLoF row has a constraint assessment", async () => {
      await expect(constraint.metrics("Synonymous")).not.toContainText("Constraint assessment");
      await expect(constraint.metrics("Missense")).not.toContainText("Constraint assessment");
      await expect(constraint.metrics("pLoF")).toContainText("Constraint assessment");
      await expect(constraint.section.getByTestId("constraint-assessment-circles")).toHaveCount(1);
    });
  });

  for (const [name, pick] of [
    ["the primary target", (primary: string) => primary],
    ["a target that is not at the top of the scale", () => EDGE_TARGETS.membraneProtein],
  ] as const) {
    test(`the pLoF constraint assessment of ${name} agrees between circles, score, label and gnomAD link`, async ({
      page,
      testConfig,
    }) => {
      const targetId = pick(testConfig.target?.primary as string);
      const { symbol } = targetFacts(targetId);
      const constraint = new GeneticConstraintSection(page);

      await page.goto(`/target/${targetId}`);
      await constraint.expectLoaded();
      await constraint.controls.expectLoaded();

      await expect(constraint.assessmentLink).toHaveText(
        /^[0-5]\/5 (very )?(high|medium|low) constraint$/
      );
      await expect(constraint.assessmentLink).toHaveAttribute(
        "href",
        `https://gnomad.broadinstitute.org/gene/${targetId}`
      );
      const linkText = (await constraint.assessmentLink.innerText()).trim();
      const score = Number(linkText[0]);
      expect(linkText).toBe(`${score}/5 ${GeneticConstraintSection.ASSESSMENT_LABELS[score]}`);

      await expect(constraint.assessmentCircles.locator("span")).toHaveCount(5);
      await expect(constraint.filledCircles, "one filled circle per point").toHaveCount(score);
      await expect(constraint.emptyCircles).toHaveCount(5 - score);

      await constraint.assessmentHelp.hover();
      await expect(constraint.tooltip).toHaveText(
        `Binned representation of ${symbol} rank in the loss-function observed/expected upper bound fraction (LOEUF) distribution. Higher scored assessments correspond to strong selection against predicted loss-of-function (pLoF) variation in the particular gene.`
      );
    });
  }

  test("the two targets with different pLoF constraint get different assessments", async ({
    page,
    testConfig,
  }) => {
    // Guards the pair of tests above against both targets sitting in the same bin.
    const constraint = new GeneticConstraintSection(page);
    const scores: string[] = [];
    for (const targetId of [testConfig.target?.primary as string, EDGE_TARGETS.membraneProtein]) {
      await page.goto(`/target/${targetId}`);
      await constraint.expectLoaded();
      await expect(constraint.assessmentLink).toHaveAttribute(
        "href",
        `https://gnomad.broadinstitute.org/gene/${targetId}`
      );
      scores.push((await constraint.assessmentLink.innerText()).trim());
    }
    expect(scores[0]).not.toBe(scores[1]);
  });

  test("column headers explain the SNV counts on hover", async ({ page, testConfig }) => {
    const constraint = new GeneticConstraintSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await constraint.expectLoaded();
    await constraint.controls.expectLoaded();

    await constraint.headerHelp("Expected SNVs").hover();
    await expect(constraint.tooltip).toContainText(
      "Expected variant counts were predicted using a depth corrected probability of mutation for each gene."
    );

    await constraint.headerHelp("Observed SNVs").hover();
    await expect(
      constraint.tooltip.filter({ hasText: "Includes single nucleotide changes" })
    ).toContainText(
      "The counts represent the number of unique variants and not the allele count of these variants."
    );
  });

  test("search narrows the rows to a category and a term nothing matches empties the table", async ({
    page,
    testConfig,
  }) => {
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();
    await expect(controls.rows).toHaveCount(3);

    await controls.search("Missense");
    await expect(controls.rows).toHaveCount(1);
    expect(await controls.table.columnTexts(0)).toEqual(["Missense"]);
    await controls.expectPosition(1, 1, 1);

    await controls.search("zzqxjv-no-such-category");
    await expect(controls.rows).toHaveCount(0);

    await controls.search("pLoF");
    await expect(controls.rows).toHaveCount(1);
    expect(await controls.table.columnTexts(0)).toEqual(["pLoF"]);

    await controls.search("");
    await expect(controls.rows).toHaveCount(3);
    await controls.expectPosition(1, 3, 3);
  });

  test("column picker hides and restores columns, and the category column cannot be hidden", async ({
    page,
    testConfig,
  }) => {
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();

    const picker = await controls.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(4);
    await expect(picker.getByRole("checkbox", { name: "Category" })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Constraint metrics" }).uncheck();
    await controls.expectHeaders(GeneticConstraintSection.COLUMNS.slice(0, 3));
    await expect(constraint.section.getByTestId("constraint-assessment-circles")).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "Constraint metrics" }).check();
    await controls.expectHeaders(GeneticConstraintSection.COLUMNS);
    await controls.closeColumnPicker(constraint.title);
  });

  test("exports the three rows as JSON and TSV with the SNV counts shown, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${targetId}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();
    const observed = await controls.table.columnTexts(2);
    const expected = await controls.table.columnTexts(1);
    expect(observed).toHaveLength(3);

    await test.step("JSON", async () => {
      const file = await controls.download("Json");
      expect(file.filename).toBe(`${targetId}-genetic-constraint-target.json`);
      const rows = JSON.parse(file.text) as Record<string, string | number>[];
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.category)).toEqual(["syn", "mis", "lof"]);
      expect(rows.map((row) => String(row.observedSnVs))).toEqual(observed);
      expect(rows.map((row) => String(Math.round(Number(row.expectedSnVs))))).toEqual(expected);
    });

    await test.step("TSV", async () => {
      const file = await controls.download("TSV");
      expect(file.filename).toBe(`${targetId}-genetic-constraint-target.tsv`);
      const { header, rows } = parseTsv(file.text);
      expect(header.slice(0, 3)).toEqual(["category", "expectedSnVs", "observedSnVs"]);
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row[2])).toEqual(observed);
    });

    await test.step("API query", async () => {
      await controls.expectApiQuery("TargetGeneticConstraintQuery");
    });
  });

  test("the export includes the constraint metrics the table shows", async ({
    page,
    testConfig,
  }) => {
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();

    const file = await controls.download("Json");
    const rows = JSON.parse(file.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    const missense = rows[1];
    expect(
      missense.constraintMetrics,
      "the Constraint metrics column should not be exported as an empty value"
    ).not.toBe("");
  });

  test("a pLoF row without gnomAD values shows N/A and no constraint assessment", async ({
    page,
  }) => {
    const targetId = EDGE_TARGETS.sparse;
    const { symbol } = targetFacts(targetId);
    const constraint = new GeneticConstraintSection(page);
    const { controls } = constraint;

    await page.goto(`/target/${targetId}`);
    await constraint.expectLoaded();
    await controls.expectLoaded();

    await expect(constraint.description).toContainText(
      `Mutational constraint observed in ${symbol}`
    );
    await expect(controls.rows).toHaveCount(3);
    expect(await controls.table.columnTexts(0)).toEqual(CATEGORIES);

    await expect(constraint.expected("pLoF")).toHaveText("N/A");
    await expect(constraint.section.getByTestId("constraint-assessment-circles")).toHaveCount(0);
    await expect(constraint.metrics("pLoF").getByRole("link")).toHaveCount(0);
    await expect(constraint.metrics("pLoF")).not.toContainText("pLI");

    // The other two categories still have their values.
    for (const category of ["Synonymous", "Missense"]) {
      await expect(constraint.expected(category)).toHaveText(/^\d+$/);
      await expect(constraint.observed(category)).toHaveText(/^\d+$/);
      expect((await constraint.readMetrics(category)).scoreName).toBe("Z");
    }
  });

  test("is not rendered for a target without constraint data", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(expected, "the manifest should record that this target has no constraint").not.toContain(
      "geneticconstraint"
    );
    const constraint = new GeneticConstraintSection(page);

    await page.goto(`/target/${targetId}`);
    await expectSections(page, expected);
    await expect(constraint.section).toHaveCount(0);
  });
});

import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { CredibleSetVariantsSection } from "../../../../POM/objects/widgets/CredibleSet/variantsSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const PAGE_SIZE = 10;
const { column } = CredibleSetVariantsSection;

// GWAS credible set of GCST90475211 (18 variants) and the pQTL credible set of
// UKB_PPP_EUR_LPA_P08519_OID30747_v1 (21 variants, so three pages of ten).
const GWAS_LEAD = "2_85545938_A_G";
const QTL_LEAD = "6_160329611_C_T";

async function open(
  page: import("@playwright/test").Page,
  credibleSetId: string
): Promise<CredibleSetVariantsSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, CredibleSetVariantsSection.id);
  const section = new CredibleSetVariantsSection(page);
  await expect(section.rows.first()).toBeVisible();
  await section.expectSettled();
  return section;
}

test.describe("Credible set page: Variants", () => {
  test("shows title, description and the column headers", async ({ page, testConfig }) => {
    const variants = await open(page, testConfig.credibleSet.primary);

    await test.step("title and description", async () => {
      await expect(
        page.getByTestId("section-variants-header"),
        "the section is titled Credible Set Variants"
      ).toHaveText("Credible Set Variants");
      await expect(variants.description).toHaveText(
        "Set of variants with 95% probability of containing the causal variant. Source: Open Targets"
      );
      await expect(variants.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/credible-set#credible-set-variants"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(variants.headers).toHaveText(CredibleSetVariantsSection.headers);
    });

    await test.step("column header tooltips explain the statistics", async () => {
      await variants.headers.filter({ hasText: "Posterior Probability" }).hover();
      await expect(page.getByRole("tooltip")).toHaveText(
        "Posterior inclusion probability that this variant is causal within the fine-mapped credible set"
      );
    });
  });

  test("lists the variants of the credible set with real values in every column", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    await expect(variants.rows).toHaveCount(PAGE_SIZE);
    const total = await variants.total();
    expect(total, "the credible set has more variants than fit on one page").toBeGreaterThan(
      PAGE_SIZE
    );
    await variants.expectPosition(1, PAGE_SIZE, total);

    await test.step("variant column: id links to the variant page, once each", async () => {
      const ids = await variants.columnTexts(column.variant);
      const cleaned = ids.map((text) => text.replace(/\s*lead$/, ""));
      for (const [index, id] of cleaned.entries()) {
        expect(id).toMatch(/^[0-9XYM]+_\d+_[ACGT]+_[ACGT]+$/);
        await expect(variants.variantLink(index)).toHaveAttribute("href", `/variant/${id}`);
      }
      expect(new Set(cleaned).size, "no variant is listed twice").toBe(PAGE_SIZE);
    });

    await test.step("numeric columns hold numbers in their formats", async () => {
      for (const text of await variants.columnTexts(column.pValue)) {
        expect(text, "p-value in scientific notation").toMatch(/^\d\.\d{2}×10 ?-\d+$/);
      }
      for (const index of [column.beta, column.standardError, column.logBf]) {
        for (const text of await variants.columnTexts(index)) {
          expect(Number.isFinite(Number(text)), `"${text}" is a number`).toBe(true);
        }
      }
      for (const text of await variants.columnTexts(column.standardError)) {
        expect(text, "standard error has three decimals").toMatch(/^\d+\.\d{3}$/);
      }
      for (const text of await variants.columnTexts(column.ld)) {
        // LD is not available for every credible set: either a number from 0 to 1 or N/A
        expect(text === "N/A" || (Number(text) >= 0 && Number(text) <= 1), `LD "${text}"`).toBe(
          true
        );
      }
    });

    await test.step("posterior probabilities are probabilities, highest first", async () => {
      const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
      for (const value of posteriors) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(posteriors).toEqual([...posteriors].sort((a, b) => b - a));
    });

    await test.step("predicted consequence links to the Sequence Ontology term", async () => {
      for (let index = 0; index < PAGE_SIZE; index += 1) {
        const link = variants.consequenceLink(index);
        await expect(link).toHaveAttribute("href", /^https:\/\/identifiers\.org\/SO:\d{7}$/);
        await expect(link, "underscores are shown as spaces").toHaveText(/^[a-z0-9 ]+$/i);
        await expect(link).not.toContainText("_");
      }
    });
  });

  test("marks the lead variant, which comes first in the GWAS credible set", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    await expect(variants.leadChips, "exactly one variant is the lead").toHaveCount(1);
    await expect(variants.row(0).getByText("lead", { exact: true })).toBeVisible();
    await expect(variants.variantLink(0)).toHaveText(GWAS_LEAD);
    await expect(variants.variantLink(0)).toHaveAttribute("href", `/variant/${GWAS_LEAD}`);
  });

  test("the lead variant of the pQTL credible set is the most probable one", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.qtl);
    await expect(variants.leadChips).toHaveCount(1);
    await expect(variants.row(0).getByText("lead", { exact: true })).toBeVisible();
    await expect(variants.variantLink(0)).toHaveText(QTL_LEAD);
    const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
    expect(posteriors[0], "the lead variant carries the highest probability").toBeGreaterThan(0.5);
  });

  test("shows the variants of a credible set with a different lead, and its rare indels", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.qtl);
    const total = await variants.total();
    expect(total).toBe(21);
    await variants.expectPosition(1, PAGE_SIZE, 21);

    const ids = await variants.columnTexts(column.variant);
    expect(ids[0]).toContain(QTL_LEAD);

    await test.step("a variant with a long allele links to its full id", async () => {
      const longAllele = "6_160311014_GTTTTGTGACAGAGTCTTGCT_G";
      const link = page.locator(`a[href="/variant/${longAllele}"]`);
      await expect(link).toHaveCount(1);
      await expect(link, "the long allele is not spelled out in the cell").not.toHaveText(
        longAllele
      );
      await expect(link).toContainText("6_160311014");
    });
  });

  test("paging moves through all variants and disables the buttons at the ends", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.qtl);
    await variants.expectPosition(1, 10, 21);
    await expect(variants.firstPageButton).toBeDisabled();
    await expect(variants.previousPageButton).toBeDisabled();
    await expect(variants.nextPageButton).toBeEnabled();
    const first = await variants.rowTexts();

    await variants.nextPageButton.click();
    await variants.expectPosition(11, 20, 21);
    await expect(variants.rows).toHaveCount(10);
    const second = await variants.rowTexts();
    expect(second, "the second page holds other variants").not.toEqual(first);
    await expect(variants.leadChips, "the lead variant is only on the first page").toHaveCount(0);
    await expect(variants.firstPageButton).toBeEnabled();
    await expect(variants.previousPageButton).toBeEnabled();

    await variants.nextPageButton.click();
    await variants.expectPosition(21, 21, 21);
    await expect(variants.rows).toHaveCount(1);
    await expect(variants.nextPageButton).toBeDisabled();
    await expect(variants.previousPageButton).toBeEnabled();

    await variants.previousPageButton.click();
    await variants.expectPosition(11, 20, 21);
    expect(await variants.rowTexts()).toEqual(second);

    await variants.firstPageButton.click();
    await variants.expectPosition(1, 10, 21);
    expect(await variants.rowTexts()).toEqual(first);
    await expect(variants.firstPageButton).toBeDisabled();
  });

  test("page size changes the rows shown, and every variant adds up to a 95% credible set", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    const total = await variants.total();
    await expect(variants.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);

    await variants.setPageSize(25);
    await expect(variants.rows).toHaveCount(total);
    await variants.expectPosition(1, total, total);
    await expect(variants.nextPageButton, "everything fits on one page").toBeDisabled();
    await expect(variants.firstPageButton).toBeDisabled();

    const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
    const sum = posteriors.reduce((a, b) => a + b, 0);
    expect(sum, "a 95% credible set sums to at least 0.95").toBeGreaterThanOrEqual(0.95);
    expect(sum, "probabilities cannot exceed 1").toBeLessThanOrEqual(1.001);
    expect(posteriors).toEqual([...posteriors].sort((a, b) => b - a));
  });

  test("the Columns button hides and restores a column", async ({ page, testConfig }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    const list = await (async () => {
      await variants.columnsButton.click();
      await expect(variants.columnList).toBeVisible();
      return variants.columnList;
    })();

    await test.step("every column is listed; the variant column cannot be hidden", async () => {
      await expect(list.getByRole("checkbox")).toHaveCount(CredibleSetVariantsSection.headers.length);
      await expect(list.getByRole("checkbox", { name: "Variant" })).toBeDisabled();
      await expect(list.getByRole("checkbox", { name: "Beta" })).toBeChecked();
    });

    await test.step("unchecking Beta removes its header and cells", async () => {
      await list.getByRole("checkbox", { name: "Beta" }).uncheck();
      await expect(variants.headers).toHaveText(
        CredibleSetVariantsSection.headers.filter((header) => header !== "Beta")
      );
      await expect(variants.rows.first().locator("td")).toHaveCount(
        CredibleSetVariantsSection.headers.length - 1
      );
    });

    await test.step("checking it again brings it back", async () => {
      await list.getByRole("checkbox", { name: "Beta" }).check();
      await expect(variants.headers).toHaveText(CredibleSetVariantsSection.headers);
    });
  });

  test("Export downloads every variant as JSON and TSV", async ({ page, testConfig }) => {
    const credibleSetId = testConfig.credibleSet.primary;
    const variants = await open(page, credibleSetId);
    const total = await variants.total();
    const firstPageIds = (await variants.columnTexts(column.variant)).map((text) =>
      text.replace(/\s*lead$/, "")
    );

    await test.step("JSON holds all variants, not just the page on screen", async () => {
      const { filename, content } = await variants.export("Json");
      expect(filename).toBe(`${credibleSetId}-credibleset.json`);
      const rows = JSON.parse(content) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.variant)).toEqual(firstPageIds);
      expect(Object.keys(rows[0])).toEqual([
        "variant",
        "pValue",
        "beta",
        "standardError",
        "ldR",
        "posteriorProbability",
        "logBf",
        "predictedConsequence",
      ]);
      expect(rows[0].pValue).toMatch(/^\d(\.\d+)?x10-\d+$/);
      expect(typeof rows[0].posteriorProbability).toBe("number");
    });

    await test.step("TSV has a header line and one line per variant", async () => {
      const { filename, content } = await variants.export("TSV");
      expect(filename).toBe(`${credibleSetId}-credibleset.tsv`);
      const lines = content.trimEnd().split("\n");
      expect(lines[0].split("\t")).toContain("posteriorProbability");
      expect(lines).toHaveLength(total + 1);
      expect(lines[1].split("\t")[0]).toBe(firstPageIds[0]);
    });
  });

  test("the API query button opens the playground with this section's query", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    await variants.expectApiQuery();
  });

  test("a variant link opens that variant's page", async ({ page, testConfig }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    await variants.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${GWAS_LEAD}$`));
    const variantPage = new VariantPage(page);
    await variantPage.waitForVariantPageLoad();
    await expect(variantPage.title).toContainText(GWAS_LEAD);
  });

  test("a consequence link points at the ontology term and leaves the app", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, testConfig.credibleSet.primary);
    // The lead variant of this set is in a 3' UTR
    await expect(variants.consequenceLink(0)).toHaveText("3 prime UTR variant");
    await expect(variants.consequenceLink(0)).toHaveAttribute(
      "href",
      "https://identifiers.org/SO:0001624"
    );
    await expect(variants.consequenceLink(0)).toHaveAttribute("target", "_blank");
  });

  test("renders exactly the sections the credible sets are known to have", async ({
    page,
    testConfig,
  }) => {
    await new CredibleSetPage(page).goToCredibleSetPage(testConfig.credibleSet.qtl);
    await expectSections(page, expectedSectionsFor(testConfig.credibleSet.qtl));
    await expect(page.getByTestId("section-variants")).toBeVisible();
  });
});

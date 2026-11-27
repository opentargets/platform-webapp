import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  INTOGEN_COLUMN,
  INTOGEN_HEADERS,
  INTOGEN_OPERATION,
  type IntOgenRow,
  IntOgenSection,
} from "../../../../POM/objects/widgets/Evidence/intOgen";
import {
  BRAF,
  type EvidenceList,
  formatPercent,
  gotoEvidence,
  MELANOMA,
  NO_SOMATIC_EVIDENCE,
  PAGE_SIZE,
  type RoleInCancer,
} from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded } from "../../../../utils/sections";

type Data = RoleInCancer & { disease: { intOgen: EvidenceList<IntOgenRow> } };

const METHOD_DESCRIPTIONS: Record<string, string> = {
  hotmaps: "Somatic mutations in the gene are significantly clustered according to HotMAPS",
  oncodriveclustl:
    "Somatic mutations in the gene are significantly clustered according to OncodriveCLUSTL",
  smregions: "Somatic mutations in the gene are significantly clustered according to smRegions",
  cbase: "Genes more mutated than the background neutral mutation rate according to CBaSE",
  dndscv: "Genes more mutated than the background neutral mutation rate according to dNdScv",
  oncodrivefml:
    "Somatic mutations in the gene show a functional impact bias according to OncodriveFML",
  mutpanning:
    "MutPanning is designed to detect rare cancer driver genes from aggregated whole-exome sequencing data",
};

/** The p-value as the table prints it: three decimals, "×10" and the exponent. */
function formatPValue(score: number): RegExp {
  const [mantissa, exponent] = score.toExponential().split("e");
  return new RegExp(`^${Number(mantissa).toFixed(3)}\\s*×10${exponent.replace("+", "")}$`);
}

const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();

async function open(page: Page) {
  const response = waitForOperation<Data>(page, INTOGEN_OPERATION);
  await gotoEvidence(page);
  const { data } = await response;
  const section = new IntOgenSection(page);
  await section.expectLoaded();
  return { section, data, list: data.disease.intOgen };
}

test.describe("Evidence page: IntOGen", () => {
  test("shows title, description, role in cancer and the table headers @smoke", async ({
    page,
  }) => {
    const { section, data, list } = await open(page);
    expect(list.count, "BRAF is a driver gene in several melanoma cohorts").toBeGreaterThan(1);

    await test.step("title, data type and description", async () => {
      await expect(section.title).toHaveText(/^IntOGen/);
      await expect(section.chip("Somatic mutations")).toBeVisible();
      await expect(section.description).toHaveText(
        "Integrative analysis of large-scale mutation data pinpointing BRAF as driver gene in melanoma. Source: IntOGen"
      );
      await expect(section.description.getByRole("link", { name: "IntOGen" })).toHaveAttribute(
        "href",
        "https://www.intogen.org/search"
      );
    });

    await test.step("role in cancer chips link to Europe PMC", async () => {
      await section.expectRoleInCancer("BRAF", data);
    });

    await test.step("exact column headers", async () => {
      await section.table.expectHeaders(INTOGEN_HEADERS);
    });

    await test.step("every cohort is on one page: the footer reads 1 - n of n and paging is disabled", async () => {
      expect(list.count, "all cohorts fit on one page").toBeLessThanOrEqual(PAGE_SIZE);
      await expect(section.table.rows).toHaveCount(list.count);
      await section.table.expectPosition(1, list.count, list.count);
      await section.table.expectFirstPage(true);
      await expect(section.table.searchInput).toHaveCount(0);
    });
  });

  test("every row shows its disease, samples, p-value, driver methods and cohort from the API", async ({
    page,
  }) => {
    const { section, list } = await open(page);

    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.cohortShortName}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.disease.name);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.disease.id}`
        );

        const items = [...expected.mutatedSamples].sort(
          (a, b) =>
            b.numberMutatedSamples / b.numberSamplesTested -
            a.numberMutatedSamples / a.numberSamplesTested
        );
        await expect(section.sampleItems(index)).toHaveCount(items.length);
        for (const [i, sample] of items.entries()) {
          await expect(section.sampleItems(index).nth(i)).toHaveText(
            new RegExp(
              `^${formatPercent(sample.numberMutatedSamples, sample.numberSamplesTested)}\\s*\\(${sample.numberMutatedSamples}/${sample.numberSamplesTested}\\)$`
            )
          );
        }

        await expect(section.table.cell(index, INTOGEN_COLUMN.pValue)).toHaveText(
          formatPValue(expected.resourceScore)
        );

        const methods = expected.significantDriverMethods ?? [];
        await expect(section.methodChips(index)).toHaveText(methods);

        await expect(section.cohortLink(index)).toHaveText(expected.cohortShortName as string);
        await expect(section.cohortLink(index)).toHaveAttribute(
          "href",
          `https://www.intogen.org/search?gene=BRAF&cohort=${expected.cohortId}`
        );
        await expect(section.table.cell(index, INTOGEN_COLUMN.cohort)).toContainText(
          expected.cohortDescription as string
        );
      });
    }
  });

  test("the first cohort is Hartwig cutaneous melanoma: 152 of 152 samples mutated, p-value 7.287×10-52", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expect(section.diseaseLink(0)).toHaveText("cutaneous melanoma");
    await expect(section.sampleItems(0)).toHaveText(/^100%\s*\(152\/152\)$/);
    await expect(section.table.cell(0, INTOGEN_COLUMN.pValue)).toHaveText(/^7\.287\s*×10-52$/);
    await expect(section.cohortLink(0)).toHaveText("HARTWIG_WGS_SKCM_2023");
    await expect(section.table.cell(0, INTOGEN_COLUMN.cohort)).toContainText(
      "Cutaneous Melanoma from Hartwig Medical Foundation"
    );
  });

  test("the disease tooltip shows the disease as it was reported by the source", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await section.helpIcon(0, INTOGEN_COLUMN.disease).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(sentence(list.rows[0].diseaseFromSource));
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("a driver method chip explains the method in a tooltip", async ({ page }) => {
    const { section, list } = await open(page);
    const methods = list.rows[0].significantDriverMethods ?? [];
    expect(methods.length, "the first cohort has several driver methods").toBeGreaterThan(3);

    for (const [index, method] of methods.entries()) {
      const chip = section.methodChips(0).nth(index);
      await expect(chip).toHaveText(method);
      await chip.hover();
      await expect(page.getByRole("tooltip")).toHaveText(METHOD_DESCRIPTIONS[method]);
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toBeHidden();
    }
  });

  test("the p-value header explains itself and links to the IntOGen FAQ", async ({ page }) => {
    const { section } = await open(page);
    await section.headerHelp(/^Combined p-value/).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Visit the IntOGen FAQ for more information.");
    await expect(tooltip.getByRole("link", { name: "IntOGen FAQ" })).toHaveAttribute(
      "href",
      "https://www.intogen.org/faq"
    );
  });

  test("the driver methods header lists the seven methods and links to the FAQ", async ({
    page,
  }) => {
    const { section } = await open(page);
    await section.headerHelp(/^Cancer driver methods/).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText(
      "The current version of the intOGen pipeline uses seven methods to identify cancer driver genes from somatic point mutations"
    );
    await expect(tooltip).toContainText(
      "HotMAPS, dNDScv, smRegions, CBaSE, FML, MutPanning, and CLUSTL"
    );
    await expect(tooltip.getByRole("link", { name: "click here" })).toHaveAttribute(
      "href",
      "https://www.intogen.org/faq"
    );
  });

  test("the column picker hides and restores columns, and locks Cohort Information", async ({
    page,
  }) => {
    const { section } = await open(page);
    const { table } = section;
    const names = [
      "Disease/phenotype",
      "Mutated / Total samples",
      "Cancer driver methods",
      "Cohort Information",
    ];
    const picker = await table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(INTOGEN_HEADERS.length);
    for (const name of names) {
      await expect(picker.getByRole("checkbox", { name })).toBeChecked();
    }
    await expect(picker.getByRole("checkbox", { name: /Combined p-value/ })).toBeChecked();
    await expect(picker.getByRole("checkbox", { name: "Cohort Information" })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "Cancer driver methods" })).toBeEnabled();

    await picker.getByRole("checkbox", { name: "Cancer driver methods" }).uncheck();
    await expect(table.headers).toHaveCount(INTOGEN_HEADERS.length - 1);
    await expect(table.header(/^Cancer driver methods/)).toHaveCount(0);
    await expect(section.methodChips(0)).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "Cancer driver methods" }).check();
    await table.expectHeaders(INTOGEN_HEADERS);
    await table.closeColumnPicker(section.title);
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section } = await open(page);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(/\/disease\/MONDO_0005012$/);
    await expect(page.getByTestId("profile-page-header-text")).toContainText("cutaneous melanoma");
  });

  test("the export offers JSON and TSV with a row per cohort", async ({ page }) => {
    const { section, list } = await open(page);
    const stem = `intOGen-${BRAF}-${MELANOMA}`;

    const json = await section.table.download("Json");
    expect(json.filename).toBe(`${stem}.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(list.count);
    expect(JSON.stringify(rows)).toContain("HARTWIG_WGS_SKCM_2023");

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe(`${stem}.tsv`);
    expect(tsv.text.split("\n").filter((line) => line.length > 0)).toHaveLength(list.count + 1);
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.expectApiQuery(INTOGEN_OPERATION, BRAF, MELANOMA);
  });

  test("an evidence page without IntOGen data has no such section", async ({ page }) => {
    await gotoEvidence(page, NO_SOMATIC_EVIDENCE.ensgId, NO_SOMATIC_EVIDENCE.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(new IntOgenSection(page).section).toHaveCount(0);
  });
});

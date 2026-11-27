import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  EVA_SOMATIC_COLUMN,
  EVA_SOMATIC_HEADERS,
  EVA_SOMATIC_OPERATION,
  type EvaSomaticRow,
  EvaSomaticSection,
} from "../../../../POM/objects/widgets/Evidence/evaSomatic";
import {
  BRAF,
  type EvidenceList,
  gotoEvidence,
  MELANOMA,
  NO_SOMATIC_EVIDENCE,
  type RoleInCancer,
} from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded } from "../../../../utils/sections";

type Data = RoleInCancer & {
  disease: { evidenceViews: { evaSomatic: EvidenceList<EvaSomaticRow> } };
};

const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();

async function open(page: Page) {
  const response = waitForOperation<Data>(page, EVA_SOMATIC_OPERATION);
  await gotoEvidence(page);
  const { data } = await response;
  const section = new EvaSomaticSection(page);
  await section.expectLoaded();
  const list = data.disease.evidenceViews.evaSomatic;
  expect(list.count, "BRAF in melanoma has ClinVar somatic records").toBeGreaterThan(0);
  expect(list.rows.length, "the first page holds a record").toBeGreaterThan(0);
  return { section, data, list, row: list.rows[0] };
}

test.describe("Evidence page: EVA somatic", () => {
  test("shows title, description, role in cancer and the table headers @smoke", async ({
    page,
  }) => {
    const { section, data } = await open(page);

    await test.step("title, data type and description", async () => {
      await expect(section.title).toHaveText(/^EVA somatic/);
      await expect(section.chip("Somatic mutations")).toBeVisible();
      await expect(section.description).toHaveText(
        "Somatic variation associated with BRAF on patients affected by melanoma. Source: EVA"
      );
      await expect(section.description.getByRole("link", { name: "EVA" })).toHaveAttribute(
        "href",
        "https://www.ebi.ac.uk/eva/"
      );
    });

    await test.step("role in cancer chips link to Europe PMC", async () => {
      await section.expectRoleInCancer("BRAF", data);
    });

    await test.step("exact column headers", async () => {
      await section.table.expectHeaders(EVA_SOMATIC_HEADERS);
    });

    await test.step("one page: footer, pagination and page size controls", async () => {
      await section.table.expectPosition(1, 1, 1);
      await section.table.expectFirstPage(true);
      await expect(section.table.pageSizeSelect).toHaveValue("10");
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await expect(section.table.searchInput).toHaveCount(0);
    });
  });

  test("the record shows its disease, variant, identifiers and clinical significance from the API", async ({
    page,
  }) => {
    const { section, list, row } = await open(page);
    await expect(section.table.rows).toHaveCount(list.rows.length);
    expect(row.variantId, "the record has a variant").not.toBeNull();

    await test.step("disease", async () => {
      await expect(section.diseaseLink(0)).toHaveText(row.diseaseName);
      await expect(section.diseaseLink(0)).toHaveAttribute("href", `/disease/${row.diseaseId}`);
    });

    await test.step("variant links to its page and shows its id", async () => {
      await expect(section.variantLink(0)).toHaveAttribute("href", `/variant/${row.variantId}`);
      await expect(section.variantLink(0)).toContainText("7_140753335_CA_GT");
    });

    await test.step("rsID links to Ensembl", async () => {
      await expect(section.rsIdLink(0)).toHaveText(row.variantRsId as string);
      await expect(section.rsIdLink(0)).toHaveAttribute(
        "href",
        `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${row.variantRsId}`
      );
    });

    await test.step("HGVS id, ClinVar record and clinical significance", async () => {
      await expect(section.table.cell(0, EVA_SOMATIC_COLUMN.hgvs)).toHaveText(
        row.variantHgvsId as string
      );
      await expect(section.clinvarLink(0)).toHaveText(row.studyId);
      await expect(section.clinvarLink(0)).toHaveAttribute(
        "href",
        `https://identifiers.org/clinvar.record/${row.studyId}`
      );
      await expect(section.table.cell(0, EVA_SOMATIC_COLUMN.significance)).toHaveText(
        (row.clinicalSignificances ?? []).map(sentence).join("")
      );
    });

    await test.step("allele origin is somatic", async () => {
      await expect(section.table.cell(0, EVA_SOMATIC_COLUMN.alleleOrigin)).toContainText(
        (row.alleleOrigins ?? []).map(sentence).join("; ")
      );
    });
  });

  test("the disease tooltip shows the reported disease, with no phenotype list for a single phenotype", async ({
    page,
  }) => {
    const { section, row } = await open(page);
    expect(row.cohortPhenotypes, "the record reports a single phenotype").toHaveLength(1);
    await section.helpIcon(0, EVA_SOMATIC_COLUMN.disease).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(row.diseaseFromSource);
    await expect(tooltip).not.toContainText("All reported phenotypes:");
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("the allele origin shows a tooltip only for a record that has allelic requirements", async ({
    page,
  }) => {
    const { section, row } = await open(page);
    expect(row.allelicRequirements, "the record has no allelic requirements").toHaveLength(0);
    await expect(section.table.cell(0, EVA_SOMATIC_COLUMN.alleleOrigin)).toContainText("Somatic");
    await expect(section.helpIcon(0, EVA_SOMATIC_COLUMN.alleleOrigin)).toHaveCount(0);
  });

  test("the review status shows four stars, none filled for a record without assertion criteria, and names the status", async ({
    page,
  }) => {
    const { section, row } = await open(page);
    expect(row.confidence).toBe("no assertion criteria provided");
    await expect(section.stars(0)).toHaveCount(4);
    await expect(section.filledStars(0)).toHaveCount(0);
    await section.stars(0).first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(row.confidence);
  });

  test("a record without direction of effect shows the inconclusive icon and says so", async ({
    page,
  }) => {
    const { section, row } = await open(page);
    expect(row.directionOnTarget).toBeNull();
    expect(row.directionOnTrait).toBeNull();
    const cell = section.table.cell(0, EVA_SOMATIC_COLUMN.directionOfEffect);
    await expect(cell.locator("svg")).toHaveCount(2);
    await cell.locator("svg").first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      "Inconclusive Assessment │ Inconclusive Assessment"
    );
  });

  test("the direction of effect header links to the documentation", async ({ page }) => {
    const { section } = await open(page);
    await section.table
      .header(/Direction of effect/i)
      .locator("sup")
      .hover();
    await expect(
      page.getByRole("tooltip").getByRole("link", { name: "More info on our assessment method" })
    ).toHaveAttribute("href", "https://platform-docs.opentargets.org/evidence#clinvar-somatic");
  });

  test("a record without literature shows N/A instead of a drawer", async ({ page }) => {
    const { section, row } = await open(page);
    expect(row.literature, "the record cites no publications").toHaveLength(0);
    await expect(section.table.cell(0, EVA_SOMATIC_COLUMN.literature)).toHaveText("N/A");
    await expect(section.literatureTrigger(0, EVA_SOMATIC_COLUMN.literature)).toHaveCount(0);
  });

  test("the column picker hides and restores columns, and locks the variant", async ({ page }) => {
    const { section } = await open(page);
    const { table } = section;
    const picker = await table.openColumnPicker();

    await expect(picker.getByRole("checkbox")).toHaveCount(EVA_SOMATIC_HEADERS.length);
    await expect(picker.getByRole("checkbox", { name: "Variant" })).toBeDisabled();
    await expect(picker.getByRole("checkbox", { name: "rsID" })).toBeEnabled();

    await picker.getByRole("checkbox", { name: "rsID" }).uncheck();
    await expect(table.headers).toHaveCount(EVA_SOMATIC_HEADERS.length - 1);
    await expect(table.header("rsID")).toHaveCount(0);
    await expect(section.rsIdLink(0)).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "rsID" }).check();
    await table.expectHeaders(EVA_SOMATIC_HEADERS);
    await table.closeColumnPicker(section.title);
  });

  test("the disease link opens that disease's page", async ({ page }) => {
    const { section, row } = await open(page);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${row.diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(row.diseaseName);
  });

  test("the variant link opens that variant's page", async ({ page }) => {
    const { section, row } = await open(page);
    await section.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${row.variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the export has the section's own columns and the record's values", async ({ page }) => {
    const { section, row } = await open(page);

    const json = await section.table.download("Json");
    expect(json.filename).toBe("eva_somatic-evidence.json");
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      diseaseId: row.diseaseId,
      diseaseName: row.diseaseName,
      variantRsId: row.variantRsId,
      reviewStatus: row.confidence,
    });

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe("eva_somatic-evidence.tsv");
    const [header, ...lines] = tsv.text.split("\n").filter((line) => line.length > 0);
    expect(header.split("\t")).toEqual([
      "diseaseId",
      "diseaseName",
      "variantId",
      "variantRsId",
      "variantHgvsId",
      "clinicalSignificances",
      "allelicRequirements",
      "reviewStatus",
      "literature",
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(row.variantRsId as string);
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.expectApiQuery(EVA_SOMATIC_OPERATION, BRAF, MELANOMA);
  });

  test("an evidence page without EVA somatic data has no such section", async ({ page }) => {
    await gotoEvidence(page, NO_SOMATIC_EVIDENCE.ensgId, NO_SOMATIC_EVIDENCE.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(new EvaSomaticSection(page).section).toHaveCount(0);
  });
});

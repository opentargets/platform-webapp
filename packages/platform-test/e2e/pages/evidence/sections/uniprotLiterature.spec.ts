import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  GeneticEvidenceSection,
  MECP2_NDD,
  NF1_NF1,
  PCSK9_LDL,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  UNIPROT_LITERATURE_COLUMN,
  UNIPROT_LITERATURE_HEADERS,
  UNIPROT_LITERATURE_LIST,
  UNIPROT_LITERATURE_OPERATION,
  type UniprotLiteratureRow,
  UniprotLiteratureSection,
} from "../../../../POM/objects/widgets/Evidence/uniprot";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** MECP2 in neurodevelopmental disorder: four UniProt literature rows, one page. */
async function open(page: Page, pair = MECP2_NDD) {
  const section = new UniprotLiteratureSection(page);
  const list = await openEvidenceSection<UniprotLiteratureRow>(
    page,
    section,
    UNIPROT_LITERATURE_OPERATION,
    UNIPROT_LITERATURE_LIST,
    pair
  );
  return { section, list };
}

test.describe("Evidence page: UniProt literature", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count).toBe(4);

    await expect(section.title).toContainText("UniProt literature");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Literature-based curation associating genetic variations affecting MECP2 protein products with neurodevelopmental disorder. Source: UniProt"
    );
    await expect(section.description.getByRole("link", { name: "UniProt" })).toHaveAttribute(
      "href",
      "https://www.uniprot.org"
    );
    await expect(section.table.headers).toHaveText([...UNIPROT_LITERATURE_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toBeVisible();
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, UniProt protein, confidence and literature", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.diseaseName}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.diseaseName);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.diseaseId}`
        );
        await expect(section.helpIcon(index, UNIPROT_LITERATURE_COLUMN.disease)).toHaveCount(1);

        await expect(section.proteinLink(index)).toHaveText(expected.targetFromSourceId!);
        await expect(section.proteinLink(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/uniprot:${expected.targetFromSourceId}`
        );
        expect(expected.targetFromSourceId).toMatch(/^[A-Z0-9]{6,10}$/);

        await expect(section.cell(index, UNIPROT_LITERATURE_COLUMN.confidence)).toHaveText(
          sentence(expected.confidence!)
        );
        await expect(section.cell(index, UNIPROT_LITERATURE_COLUMN.score)).toHaveText(
          expected.score.toFixed(2)
        );
        await expect(section.cell(index, UNIPROT_LITERATURE_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
    await expect(section.diseaseLink(0)).toHaveText("Rett syndrome");
    await expect(section.proteinLink(0)).toHaveText("P51608");
    await expect(section.cell(0, UNIPROT_LITERATURE_COLUMN.confidence)).toHaveText("High");
    await expect(section.cell(3, UNIPROT_LITERATURE_COLUMN.confidence)).toHaveText("Medium");
  });

  test("the disease tooltip shows the phenotype as reported by UniProt", async ({ page }) => {
    const { section, list } = await open(page);
    const tooltip = await section.openHelp(1, UNIPROT_LITERATURE_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(list.rows[1].diseaseFromSource!);
  });

  test("the column picker hides and restores columns and locks disease and protein", async ({
    page,
  }) => {
    const { section } = await open(page);
    await expectColumnPicker(
      section,
      UNIPROT_LITERATURE_HEADERS.map((header) => header.replace("?", "")),
      ["Disease/phenotype", "Reported protein"],
      "Confidence"
    );
  });

  test("the Score header explains the score and sorts the rows on the server", async ({ page }) => {
    const { section, list } = await open(page);
    const header = section.table.headers.nth(UNIPROT_LITERATURE_COLUMN.score);
    await header.locator("sup").hover();
    await expect(section.tooltip).toHaveText("Evidence score, from 0 to 1");
    await page.mouse.move(0, 0);

    // The table opens sorted by score, highest first; a click on the header reverses it.
    const scores = list.rows.map((row) => row.score);
    expect(scores, "the API returns the highest scores first").toEqual(
      [...scores].sort((a, b) => b - a)
    );
    const ascending = page.waitForResponse((response) => {
      const post = response.request().postData() ?? "";
      return (
        post.includes(UNIPROT_LITERATURE_OPERATION) &&
        (JSON.parse(post).variables?.sort ?? []).some(
          (sort: { direction: string }) => sort.direction === "ASCENDING"
        )
      );
    });
    await header.click();
    const reversed = (await (await ascending).json()).data.disease.evidenceViews[
      UNIPROT_LITERATURE_LIST
    ].rows as UniprotLiteratureRow[];
    expect(reversed.map((row) => row.score)).toEqual([...scores].sort((a, b) => a - b));
    await expect
      .poll(() => section.table.columnTexts(UNIPROT_LITERATURE_COLUMN.score))
      .toEqual(reversed.map((row) => row.score.toFixed(2)));
    await expect(section.diseaseLink(0)).toHaveText(reversed[0].diseaseName);
  });

  test("the search box filters the rows on the server", async ({ page }) => {
    const { section, list } = await open(page);
    const target = list.rows[1];
    const term = target.diseaseName;
    const response = page.waitForResponse((candidate) => {
      const post = candidate.request().postData() ?? "";
      return post.includes(UNIPROT_LITERATURE_OPERATION) && post.includes(`"text":"${term}"`);
    });
    await section.table.search(term);
    const found = (await (await response).json()).data.disease.evidenceViews[
      UNIPROT_LITERATURE_LIST
    ] as { count: number; rows: UniprotLiteratureRow[] };
    expect(found.count, "the search narrows the rows").toBeLessThan(list.count);
    expect(found.rows.map((row) => row.diseaseName)).toContain(term);
    await section.table.expectRowCount(found.rows.length);
    await expect(section.diseaseLink(0)).toHaveText(found.rows[0].diseaseName);

    const none = page.waitForResponse((candidate) =>
      (candidate.request().postData() ?? "").includes("zzz-no-match")
    );
    await section.table.search("zzz-no-match");
    await none;
    await section.table.expectRowCount(0);

    await section.table.searchInput.fill("");
    await section.table.expectRowCount(list.count);
  });

  test("the literature cell lists the publications of its row, a single one by its id", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.rows[0].literature!.length).toBeGreaterThan(1);
    expect(list.rows[1].literature).toHaveLength(1);
    await section.expectLiteratureDrawer(
      0,
      UNIPROT_LITERATURE_COLUMN.literature,
      list.rows[0].literature!
    );
    await section.expectLiteratureDrawer(
      1,
      UNIPROT_LITERATURE_COLUMN.literature,
      list.rows[1].literature!
    );
  });

  test("the page size select offers 10, 25 and 100 rows", async ({ page }) => {
    const { section, list } = await open(page);
    await expectPageSizes(section, list);
  });

  test("the export holds every row as JSON and TSV", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `UniProtLiterature-${MECP2_NDD.ensgId}-${MECP2_NDD.efoId}`
    );
    expect(json.map((row) => row.diseasePhenotype)).toEqual(
      list.rows.map((row) => row.diseaseName)
    );
    expect(header).not.toContain("objectObject");
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(UNIPROT_LITERATURE_OPERATION, MECP2_NDD.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page", async ({ page }) => {
    const { section, list } = await open(page);
    await section.diseaseLink(1).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${list.rows[1].diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[1].diseaseName
    );
  });

  test("a pair with a single row lists it", async ({ page }) => {
    const { section, list } = await open(page, NF1_NF1);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("affecting NF1 protein products");
    await expect(section.proteinLink(0)).toHaveAttribute(
      "href",
      `https://identifiers.org/uniprot:${list.rows[0].targetFromSourceId}`
    );
  });

  test("an evidence page without UniProt literature data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${PCSK9_LDL.ensgId}/${PCSK9_LDL.efoId}`);
    await expectSections(page, expectedSectionsFor(`${PCSK9_LDL.ensgId}/${PCSK9_LDL.efoId}`));
    await expect(new UniprotLiteratureSection(page).section).toHaveCount(0);
  });
});

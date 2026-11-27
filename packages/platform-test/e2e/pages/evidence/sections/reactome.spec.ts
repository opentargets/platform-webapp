import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  type EvidenceViewsData,
  evidenceList,
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  EVIDENCE_PAGE_SIZE,
  GeneticEvidenceSection,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  CTNNB1_NEOPLASM,
  FGFR3_NEOPLASM,
  openReactome,
  REACTOME_COLUMN,
  REACTOME_HEADERS,
  REACTOME_LIST,
  REACTOME_LOCKED,
  REACTOME_OPERATION,
  type ReactomeRow,
  ReactomeSection,
} from "../../../../POM/objects/widgets/Evidence/reactome";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** KIF1A in neurodegenerative disease: CRISPR screens and Expression Atlas, no Reactome. */
const KIF1A_NDD = { ensgId: "ENSG00000130294", efoId: "MONDO_0005559" };

/** Open the section with Europe PMC stubbed, so the literature drawers depend only on the app. */
async function open(page: Page, pair = FGFR3_NEOPLASM) {
  await stubEuropePmc(page);
  return openReactome(page, pair);
}

type SectionPage<Row> = { count: number; rows: Row[]; variables: Record<string, any> };

/** Resolve with the next reactomeQuery response whose variables satisfy `match`. */
function waitForQuery(page: Page, match: (variables: Record<string, any>) => boolean) {
  return page
    .waitForResponse((response) => {
      const post = response.request().postData() ?? "";
      if (!post.includes(REACTOME_OPERATION)) return false;
      return match(JSON.parse(post).variables ?? {});
    })
    .then(async (response): Promise<SectionPage<ReactomeRow>> => {
      const body = (await response.json()) as {
        data: EvidenceViewsData<ReactomeRow>;
      };
      return {
        ...evidenceList(body.data, REACTOME_LIST),
        variables: JSON.parse(response.request().postData() ?? "{}").variables,
      };
    });
}

/** Type a term in the search box and wait for the first page of its results. */
async function searchFor(page: Page, section: ReactomeSection, term: string) {
  const response = waitForQuery(page, (variables) => variables.search?.text === term);
  await section.table.search(term);
  return response;
}

test.describe("Evidence page: Reactome", () => {
  test("shows title, description, chip, controls and the table headers @smoke", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    expect(list.count, "FGFR3 has more than two pages of reactions").toBeGreaterThan(20);

    await expect(section.title).toContainText("Reactome");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Literature-curated list of pathway reactions affected by genetic alterations or changes in gene expression that lead to disregulation of FGFR3 in the context of cancer or benign tumor. Source: Reactome"
    );
    await expect(section.description.getByRole("link", { name: "Reactome" })).toHaveAttribute(
      "href",
      "https://reactome.org"
    );
    await expect(section.table.headers).toHaveText([...REACTOME_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput).toBeVisible();
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, pathway, reaction, target, modulation, variations and literature", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.reactionId}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(expected.diseaseName);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.diseaseId}`
        );
        await expect(section.helpIcon(index, REACTOME_COLUMN.disease)).toHaveCount(1);

        const pathways = expected.pathways ?? [];
        if (pathways.length === 1) {
          await expect(section.pathwayLink(index)).toHaveText(pathways[0].name);
          await expect(section.pathwayLink(index)).toHaveAttribute(
            "href",
            `http://www.reactome.org/PathwayBrowser/#${pathways[0].id}`
          );
        } else if (pathways.length === 0) {
          await expect(section.cell(index, REACTOME_COLUMN.pathway)).toHaveText("N/A");
        } else {
          await expect(section.cell(index, REACTOME_COLUMN.pathway)).toHaveText(
            `${pathways.length} pathways`
          );
        }

        await expect(section.reactionLink(index)).toHaveText(expected.reactionName);
        await expect(section.reactionLink(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/reactome/${expected.reactionId}`
        );
        expect(expected.reactionId).toMatch(/^R-HSA-\d+$/);

        await expect(section.targetLink(index)).toHaveText(expected.targetFromSourceId);
        await expect(section.targetLink(index)).toHaveAttribute(
          "href",
          `https://identifiers.org/uniprot/${expected.targetFromSourceId}`
        );
        expect(expected.targetFromSourceId).toMatch(/^[A-Z0-9]{6,10}$/);

        await expect(section.cell(index, REACTOME_COLUMN.modulation)).toHaveText(
          expected.targetModulation ? sentence(expected.targetModulation) : "N/A"
        );

        const variations = expected.variantAminoacidDescriptions ?? [];
        await expect(section.cell(index, REACTOME_COLUMN.variation)).toHaveText(
          variations.length === 0
            ? "N/A"
            : variations.length === 1
              ? variations[0]
              : `${variations.length} entries`
        );

        await expect(section.cell(index, REACTOME_COLUMN.score)).toHaveText(
          expected.score.toFixed(2)
        );
        expect(expected.score).toBeGreaterThan(0);
        expect(expected.score).toBeLessThanOrEqual(1);

        await expect(section.cell(index, REACTOME_COLUMN.literature)).toHaveText(
          GeneticEvidenceSection.literatureLabel(expected.literature)
        );
      });
    }
    await expect(section.cell(0, REACTOME_COLUMN.modulation)).toHaveText("Gain of function");
    await expect(section.pathwayLink(0)).toHaveText("t(4;14) translocations of FGFR3");
  });

  test("the disease tooltip shows the reported disease", async ({ page }) => {
    const { section, list } = await open(page);
    const tooltip = await section.openHelp(0, REACTOME_COLUMN.disease);
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(list.rows[0].diseaseFromSource ?? "");
  });

  test("pagination walks to the last page and back, and the page size select changes the rows", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await test.step("pages", async () => {
      await expectPaging(
        page,
        section,
        REACTOME_OPERATION,
        REACTOME_LIST,
        list,
        (row: ReactomeRow) => row.reactionName,
        REACTOME_COLUMN.reaction
      );
    });
    await test.step("page sizes", async () => {
      await expectPageSizes(section, list);
    });
  });

  test("the column picker hides and restores the optional columns and locks the reaction", async ({
    page,
  }) => {
    const { section } = await open(page);
    // the picker lists the Score column without the "?" of its header tooltip
    const pickerNames = REACTOME_HEADERS.map((name) => (name === "Score?" ? "Score" : name));
    await expectColumnPicker(section, pickerNames, REACTOME_LOCKED, "Target modulation");
  });

  test("the literature cell lists the publications of its row", async ({ page }) => {
    const { section, list } = await open(page);
    await test.step("a row with several publications", async () => {
      const row = list.rows[0];
      expect(row.literature?.length).toBeGreaterThan(1);
      await section.expectLiteratureDrawer(0, REACTOME_COLUMN.literature, row.literature ?? []);
    });
    await test.step("a row with a single publication shows its id", async () => {
      const index = list.rows.findIndex((row) => row.literature?.length === 1);
      expect(index, "the first page has a reaction with one publication").toBeGreaterThanOrEqual(0);
      await section.expectLiteratureDrawer(
        index,
        REACTOME_COLUMN.literature,
        list.rows[index].literature ?? []
      );
    });
  });

  test("the amino acid variation cell opens a drawer with the variations of its row", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const index = list.rows.findIndex((row) => (row.variantAminoacidDescriptions ?? []).length > 1);
    expect(index, "the first page has a reaction with several variations").toBeGreaterThanOrEqual(
      0
    );
    const variations = list.rows[index].variantAminoacidDescriptions ?? [];
    await expect(section.tableDrawer.root).toHaveCount(0);

    await section.variationTrigger(index).click();
    await section.tableDrawer.expectEntries("Amino acid variation", variations);
    await section.tableDrawer.close();

    await test.step("another row replaces the content", async () => {
      const other = list.rows.findIndex(
        (row, at) =>
          at !== index &&
          (row.variantAminoacidDescriptions ?? []).length > 1 &&
          (row.variantAminoacidDescriptions ?? []).length !== variations.length
      );
      expect(
        other,
        "the first page has another reaction with a different number of variations"
      ).toBeGreaterThanOrEqual(0);
      await section.variationTrigger(other).click();
      await section.tableDrawer.expectEntries(
        "Amino acid variation",
        list.rows[other].variantAminoacidDescriptions ?? []
      );
      await page.keyboard.press("Escape");
      await expect(section.tableDrawer.root).toBeHidden();
    });
  });

  test("the export holds every reaction", async ({ page }) => {
    const { section, list } = await open(page);
    const { json, header } = await expectExports(
      section,
      list,
      `reactome-${FGFR3_NEOPLASM.ensgId}-${FGFR3_NEOPLASM.efoId}`
    );
    expect(header).toEqual([
      "diseasePhenotype",
      "pathway",
      "reaction",
      "reportedTarget",
      "targetModulation",
      "aminoAcidVariation",
      "score",
      "literature",
    ]);
    expect(json.slice(0, list.rows.length).map((row) => row.reaction)).toEqual(
      list.rows.map((row) => row.reactionId)
    );
    expect(json.slice(0, list.rows.length).map((row) => row.reportedTarget)).toEqual(
      list.rows.map((row) => row.targetFromSourceId)
    );
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(REACTOME_OPERATION, FGFR3_NEOPLASM.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens the page of the disease the reaction is mapped to", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const disease = { id: list.rows[0].diseaseId, name: list.rows[0].diseaseName };
    expect(disease.id, "the reaction is mapped to a narrower disease than the page").not.toBe(
      FGFR3_NEOPLASM.efoId
    );
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(disease.name, {
      ignoreCase: true,
    });

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
  });

  test("a pair with a single page of reactions lists them all", async ({ page }) => {
    const { section, list } = await open(page, CTNNB1_NEOPLASM);
    expect(list.count).toBeLessThanOrEqual(10);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("disregulation of CTNNB1 in the context of");
    await expect(section.table.nextPageButton).toBeDisabled();
    await test.step("a reaction without amino acid variations says N/A", async () => {
      const index = list.rows.findIndex(
        (row) => (row.variantAminoacidDescriptions ?? []).length === 0
      );
      expect(index, "one CTNNB1 reaction has no variation").toBeGreaterThanOrEqual(0);
      await expect(section.cell(index, REACTOME_COLUMN.variation)).toHaveText("N/A");
      await expect(section.variationTrigger(index)).toHaveCount(0);
    });
    await expect(section.cell(0, REACTOME_COLUMN.modulation)).toHaveText("Loss of function");
  });

  test("the search box filters the reactions on the server and shows the matches", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    await expect(section.table.searchInput).toBeVisible();
    const term = list.rows[0].reactionName;

    const { rows, count, variables } = await searchFor(page, section, term);
    expect(variables.search, "the search is sent to the API").toMatchObject({ text: term });
    expect(count, "the search narrows the reactions").toBeLessThan(list.count);
    expect(count).toBeGreaterThan(0);
    await section.table.expectRowCount(Math.min(count, EVIDENCE_PAGE_SIZE));
    await expect(section.table.position).toHaveText(
      `1 - ${Math.min(count, EVIDENCE_PAGE_SIZE)} of ${count}`
    );
    await expect
      .poll(() => section.table.columnTexts(REACTOME_COLUMN.reaction))
      .toEqual(rows.map((row) => row.reactionName));
    expect(rows.map((row) => row.reactionName)).toContain(term);

    await test.step("a search without matches shows no rows", async () => {
      const none = await searchFor(page, section, "no such reaction anywhere");
      expect(none.count).toBe(0);
      await expect(section.table.rows).toHaveCount(0);
    });
  });

  test("the table is sorted by score, highest first, and the Score header reverses it", async ({
    page,
  }) => {
    const { section, list } = await open(page);
    const scores = list.rows.map((row) => row.score);
    expect(scores, "the API returns the highest scores first").toEqual(
      [...scores].sort((a, b) => b - a)
    );
    await expect
      .poll(() => section.table.columnTexts(REACTOME_COLUMN.score))
      .toEqual(scores.map((score) => score.toFixed(2)));

    const ascending = waitForQuery(page, (variables) =>
      variables.sort?.some((sort: any) => sort.key === "SCORE" && sort.direction === "ASCENDING")
    );
    await section.table.headers.filter({ hasText: "Score" }).click();
    const sorted = (await ascending).rows.map((row) => row.score);
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
    await expect
      .poll(() => section.table.columnTexts(REACTOME_COLUMN.score))
      .toEqual(sorted.map((score) => score.toFixed(2)));
  });

  test("a pair without Reactome data has no such section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${KIF1A_NDD.ensgId}/${KIF1A_NDD.efoId}`);
    await expectSections(page, expectedSectionsFor(`${KIF1A_NDD.ensgId}/${KIF1A_NDD.efoId}`));
    await expect(new ReactomeSection(page).section).toHaveCount(0);
  });
});

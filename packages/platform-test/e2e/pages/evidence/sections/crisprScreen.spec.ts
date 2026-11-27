import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  CHRM1_PD,
  type CrisprScreenRow,
  CrisprScreenSection,
  CS_COLUMN,
  CS_HEADERS,
  CS_LIST,
  CS_LOCKED,
  CS_OPERATION,
  foldChange,
  KIF1A_NDD,
  openCrisprScreen,
  overviewText,
  reportedDisease,
  significance,
} from "../../../../POM/objects/widgets/Evidence/crisprScreen";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import { waitForPageOfOperation } from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";

/** FGFR3 in cancer or benign tumor: Reactome, Expression Atlas and IMPC, no CRISPR screens. */
const FGFR3_NEOPLASM = { ensgId: "ENSG00000068078", efoId: "MONDO_0045024" };

test.describe("Evidence page: CRISPR Screens", () => {
  test("shows title, description, chip, controls and the table headers", async ({ page }) => {
    const { section, list } = await openCrisprScreen(page);
    expect(list.count, "KIF1A has more than one page of CRISPR screens").toBeGreaterThan(
      EVIDENCE_PAGE_SIZE
    );

    await expect(section.title).toContainText("CRISPR Screens");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "CRISPR knockout screens from public CRISPR datasources, associating KIF1A and CRISPR results. Sources: CRISPRBrain"
    );
    await expect(section.description.getByRole("link", { name: "CRISPRBrain" })).toHaveAttribute(
      "href",
      "https://crisprbrain.org/"
    );
    await expect(section.table.headers).toHaveText([...CS_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "this table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its disease, study, contrast, cell type, scores, source and publication", async ({
    page,
  }) => {
    const { section, list } = await openCrisprScreen(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.studyId}`, async () => {
        await expect(section.diseaseLink(index)).toHaveText(reportedDisease(expected));
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.diseaseFromSourceMappedId}`
        );
        expect(expected.diseaseFromSourceMappedId).toMatch(/^(MONDO|EFO)_\d+$/);

        await expect(section.studyLink(index)).toHaveText(expected.studyId);
        await expect(section.studyLink(index)).toHaveAttribute(
          "href",
          `https://crisprbrain.org/simple-screen/?screen=${expected.studyId}`
        );

        await expect(section.cell(index, CS_COLUMN.contrast)).toHaveText(
          `${expected.contrast} / ${overviewText(expected)}?`
        );
        await expect(section.cell(index, CS_COLUMN.cellType)).toHaveText(expected.cellType ?? "");

        const fold = foldChange(expected);
        await expect(section.cell(index, CS_COLUMN.log2fc)).toHaveText(fold);
        expect(Number(fold), "the fold change is a number").not.toBeNaN();
        await expect(section.cell(index, CS_COLUMN.significance)).toHaveText(
          `${significance(expected)}?`
        );
        expect(
          Number(significance(expected)),
          "the significance is a probability"
        ).toBeLessThanOrEqual(1);

        await expect(section.sourceLink(index)).toHaveText("CRISPRBrain");
        await expect(section.sourceLink(index)).toHaveAttribute("href", "https://crisprbrain.org/");
        expect(expected.projectId).toBe("crispr_brain");

        await expect(section.literatureTrigger(index, CS_COLUMN.publication)).toHaveText(
          expected.literature?.[0] ?? ""
        );
      });
    }
  });

  test("the contrast and significance tooltips give the screen library and the test tail", async ({
    page,
  }) => {
    const { section, list } = await openCrisprScreen(page);
    const first = list.rows[0];
    const contrast = await section.openContrastHelp(0);
    await expect(contrast).toContainText("SCREEN LIBRARY");
    await expect(contrast).toContainText(first.crisprScreenLibrary ?? "");

    const tail = await section.openHelp(0, CS_COLUMN.significance);
    await expect(tail).toContainText("STATISTICAL TEST TAIL");
    await expect(tail).toContainText(first.statisticalTestTail ?? "");
    await expect(section.tooltip, "only the tooltip of the hovered cell is open").toHaveCount(1);
  });

  test("pagination walks to the last page and back, and the page size select changes the rows", async ({
    page,
  }) => {
    const { section, list } = await openCrisprScreen(page);
    await test.step("pages", async () => {
      const { table } = section;
      const total = list.count;
      expect(total, "two pages: the second one is the last").toBeGreaterThan(EVIDENCE_PAGE_SIZE);
      expect(total).toBeLessThanOrEqual(2 * EVIDENCE_PAGE_SIZE);
      const firstPage = await table.columnTexts(CS_COLUMN.study);
      expect(firstPage).toEqual(list.rows.map((row) => row.studyId));

      const next = waitForPageOfOperation<{
        disease: Record<string, EvidenceList<CrisprScreenRow>>;
      }>(page, CS_OPERATION, 1);
      await table.nextPageButton.click();
      const second = (await next).disease[CS_LIST];
      await table.expectPosition(`${EVIDENCE_PAGE_SIZE + 1} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await expect(table.rows).toHaveCount(total - EVIDENCE_PAGE_SIZE);
      await expect
        .poll(() => table.columnTexts(CS_COLUMN.study), {
          message: "page 2 shows the API's second page",
        })
        .toEqual(second.rows.map((row) => row.studyId));
      await expect(section.diseaseLink(0)).toHaveAttribute(
        "href",
        `/disease/${second.rows[0].diseaseFromSourceMappedId}`
      );

      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${EVIDENCE_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect
        .poll(() => table.columnTexts(CS_COLUMN.study), { message: "the first page comes back" })
        .toEqual(firstPage);

      await table.lastPageButton.click();
      await table.expectPosition(`${EVIDENCE_PAGE_SIZE + 1} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.previousPageButton.click();
      await expect(table.position).toHaveText(`1 - ${EVIDENCE_PAGE_SIZE} of ${total}`);
    });
    await test.step("page sizes", async () => {
      await expectPageSizes(section, list);
    });
  });

  test("the column picker hides and restores the optional columns and locks the study", async ({
    page,
  }) => {
    const { section } = await openCrisprScreen(page);
    await expectColumnPicker(section, CS_HEADERS, CS_LOCKED, "Cell type");
  });

  test("the publication cell lists the publication of its row and closes again", async ({
    page,
  }) => {
    await stubEuropePmc(page);
    const { section, list } = await openCrisprScreen(page);
    await section.expectLiteratureDrawer(0, CS_COLUMN.publication, [
      list.rows[0].literature?.[0] ?? "",
    ]);
    // Another row, so the drawer is not showing a fixed publication.
    const other = list.rows.findIndex(
      (row) => row.literature?.[0] !== list.rows[0].literature?.[0]
    );
    expect(other, "the first page cites two different publications").toBeGreaterThan(0);
    await section.expectLiteratureDrawer(other, CS_COLUMN.publication, [
      list.rows[other].literature?.[0] ?? "",
    ]);
  });

  test("the export holds every screen with named columns", async ({ page }) => {
    const { section, list } = await openCrisprScreen(page);
    const { json, header } = await expectExports(
      section,
      list,
      `${KIF1A_NDD.ensgId}-${KIF1A_NDD.efoId}-crisprscreen`
    );
    expect(header).toEqual([
      "disease",
      "diseaseId",
      "studyIdentifier",
      "contrast",
      "studyOverview",
      "cellType",
      "log2FoldChange",
      "significance",
      "statisticalTestTail",
      "source",
      "publication",
    ]);
    expect(json.slice(0, list.rows.length).map((row) => row.studyIdentifier)).toEqual(
      list.rows.map((row) => row.studyId)
    );
    expect(json.map((row) => row.source)).toEqual(Array(list.count).fill("crispr_brain"));
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await openCrisprScreen(page);
    await section.controls.openApiQuery(CS_OPERATION, KIF1A_NDD.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens the page of the disease the screen is mapped to, not the one on this page", async ({
    page,
  }) => {
    const { section, list } = await openCrisprScreen(page);
    const index = list.rows.findIndex((row) => row.diseaseFromSourceMappedId !== KIF1A_NDD.efoId);
    expect(index, "the first page has a screen mapped to another disease").toBeGreaterThanOrEqual(
      0
    );
    const mapped = list.rows[index].diseaseFromSourceMappedId;
    await section.diseaseLink(index).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${mapped}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${KIF1A_NDD.ensgId}/${KIF1A_NDD.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
  });

  test("a pair with a single screen lists just that row", async ({ page }) => {
    const { section, list } = await openCrisprScreen(page, CHRM1_PD);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText("associating CHRM1 and CRISPR results");
    await expect(section.studyLink(0)).toHaveText(list.rows[0].studyId);
    await expect(section.cell(0, CS_COLUMN.cellType)).toHaveText(list.rows[0].cellType ?? "");
    await expect(section.table.nextPageButton).toBeDisabled();
    await expect(section.table.lastPageButton).toBeDisabled();
  });

  test("a pair without CRISPR screens does not render the section", async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}`);
    await expectSections(
      page,
      expectedSectionsFor(`${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}`)
    );
    await expect(new CrisprScreenSection(page).section).toHaveCount(0);
  });
});

import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  BRAF_MELANOMA,
  type ClinicalPrecedenceRow,
  CP_COLUMN,
  CP_HEADERS,
  CP_LIST,
  CP_LOCKED,
  CP_OPERATION,
  openClinicalPrecedence,
  otherTargetIds,
  stageLabel,
  startYear,
  targetsText,
} from "../../../../POM/objects/widgets/Evidence/clinicalPrecedence";
import { stubEuropePmcSearch } from "../../../../POM/objects/widgets/Evidence/europePmc";
import { DIRECTION_LABEL } from "../../../../POM/objects/widgets/Evidence/gene2Phenotype";
import {
  type EvidenceViewsData,
  evidenceList,
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import { EVIDENCE_PAGE_SIZE } from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import { waitForPageOfOperation } from "../../../../POM/objects/widgets/Evidence/somaticEvidenceSection";
import { CLINICAL_STAGE_LABELS } from "../../../../POM/page/drug/drugData";
import { expectSections } from "../../../../utils/sections";

/** BRAF in a disease with a single clinical precedence row. */
const BRAF_T1D = { ensgId: "ENSG00000157764", efoId: "MONDO_0005147" };
/** BRAF in myocardial infarction: no clinical precedence at all. */
const BRAF_MI = { ensgId: "ENSG00000157764", efoId: "MONDO_0005068" };

type SentVariables = {
  sort?: { key: string; direction: string }[];
  search?: { text?: string };
};

/** Wait for the clinical precedence response whose request matches, and return its data. */
async function waitForRequest(
  page: Page,
  matches: (variables: SentVariables) => boolean
): Promise<EvidenceViewsData<ClinicalPrecedenceRow>> {
  const response = await page.waitForResponse((candidate) => {
    const request = candidate.request();
    if (request.method() !== "POST") return false;
    const body = request.postDataJSON?.() as {
      operationName?: string;
      variables?: SentVariables;
    } | null;
    return body?.operationName === CP_OPERATION && matches(body.variables ?? {});
  });
  const body = (await response.json()) as {
    data: EvidenceViewsData<ClinicalPrecedenceRow>;
    errors?: unknown[];
  };
  expect(body.errors, `${CP_OPERATION} should not return GraphQL errors`).toBeUndefined();
  return body.data;
}

const waitForSortedPage = (page: Page, key: string, direction?: string) =>
  waitForRequest(
    page,
    (variables) =>
      variables.sort?.[0]?.key === key && (!direction || variables.sort[0].direction === direction)
  );

const waitForSearchedPage = (page: Page, text: string) =>
  waitForRequest(page, (variables) => variables.search?.text === text);

test.describe("Evidence page: Clinical precedence", () => {
  test.beforeEach(async ({ page }) => {
    // The Europe PMC section on the same page looks publications up on a third-party service.
    await stubEuropePmcSearch(page);
  });

  test("shows title, description, chip, controls and the table headers", async ({ page }) => {
    const { section, list } = await openClinicalPrecedence(page);
    expect(
      list.count,
      "BRAF has more than one page of clinical precedence in melanoma"
    ).toBeGreaterThan(EVIDENCE_PAGE_SIZE);

    await expect(section.title).toContainText("Clinical Precedence");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Clinical candidates and/or approved drugs pharmacologically targeting BRAF and indicated for melanoma. Source: Open Targets and ChEMBL."
    );
    await expect(section.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/evidence#clinical-precedence"
    );
    await expect(section.description.getByRole("link", { name: "ChEMBL" })).toHaveAttribute(
      "href",
      "https://www.ebi.ac.uk/chembl/"
    );
    await expect(section.table.headers).toHaveText([...CP_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "the table searches on the server").toBeVisible();
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });

  test("every row shows its report button, disease, targets, drug, direction, stage and start year", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    for (const [index, expected] of list.rows.entries()) {
      await test.step(`row ${index + 1}: ${expected.drugName} for ${expected.diseaseName}`, async () => {
        await expect(section.reportButton(index)).toHaveText("View");

        await expect(section.diseaseLink(index)).toHaveText(expected.diseaseName);
        await expect(section.diseaseLink(index)).toHaveAttribute(
          "href",
          `/disease/${expected.diseaseId}`
        );

        await expect(section.cell(index, CP_COLUMN.targets)).toHaveText(targetsText(expected));
        await expect(section.targetLink(index)).toHaveAttribute(
          "href",
          `/target/${expected.targetId}`
        );
        expect(expected.targetId).toBe(BRAF_MELANOMA.ensgId);

        await expect(section.drugLink(index)).toHaveText(expected.drugName);
        await expect(section.drugLink(index)).toHaveAttribute("href", `/drug/${expected.drugId}`);
        expect(expected.drugId).toMatch(/^CHEMBL\d+$/);

        await expect(section.directionIcons(index)).toHaveCount(2);
        await expect(section.cell(index, CP_COLUMN.stage)).toHaveText(
          stageLabel(expected.clinicalStage)
        );
        await expect(section.cell(index, CP_COLUMN.startDate)).toHaveText(
          startYear(expected.studyStartDate)
        );
      });
    }
    await test.step("the rows come sorted by stage, the latest stage first", async () => {
      const stages = await section.table.columnTexts(CP_COLUMN.stage);
      const ranks = stages.map((stage) => CLINICAL_STAGE_LABELS.indexOf(stage as never));
      expect(ranks.every((rank) => rank >= 0)).toBe(true);
      expect(ranks, "stages never go up the page").toEqual([...ranks].sort((a, b) => b - a));
      await expect(section.cell(0, CP_COLUMN.startDate)).toHaveText(/^(\d{4}|N\/A)$/);
    });
  });

  test("a drug that hits other targets says how many", async ({ page }) => {
    // The API says which rows of the first page have a multi-target drug; the cell must
    // count them the way the component does and link only the evidence target.
    const { section, list } = await openClinicalPrecedence(page);
    const targetCounts = list.rows.map((row) => otherTargetIds(row).length);
    for (const [index, others] of targetCounts.entries()) {
      const text = await section.cell(index, CP_COLUMN.targets).innerText();
      if (others === 0) expect(text.trim(), `row ${index + 1} names only BRAF`).toBe("BRAF");
      else expect(text.trim()).toBe(`BRAF and ${others} other target${others > 1 ? "s" : ""}`);
      await expect(section.cell(index, CP_COLUMN.targets).getByRole("link")).toHaveCount(1);
    }
  });

  test("the direction of effect icons and the header tooltip explain the assessment", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const expected = list.rows[0];
    const tooltip = await section.openDirection(0);
    await expect(tooltip).toHaveText(
      `${DIRECTION_LABEL[(expected.directionOnTarget ?? "default").toLowerCase()]} │ ${DIRECTION_LABEL[(expected.directionOnTrait ?? "default").toLowerCase()]}`
    );
    await expect(tooltip).toHaveText("Loss of Function │ Protective");

    await section.page.mouse.move(0, 0);
    await expect(section.tooltip).toHaveCount(0);
    await section.directionHeaderHelp.hover();
    await expect(
      section.tooltip.getByRole("link", { name: "More info on our assessment method" })
    ).toHaveAttribute("href", "https://platform-docs.opentargets.org/evidence#clinical-precedence");
  });

  test("pagination walks to the last page and back, and the page size select changes the rows", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    await test.step("pages", async () => {
      await expectPaging(
        page,
        section,
        CP_OPERATION,
        CP_LIST,
        list,
        (row: ClinicalPrecedenceRow) => row.drugName,
        CP_COLUMN.drug
      );
    });
    await test.step("page sizes", async () => {
      await expectPageSizes(section, list);
    });
  });

  test("the table is sorted by stage on the server and the Stage and Start Date headers re-sort it", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const rank = (stage: string): number =>
      CLINICAL_STAGE_LABELS.indexOf(stageLabel(stage) as never);
    expect(
      list.rows.map((row) => rank(row.clinicalStage)),
      "the first request sorts by stage, latest first"
    ).toEqual(list.rows.map((row) => rank(row.clinicalStage)).sort((a, b) => b - a));

    await test.step("stage: the first click drops the sort, the second sorts ascending", async () => {
      const header = section.table.headers.nth(CP_COLUMN.stage).getByText("Stage");
      const unsorted = waitForRequest(page, (variables) => !variables.sort?.length);
      await header.click();
      await unsorted;
      await expect(section.table.rows).toHaveCount(EVIDENCE_PAGE_SIZE);
      const response = waitForSortedPage(page, "CLINICAL_STAGE", "ASCENDING");
      await header.click();
      const rows = evidenceList(await response, CP_LIST).rows;
      const ranks = rows.map((row) => rank(row.clinicalStage));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      await expect
        .poll(() => section.table.columnTexts(CP_COLUMN.stage), {
          message: "the table shows the API's ascending page",
        })
        .toEqual(rows.map((row) => stageLabel(row.clinicalStage)));
    });

    await test.step("start date sorts on the server too", async () => {
      const response = waitForSortedPage(page, "STUDY_START_DATE");
      await section.table.headers.nth(CP_COLUMN.startDate).getByText("Start Date").click();
      const rows = evidenceList(await response, CP_LIST).rows;
      await expect
        .poll(() => section.table.columnTexts(CP_COLUMN.startDate), {
          message: "the table shows the API's page sorted by start date",
        })
        .toEqual(rows.map((row) => startYear(row.studyStartDate)));
    });
  });

  test("the search box filters the rows on the server and clearing it brings every row back", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const drug = list.rows[0].drugName as string;
    expect(drug, "the first row names its drug").toBeTruthy();

    const searched = waitForSearchedPage(page, drug);
    await section.table.search(drug);
    const result = evidenceList(await searched, CP_LIST);
    expect(result.count, "the drug is found").toBeGreaterThan(0);
    expect(result.count, "the search narrows the list").toBeLessThan(list.count);
    await expect(section.table.rows).toHaveCount(Math.min(result.count, EVIDENCE_PAGE_SIZE));
    await expect(section.table.position).toHaveText(
      `1 - ${Math.min(result.count, EVIDENCE_PAGE_SIZE)} of ${result.count}`
    );
    await expect
      .poll(() => section.table.columnTexts(CP_COLUMN.drug), {
        message: "the table shows the rows the API found",
      })
      .toEqual(result.rows.map((row) => row.drugName));
    for (const name of await section.table.columnTexts(CP_COLUMN.drug)) {
      expect(name.toLowerCase()).toBe(drug.toLowerCase());
    }

    await test.step("a term nothing matches leaves an empty table", async () => {
      const none = waitForSearchedPage(page, "zzzz-no-such-drug");
      await section.table.search("zzzz-no-such-drug");
      expect(evidenceList(await none, CP_LIST).count).toBe(0);
      await expect(section.table.rows).toHaveCount(0);
    });

    await test.step("clearing the search restores the list", async () => {
      await section.table.search("");
      await expect(section.table.position).toHaveText(`1 - ${EVIDENCE_PAGE_SIZE} of ${list.count}`);
      await expect(section.table.rows).toHaveCount(EVIDENCE_PAGE_SIZE);
    });
  });

  test("the column picker hides and restores the optional columns and locks the others", async ({
    page,
  }) => {
    const { section } = await openClinicalPrecedence(page);
    await expectColumnPicker(
      section,
      [
        "Report",
        "Disease/phenotype",
        "Targets",
        "Drug",
        "Direction of Effect?",
        "Stage",
        "Start Date",
      ],
      CP_LOCKED,
      "Stage"
    );
  });

  test("a report opens in a drawer with the details of the row clicked, and closes again", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const first = list.rows[0];
    expect(first.clinicalReportId, "the first row cites a report").not.toBeNull();
    await expect(section.recordDrawer).toHaveCount(0);

    const drawer = await section.openReport(0, first.clinicalReportId as string);
    await test.step("source, url, stage and diseases of the report", async () => {
      await expect(drawer).toContainText(/Source\s*\S+/);
      const link = drawer.getByRole("link").first();
      await expect(link).toHaveAttribute("href", /^https?:\/\/\S+$/);
      await expect(link, "the link text is the URL itself").toHaveText(/^https?:\/\/\S+$/);
      await expect(drawer).toContainText(new RegExp(`Stage\\s*${stageLabel(first.clinicalStage)}`));
      await expect(
        drawer.getByRole("link", { name: first.diseaseName, exact: true }).first()
      ).toHaveAttribute("href", `/disease/${first.diseaseId}`);
      await expect(drawer).toContainText(/Drugs\s*\S+/);
    });
    await section.closeReport();

    await test.step("another row replaces the content, and Escape closes it", async () => {
      const second = list.rows[3];
      const secondDrawer = await section.openReport(3, second.clinicalReportId as string);
      await expect(secondDrawer).toContainText(
        new RegExp(`Stage\\s*${stageLabel(second.clinicalStage)}`)
      );
      await page.keyboard.press("Escape");
      await expect(section.recordDrawer).toBeHidden();
    });
  });

  test("a trial on the last page shows its start date in the drawer", async ({ page }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const lastPage = Math.ceil(list.count / EVIDENCE_PAGE_SIZE) - 1;
    const last = waitForPageOfOperation<EvidenceViewsData<ClinicalPrecedenceRow>>(
      page,
      CP_OPERATION,
      lastPage
    );
    await section.table.lastPageButton.click();
    const rows = evidenceList(await last, CP_LIST).rows;
    await expect(section.table.rows).toHaveCount(rows.length);
    const index = rows.findIndex((row) => row.studyStartDate !== null);
    expect(index, "the last page has a study with a start date").toBeGreaterThanOrEqual(0);
    await expect(section.cell(index, CP_COLUMN.startDate)).toHaveText(
      startYear(rows[index].studyStartDate)
    );

    const drawer = await section.openReport(index, rows[index].clinicalReportId as string);
    await expect(drawer).toContainText(/Start\s*\d{4}-\d{2}-\d{2}/);
    await expect(drawer).toContainText(
      new RegExp(`Stage\\s*${stageLabel(rows[index].clinicalStage)}`)
    );
    await section.closeReport();
  });

  test("the export holds every row with named columns", async ({ page }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const { json, header } = await expectExports(
      section,
      list,
      `${BRAF_MELANOMA.ensgId}-${BRAF_MELANOMA.efoId}-clinical-precedence-evidence`
    );
    expect(header).toEqual([
      "clinicalReportId",
      "diseaseId",
      "diseaseName",
      "targetId",
      "targetApprovedSymbol",
      "drugId",
      "drugName",
      "clinicalStage",
      "startDate",
    ]);
    expect(json.map((row) => row.drugId)).toEqual(
      expect.arrayContaining(list.rows.map((row) => row.drugId))
    );
    expect(json.slice(0, list.rows.length).map((row) => row.clinicalReportId)).toEqual(
      list.rows.map((row) => row.clinicalReportId)
    );
    expect(new Set(json.map((row) => row.targetApprovedSymbol))).toEqual(new Set(["BRAF"]));
  });

  test("the API query drawer is loaded with the section's query", async ({ page }) => {
    const { section } = await openClinicalPrecedence(page);
    await section.controls.openApiQuery(CP_OPERATION, BRAF_MELANOMA.ensgId);
    await section.controls.closeApiQuery();
  });

  test("a disease link opens that disease's page and back returns to the section", async ({
    page,
  }) => {
    const { section, list } = await openClinicalPrecedence(page);
    const target = list.rows.findIndex((row) => row.diseaseId !== BRAF_MELANOMA.efoId);
    const index = target >= 0 ? target : 0;
    const disease = { id: list.rows[index].diseaseId, name: list.rows[index].diseaseName };
    await section.diseaseLink(index).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${disease.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(disease.name);

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/evidence/${BRAF_MELANOMA.ensgId}/${BRAF_MELANOMA.efoId}(#.*)?$`)
    );
    await section.expectLoaded();
    await expect(section.table.rows).toHaveCount(EVIDENCE_PAGE_SIZE);
  });

  test("a drug link opens that drug's page", async ({ page }) => {
    const { section, list } = await openClinicalPrecedence(page);
    await section.drugLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${list.rows[0].drugId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      list.rows[0].drugName,
      { ignoreCase: true }
    );
  });

  test("the target link opens the target's page", async ({ page }) => {
    const { section } = await openClinicalPrecedence(page);
    await section.targetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/target/${BRAF_MELANOMA.ensgId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText("BRAF");
  });

  test("a pair with a single clinical precedence row lists just that row", async ({ page }) => {
    const { section, list } = await openClinicalPrecedence(page, BRAF_T1D);
    expect(list.count).toBe(1);
    await expectFirstPage(section, list);
    await expect(section.description).toContainText(
      "targeting BRAF and indicated for type 1 diabetes mellitus"
    );
    await expect(section.diseaseLink(0)).toHaveAttribute(
      "href",
      `/disease/${list.rows[0].diseaseId}`
    );
    await expect(section.cell(0, CP_COLUMN.stage)).toHaveText(
      stageLabel(list.rows[0].clinicalStage)
    );
    await expect(section.table.nextPageButton).toBeDisabled();
  });

  test("a pair without clinical precedence does not render the section", async ({ page }) => {
    await page.goto(`/evidence/${BRAF_MI.ensgId}/${BRAF_MI.efoId}`);
    await expectSections(page, expectedSectionsFor(`${BRAF_MI.ensgId}/${BRAF_MI.efoId}`));
    await expect(page.getByTestId("section-clinical-precedence")).toHaveCount(0);
  });
});

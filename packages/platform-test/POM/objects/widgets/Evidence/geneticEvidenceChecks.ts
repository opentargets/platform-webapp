import { expect, type Page } from "@playwright/test";
import { stubEuropePmc, waitForOperation } from "../shared/sectionDataControls";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
  type EvidencePair,
  type GeneticEvidenceSection,
} from "./geneticEvidenceSection";
import { waitForPageOfOperation } from "./somaticEvidenceSection";

/** The shape every evidence section query answers with since the move to `evidenceViews`. */
export type EvidenceViewsData<Row> = {
  disease: {
    evidenceViews?: Record<string, EvidenceList<Row> | undefined>;
    // sections not yet migrated to evidenceViews (Orphanet, UniProt variants, Genomics England,
    // ClinGen) still alias `evidences` directly under `disease`
    [alias: string]:
      | EvidenceList<Row>
      | Record<string, EvidenceList<Row> | undefined>
      | string
      | undefined;
  };
};

/** The `{ count, rows }` of one evidence view, failing clearly when the key is wrong. */
export function evidenceList<Row>(
  data: EvidenceViewsData<Row>,
  listKey: string
): EvidenceList<Row> {
  const views = data.disease?.evidenceViews ?? {};
  const aliased = data.disease?.[listKey];
  const list =
    views[listKey] ??
    (aliased && typeof aliased === "object" && "rows" in aliased
      ? (aliased as EvidenceList<Row>)
      : undefined);
  expect(
    list,
    `the response holds disease.evidenceViews.${listKey} or disease.${listKey}; evidenceViews has: ${
      Object.keys(views).join(", ") || "nothing"
    }`
  ).toBeDefined();
  return list as EvidenceList<Row>;
}

/**
 * Open an evidence page and wait for one section together with the response of its first
 * page. Europe PMC is stubbed, so the publication drawers depend only on the app.
 * `listKey` is the field of `disease.evidenceViews` the section's query reads (e.g. `eva`), or the
 * alias under `disease` for a section not yet migrated to evidenceViews.
 */
export async function openEvidenceSection<Row>(
  page: Page,
  section: GeneticEvidenceSection,
  operation: string,
  listKey: string,
  pair: EvidencePair
): Promise<EvidenceList<Row>> {
  await stubEuropePmc(page);
  const response = waitForOperation<EvidenceViewsData<Row>>(page, operation);
  await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
  const { data, variables } = await response;
  expect(variables, "the section asks for the first page of its target and disease").toMatchObject({
    ensemblId: pair.ensgId,
    efoId: pair.efoId,
    index: 0,
    size: EVIDENCE_PAGE_SIZE,
  });
  await section.expectLoaded();
  const list = evidenceList(data, listKey);
  expect(list.count, "the API has evidence for this pair").toBeGreaterThan(0);
  expect(list.rows.length).toBe(Math.min(list.count, EVIDENCE_PAGE_SIZE));
  return list;
}

/** Assert the footer, the pagination buttons and the row count of the first page. */
export async function expectFirstPage(
  section: GeneticEvidenceSection,
  list: EvidenceList<unknown>
): Promise<void> {
  const { table } = section;
  const shown = Math.min(list.count, EVIDENCE_PAGE_SIZE);
  await expect(table.position).toHaveText(`1 - ${shown} of ${list.count}`);
  await expect(table.rows).toHaveCount(shown);
  await expect(table.firstPageButton).toBeDisabled();
  await expect(table.previousPageButton).toBeDisabled();
  if (list.count > EVIDENCE_PAGE_SIZE) {
    await expect(table.nextPageButton).toBeEnabled();
    await expect(table.lastPageButton).toBeEnabled();
  } else {
    await expect(table.nextPageButton).toBeDisabled();
    await expect(table.lastPageButton).toBeDisabled();
  }
}

/**
 * Page forwards to the last page and back to the first one. `firstCell` reads the text
 * of the cell that identifies a row (in the DOM) and `rowText` what the API says it is.
 */
export async function expectPaging<Row>(
  page: Page,
  section: GeneticEvidenceSection,
  operation: string,
  listKey: string,
  list: EvidenceList<Row>,
  identify: (row: Row) => string,
  identifyColumn: number
): Promise<void> {
  const { table } = section;
  const total = list.count;
  const lastPage = Math.ceil(total / EVIDENCE_PAGE_SIZE) - 1;
  expect(lastPage, "this pair has at least two pages").toBeGreaterThanOrEqual(1);
  const firstPageTexts = await table.columnTexts(identifyColumn);
  expect(firstPageTexts).toEqual(list.rows.map(identify));

  const next = waitForPageOfOperation<EvidenceViewsData<Row>>(page, operation, 1);
  await table.nextPageButton.click();
  const second = evidenceList(await next, listKey);
  await expect(table.position).toHaveText(
    `${EVIDENCE_PAGE_SIZE + 1} - ${Math.min(2 * EVIDENCE_PAGE_SIZE, total)} of ${total}`
  );
  await expect
    .poll(() => table.columnTexts(identifyColumn), {
      message: "page 2 shows the API's second page",
    })
    .toEqual(second.rows.map(identify));
  await expect(table.firstPageButton).toBeEnabled();
  await expect(table.previousPageButton).toBeEnabled();

  const last = waitForPageOfOperation<EvidenceViewsData<Row>>(page, operation, lastPage);
  await table.lastPageButton.click();
  const lastRows = evidenceList(await last, listKey);
  const remainder = total - lastPage * EVIDENCE_PAGE_SIZE;
  await expect(table.position).toHaveText(
    `${lastPage * EVIDENCE_PAGE_SIZE + 1} - ${total} of ${total}`
  );
  await expect(table.rows).toHaveCount(remainder);
  await expect
    .poll(() => table.columnTexts(identifyColumn), { message: "the last page shows the remainder" })
    .toEqual(lastRows.rows.map(identify));
  await expect(table.firstPageButton).toBeEnabled();
  await expect(table.previousPageButton).toBeEnabled();
  await expect(table.nextPageButton).toBeDisabled();
  await expect(table.lastPageButton).toBeDisabled();

  await table.firstPageButton.click();
  await expect(table.position).toHaveText(`1 - ${EVIDENCE_PAGE_SIZE} of ${total}`);
  await expect
    .poll(() => table.columnTexts(identifyColumn), { message: "the first page comes back" })
    .toEqual(firstPageTexts);
  await expect(table.firstPageButton).toBeDisabled();
  await expect(table.previousPageButton).toBeDisabled();
}

/** The page-size select offers 10, 25 and 100 rows and a bigger size shows more rows. */
export async function expectPageSizes(
  section: GeneticEvidenceSection,
  list: EvidenceList<unknown>
): Promise<void> {
  const { table } = section;
  await expect(table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
  await expect(table.pageSizeSelect).toHaveValue("10");
  const shown = Math.min(list.count, 25);
  await table.pageSizeSelect.selectOption("25");
  await expect(table.pageSizeSelect).toHaveValue("25");
  await expect(table.position).toHaveText(`1 - ${shown} of ${list.count}`);
  await expect(table.rows).toHaveCount(shown);
  await table.pageSizeSelect.selectOption("10");
  await expect(table.rows).toHaveCount(Math.min(list.count, EVIDENCE_PAGE_SIZE));
}

/** Hide and restore a column through the column picker; `locked` columns cannot be hidden. */
export async function expectColumnPicker(
  section: GeneticEvidenceSection,
  pickerNames: readonly string[],
  locked: readonly string[],
  hide: string
): Promise<void> {
  const { table } = section;
  const headers = pickerNames;
  const picker = await table.openColumnPicker();
  await expect(picker.getByRole("checkbox")).toHaveCount(headers.length);
  for (const name of headers) {
    const box = picker.getByRole("checkbox", { name, exact: true });
    await expect(box).toBeChecked();
    if (locked.includes(name)) await expect(box).toBeDisabled();
    else await expect(box).toBeEnabled();
  }
  await picker.getByRole("checkbox", { name: hide, exact: true }).uncheck();
  await expect(table.headers).toHaveCount(headers.length - 1);
  await expect(table.headers.filter({ hasText: hide })).toHaveCount(0);
  await expect(table.row(0).locator("td")).toHaveCount(headers.length - 1);
  await picker.getByRole("checkbox", { name: hide, exact: true }).check();
  await expect(table.headers).toHaveCount(headers.length);
  await section.title.click();
  await expect(picker).toBeHidden();
}

/** Export JSON and TSV: every row of the API, not only the visible page. */
export async function expectExports(
  section: GeneticEvidenceSection,
  list: EvidenceList<unknown>,
  stem: string
): Promise<{ json: Record<string, unknown>[]; header: string[] }> {
  const json = await section.controls.downloadJson();
  expect(json.filename).toBe(`${stem}.json`);
  expect(json.rows, "the JSON export holds every row, not only the visible page").toHaveLength(
    list.count
  );
  const tsv = await section.controls.downloadTsv();
  expect(tsv.filename).toBe(`${stem}.tsv`);
  expect(
    tsv.lines.filter((line) => line.join("").length > 0),
    "the TSV export holds a line per row"
  ).toHaveLength(list.count);
  return { json: json.rows, header: tsv.header };
}

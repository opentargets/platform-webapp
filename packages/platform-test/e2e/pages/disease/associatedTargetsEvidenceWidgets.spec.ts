import { expect, test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
import {
  DATA_SOURCE_COLUMNS,
  dataSourceColumn,
  prioritisationColumn,
} from "../../../POM/objects/widgets/AOTF/columns";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";

/**
 * Clicking a cell with a value in the associations table opens, under that row, the
 * widget of that column: an evidence widget in the associations view, a target profile
 * widget in the prioritisation view. Clicking it again closes it.
 *
 * Each test checks every cell the gene has a value in, so a column wired to the wrong
 * widget, a widget whose query fails, or a cell that does not open anything fails here.
 */
test.describe("Disease associations: evidence widgets", () => {
  test.describe.configure({ timeout: 240_000 });

  test(
    "clicking a data cell opens the widget of that data source and closing it removes it",
    { tag: "@smoke" },
    async ({ page, testConfig }) => {
      await stubEuropePmc(page);
      const aotf = new AssociationsTable(page);
      const gene = "IL6";
      await aotf.gotoDisease(testConfig.disease.primary, { q: gene });
      const row = aotf.rowByName(gene);
      await expect(row, `${gene} should be listed for the disease`).toHaveCount(1);

      const [columnId] = await aotf.dataColumnIds(row);
      const column = dataSourceColumn(columnId);
      const panel = await aotf.openPanel(row, column.id, {
        panelKey: column.id,
        sectionId: column.sectionId,
      });
      await expect(panel.title(column.sectionId)).toContainText(column.sectionName);

      await aotf.dataCell(row, column.id).click();
      await panel.expectClosed();
    }
  );

  for (const gene of ["IL6", "ADRB1", "APOE"]) {
    test(`${gene}: every data cell opens the widget of its data source`, async ({
      page,
      testConfig,
    }) => {
      expect(testConfig.disease.aotfGenes ?? []).toContain(gene);
      await stubEuropePmc(page);
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { q: gene });
      const row = aotf.rowByName(gene);
      await expect(row, `${gene} should be listed for the disease`).toHaveCount(1);

      const columnIds = await aotf.dataColumnIds(row);
      expect(columnIds.length, `${gene} should have evidence in some data source`).toBeGreaterThan(
        0
      );
      expect(
        columnIds.filter((id) => !DATA_SOURCE_COLUMNS.some((column) => column.id === id)),
        "every column with a value is a known data source"
      ).toEqual([]);

      for (const columnId of columnIds) {
        await test.step(`${columnId} opens and closes`, async () => {
          const column = dataSourceColumn(columnId);
          const panel = await aotf.openPanel(row, column.id, {
            panelKey: column.id,
            sectionId: column.sectionId,
          });
          await expect(panel.title(column.sectionId)).toContainText(column.sectionName);
          await aotf.dataCell(row, column.id).click();
          await panel.expectClosed();
          await expect(aotf.openPanels).toHaveCount(0);
        });
      }
    });

    test(`${gene}: every data cell of the prioritisation view opens its target widget`, async ({
      page,
      testConfig,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(testConfig.disease.primary, { table: "prioritisations", q: gene });
      const row = aotf.rowByName(gene);
      await expect(row, `${gene} should be listed for the disease`).toHaveCount(1);

      const columnIds = await aotf.dataColumnIds(row);
      expect(columnIds.length, `${gene} should have prioritisation data`).toBeGreaterThan(0);

      for (const columnId of columnIds) {
        await test.step(`${columnId} opens and closes`, async () => {
          const column = prioritisationColumn(columnId);
          const panel = await aotf.openPanel(row, column.id, {
            panelKey: column.panelKey,
            sectionId: column.sectionId,
          });
          await expect(panel.title(column.sectionId)).toContainText(column.sectionName);
          await aotf.dataCell(row, column.id).click();
          await panel.expectClosed();
        });
      }
    });
  }

  test("clicking another cell of the row replaces the open widget", async ({
    page,
    testConfig,
  }) => {
    await stubEuropePmc(page);
    const aotf = new AssociationsTable(page);
    const gene = "ADRB1";
    await aotf.gotoDisease(testConfig.disease.primary, { q: gene });
    const row = aotf.rowByName(gene);
    await expect(row).toHaveCount(1);
    const [first, second] = await aotf.dataColumnIds(row);
    expect(second, `${gene} should have data in at least two sources`).toBeTruthy();

    const firstPanel = await aotf.openPanel(row, first, {
      panelKey: first,
      sectionId: dataSourceColumn(first).sectionId,
    });
    await aotf.openPanel(row, second, {
      panelKey: second,
      sectionId: dataSourceColumn(second).sectionId,
    });
    await firstPanel.expectClosed();
  });

  test("a cell without a value opens nothing", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    const gene = "IL6";
    await aotf.gotoDisease(testConfig.disease.primary, { q: gene });
    const row = aotf.rowByName(gene);
    await expect(row).toHaveCount(1);
    const withData = await aotf.dataColumnIds(row);
    const empty = DATA_SOURCE_COLUMNS.find((column) => !withData.includes(column.id));
    expect(empty, `${gene} should lack data in at least one source`).toBeDefined();

    await aotf.emptyCell(row, empty!.id).click();
    await expect(aotf.openPanels).toHaveCount(0);
    await expect(aotf.emptyCell(row, empty!.id)).toBeVisible();
  });

  test("the open widget is kept in the URL and restored on reload", async ({
    page,
    testConfig,
  }) => {
    await stubEuropePmc(page);
    const aotf = new AssociationsTable(page);
    const gene = "ADRB1";
    await aotf.gotoDisease(testConfig.disease.primary, { q: gene });
    const row = aotf.rowByName(gene);
    await expect(row).toHaveCount(1);
    const column = dataSourceColumn("clinical_precedence");

    await aotf.openPanel(row, column.id, { panelKey: column.id, sectionId: column.sectionId });
    await aotf.expectUrlParam(
      "focus",
      new RegExp(`^core\\|ENSG\\d+\\|${column.id}\\+${column.id}$`)
    );

    await page.reload();
    await aotf.expectLoaded();
    await aotf.panel(column.id).expectLoaded(column.sectionId);
    await expect(aotf.openPanels).toHaveCount(1);
  });
});

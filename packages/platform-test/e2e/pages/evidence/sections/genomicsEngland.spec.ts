import { expect, test } from "../../../../fixtures";
import {
  EVIDENCE_PAGE_SIZE,
  GeneticEvidenceSection,
  MECP2_NDD,
  NF1_NF1,
  PCSK9_LDL,
  sentence,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceSection";
import {
  expectColumnPicker,
  expectExports,
  expectFirstPage,
  expectPageSizes,
  expectPaging,
  openEvidenceSection,
} from "../../../../POM/objects/widgets/Evidence/geneticEvidenceChecks";
import {
  GE_COLUMN,
  GE_HEADERS,
  GE_LIST,
  GE_OPERATION,
  GenomicsEnglandSection,
  type GeRow,
} from "../../../../POM/objects/widgets/Evidence/genomicsEngland";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSectionLoaded } from "../../../../utils/sections";

async function open(page: import("@playwright/test").Page, pair = NF1_NF1) {
  const section = new GenomicsEnglandSection(page);
  const list = await openEvidenceSection<GeRow>(page, section, GE_OPERATION, GE_LIST, pair);
  return { section, list };
}

test.describe("Evidence page: Genomics England PanelApp", () => {
  test("shows title, description, chip and the table headers @smoke", async ({ page }) => {
    const { section, list } = await open(page);
    expect(list.count, "NF1 has several pages of panels").toBeGreaterThan(EVIDENCE_PAGE_SIZE);

    await expect(section.title).toContainText("GEL PanelApp");
    await expect(section.chip).toBeVisible();
    await expect(section.description).toHaveText(
      "Crowdsourced expert knowledge establishing consensus causation evidence associating NF1 with neurofibromatosis type 1. Source: Genomics England PanelApp"
    );
    await expect(section.description.getByRole("link", { name: "Genomics England PanelApp" })).toHaveAttribute(
      "href",
      "https://panelapp.genomicsengland.co.uk"
    );
    await expect(section.table.headers).toHaveText([...GE_HEADERS]);
    await expectFirstPage(section, list);
    await expect(section.table.searchInput, "the table has no search box").toHaveCount(0);
    await expect(section.table.columnsButton).toBeVisible();
    await expect(section.controls.exportButton).toBeVisible();
    await expect(section.controls.apiQueryButton).toBeVisible();
  });
});

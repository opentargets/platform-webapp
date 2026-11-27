import { expect, test } from "../../../../fixtures";
import { ComparativeGenomicsSection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Comparative Genomics Section", () => {
  sectionContract({
    id: "compgenomics",
    title: "Comparative Genomics",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("shows the homology chart and the export", async ({ page }) => {
    const section = new ComparativeGenomicsSection(page);

    await expect(section.chart()).toBeVisible();
    await expect(section.exportButton()).toBeVisible();
  });

  test("table view lists homologues", async ({ page }) => {
    const section = new ComparativeGenomicsSection(page);

    await section.tableViewToggle().click();

    await expect(section.rows().first()).toBeVisible();
    await expect(
      section.rows().first().locator("a[href*='identifiers.org/ensembl']").first()
    ).toBeVisible();
  });
});

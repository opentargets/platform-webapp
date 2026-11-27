import { expect, test } from "../../../../fixtures";
import { SubcellularLocationSection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Subcellular Location Section", () => {
  sectionContract({
    id: "subcellularlocation",
    title: "Subcellular Location",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("HPA main tab shows the cell diagram and locations", async ({ page }) => {
    const section = new SubcellularLocationSection(page);

    await expect(section.tabPanel("hpa_main")).toBeVisible();
    await expect(section.visualization()).toBeVisible();
    await expect(section.locationItems().first()).toBeVisible();
  });

  test("UniProt tab can be selected", async ({ page }) => {
    const section = new SubcellularLocationSection(page);

    await section.tab("uniprot").click();

    await expect(section.tabPanel("uniprot")).toBeVisible();
    await expect(
      section.tabPanel("uniprot").locator("a[href*='identifiers.org/uniprot']").first()
    ).toBeVisible();
  });
});

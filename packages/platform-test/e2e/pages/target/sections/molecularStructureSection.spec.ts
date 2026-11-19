import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Molecular Structure Section", () => {
  sectionContract({
    id: "molecularstructure",
    title: "Molecular Structure",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "AlphaFold" },
  });

  test("lists the AlphaFold prediction", async ({ page }) => {
    const section = new ProfileSection(page, "molecularstructure");

    await expect(section.rows().first()).toContainText("AlphaFold");
    await expect(section.root.locator("a[href*='alphafold.ebi.ac.uk']").first()).toBeVisible();
  });
});

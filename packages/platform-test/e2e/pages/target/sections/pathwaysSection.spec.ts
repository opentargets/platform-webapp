import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Pathways Section", () => {
  sectionContract({
    id: "pathways",
    title: "Pathways",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "signaling", exportable: true },
  });

  test("rows link to the Reactome pathway browser", async ({ page }) => {
    const firstRow = new ProfileSection(page, "pathways").rows().first();

    await expect(firstRow.locator("a[href*='reactome.org']").first()).toBeVisible();
  });
});

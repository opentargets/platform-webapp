import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Chemical Probes Section", () => {
  sectionContract({
    id: "chemicalprobes",
    title: "Chemical Probes",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "degrader", exportable: true },
  });

  test("probes with a ChEMBL id link to their drug page", async ({ page }) => {
    const section = new ProfileSection(page, "chemicalprobes");

    await expect(section.rows().locator("a[href*='/drug/']").first()).toBeVisible();
  });
});

import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Cancer Hallmarks Section", () => {
  sectionContract({
    id: "cancerhallmarks",
    title: "Cancer Hallmarks",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "proliferative", exportable: true },
  });

  test("shows the role in cancer", async ({ page }) => {
    const roleInCancer = new ProfileSection(page, "cancerhallmarks").root.getByTestId(
      "role-in-cancer"
    );

    await expect(roleInCancer).toBeVisible();
    await expect(roleInCancer.locator("a[href*='europepmc.org']").first()).toBeVisible();
  });

  test("rows link to their publications", async ({ page }) => {
    const firstRow = new ProfileSection(page, "cancerhallmarks").rows().first();

    await expect(firstRow.getByRole("button").first()).toBeVisible();
  });
});

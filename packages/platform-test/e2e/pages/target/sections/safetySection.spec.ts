import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Safety Section", () => {
  sectionContract({
    id: "safety",
    title: "Safety",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "heart", exportable: true },
  });

  test("rows link the event to its disease page", async ({ page }) => {
    const firstRow = new ProfileSection(page, "safety").rows().first();

    await expect(firstRow.locator("a[href*='/disease/']").first()).toBeVisible();
  });

  test("studies drawer opens", async ({ page }) => {
    const section = new ProfileSection(page, "safety");

    await section
      .rows()
      .first()
      .getByRole("button", { name: /studies/ })
      .click();

    await expect(page.getByTestId("safety-studies-drawer")).toBeVisible();
  });
});

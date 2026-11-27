import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("molQTL Credible Sets Section", () => {
  sectionContract({
    id: "qtl-credible-sets",
    title: "molQTL Credible Sets",
    url: (config) => `/target/${config.target?.primary}`,
    table: { exportable: true },
  });

  test("credible set link opens the credible set page", async ({ page }) => {
    const link = new ProfileSection(page, "qtl-credible-sets")
      .rows()
      .first()
      .locator("a[href*='/credible-set/']")
      .first();

    await link.click();

    await expect(page).toHaveURL(/\/credible-set\//);
  });

  test("study link opens the study page", async ({ page }) => {
    const link = new ProfileSection(page, "qtl-credible-sets")
      .rows()
      .first()
      .locator("a[href*='/study/']")
      .first();

    await link.click();

    await expect(page).toHaveURL(/\/study\//);
  });
});

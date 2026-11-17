import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Genetic Constraint Section", () => {
  sectionContract({
    id: "geneticconstraint",
    title: "Genetic Constraint",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "Missense", exportable: true },
  });

  test("lists the three constraint types with observed/expected values", async ({ page }) => {
    const rows = new ProfileSection(page, "geneticconstraint").rows();

    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Synonymous");
    await expect(rows.nth(1)).toContainText("Missense");
    await expect(rows.nth(0)).toContainText("o/e =");
  });

  test("links to gnomAD", async ({ page }) => {
    const section = new ProfileSection(page, "geneticconstraint");

    await expect(
      section.root.locator("a[href*='gnomad.broadinstitute.org']").first()
    ).toBeVisible();
  });
});

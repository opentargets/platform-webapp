import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Mouse Phenotypes Section", () => {
  sectionContract({
    id: "mousephenotypes",
    title: "Mouse Phenotypes",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "neurocranium", exportable: true },
  });

  test("rows show the phenotype with its categories and models", async ({ page }) => {
    const firstRow = new ProfileSection(page, "mousephenotypes").rows().first();

    await expect(firstRow.getByRole("button", { name: /categor/ })).toBeVisible();
    await expect(firstRow.getByRole("button", { name: /model/ })).toBeVisible();
  });

  test("links to MGI", async ({ page }) => {
    const section = new ProfileSection(page, "mousephenotypes");

    await expect(section.root.locator("a[href*='informatics.jax.org']").first()).toBeVisible();
  });
});

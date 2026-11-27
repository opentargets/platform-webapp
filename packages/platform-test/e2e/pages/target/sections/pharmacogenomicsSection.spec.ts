import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Pharmacogenetics Section", () => {
  sectionContract({
    id: "pharmacogenetics",
    title: "Pharmacogenetics",
    url: (config) => `/target/${config.target?.withPharmacogenomics}`,
    table: { searchTerm: "desipramine", exportable: true },
  });

  test("rows show the genotype and link to the drug", async ({ page }) => {
    const firstRow = new ProfileSection(page, "pharmacogenetics").rows().first();

    await expect(firstRow).toContainText("CYP2D6*");
    await expect(firstRow.locator("a[href*='/drug/']").first()).toBeVisible();
  });

  test("next page shows the following rows", async ({ page }) => {
    const section = new ProfileSection(page, "pharmacogenetics");
    const firstRow = await section.rows().first().innerText();

    await section.nextPageButton().click();

    await expect(section.rows().first()).not.toHaveText(firstRow);
  });
});

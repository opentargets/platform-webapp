import { expect, test } from "../../../../fixtures";
import { MolecularInteractionsSection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Molecular Interactions Section", () => {
  sectionContract({
    id: "interactions",
    title: "Molecular Interactions",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "KRAS", exportable: true },
  });

  test("shows a tab per interaction source", async ({ page }) => {
    const section = new MolecularInteractionsSection(page);

    for (const source of ["intact", "signor", "reactome", "string"] as const) {
      await expect(section.tab(source)).toBeVisible();
    }
  });

  test("STRING tab lists interactors linked to their target page", async ({ page }) => {
    const section = new MolecularInteractionsSection(page);

    await section.tab("string").click();

    await expect(section.content("string")).toBeVisible();
    await expect(section.rows().first().locator("a[href*='/target/']").first()).toBeVisible();
  });
});

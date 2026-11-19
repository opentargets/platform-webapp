import { expect, test } from "../../../../fixtures";
import { ProfileSection } from "../../../../POM/objects/components/ProfileSection/profileSection";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Gene Ontology Section", () => {
  sectionContract({
    id: "geneontology",
    title: "Gene Ontology",
    url: (config) => `/target/${config.target?.primary}`,
    table: { searchTerm: "Biological Process", exportable: true },
  });

  test("rows link to the GO term and its evidence", async ({ page }) => {
    const firstRow = new ProfileSection(page, "geneontology").rows().first();

    await expect(firstRow.locator("a[href*='ebi.ac.uk']").first()).toBeVisible();
    await expect(firstRow.getByRole("button").first()).toBeVisible();
  });
});

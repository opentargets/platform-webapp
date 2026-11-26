import { expect, test } from "../../../fixtures";
import { TargetPage } from "../../../POM/page/target/target";

// Pinned entities: the RNAcentral link depends on the target's dbXrefs, so the
// generic testConfig target cannot cover both cases
const NON_CODING_TARGET = {
  id: "ENSG00000245532", // NEAT1, lncRNA with no protein ids
  rnacentralId: "URS0000204428_9606",
};
const PROTEIN_CODING_TARGET = "ENSG00000157764"; // BRAF, no RNAcentral xref

test.describe("Target Page - RNAcentral header link", () => {
  test(
    "Non-coding target links to RNAcentral and shows no UniProt label",
    { tag: "@smoke" },
    async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.goToTargetPage(NON_CODING_TARGET.id);

      const links = targetPage.getRNAcentralLinks();
      await expect(links).toHaveCount(1);
      await expect(links.first()).toHaveText(NON_CODING_TARGET.rnacentralId);
      await expect(links.first()).toHaveAttribute(
        "href",
        `https://identifiers.org/rnacentral:${NON_CODING_TARGET.rnacentralId}`
      );

      await expect(targetPage.getUniProtLabel()).toHaveCount(0);
    }
  );

  test("Protein-coding target without an RNAcentral xref shows no RNAcentral link", async ({
    page,
  }) => {
    const targetPage = new TargetPage(page);
    await targetPage.goToTargetPage(PROTEIN_CODING_TARGET);

    await expect(targetPage.getUniProtLabel()).toBeVisible();
    await expect(targetPage.getRNAcentralLabel()).toHaveCount(0);
  });
});

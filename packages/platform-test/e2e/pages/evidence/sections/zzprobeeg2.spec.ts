import { test } from "../../../../fixtures";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectAllSectionsSettled, renderedSectionIds } from "../../../../utils/sections";
for (const p of ["ENSG00000169057/MONDO_0700092", "ENSG00000196712/MONDO_0018975", "ENSG00000001626/MONDO_0009061", "ENSG00000012048/MONDO_0007254"]) {
  test("probe " + p, async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto("/evidence/" + p);
    await page.getByTestId("profile-page-header-text").waitFor();
    await page.locator("section[data-testid^='section-']").first().waitFor();
    await expectAllSectionsSettled(page);
    console.log("SECTIONS", p, JSON.stringify(await renderedSectionIds(page)));
  });
}

import { test } from "../../../../fixtures";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections } from "../../../../utils/sections";
for (const p of ["ENSG00000169174/EFO_0004611", "ENSG00000012048/MONDO_0007254"]) {
  test("probe " + p, async ({ page }) => {
    await stubEuropePmc(page);
    await page.goto("/evidence/" + p);
    await expectSections(page, ["none"]);
  });
}

import { test } from "../../../../fixtures";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
test("probe", async ({ page }) => {
  await stubEuropePmc(page);
  await page.goto("/disease/MONDO_0005068");
  for (const id of ["drugs", "gwasstudies"]) {
    const s = page.getByTestId(`section-${id}`);
    await s.waitFor();
    await s.scrollIntoViewIfNeeded();
    await page.waitForTimeout(6000);
    console.log(id, "\n", await s.innerText());
    console.log(await s.getByTestId("ot-table").first().locator("thead").innerHTML().then(h=>h.slice(0,1500)));
  }
  const d = page.getByTestId("section-drugs");
  await d.getByTestId("table-search-input").fill("zzzqq");
  await page.waitForTimeout(3000);
  console.log("EMPTY", await d.innerText());
  const g = page.getByTestId("section-gwasstudies");
  await g.getByTestId("table-search-input").fill("zzzqq");
  await page.waitForTimeout(3000);
  console.log("EMPTYG", await g.innerText());
});

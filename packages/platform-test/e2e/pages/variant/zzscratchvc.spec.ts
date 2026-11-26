import { test } from "../../../fixtures";
import { GWASCredibleSetsSection } from "../../../POM/objects/widgets/shared/GWASCredibleSetsSection";
import { QTLCredibleSetsSection } from "../../../POM/objects/widgets/shared/qtlCredibleSetsSection";
for (const v of ["19_44908822_C_T", "1_154453788_C_T"]) {
  test("dump " + v, async ({ page }) => {
    await page.goto(`/variant/${v}`);
    for (const S of [GWASCredibleSetsSection, QTLCredibleSetsSection]) {
      const s = new S(page);
      await s.section.scrollIntoViewIfNeeded();
      await s.table.expectLoaded();
      console.log(v, S.id, "TITLE", await s.title.innerText(), "|DESC", await s.description.innerText());
      console.log(JSON.stringify(await s.table.headerTexts()));
      console.log((await s.table.rowTexts()).slice(0, 4).join("\n"));
      console.log(await s.table.pagePosition.innerText());
      console.log("btns", await s.section.getByRole("button").allInnerTexts());
    }
  });
}

import { test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
test("probe", async ({ page }) => {
  const a = new AssociationsTable(page);
  await a.gotoDisease("MONDO_0005068", { table: "prioritisations" });
  await a.expectLoaded(5);
  console.log(await a.headerLabels.allInnerTexts());
  console.log(await a.aggregationButtons.evaluateAll(e=>e.map(x=>x.getAttribute("data-testid"))));
  console.log(await a.rows().first().evaluate(e=>e.innerHTML.slice(0,3000)));
  console.log(await a.header.evaluate(e=>[...e.querySelectorAll("[data-testid]")].map(x=>x.getAttribute("data-testid")).join(" ")));
  console.log(await a.footer.innerText());
});

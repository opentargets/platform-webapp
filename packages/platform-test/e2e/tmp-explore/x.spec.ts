import { test } from "../../fixtures";
for (const [name, id, sec] of [["gwas","a3ea67115f6db323b2eae6c1bf6cda7e","gwas-coloc"],["mol","a3ea67115f6db323b2eae6c1bf6cda7e","molqtl-coloc"],["e2g","a3ea67115f6db323b2eae6c1bf6cda7e","enhancer-to-gene-predictions"]]) {
test("dump "+name, async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/credible-set/${id}`);
  const s = page.getByTestId("section-"+sec);
  await s.waitFor();
  await s.scrollIntoViewIfNeeded();
  await page.getByTestId("section-"+sec).locator("tbody tr").first().waitFor();
  console.log(name, (await s.innerText()).slice(0,1800));
  console.log(await s.locator("tbody tr").first().evaluate(e=>e.outerHTML.slice(0,3000)));
  console.log(await s.locator("[data-testid]").evaluateAll(es=>es.map(e=>e.getAttribute("data-testid")).join(",")));
});}

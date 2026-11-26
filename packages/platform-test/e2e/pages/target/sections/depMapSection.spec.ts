import { expect, test } from "../../../../fixtures";
import { DepMapSection } from "../../../../POM/objects/widgets/shared/depMapSection";

test.describe("Target profile: Cancer DepMap section", () => {
  test("probe", async ({ page }) => {
    const depMap = new DepMapSection(page);
    await page.goto("/target/ENSG00000157764");
    await depMap.expectLoaded();
    console.log(await depMap.plot.evaluate((e) => [...e.querySelectorAll("svg.plot-d6a7b5 > g, svg > g")].map((g) => g.getAttribute("aria-label") + " " + g.children.length + " " + (g.children[0]?.outerHTML.slice(0,200)))));
    console.log(await depMap.plot.evaluate((e) => [...e.querySelectorAll("g[aria-label='y-axis tick label']")].map((g) => g.outerHTML.slice(0,500))));
    const c = page.locator("g[aria-label='dot']").last().locator("circle, path").first();
    console.log(await c.evaluate((e) => e.outerHTML));
    await c.hover();
    console.log(await depMap.plot.evaluate((e) => [...e.querySelectorAll("g[aria-label='tip']")].map(g=>g.outerHTML.slice(0,1500))));
  });
});

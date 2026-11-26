import { expect, test } from "../../../../fixtures";
import { stubGtexPortal } from "../../../../POM/objects/widgets/shared/expressionSection";
test("scratch", async ({ page, pageHealth }) => {
  pageHealth.allow(/./, "scratch", "page-error");
  const req = await stubGtexPortal(page);
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 300)));
  page.on("pageerror", (e) => console.log("PAGEERR", e.message));
  await page.goto("/target/ENSG00000157764");
  const s = page.getByTestId("section-baselineexpression");
  await expect(s).toBeVisible({ timeout: 60000 });
  await s.scrollIntoViewIfNeeded();
  await expect(s.getByRole("tab", { name: "Variation (GTEx)" })).toBeVisible();
  await s.getByRole("tab", { name: "Variation (GTEx)" }).click();
  await page.waitForTimeout(5000);
  console.log("REQ", JSON.stringify(req));
  console.log("SECTION", await s.count(), (await s.innerText().catch(() => "none")).slice(0, 300));
});

import { expect, test } from "../../../../fixtures";
import { BaselineExpressionSection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Baseline Expression Section", () => {
  sectionContract({
    id: "baselineexpression",
    title: "Baseline Expression",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("summary tab lists tissues", async ({ page }) => {
    const section = new BaselineExpressionSection(page);

    await expect(section.tab("Summary")).toHaveAttribute("aria-selected", "true");
    await expect(section.summaryRows().first()).toBeVisible();
    await expect(section.exportButton()).toBeVisible();
  });

  test("GTEx tab can be selected", async ({ page }) => {
    const section = new BaselineExpressionSection(page);

    await section.tab("Variation (GTEx)").click();

    await expect(section.tab("Variation (GTEx)")).toHaveAttribute("aria-selected", "true");
    await expect(section.root.locator("a[href*='gtexportal.org']").first()).toBeVisible();
  });
});

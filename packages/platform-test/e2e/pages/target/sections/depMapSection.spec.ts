import { expect, test } from "../../../../fixtures";
import { DepMapSection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Cancer DepMap Section", () => {
  sectionContract({
    id: "depmapessentiality",
    title: "Cancer DepMap",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("shows the essentiality plot and the export", async ({ page }) => {
    const section = new DepMapSection(page);

    await expect(section.plot()).toBeVisible();
    await expect(section.plot().locator("svg").first()).toBeVisible();
    await expect(section.exportButton()).toBeVisible();
  });
});

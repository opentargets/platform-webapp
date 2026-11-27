import { expect, test } from "../../../../fixtures";
import { BibliographySection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Bibliography Section", () => {
  sectionContract({
    id: "bibliography",
    title: "Bibliography",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("lists literature entries with a title", async ({ page }) => {
    const section = new BibliographySection(page);

    await expect(section.entries()).toHaveCount(5);
    await expect(
      section.entries().first().locator("a[href*='europepmc.org']").first()
    ).toBeVisible();
  });

  test("next page shows different entries", async ({ page }) => {
    const section = new BibliographySection(page);
    const firstEntry = await section.entries().first().getAttribute("data-testid");

    await expect(section.root.getByText(/^1–5 of/)).toBeVisible();
    await section.nextPage().click();

    await expect(section.root.getByText(/^6–10 of/)).toBeVisible();
    await expect(section.entries().first()).not.toHaveAttribute("data-testid", firstEntry ?? "");
    await expect(section.entries()).toHaveCount(5);
  });
});

import { expect, test } from "../../../../fixtures";
import { TractabilitySection } from "../../../../POM/objects/components/ProfileSection/targetSections";
import { sectionContract } from "../../../../utils/sectionContract";

test.describe("Tractability Section", () => {
  sectionContract({
    id: "tractability",
    title: "Tractability",
    url: (config) => `/target/${config.target?.primary}`,
  });

  test("grid shows small molecule, antibody and PROTAC modalities", async ({ page }) => {
    const section = new TractabilitySection(page);

    await expect(section.grid()).toBeVisible();
    for (const modality of ["sm", "ab", "pr"] as const) {
      await expect(section.modality(modality)).toBeVisible();
    }
  });

  test("small molecule modality marks assessments as met or not met", async ({ page }) => {
    const section = new TractabilitySection(page);
    const smallMolecule = section.modality("sm");

    await expect(section.enabledItems(smallMolecule).first()).toBeVisible();
    await expect(section.disabledItems(smallMolecule).first()).toBeVisible();
  });
});

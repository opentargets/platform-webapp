import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import {
  TRACTABILITY_MODALITIES,
  TractabilitySection,
} from "../../../../POM/objects/widgets/shared/tractabilitySection";

type TractabilityData = {
  target: { id: string; tractability: { modality: string; label: string; value: boolean }[] };
};

/** Target profile > Tractability (packages/sections/src/target/Tractability). */
test.describe("Target tractability section", () => {
  test("shows its title, description and documentation link", async ({ page, testConfig }) => {
    const tractability = new TractabilitySection(page);
    await page.goto(`/target/${testConfig.target?.primary}`);
    await tractability.expectLoaded();

    await expect(tractability.header).toHaveText("Tractability");
    await expect(tractability.description).toHaveText(
      "Target tractability assessment for BRAF. Source: Open Targets."
    );
    await expect(tractability.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/target/tractability"
    );
  });

  test("lists the four modalities in order, each with its full set of assessment buckets", async ({
    page,
    testConfig,
  }) => {
    const tractability = new TractabilitySection(page);
    await page.goto(`/target/${testConfig.target?.primary}`);
    await tractability.expectLoaded();

    await expect(tractability.modalityColumns).toHaveText(
      TRACTABILITY_MODALITIES.map((modality) => modality.title)
    );
    for (const modality of TRACTABILITY_MODALITIES) {
      await test.step(modality.title, async () => {
        await expect(tractability.modalityTitle(modality.key)).toHaveText(modality.title);
        await expect(
          tractability.items(modality.key),
          `${modality.title} should list every assessment bucket`
        ).toHaveText([...modality.buckets]);
        // The full label is also the title, because long labels are truncated with an ellipsis.
        for (const bucket of modality.buckets) {
          await expect(
            tractability.item(modality.key, bucket).getByTitle(bucket, { exact: true })
          ).toBeVisible();
        }
      });
    }
  });

  test("marks each bucket as met or not met exactly as the API reports it", async ({
    page,
    testConfig,
  }) => {
    const tractability = new TractabilitySection(page);
    const response = waitForOperation<TractabilityData>(page, TractabilitySection.operation);
    await page.goto(`/target/${testConfig.target?.primary}`);
    const { data, variables } = await response;
    await tractability.expectLoaded();

    expect(variables).toEqual({ ensemblId: testConfig.target?.primary });
    const assessments = data.target.tractability;
    expect(
      assessments.length,
      "the API should return one assessment per bucket of every modality"
    ).toBe(TRACTABILITY_MODALITIES.reduce((total, modality) => total + modality.buckets.length, 0));

    for (const modality of TRACTABILITY_MODALITIES) {
      await test.step(modality.title, async () => {
        const ofModality = assessments.filter((assessment) => assessment.modality === modality.code);
        const met = ofModality.filter((assessment) => assessment.value).map(({ label }) => label);
        const notMet = ofModality.filter((assessment) => !assessment.value).map(({ label }) => label);

        await expect(tractability.enabledItems(modality.key)).toHaveText(met);
        await expect(tractability.disabledItems(modality.key)).toHaveText(notMet);
        // A met bucket carries the check icon and bold text; an unmet one the cross icon.
        await expect(
          tractability.enabledItems(modality.key).locator("svg[data-icon='circle-check']")
        ).toHaveCount(met.length);
        await expect(
          tractability.disabledItems(modality.key).locator("svg[data-icon='circle-xmark']")
        ).toHaveCount(notMet.length);
        await expect(
          tractability.enabledItems(modality.key).locator("svg[data-icon='circle-xmark']")
        ).toHaveCount(0);
        for (const item of await tractability.enabledItems(modality.key).all()) {
          await expect(item).toHaveCSS("font-weight", "700");
        }
      });
    }
  });

  test("a target with approved small-molecule drugs has that bucket met", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary ?? "";
    // The manifest says this target renders the drugs section: it has approved drugs.
    expect(expectedSectionsFor(targetId)).toContain("drugs");

    const tractability = new TractabilitySection(page);
    await page.goto(`/target/${targetId}`);
    await tractability.expectLoaded();

    await expect(tractability.item("sm", "Approved Drug")).toHaveAttribute(
      "data-testid",
      "tractability-item-enabled"
    );
    await expect(
      tractability.enabledItems("sm"),
      "BRAF meets several small-molecule buckets"
    ).not.toHaveCount(0);
    await expect(
      tractability.disabledItems("ab"),
      "BRAF does not meet every antibody bucket"
    ).not.toHaveCount(0);
  });

  test("a target without drugs still renders every bucket, with no clinical bucket met", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.withoutDrugsSafetyOrProbes ?? "";
    // The manifest says this target (ALB) has no drugs section.
    expect(expectedSectionsFor(targetId)).not.toContain("drugs");

    const tractability = new TractabilitySection(page);
    await page.goto(`/target/${targetId}`);
    await tractability.expectLoaded();

    await expect(tractability.description).toHaveText(
      "Target tractability assessment for ALB. Source: Open Targets."
    );
    for (const modality of TRACTABILITY_MODALITIES) {
      await test.step(modality.title, async () => {
        await expect(tractability.items(modality.key)).toHaveText([...modality.buckets]);
        for (const clinicalBucket of ["Approved Drug", "Advanced Clinical", "Phase 1 Clinical"]) {
          await expect(
            tractability.item(modality.key, clinicalBucket),
            `${modality.title} > ${clinicalBucket} cannot be met by a target with no drugs`
          ).toHaveAttribute("data-testid", "tractability-item-disabled");
        }
      });
    }
  });
});

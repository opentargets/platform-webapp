import { expect, test } from "../../../fixtures";
import {
  COLOUR_OPTIONS,
  MolecularStructureSection,
  STRUCTURE_OPTIONS,
} from "../../../POM/objects/widgets/shared/molecularStructureSection";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded } from "../../../utils/sections";

const VARIANTS = [
  {
    id: "19_44908822_C_T",
    target: "APOE",
    targetId: "ENSG00000130203",
    uniprot: "P02649",
  },
  {
    id: "7_95308134_T_C",
    target: "PON1",
    targetId: "ENSG00000005421",
    uniprot: "P27169",
  },
] as const;

async function open(page: import("@playwright/test").Page, variantId: string) {
  const variantPage = new VariantPage(page);
  const structure = new MolecularStructureSection(page);
  await variantPage.goToVariantPage(variantId);
  await expectSectionLoaded(page, MolecularStructureSection.id);
  await structure.expectStructureDrawn();
  return structure;
}

test.describe("Variant page: Molecular Structure", () => {
  for (const variant of VARIANTS) {
    test(`${variant.id}: shows the AlphaFold model of ${variant.target} with its description and links`, async ({
      page,
    }) => {
      const structure = await open(page, variant.id);

      await test.step("title and description", async () => {
        await expect(page.getByTestId("section-molecular-structure-header")).toHaveText(
          "Molecular Structure"
        );
        await expect(structure.description).toContainText(
          "reference amino acid highlighted in AlphaFold predicted model of"
        );
        await expect(structure.description).toContainText(variant.target);
      });

      await test.step("links", async () => {
        const targetLink = structure.description.getByRole("link", {
          name: variant.target,
          exact: true,
        });
        await expect(targetLink).toHaveAttribute("href", `/target/${variant.targetId}`);
        const alphaFold = structure.description.getByRole("link", { name: "AlphafoldDB" });
        await expect(alphaFold).toHaveAttribute(
          "href",
          `https://alphafold.ebi.ac.uk/entry/${variant.uniprot}`
        );
        const uniprot = structure.description.getByRole("link", { name: "UniProt" });
        await expect(uniprot).toHaveAttribute(
          "href",
          `https://www.uniprot.org/uniprotkb/${variant.uniprot}/entry#family_and_domains`
        );
        await expect(
          structure.description.getByRole("link", { name: "Open Targets" })
        ).toHaveAttribute("href", "https://platform-docs.opentargets.org/variant");
      });

      await test.step("viewer controls and default legend", async () => {
        await expect(structure.screenshotButton).toBeVisible();
        await expect(structure.usageButton).toBeVisible();
        await expect(structure.structureRadios).toHaveCount(STRUCTURE_OPTIONS.length);
        for (const option of STRUCTURE_OPTIONS) {
          await expect(structure.structureRadio(option)).toBeVisible();
        }
        await expect(structure.structureRadio("cartoon")).toBeChecked();
        await expect(structure.colourSelect).toHaveText("confidence");
        await expect(structure.viewer.getByText("low", { exact: true })).toBeVisible();
        await expect(structure.viewer.getByText("high", { exact: true })).toBeVisible();
        await expect(structure.missingColourWarning).toHaveCount(0);
      });
    });
  }

  test("the target link navigates to the target page", async ({ page }) => {
    const structure = await open(page, VARIANTS[0].id);
    await structure.description.getByRole("link", { name: "APOE", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/target/${VARIANTS[0].targetId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText("APOE");
  });

  test("the usage tooltip lists the viewer gestures", async ({ page }) => {
    const structure = await open(page, VARIANTS[0].id);
    await structure.usageButton.click();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    for (const label of ["Rotate", "Move", "Zoom", "Resize", "Highlight", "Unhighlight"]) {
      await expect(tooltip).toContainText(`${label}:`);
    }
    await expect(tooltip).toContainText("Click residue");
  });

  test("the structure radios switch one representation at a time", async ({ page }) => {
    const structure = await open(page, VARIANTS[0].id);
    for (const option of STRUCTURE_OPTIONS) {
      await structure.structureRadio(option).check();
      await expect(structure.structureRadio(option)).toBeChecked();
      for (const other of STRUCTURE_OPTIONS.filter((o) => o !== option)) {
        await expect(structure.structureRadio(other)).not.toBeChecked();
      }
      await expect(structure.canvas).toBeVisible();
    }
  });

  test("the colour dropdown offers every scheme and the legend follows the choice", async ({
    page,
  }) => {
    const structure = await open(page, VARIANTS[0].id);

    await test.step("options", async () => {
      await structure.colourSelect.click();
      const listbox = page.getByRole("listbox");
      await expect(listbox.getByRole("option")).toHaveText([...COLOUR_OPTIONS]);
      await page.keyboard.press("Escape");
      await expect(listbox).toHaveCount(0);
    });

    await test.step("pathogenicity", async () => {
      await structure.chooseColour("pathogenicity");
      await expect(structure.missingColourWarning).toHaveCount(0, { timeout: 45_000 });
      await expect(structure.viewer.getByText("likely benign")).toBeVisible();
      await expect(structure.viewer.getByText("likely pathogenic")).toBeVisible();
      await expect(
        structure.viewer.getByText(
          "Mean AlphaMissense pathogenicity over possible amino acid substitutions"
        )
      ).toBeVisible();
    });

    await test.step("domain", async () => {
      await structure.chooseColour("domain");
      await expect(structure.missingColourWarning).toHaveCount(0, { timeout: 45_000 });
      await expect(structure.viewer.getByText("likely benign")).toHaveCount(0);
      await expect(structure.viewer.getByText("low", { exact: true })).toHaveCount(0);
    });

    await test.step("hydrophobicity", async () => {
      await structure.chooseColour("hydrophobicity");
      await expect(structure.viewer.getByText("hydrophilic")).toBeVisible();
      await expect(structure.viewer.getByText("hydrophobic", { exact: true })).toBeVisible();
    });

    await test.step("secondary structure and none have no legend", async () => {
      for (const option of ["secondary structure", "none"] as const) {
        await structure.chooseColour(option);
        await expect(structure.viewer.getByText("hydrophilic")).toHaveCount(0);
        await expect(structure.viewer.getByText("low", { exact: true })).toHaveCount(0);
        await expect(structure.viewer.getByText("likely benign")).toHaveCount(0);
      }
    });

    await test.step("back to confidence", async () => {
      await structure.chooseColour("confidence");
      await expect(structure.viewer.getByText("low", { exact: true })).toBeVisible();
      await expect(structure.viewer.getByText("high", { exact: true })).toBeVisible();
    });
  });

  test("the section is absent for a variant without protein coding coordinates", async ({
    page,
  }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage("1_154453788_C_T");
    // wait for a section that does render, so absence is not just "not loaded yet"
    await expectSectionLoaded(page, "variant-effect-predictor");
    await expect(page.getByTestId("section-molecular-structure")).toHaveCount(0);
  });
});

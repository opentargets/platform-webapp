import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { VariantPage } from "../../../POM/page/variant/variant";
import { VARIANTS } from "../../../POM/page/variant/variantData";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

test.describe("Variant page", () => {
  const MANIFEST = [
    { name: "intron variant", id: VARIANTS.intron.id },
    { name: "APOE missense variant", id: VARIANTS.missense.id },
    { name: "PON1 pharmacogenomic variant", id: VARIANTS.pharmacogenomic.id },
  ];

  for (const { name, id } of MANIFEST) {
    test(`renders the header and exactly the expected sections: ${name} @smoke`, async ({
      page,
    }) => {
      const variantPage = new VariantPage(page);
      await variantPage.goToVariantPage(id);

      await expect(variantPage.title).toHaveText(id);
      await variantPage.expectOnVariantPage(id);
      await expectSections(page, expectedSectionsFor(id));
      for (const sectionId of expectedSectionsFor(id)) {
        await expectSectionLoaded(page, sectionId);
      }
    });
  }

  test("has a single, selected Profile tab that links to the variant", async ({ page }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.intron.id);

    await expect(page.getByRole("tab")).toHaveText(["Profile"]);
    await expect(variantPage.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(variantPage.profileTab).toHaveAttribute("href", `/variant/${VARIANTS.intron.id}`);
  });

  test("long alleles are abbreviated in the title and the full id opens in a dialog", async ({
    page,
  }) => {
    const variantPage = new VariantPage(page);
    const { id, title } = VARIANTS.longInsertion;
    await variantPage.goToVariantPage(id);

    await expect(variantPage.title).toHaveText(title);
    await variantPage.title.getByTitle("Show variant ID").click();

    const dialog = page.getByRole("dialog", { name: "Variant ID" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Full Variant ID");
    await expect(dialog).toContainText(id);
    await expect(dialog.getByText("Hashed Variant ID")).toHaveCount(0);

    await dialog.getByRole("button").first().click();
    await expect(dialog).toBeHidden();
  });

  test("a deletion is abbreviated the same way", async ({ page }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.longDeletion.id);
    await expect(variantPage.title).toHaveText(VARIANTS.longDeletion.title);
    await expectSections(page, expectedSectionsFor(VARIANTS.longDeletion.id));
    await variantPage.title.getByTitle("Show variant ID").click();
    await expect(page.getByRole("dialog", { name: "Variant ID" })).toContainText(
      VARIANTS.longDeletion.id
    );
  });

  test("a short id is shown in full without a dialog", async ({ page }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.intron.id);
    // the title is the whole id, so there is nothing to abbreviate and no dialog to open
    await expect(variantPage.title).toHaveText(VARIANTS.intron.title);
    await expect(variantPage.title.getByTitle("Show variant ID")).toHaveCount(0);
  });

  test("a credible set link leads to the credible set and back returns to the variant", async ({
    page,
  }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.intron.id);
    const section = await expectSectionLoaded(page, "gwas-credible-sets");

    const link = section.locator("a[href^='/credible-set/']").first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/credible-set\/.+/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(variantPage.notFound).toHaveCount(0);
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();

    await page.goBack();
    await variantPage.expectOnVariantPage(VARIANTS.intron.id);
    await expect(variantPage.title).toHaveText(VARIANTS.intron.id);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("reloading keeps the variant and its sections", async ({ page }) => {
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.intron.id);
    await page.reload();
    await variantPage.waitForVariantPageLoad();
    await expect(variantPage.title).toHaveText(VARIANTS.intron.id);
    await expectSections(page, expectedSectionsFor(VARIANTS.intron.id));
  });

  test.describe("variants that do not exist", () => {
    test("an unknown variant id shows the not found page", async ({ page, pageHealth }) => {
      pageHealth.allow(/404 page is displayed/, "opens a variant that does not exist", "error-ui");
      await page.goto("/variant/1_1_A_C");
      const variantPage = new VariantPage(page);
      await expect(variantPage.notFound).toBeVisible();
      await expect(variantPage.notFound).toContainText("404: Page not found");
      await expect(page.getByTestId("profile-page-header-block")).toHaveCount(0);
    });

    test("a malformed variant id shows the not found page", async ({ page, pageHealth }) => {
      pageHealth.allow(/404 page is displayed/, "opens a variant that does not exist", "error-ui");
      await page.goto("/variant/not-a-variant");
      await expect(new VariantPage(page).notFound).toBeVisible();
    });
  });
});

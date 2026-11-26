import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { CredibleSetPage } from "../../../POM/page/credibleSet/credibleSet";
import type { TestConfig } from "../../../types";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

/** The credible set ids under test; fails loudly when the config has none. */
function credibleSetIds(testConfig: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = testConfig.credibleSet ?? {};
  if (!primary || !qtl) throw new Error("testConfig.credibleSet needs a primary and a qtl id");
  return { primary, qtl };
}

const GWAS = {
  variantId: "2_85545938_A_G",
  studyId: "GCST90475211",
  studyHeading: "GWAS Study",
  method: "SuSiE-inf",
  trait: "Heart attack",
  disease: { id: "MONDO_0005068", name: "myocardial infarction" },
};
const QTL = {
  variantId: "6_160329611_C_T",
  studyId: "UKB_PPP_EUR_LPA_P08519_OID30747_v1",
  studyHeading: "pQTL Study",
  project: "UKB PPP EUR",
};

/** The credible set profile page: header, fine-mapping and study fields, links and sections. */
test.describe("Credible set page", () => {
  test("GWAS credible set renders its header and every expected section @smoke", async ({
    page,
    testConfig,
  }) => {
    const id = credibleSetIds(testConfig).primary;
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(id);

    await expect(page).toHaveTitle(
      `Credible set around ${GWAS.variantId} for ${GWAS.studyId} | Open Targets Platform`
    );
    await expect(credibleSet.leadVariantLink).toContainText(GWAS.variantId);
    await expect(credibleSet.studyLink).toHaveText(GWAS.studyId);
    await expectSections(page, expectedSectionsFor(id));
    for (const sectionId of expectedSectionsFor(id)) {
      await expectSectionLoaded(page, sectionId);
    }
  });

  test("pQTL credible set renders only the sections it has data for @smoke", async ({
    page,
    testConfig,
  }) => {
    const id = credibleSetIds(testConfig).qtl;
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(id);

    await expect(credibleSet.leadVariantLink).toContainText(QTL.variantId);
    await expect(credibleSet.studyLink).toHaveText(QTL.studyId);
    await expectSections(page, expectedSectionsFor(id));
    for (const sectionId of expectedSectionsFor(id)) {
      await expectSectionLoaded(page, sectionId);
    }
    // no L2G and no molQTL colocalisation for a pQTL credible set
    await expect(credibleSet.section("locus2gene")).toHaveCount(0);
    await expect(credibleSet.section("molqtl-coloc")).toHaveCount(0);
  });

  test("GWAS lead variant and fine-mapping fields", async ({ page, testConfig }) => {
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(credibleSetIds(testConfig).primary);
    await expect(credibleSet.profileHeader).toContainText("Lead Variant");

    await expect(credibleSet.field("P-value")).toHaveText(/^P-value:\s*\d(\.\d+)?\s*×\s*10-17$/);
    await expect(credibleSet.field("Beta")).toHaveText(/0\.0630$/);
    await expect(credibleSet.field("Standard error")).toHaveText(/\d\.\d+(e-\d+)?$/);
    await expect(credibleSet.field("Posterior probability")).toHaveText(
      /[01]\.\d+$/
    );
    await expect(credibleSet.profileHeader).toContainText("Fine-mapping");
    await expect(credibleSet.field("Locus")).toHaveText("Locus: chr2:85366766-85770276");
    await expect(credibleSet.field("Method")).toHaveText(`Method: ${GWAS.method}`);
    await expect(credibleSet.field("Confidence")).toBeVisible();
    await credibleSet.field("Confidence").locator("svg, span").last().hover();
    await expect(page.getByRole("tooltip")).toContainText("SuSiE fine-mapped credible set");
    await expect(credibleSet.field("Minimum R2")).toHaveText(/0\.915$/);
  });

  test("GWAS study fields and disease link", async ({ page, testConfig }) => {
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(credibleSetIds(testConfig).primary);

    await expect(credibleSet.profileHeader).toContainText(GWAS.studyHeading);
    await expect(credibleSet.field("Reported trait")).toHaveText(`Reported trait: ${GWAS.trait}`);
    await expect(credibleSet.field("Summary statistics")).toContainText("Available");
    await expect(credibleSet.field("Sample size")).toContainText(/\d/);
    const disease = credibleSet.field("Disease or phenotype").getByRole("link", {
      name: GWAS.disease.name,
    });
    await expect(disease).toHaveAttribute("href", `/disease/${GWAS.disease.id}`);
  });

  test("pQTL study fields have a project and no disease", async ({ page, testConfig }) => {
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(credibleSetIds(testConfig).qtl);

    await expect(credibleSet.profileHeader).toContainText(QTL.studyHeading);
    await expect(credibleSet.field("Project")).toHaveText(`Project: ${QTL.project}`);
    await expect(credibleSet.field("Reported trait")).toHaveCount(0);
    await expect(credibleSet.field("Disease or phenotype")).toHaveCount(0);
    await expect(credibleSet.field("P-value")).toHaveText(/^P-value:\s*\d(\.\d+)?\s*×\s*10-231$/);
    await expect(credibleSet.field("Method")).toHaveText(`Method: ${GWAS.method}`);
    await expect(credibleSet.field("Posterior probability")).toHaveText(/[01]\.\d+$/);
  });

  test("has a single, selected Profile tab that links to the credible set", async ({
    page,
    testConfig,
  }) => {
    const id = credibleSetIds(testConfig).primary;
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(id);

    await expect(page.getByRole("tab")).toHaveText(["Profile"]);
    await expect(credibleSet.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(credibleSet.profileTab).toHaveAttribute("href", `/credible-set/${id}`);
  });

  test("lead variant link goes to the variant page", async ({ page, testConfig }) => {
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(credibleSetIds(testConfig).primary);

    await expect(credibleSet.leadVariantLink).toHaveAttribute("href", `../variant/${GWAS.variantId}`);
    await credibleSet.leadVariantLink.click();
    await expect(page).toHaveURL(new RegExp(`/variant/${GWAS.variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
  });

  test("study link goes to the study page", async ({ page, testConfig }) => {
    const credibleSet = new CredibleSetPage(page);
    await credibleSet.goToCredibleSetPage(credibleSetIds(testConfig).primary);

    await expect(credibleSet.studyLink).toHaveAttribute("href", `../study/${GWAS.studyId}`);
    await credibleSet.studyLink.click();
    await expect(page).toHaveURL(new RegExp(`/study/${GWAS.studyId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(GWAS.studyId);
  });

  test("a nonexistent credible set shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404/, "opens a credible set that does not exist", "error-ui");
    await page.goto("/credible-set/00000000000000000000000000000000");
    await expect(page.getByTestId("profile-page-header-block")).toHaveCount(0);
    await expect(page.getByText(/page not found|404/i).first()).toBeVisible();
  });
});

import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { expect, test } from "../../../fixtures";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { EvidencePage } from "../../../POM/page/evidence/evidence";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

/**
 * The evidence page shell, /evidence/:ensgId/:efoId: header, links to the target and
 * the disease, summary cards, and which evidence sections each pair renders.
 */
test.describe("Evidence page", () => {
  // Europe PMC is a third-party service that throttles; stub it so the tests depend
  // only on the app and its API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  const pairKey = (pair: { ensgId: string; efoId: string }) => `${pair.ensgId}/${pair.efoId}`;

  test("renders the header, links and every expected section @smoke", async ({ page, testConfig }) => {
    const pair = testConfig.evidence!.primary;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);

    await expect(evidence.title).toHaveText("Evidence for BRAF in melanoma");
    await expect(page).toHaveTitle(/^Evidence for BRAF and melanoma/);
    await expect(evidence.targetLink).toContainText("BRAF");
    await expect(evidence.targetLink).toHaveAttribute("href", `/target/${pair.ensgId}`);
    await expect(evidence.diseaseLink).toContainText("melanoma");
    await expect(evidence.diseaseLink).toHaveAttribute("href", `/disease/${pair.efoId}`);

    const expected = expectedSectionsFor(pairKey(pair));
    await expectSections(page, expected);
    for (const sectionId of expected) {
      await expectSectionLoaded(page, sectionId);
      await expect(evidence.summaryCard(sectionId), `summary card of ${sectionId}`).toBeVisible();
    }
  });

  test("renders a pair with genetic evidence and only its sections @smoke", async ({
    page,
    testConfig,
  }) => {
    const pair = testConfig.evidence!.withGeneticEvidence;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);

    await expect(evidence.title).toHaveText("Evidence for IL6R in myocardial infarction");
    const expected = expectedSectionsFor(pairKey(pair));
    await expectSections(page, expected);
    for (const sectionId of expected) await expectSectionLoaded(page, sectionId);
    await expect(evidence.section("eva"), "BRAF-only evidence is absent here").toHaveCount(0);
  });

  test("the header cards describe the target and the disease", async ({ page, testConfig }) => {
    const pair = testConfig.evidence!.primary;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);

    await expect(page.getByTestId("profile-synonyms").first()).toContainText("Synonyms");
    await expect(page.getByTestId("profile-synonyms").first().getByTestId("chip-BRAF")).toBeVisible();
  });

  test("summary cards mark the sections with data and jump to the one clicked", async ({
    page,
    testConfig,
  }) => {
    const pair = testConfig.evidence!.primary;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);
    await expectSections(page, expectedSectionsFor(pairKey(pair)));

    await evidence.summaryCard("clinical-precedence").click();
    await expect(page).toHaveURL(/#clinical_precedence$|#clinical-precedence$|#clinicalPrecedence$/i);
    await expect(evidence.section("clinical-precedence")).toBeInViewport();
  });

  test("the target link opens the target page and back returns to the evidence", async ({
    page,
    testConfig,
  }) => {
    const pair = testConfig.evidence!.withGeneticEvidence;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);
    await evidence.targetLink.click();
    await expect(page).toHaveURL(new RegExp(`/target/${pair.ensgId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("IL6R");

    await page.goBack();
    await expect(evidence.title).toHaveText("Evidence for IL6R in myocardial infarction");
  });

  test("the disease link opens the disease page", async ({ page, testConfig }) => {
    const pair = testConfig.evidence!.withGeneticEvidence;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);
    await evidence.diseaseLink.click();
    await expect(page).toHaveURL(new RegExp(`/disease/${pair.efoId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("myocardial infarction");
  });

  test("reloading keeps the pair and its sections", async ({ page, testConfig }) => {
    const pair = testConfig.evidence!.withGeneticEvidence;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);
    await page.reload();
    await expect(evidence.title).toHaveText("Evidence for IL6R in myocardial infarction");
    await expectSections(page, expectedSectionsFor(pairKey(pair)));
  });

  test("a pair without evidence shows the header and no sections", async ({ page, testConfig }) => {
    const pair = testConfig.evidence!.withoutEvidence;
    const evidence = new EvidencePage(page);
    await evidence.goto(pair.ensgId, pair.efoId);

    await expect(evidence.title).toHaveText("Evidence for MIR1302-2HG in melanoma");
    await expectSections(page, expectedSectionsFor(pairKey(pair)));
    await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
  });

  test("a target that does not exist shows the 404 page", async ({ page, pageHealth, testConfig }) => {
    pageHealth.allow(/404 page is displayed/, "opens an unknown target", "error-ui");
    await page.goto(`/evidence/ENSG00000000000/${testConfig.evidence!.primary.efoId}`);
    await expect(new EvidencePage(page).notFound).toBeVisible();
    await expect(page.getByTestId("profile-page-header-text")).toHaveCount(0);
  });

  test("a disease that does not exist shows the 404 page", async ({ page, pageHealth, testConfig }) => {
    pageHealth.allow(/404 page is displayed/, "opens an unknown disease", "error-ui");
    await page.goto(`/evidence/${testConfig.evidence!.primary.ensgId}/MONDO_0000000000`);
    await expect(new EvidencePage(page).notFound).toBeVisible();
    await expect(page.getByTestId("profile-page-header-text")).toHaveCount(0);
  });
});

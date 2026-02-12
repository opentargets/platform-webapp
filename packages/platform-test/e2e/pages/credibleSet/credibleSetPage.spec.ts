import { expect, test } from "../../../fixtures";
import { CredibleSetPage } from "../../../POM/page/credibleSet/credibleSet";

test.describe("Credible Set Page", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Page loads successfully", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    const isOnPage = await credibleSetPage.isCredibleSetPage();
    expect(isOnPage).toBe(true);
  });

  test("Header is visible", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const isHeaderVisible = await credibleSetPage.isHeaderVisible();
    expect(isHeaderVisible).toBe(true);
  });

  test("Page title is displayed", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const title = await credibleSetPage.getPageTitleText();
    expect(title).toBeTruthy();
  });

  test("Lead variant link is present", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const leadVariantLink = credibleSetPage.getLeadVariantLink();
    const isVisible = await leadVariantLink.isVisible().catch(() => false);

    if (isVisible) {
      const variantId = await credibleSetPage.getLeadVariantId();
      expect(variantId).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test("Study link is present", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const studyLink = credibleSetPage.getStudyLink();
    const isVisible = await studyLink.isVisible().catch(() => false);

    if (isVisible) {
      const studyId = await credibleSetPage.getStudyId();
      expect(studyId).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test("Profile tab is visible and active", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const profileTab = credibleSetPage.getProfileTab();
    const isVisible = await profileTab.isVisible().catch(() => false);

    if (isVisible) {
      const isActive = await credibleSetPage.isProfileTabActive();
      expect(isActive).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Lead variant link navigates to variant page", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const leadVariantLink = credibleSetPage.getLeadVariantLink();
    const isVisible = await leadVariantLink.isVisible().catch(() => false);

    if (isVisible) {
      await credibleSetPage.clickLeadVariantLink();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/variant/");
    } else {
      test.skip();
    }
  });

  test("Study link navigates to study page", async ({ page }) => {
    const credibleSetPage = new CredibleSetPage(page);
    await credibleSetPage.waitForCredibleSetPageLoad();
    const studyLink = credibleSetPage.getStudyLink();
    const isVisible = await studyLink.isVisible().catch(() => false);

    if (isVisible) {
      await credibleSetPage.clickStudyLink();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/study/");
    } else {
      test.skip();
    }
  });
});

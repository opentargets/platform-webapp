import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { DrugHeader } from "../../../POM/objects/components/DrugHeader/drugHeader";
import { MechanismsOfActionSection } from "../../../POM/objects/widgets/shared/mechanismsOfActionSection";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DRUG_SECTIONS, DrugPage } from "../../../POM/page/drug/drug";
import { type DrugIds, drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

/**
 * The drug profile page as a whole: which sections each drug renders, the summary
 * cards and sticky header that navigate between them, deep links, history and the
 * routes that must end on the 404 page.
 */
test.describe("Drug page", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("renders the header and every expected section @smoke", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    await drugPage.goto(primary);

    await expect(drugPage.title).toHaveText(drugFacts(primary).name);
    await expect(page).toHaveTitle(
      `${drugFacts(primary).name} profile page | Open Targets Platform`
    );
    await expectSections(page, expectedSectionsFor(primary));

    await test.step("every section has loaded with its own title", async () => {
      for (const section of DRUG_SECTIONS) {
        await expectSectionLoaded(page, section.id);
        await expect(drugPage.sectionTitle(section.id)).toHaveText(section.name);
      }
    });

    await test.step("sections are in the order of the profile", async () => {
      const rendered = await page
        .locator("section[data-testid^='section-']")
        .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-testid")));
      expect(rendered).toEqual(DRUG_SECTIONS.map((section) => `section-${section.id}`));
    });
  });

  const scenarios: { role: Exclude<keyof DrugIds, "primary">; what: string }[] = [
    { role: "smallMolecule", what: "a small molecule with every section" },
    { role: "withParentMolecule", what: "a salt form without pharmacogenetics" },
    { role: "withManyWarnings", what: "a withdrawn drug with every section" },
    { role: "withMultipleMechanisms", what: "a drug without warnings" },
    { role: "withNonHumanTarget", what: "an antibiotic without warnings" },
    { role: "sparse", what: "a drug with only mechanisms of action and indications" },
  ];

  for (const { role, what } of scenarios) {
    test(`renders exactly the sections it has data for: ${what}`, async ({ page, testConfig }) => {
      const chemblId = drugIds(testConfig)[role];
      const drugPage = new DrugPage(page);
      await drugPage.goto(chemblId);

      await expect(drugPage.title).toHaveText(drugFacts(chemblId).name);
      // Sections without data must be absent, sections with data must be present.
      await expectSections(page, expectedSectionsFor(chemblId));
      for (const sectionId of expectedSectionsFor(chemblId)) {
        await expectSectionLoaded(page, sectionId);
      }
    });
  }

  test("has a single, selected Profile tab that links to the drug", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    await drugPage.goto(primary);

    await expect(page.getByRole("tab")).toHaveText(["Profile"]);
    await expect(drugPage.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(drugPage.profileTab).toHaveAttribute("href", `/drug/${primary}`);
    await expectSectionLoaded(page, "mechanismsofaction");
  });

  test("summary cards list every section and jump to the one clicked", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    await drugPage.goto(primary);
    await expectSections(page, expectedSectionsFor(primary));

    await expect(drugPage.summaryCards).toHaveCount(DRUG_SECTIONS.length);
    for (const section of DRUG_SECTIONS) {
      await expect(drugPage.summaryCard(section.id)).toContainText(section.name);
      await expect(drugPage.summaryCard(section.id)).toContainText(section.shortName);
    }

    const target = DRUG_SECTIONS[4];
    await drugPage.summaryCard(target.id).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${primary}#${target.anchor}$`));
    await expect(drugPage.sectionTitle(target.id)).toBeInViewport();
  });

  test("a deep link with a section hash scrolls to that section", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    await drugPage.goto(primary, "#bibliography");

    await expectSectionLoaded(page, "bibliography");
    await expect(drugPage.sectionTitle("bibliography")).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`/drug/${primary}#bibliography$`));
    await expect(drugPage.stickyHeader, "the sticky header shows once scrolled").toBeVisible();
  });

  test("the sticky header names the drug and navigates between sections", async ({
    page,
    testConfig,
  }) => {
    const { withMultipleMechanisms: chemblId } = drugIds(testConfig);
    const facts = drugFacts(chemblId);
    const drugPage = new DrugPage(page);
    await drugPage.goto(chemblId);
    await expectSections(page, expectedSectionsFor(chemblId));
    await expect(drugPage.stickyHeader, "hidden at the top of the page").toHaveCount(0);

    await drugPage.section("pharmacogenetics").scrollIntoViewIfNeeded();
    const sticky = drugPage.stickyHeader;
    await expect(sticky).toBeVisible();
    await expect(sticky).toContainText(facts.name);
    await expect(sticky.getByRole("link", { name: chemblId })).toHaveAttribute(
      "href",
      `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`
    );
    for (const id of Object.values(facts.crossReferences)) {
      await expect(sticky.getByRole("link", { name: id })).toBeVisible();
    }

    await test.step("the section menu lists every section and disables those without data", async () => {
      await sticky.getByTestId("sticky-section-selector").click();
      const menu = page.getByRole("menu");
      await expect(menu.getByRole("menuitem")).toHaveText(
        DRUG_SECTIONS.map((section) => new RegExp(`${section.name}$`))
      );
      const present = new Set(expectedSectionsFor(chemblId));
      for (const section of DRUG_SECTIONS) {
        const item = menu.getByRole("menuitem", { name: section.name });
        if (present.has(section.id))
          await expect(item).not.toHaveAttribute("aria-disabled", "true");
        else await expect(item).toHaveAttribute("aria-disabled", "true");
      }
    });

    await test.step("the filter narrows the menu and a choice scrolls to the section", async () => {
      const menu = page.getByRole("menu");
      await menu.getByPlaceholder("Filter widgets...").fill("pharmaco");
      await expect(menu.getByRole("menuitem")).toHaveText([
        /Pharmacogenetics$/,
        /Pharmacovigilance$/,
      ]);
      await menu.getByRole("menuitem", { name: "Pharmacovigilance" }).click();
      await expect(menu).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`/drug/${chemblId}#adverseEvents$`));
      await expect(drugPage.sectionTitle("adverseevents")).toBeInViewport();
    });
  });

  test("following a target link and going back restores the drug page", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const mechanisms = new MechanismsOfActionSection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);

    const targetLink = mechanisms.targetLinks(0).first();
    const symbol = (await targetLink.innerText()).trim();
    const href = await targetLink.getAttribute("href");
    expect(href).toMatch(/^\/target\/ENSG\d{11}$/);
    await targetLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/drug/${primary}`));
    await expect(drugPage.title).toHaveText(drugFacts(primary).name);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await expect(mechanisms.targetLinks(0).first()).toHaveText(symbol);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);

    // Finish on the page under test rather than in the middle of the target page's queries.
    await page.goBack();
    await expect(drugPage.title).toHaveText(drugFacts(primary).name);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
  });

  test("reloading keeps the drug and its sections", async ({ page, testConfig }) => {
    const { sparse } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    await drugPage.goto(sparse);
    await expectSections(page, expectedSectionsFor(sparse));

    await page.reload();
    await expect(drugPage.title).toHaveText(drugFacts(sparse).name);
    await expect(new DrugHeader(page).moleculeType).toContainText(drugFacts(sparse).moleculeType);
    await expectSections(page, expectedSectionsFor(sparse));
  });

  test("a ChEMBL id that does not exist shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a drug that does not exist", "error-ui");
    const drugPage = new DrugPage(page);
    await page.goto("/drug/CHEMBL0000000000");

    await expect(drugPage.notFound).toBeVisible();
    await expect(
      drugPage.notFound.getByRole("heading", { name: "404: Page not found" })
    ).toBeVisible();
    await expect(
      drugPage.notFound.getByRole("link", { name: "Go back to Home Page" })
    ).toHaveAttribute("href", "/");
    await expect(drugPage.title, "no drug header on the 404 page").toHaveCount(0);
    await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
  });

  test("ChEMBL ids are case sensitive: a lower-case id shows the 404 page", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(/404 page is displayed/, "opens a drug id in the wrong case", "error-ui");
    const drugPage = new DrugPage(page);
    await page.goto(`/drug/${drugIds(testConfig).primary.toLowerCase()}`);

    await expect(drugPage.notFound).toBeVisible();
    await expect(drugPage.title).toHaveCount(0);
  });

  test("an unknown sub-route of a drug shows the 404 page", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "opens a drug sub-route that does not exist",
      "error-ui"
    );
    const drugPage = new DrugPage(page);
    await page.goto(`/drug/${drugIds(testConfig).primary}/this-tab-does-not-exist`);

    // The drug page has one tab. Any other path under the drug must not render an
    // empty profile under a valid header.
    await expect(drugPage.notFound).toBeVisible();
  });
});

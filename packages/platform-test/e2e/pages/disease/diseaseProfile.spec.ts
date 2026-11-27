import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DISEASE_SECTIONS, DiseasePage } from "../../../POM/page/disease/disease";
import type { TestConfig } from "../../../types";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

/**
 * The disease page shell, /disease/:efoId: header, cross references, profile header,
 * tabs, summary chips, section manifest and the 404 page. The sections themselves and the
 * associations table have their own specs.
 */

/** What identifies each test disease. Cross references are listed in the order the header shows them. */
const DISEASES = {
  MONDO_0005068: {
    name: "myocardial infarction",
    description: "Gross necrosis of the myocardium",
    xrefs: [
      { source: "mesh", label: "MeSH", ids: ["D009203"], stem: "https://identifiers.org/mesh:" },
      { source: "ncit", label: "NCIt", ids: ["C27996"], stem: "https://identifiers.org/ncit:" },
      { source: "umls", label: "UMLS", ids: ["C0027051"], stem: "https://identifiers.org/umls:" },
    ],
    synonymCount: 24,
  },
  MONDO_0007254: {
    name: "breast cancer",
    description: "A primary or metastatic malignant neoplasm involving the breast",
    xrefs: [
      { source: "ncit", label: "NCIt", ids: ["C9335"], stem: "https://identifiers.org/ncit:" },
      { source: "umls", label: "UMLS", ids: ["C0006142"], stem: "https://identifiers.org/umls:" },
    ],
    synonymCount: 17,
  },
  MONDO_0007739: {
    name: "Huntington disease",
    description: "Huntington disease (HD) is a rare neurodegenerative disorder",
    xrefs: [
      { source: "mesh", label: "MeSH", ids: ["D006816"], stem: "https://identifiers.org/mesh:" },
      {
        source: "meddra",
        label: "MedDRA",
        ids: ["10070668"],
        stem: "https://identifiers.org/meddra:",
      },
      { source: "ncit", label: "NCIt", ids: ["C82342"], stem: "https://identifiers.org/ncit:" },
      { source: "omim", label: "OMIM", ids: ["143100"], stem: "https://www.omim.org/entry/" },
      {
        source: "orphanet",
        label: "Orphanet",
        ids: ["399"],
        stem: "https://identifiers.org/orphanet:",
      },
      { source: "umls", label: "UMLS", ids: ["C0020179"], stem: "https://identifiers.org/umls:" },
    ],
    synonymCount: 45,
  },
} as const;

/** A therapeutic-area term with only ontology and bibliography, no synonyms and no cross references. */
const OTAR_DISEASE = "OTAR_0000018";
const OTAR_NAME = "genetic, familial or congenital disease";

const MISSING_DISEASE = "EFO_0000305";

/** The primary disease of the test config, with the name the config must carry. */
function primaryDisease(testConfig: TestConfig): { efoId: string; name: string } {
  const { primary, name } = testConfig.disease;
  if (!name) throw new Error("test config disease.name is required by the disease page tests");
  return { efoId: primary, name };
}

const efoUrl = (efoId: string) =>
  `https://www.ebi.ac.uk/ols4/ontologies/efo/terms?short_form=${efoId}`;

test.describe("Disease page shell", () => {
  // Every disease page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and answers without CORS headers, so it is
  // stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("renders the header and exactly the expected sections for the primary disease @smoke", async ({
    page,
    testConfig,
  }) => {
    const { efoId, name } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await expect(disease.title).toHaveText(name);
    await expect(page).toHaveTitle(`${name} profile page | Open Targets Platform`);
    await expectSections(page, expectedSectionsFor(efoId));

    await test.step("every expected section has loaded with its own title", async () => {
      for (const sectionId of expectedSectionsFor(efoId)) {
        await expectSectionLoaded(page, sectionId);
        const known = DISEASE_SECTIONS.find((section) => section.id === sectionId);
        expect(known, `"${sectionId}" should be a known disease section`).toBeDefined();
        await expect(disease.sectionTitle(sectionId)).toContainText(known?.name ?? "");
      }
    });

    await test.step("sections follow the order of the profile", async () => {
      const rendered = await page
        .locator("section[data-testid^='section-']")
        .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-testid")));
      const order = DISEASE_SECTIONS.map((section) => section.id).filter((id) =>
        expectedSectionsFor(efoId).includes(id)
      );
      expect(rendered).toEqual(order.map((id) => `section-${id}`));
    });
  });

  test("renders exactly the expected sections for a second disease @smoke", async ({
    page,
    testConfig,
  }) => {
    const efoId = "MONDO_0007254";
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await expect(disease.title).toHaveText(DISEASES.MONDO_0007254.name);
    await expect(page).toHaveTitle(
      `${DISEASES.MONDO_0007254.name} profile page | Open Targets Platform`
    );
    await expectSections(page, expectedSectionsFor(efoId));
    for (const sectionId of expectedSectionsFor(efoId)) {
      await expectSectionLoaded(page, sectionId);
    }
  });

  test("a disease with clinical signs and symptoms renders that section too", async ({ page }) => {
    const efoId = "MONDO_0007739";
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await expect(disease.title).toHaveText(DISEASES[efoId].name);
    await expectSections(page, expectedSectionsFor(efoId));
    await expectSectionLoaded(page, "phenotypes");
    await expect(disease.sectionTitle("phenotypes")).toContainText("Clinical signs and symptoms");
  });

  test("a disease without drugs, GWAS studies or synonyms drops those sections and blocks", async ({
    page,
  }) => {
    const disease = new DiseasePage(page);
    await disease.goto(OTAR_DISEASE);

    await expect(disease.title).toHaveText(OTAR_NAME);
    await expectSections(page, expectedSectionsFor(OTAR_DISEASE));
    for (const sectionId of expectedSectionsFor(OTAR_DISEASE)) {
      await expectSectionLoaded(page, sectionId);
    }
    for (const missing of ["drugs", "phenotypes", "gwasstudies"]) {
      await expect(
        disease.section(missing),
        `"${missing}" has no data for this disease`
      ).toHaveCount(0);
    }
    await expect(disease.description).toContainText("A disease caused by genetic modifications");
    await expect(disease.synonyms, "no synonyms block when there are no synonyms").toHaveCount(0);
    // An OTAR term has no EFO page: the id is shown as plain text and there are no references
    await expect(disease.externalLinks).toHaveText(`EFO: ${OTAR_DISEASE}`);
    await expect(disease.externalLinks.getByRole("link")).toHaveCount(0);
  });

  for (const [efoId, facts] of Object.entries(DISEASES)) {
    test(`header shows the name, the EFO link and the cross references of ${facts.name}`, async ({
      page,
    }) => {
      const disease = new DiseasePage(page);
      await disease.goto(efoId);

      await expect(disease.title).toHaveText(facts.name);
      await expect(disease.title).toHaveAttribute("title", facts.name);
      // the header is above the tabs: it is there on the profile route without any section loaded

      await test.step("EFO link points to the ontology term", async () => {
        await expect(disease.externalLinks).toContainText(`EFO: ${efoId}`);
        const link = disease.getEfoLink();
        await expect(link).toHaveCount(1);
        await expect(link).toHaveText(efoId);
        await expect(link).toHaveAttribute("href", efoUrl(efoId));
      });

      await test.step("cross references list exactly the supported sources, in order", async () => {
        const sources = await page
          .locator("[data-testid^='header-external-links-']")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
        expect(sources).toEqual(facts.xrefs.map((xref) => `header-external-links-${xref.source}`));
        for (const xref of facts.xrefs) {
          const group = disease.xrefSource(xref.source);
          await expect(group).toContainText(`${xref.label}:`);
          await expect(group.getByRole("link")).toHaveText([...xref.ids]);
          for (const id of xref.ids) {
            await expect(group.getByRole("link", { name: id, exact: true })).toHaveAttribute(
              "href",
              `${xref.stem}${id}`
            );
          }
        }
      });

      await test.step("sources the app does not list are not shown", async () => {
        // ICD10CM, DOID, MEDGEN, SCTID and others are in the data but not in the header
        await expect(disease.externalLinks).not.toContainText(/DOID|ICD10|MEDGEN|SCTID|NANDO/);
      });
    });
  }

  test("description and synonyms come from the disease", async ({ page, testConfig }) => {
    const { efoId } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await expect(disease.profileHeader).toBeVisible();
    await expect(disease.description.getByText("Description", { exact: true })).toBeVisible();
    await expect(disease.description).toContainText(DISEASES.MONDO_0005068.description);
    await expect(disease.description).not.toContainText("No description available");
    await expect(disease.synonyms.getByText("Synonyms", { exact: true })).toBeVisible();
    await expect(disease.synonymChips.first()).toBeVisible();
    // The first ten are shown, the rest sit behind "show more"
    await expect(disease.synonymChips).toHaveCount(10);
    await expect(disease.synonymChip("heart attack")).toBeVisible();
  });

  test("a long synonym list expands with show more and collapses with hide", async ({ page }) => {
    const disease = new DiseasePage(page);
    await disease.goto("MONDO_0005068");

    await expect(disease.synonymChips).toHaveCount(10);
    await expect(disease.synonymsToggle).toContainText("show more");
    await expect(disease.synonymChip("Myocardial infarction, NOS")).toHaveCount(0);

    await disease.synonymsToggle.click();
    await expect(disease.synonymChips).toHaveCount(DISEASES.MONDO_0005068.synonymCount);
    await expect(disease.synonymChip("Myocardial infarction, NOS")).toBeVisible();
    await expect(disease.synonymsToggle).toContainText("hide");

    await disease.synonymsToggle.click();
    await expect(disease.synonymChips).toHaveCount(10);
    await expect(disease.synonymsToggle).toContainText("show more");
  });

  test("a synonym chip shows its relation in a tooltip, including the relations of later terms", async ({
    page,
  }) => {
    const disease = new DiseasePage(page);
    await disease.goto("MONDO_0007254");

    await disease.synonymChip("BC").hover();
    await expect(disease.tooltip).toHaveText("hasExactSynonym");
    await page.mouse.move(0, 0);
    await expect(disease.tooltip).toHaveCount(0);

    // 17 synonyms: the narrow and broad ones are behind "show more"
    await expect(disease.synonymChips).toHaveCount(10);
    await disease.synonymsToggle.click();
    await expect(disease.synonymChips).toHaveCount(DISEASES.MONDO_0007254.synonymCount);

    await disease.synonymChip("primary breast cancer").hover();
    await expect(disease.tooltip).toHaveText("hasNarrowSynonym");
    await page.mouse.move(0, 0);
    await expect(disease.tooltip).toHaveCount(0);

    await disease.synonymChip("breast tumor").hover();
    await expect(disease.tooltip).toHaveText("hasBroadSynonym");
  });

  test("a long synonym list of another disease shows the same ten-then-all behaviour", async ({
    page,
  }) => {
    const disease = new DiseasePage(page);
    await disease.goto("MONDO_0007739");

    await expect(disease.synonymChips).toHaveCount(10);
    await disease.synonymsToggle.click();
    await expect(disease.synonymChips).toHaveCount(DISEASES.MONDO_0007739.synonymCount);
  });

  test("has Associated targets and Profile tabs with the profile selected", async ({
    page,
    testConfig,
  }) => {
    const { efoId } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await expect(disease.tabs).toHaveText(["Associated targets", "Profile"]);
    await expect(disease.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(disease.associationsTab).toHaveAttribute("aria-selected", "false");
    await expect(disease.profileTab).toHaveAttribute("href", `/disease/${efoId}`);
    await expect(disease.associationsTab).toHaveAttribute("href", `/disease/${efoId}/associations`);
  });

  test("the tabs switch route and content, and back and forward follow", async ({
    page,
    testConfig,
  }) => {
    const { efoId, name } = primaryDisease(testConfig);
    const firstSection = expectedSectionsFor(efoId)[0];
    const disease = new DiseasePage(page);
    await disease.goto(efoId);

    await test.step("the profile route shows the sections", async () => {
      await expect(page.getByTestId("profile-header")).toBeVisible();
      await expect(disease.section(firstSection)).toBeVisible();
    });

    await test.step("Associated targets replaces the profile with the associations table", async () => {
      await disease.openAssociationsTab();
      await expect(page).toHaveURL(new RegExp(`/disease/${efoId}/associations$`));
      await expect(page).toHaveTitle(`Targets associated with ${name} | Open Targets Platform`);
      await expect(disease.associationsTab).toHaveAttribute("aria-selected", "true");
      await expect(disease.profileTab).toHaveAttribute("aria-selected", "false");
      await expect(page.getByTestId("associations-table")).toBeVisible();
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();
      await expect(page.getByTestId("profile-header")).toHaveCount(0);
      await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
      // the header above the tabs is shared by both routes
      await expect(disease.title).toHaveText(name);
      await expect(disease.getEfoLink()).toHaveAttribute("href", efoUrl(efoId));
    });

    await test.step("Profile brings the sections back", async () => {
      await disease.openProfileTab();
      await expect(page).toHaveURL(new RegExp(`/disease/${efoId}$`));
      await expect(page).toHaveTitle(`${name} profile page | Open Targets Platform`);
      await expect(page.getByTestId("associations-table")).toHaveCount(0);
      await expect(disease.section(firstSection)).toBeVisible();
    });

    await test.step("browser back returns to the associations, forward to the profile", async () => {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/disease/${efoId}/associations$`));
      await expect(disease.associationsTab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();

      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`/disease/${efoId}$`));
      await expect(disease.profileTab).toHaveAttribute("aria-selected", "true");
      await expect(disease.section(firstSection)).toBeVisible();
    });
  });

  test("the associations route opens directly and survives a reload", async ({
    page,
    testConfig,
  }) => {
    const { efoId, name } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.gotoAssociations(efoId);

    const expectAssociationsRoute = async () => {
      await expect(disease.title).toHaveText(name);
      await expect(disease.associationsTab).toHaveAttribute("aria-selected", "true");
      await expect(disease.profileTab).toHaveAttribute("aria-selected", "false");
      await expect(page).toHaveTitle(`Targets associated with ${name} | Open Targets Platform`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `Ranked list of targets associated with ${name}`
      );
      await expect(page.getByTestId("table-row-core-0")).toBeVisible();
      await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
    };

    await expectAssociationsRoute();
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/disease/${efoId}/associations$`));
    await expectAssociationsRoute();
  });

  test("the profile page sets its description meta and survives a reload", async ({
    page,
    testConfig,
  }) => {
    const { efoId, name } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);
    await expectSections(page, expectedSectionsFor(efoId));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      `Annotation information for ${name}`
    );

    await page.reload();
    await expect(disease.title).toHaveText(name);
    await expect(disease.profileTab).toHaveAttribute("aria-selected", "true");
    await expectSections(page, expectedSectionsFor(efoId));
  });

  test("summary chips list every section and jump to the one clicked", async ({
    page,
    testConfig,
  }) => {
    const { efoId } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);
    await expectSections(page, expectedSectionsFor(efoId));

    await expect(disease.summaryCards).toHaveCount(DISEASE_SECTIONS.length);
    for (const section of DISEASE_SECTIONS) {
      await expect(disease.summaryCard(section.id)).toContainText(section.name);
    }

    await disease.summaryCard("gwasstudies").click();
    await expect(page).toHaveURL(new RegExp(`/disease/${efoId}#GWASStudies$`));
    await expect(disease.sectionTitle("gwasstudies")).toBeInViewport();
  });

  test("a deep link with a section hash scrolls to that section", async ({ page, testConfig }) => {
    const { efoId } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId, "#bibliography");

    await expectSectionLoaded(page, "bibliography");
    await expect(disease.sectionTitle("bibliography")).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`/disease/${efoId}#bibliography$`));
    await expect(disease.stickyHeader, "the sticky header shows once scrolled").toBeVisible();
  });

  test("the sticky header names the disease and navigates between sections", async ({
    page,
    testConfig,
  }) => {
    const { efoId, name } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);
    await expectSections(page, expectedSectionsFor(efoId));
    await expect(disease.stickyHeader, "hidden at the top of the page").toHaveCount(0);

    await disease.section("bibliography").scrollIntoViewIfNeeded();
    const sticky = disease.stickyHeader;
    await expect(sticky).toBeVisible();
    await expect(sticky).toContainText(name);
    await expect(sticky.getByRole("link", { name: efoId, exact: true })).toHaveAttribute(
      "href",
      efoUrl(efoId)
    );

    await test.step("the section menu lists every section", async () => {
      await sticky.getByTestId("sticky-section-selector").click();
      const menu = page.getByRole("menu");
      await expect(menu.getByRole("menuitem")).toHaveText(
        DISEASE_SECTIONS.map((section) => new RegExp(`${section.name}$`))
      );
    });

    await test.step("the filter narrows the menu and a choice scrolls to the section", async () => {
      const menu = page.getByRole("menu");
      await menu.getByPlaceholder("Filter widgets...").fill("onto");
      await expect(menu.getByRole("menuitem")).toHaveText([/Ontology$/]);
      await menu.getByRole("menuitem", { name: "Ontology" }).click();
      await expect(menu).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`/disease/${efoId}#ontology$`));
      await expect(disease.sectionTitle("ontology")).toBeInViewport();
    });
  });

  test("the sticky section menu enables the sections with data and disables the others", async ({
    page,
    testConfig,
  }) => {
    const { efoId } = primaryDisease(testConfig);
    const disease = new DiseasePage(page);
    await disease.goto(efoId);
    await expectSections(page, expectedSectionsFor(efoId));

    await disease.section("bibliography").scrollIntoViewIfNeeded();
    await disease.stickyHeader.getByTestId("sticky-section-selector").click();
    const menu = page.getByRole("menu");
    const present = new Set(expectedSectionsFor(efoId));
    for (const section of DISEASE_SECTIONS) {
      const item = menu.getByRole("menuitem", { name: section.name });
      if (present.has(section.id)) {
        await expect(
          item,
          `"${section.name}" has data, so it must be selectable`
        ).not.toHaveAttribute("aria-disabled", "true");
      } else {
        await expect(item, `"${section.name}" has no data`).toHaveAttribute(
          "aria-disabled",
          "true"
        );
      }
    }
  });

  test("a disease id that does not exist shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a disease that does not exist", "error-ui");
    const disease = new DiseasePage(page);
    await page.goto(`/disease/${MISSING_DISEASE}`);

    await expect(disease.notFound).toBeVisible();
    await expect(
      disease.notFound.getByRole("heading", { name: "404: Page not found" })
    ).toBeVisible();
    await expect(
      disease.notFound.getByRole("link", { name: "Documentation", exact: true })
    ).toHaveAttribute("href", /^https:\/\/platform-docs\.opentargets\.org/);
    await expect(disease.title, "no disease header on the 404 page").toHaveCount(0);
    await expect(disease.tabs).toHaveCount(0);
    await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
  });

  test("the associations route of a disease that does not exist shows the 404 page", async ({
    page,
    pageHealth,
  }) => {
    pageHealth.allow(/404 page is displayed/, "opens a disease that does not exist", "error-ui");
    const disease = new DiseasePage(page);
    await page.goto(`/disease/${MISSING_DISEASE}/associations`);

    await expect(disease.notFound).toBeVisible();
    await expect(disease.title).toHaveCount(0);
    await expect(page.getByTestId("associations-table")).toHaveCount(0);
  });
});

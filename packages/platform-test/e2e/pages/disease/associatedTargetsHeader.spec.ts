import { expect, test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";

/**
 * /disease/:efoId/associations: the page around the associations table. The disease
 * header, the Associated targets / Profile tabs, the toolbar and what a wrong id shows.
 */
test.describe("Disease associations: header, tabs and toolbar", () => {
  test("loads with the disease header, the associations tab selected and a table of targets @smoke", async ({
    page,
    testConfig,
  }) => {
    const { primary: diseaseId, name } = testConfig.disease;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);

    await test.step("header and document title", async () => {
      await expect(page.getByTestId("profile-page-header-text")).toHaveText(name as string);
      await expect(page).toHaveTitle(`Targets associated with ${name} | Open Targets Platform`);
    });

    await test.step("tabs", async () => {
      const tabs = page.getByRole("tablist").getByRole("tab");
      await expect(tabs).toHaveText(["Associated targets", "Profile"]);
      await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
      await expect(tabs.nth(0)).toHaveAttribute("href", `/disease/${diseaseId}/associations`);
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
      await expect(tabs.nth(1)).toHaveAttribute("href", `/disease/${diseaseId}`);
    });

    await test.step("toolbar", async () => {
      await expect(aotf.facetsButton).toHaveText("Advanced filters");
      await expect(aotf.facetsButton).toBeEnabled();
      await expect(aotf.columnOptionsButton).toHaveText("Column options");
      await expect(aotf.columnOptionsButton).toBeEnabled();
      await expect(aotf.uploadButton).toHaveText("Upload targets");
      await expect(aotf.exportButton).toHaveText("Export");
      await expect(aotf.viewSwitch.getByRole("button")).toHaveText([
        "Target-disease association",
        "Target prioritisation factors",
      ]);
      await expect(aotf.associationsViewButton).toHaveAttribute("aria-pressed", "true");
      await expect(aotf.prioritisationViewButton).toHaveAttribute("aria-pressed", "false");
      // Analysis (gene enrichment) is a partner-preview, target-page-only menu.
      await expect(page.getByRole("button", { name: "Analysis" })).toHaveCount(0);
    });

    await test.step("table", async () => {
      await expect(aotf.rows()).toHaveCount(25);
      await expect(aotf.headerLabel("name")).toHaveText("Target");
      await expect(aotf.headerLabel("score")).toHaveText("Association Score");
      await expect(aotf.nameFilter).toHaveAttribute("placeholder", "Search target");
      await expect(aotf.filterChips, "no filter is applied by default").toHaveCount(0);
      await expect(aotf.clearAllFiltersButton).toHaveCount(0);
      await expect(aotf.openPanels, "no detail panel is open by default").toHaveCount(0);
      const { from, to, total } = await aotf.displayedRange();
      expect([from, to]).toEqual([1, 25]);
      expect(total, "the disease should have more than one page of targets").toBeGreaterThan(25);
    });
  });

  test("the header links the disease id to the ontology and each cross-reference to its source", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    await new AssociationsTable(page).gotoDisease(diseaseId);

    const links = page.getByTestId("external-links");
    const ontologyLink = links.getByRole("link", { name: diseaseId, exact: true });
    await expect(ontologyLink).toHaveAttribute(
      "href",
      `https://www.ebi.ac.uk/ols4/ontologies/efo/terms?short_form=${diseaseId}`
    );

    const stems: Record<string, string> = {
      mondo: "http://purl.obolibrary.org/obo/MONDO_",
      mesh: "https://identifiers.org/mesh:",
      ncit: "https://identifiers.org/ncit:",
      meddra: "https://identifiers.org/meddra:",
      umls: "https://identifiers.org/umls:",
      orphanet: "https://identifiers.org/orphanet:",
      icd10: "https://identifiers.org/icd:",
      omim: "https://www.omim.org/entry/",
    };
    const groups = links.locator("[data-testid^='header-external-links-']");
    await expect(groups.first()).toBeVisible();
    const xrefs = await groups.evaluateAll((elements) =>
      elements.map((element) => ({
        source: (element.getAttribute("data-testid") ?? "").replace("header-external-links-", ""),
        links: [...element.querySelectorAll("a")].map((anchor) => ({
          href: anchor.getAttribute("href"),
          text: anchor.textContent?.trim(),
        })),
      }))
    );
    expect(xrefs.length, "the disease should have cross-references").toBeGreaterThan(0);
    for (const { source, links: sourceLinks } of xrefs) {
      expect(Object.keys(stems), `"${source}" should be a known cross-reference source`).toContain(source);
      expect(sourceLinks.length, `"${source}" should have at least one link`).toBeGreaterThan(0);
      for (const link of sourceLinks) {
        expect(link.text, `a "${source}" link should show its id`).toBeTruthy();
        expect(link.href, `the "${source}" link should point at the id it shows`).toBe(
          `${stems[source]}${link.text}`
        );
      }
    }
  });

  test("the Profile tab opens the profile, and back returns to the loaded table", async ({
    page,
    testConfig,
  }) => {
    const { primary: diseaseId, name } = testConfig.disease;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);
    const firstPage = await aotf.rowNames();

    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${diseaseId}$`));
    await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Associated targets" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    await expect(page).toHaveTitle(`${name} profile page | Open Targets Platform`);
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(name as string);
    await expect(aotf.root, "the table belongs to the associations tab only").toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/disease/${diseaseId}/associations$`));
    await expect(page.getByRole("tab", { name: "Associated targets" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await aotf.expectRowNames(firstPage);

    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/disease/${diseaseId}$`));
    await expect(aotf.root).toHaveCount(0);
  });

  test("the Associated targets tab opens the table from the profile page", async ({
    page,
    testConfig,
  }) => {
    const { primary: diseaseId, name } = testConfig.disease;
    await page.goto(`/disease/${diseaseId}`);
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(name as string);
    await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: "Associated targets" }).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${diseaseId}/associations$`));
    const aotf = new AssociationsTable(page);
    await aotf.expectLoaded(25);
    await expect(page).toHaveTitle(`Targets associated with ${name} | Open Targets Platform`);
  });

  test("a disease id that does not exist shows the 404 page instead of a table", async ({
    page,
    pageHealth,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "this test opens the associations of a disease that does not exist",
      "error-ui"
    );
    await page.goto(AssociationsTable.diseasePath("MONDO_9999999"));

    const notFound = page.getByTestId("not-found-page");
    await expect(notFound).toBeVisible();
    await expect(notFound).toContainText("404: Page not found");
    await expect(notFound.getByRole("link", { name: "Go back to Home Page" })).toHaveAttribute("href", "/");
    await expect(new AssociationsTable(page).root).toHaveCount(0);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByTestId("profile-page-header-text")).toHaveCount(0);
  });
});

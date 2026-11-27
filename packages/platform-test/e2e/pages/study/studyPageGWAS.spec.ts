import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { GwasStudyHeader } from "../../../POM/objects/components/StudyProfileHeader/gwasStudyHeader";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { GWAS_STUDY_SECTIONS, GwasStudyPage } from "../../../POM/page/study/gwasStudy";
import {
  GWAS_STUDIES,
  MYOCARDIAL_INFARCTION,
  SUMSTAT_LABELS,
  UNKNOWN_STUDY_ID,
} from "../../../POM/page/study/studyData";
import { expectSectionLoaded, expectSections } from "../../../utils/sections";

const parseNumber = (text: string): number => Number(text.replace(/[^\d.]/g, ""));

/**
 * The GWAS study profile page: its header, which sections it renders, the cards and
 * sticky bar that navigate between them, links out and the routes that must 404.
 * The two sections have their own specs.
 */
test.describe("Study page: GWAS study", () => {
  // The PubMed drawer asks Europe PMC for the publication. That third-party service
  // throttles, so it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("renders the header and every expected section @smoke", async ({ page, testConfig }) => {
    const study = testConfig.study.gwas.primary;
    expect(study).toBe(GWAS_STUDIES.primary.id);
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(study);

    await expect(page).toHaveTitle(`${study} profile page | Open Targets Platform`);
    await expectSections(page, expectedSectionsFor(study));
    await expect(studyPage.page.getByTestId("profile-header")).toBeVisible();

    await test.step("every section has loaded with its own title, in profile order", async () => {
      for (const section of GWAS_STUDY_SECTIONS) {
        await expectSectionLoaded(page, section.id);
        await expect(studyPage.sectionTitle(section.id)).toHaveText(section.name);
      }
      const rendered = await page
        .locator("section[data-testid^='section-']")
        .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-testid")));
      expect(rendered).toEqual(GWAS_STUDY_SECTIONS.map((section) => `section-${section.id}`));
    });
  });

  test("has a single, selected Profile tab that links to the study", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(study);

    await expect(page.getByRole("tab")).toHaveText(["Profile"]);
    await expect(studyPage.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(studyPage.profileTab).toHaveAttribute("href", `/study/${study}`);
    await expectSectionLoaded(page, "gwas-credible-sets");
  });

  test("the header shows the study, its trait, publication and sample sizes", async ({
    page,
    testConfig,
  }) => {
    const facts = GWAS_STUDIES.primary;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);
    await expect(header.root).toBeVisible();

    await test.step("type, reported trait and disease", async () => {
      await expect(header.studyType).toHaveText("Study type: GWAS");
      await expect(header.reportedTrait).toHaveText(`Reported trait: ${facts.traitFromSource}`);
      await expect(header.diseases).toHaveText(
        `Disease or phenotype: ${MYOCARDIAL_INFARCTION.name}`
      );
      await expect(header.diseases.getByRole("link")).toHaveAttribute(
        "href",
        `/disease/${MYOCARDIAL_INFARCTION.id}`
      );
    });

    await test.step("publication: first author, journal and year, and the PubMed id", async () => {
      await expect(header.publication).toHaveText(/^Publication: .+ et al\. .+ \((19|20)\d{2}\)$/);
      await expect(header.pubmed).toHaveText(/^PubMed:\s+\d+\s*$/);
    });

    await test.step("sample size, cases and controls add up", async () => {
      await expect(header.sampleSize).toHaveText(/^Sample size: [\d,]+ \(cohorts: [^)]+\)/);
      const sampleSize = parseNumber((await header.sampleSize.innerText()).split("(")[0]);
      const cases = parseNumber(await header.nCases.innerText());
      const controls = parseNumber(await header.nControls.innerText());
      await expect(header.nCases).toHaveText(/^N cases: [\d,]+$/);
      await expect(header.nControls).toHaveText(/^N controls: [\d,]+$/);
      expect(cases, "a case/control study has cases").toBeGreaterThan(0);
      expect(cases + controls, "cases and controls make up the sample").toBe(sampleSize);
    });

    await test.step("the cohorts are those of the study", async () => {
      await expect(header.sampleSize).toContainText("(cohorts: MVP)");
    });

    await test.step("a study without an analysis flag shows no Analysis field", async () => {
      await expect(header.analysis).toHaveCount(0);
    });
  });

  test("the sample size tooltip gives the initial sample size", async ({ page, testConfig }) => {
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    await header.sampleSize.locator("sup").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Initial sample size");
    await expect(tooltip).toContainText(/\d[\d,]* .*ancestry cases, [\d,]+ .*ancestry controls/);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("the LD populations are shown as chips with their share of the sample", async ({
    page,
    testConfig,
  }) => {
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    await expect(header.ldChips).toHaveCount(1);
    await expect(header.ldChip("nfe")).toContainText("NFE");
    await expect(header.ldChip("nfe")).toContainText("100%");
    await header.ldChip("nfe").hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      "LD reference population: non-Finnish Europeans"
    );
  });

  test("a multi-ancestry study lists its LD populations from largest to smallest and they total 100%", async ({
    page,
  }) => {
    const facts = GWAS_STUDIES.multiAncestry;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    await expect(header.ldChips).toHaveCount(4);
    const shares = await header.ldChips.evaluateAll((chips) =>
      chips.map((chip) => ({
        id: (chip.getAttribute("data-testid") ?? "").replace("chip-ld-population-", ""),
        label: chip.querySelector("[data-testid='label-chip-label']")?.textContent ?? "",
        value: Number.parseFloat(
          chip.querySelector("[data-testid='label-chip-value']")?.textContent ?? "NaN"
        ),
      }))
    );
    expect(shares.map(({ id }) => id).sort()).toEqual(["afr", "amr", "eas", "nfe"]);
    for (const { id, label } of shares) expect(label).toBe(id.toUpperCase());
    const values = shares.map(({ value }) => value);
    expect(values, "largest first").toEqual([...values].sort((a, b) => b - a));
    expect(values[0], "European ancestry dominates this study").toBe(
      shares.find(({ id }) => id === "nfe")?.value
    );
    // Each share is rounded to a whole percent, so the total is within a rounding step of 100.
    const total = values.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  test("the summary statistics popover lists the harmonised QC values", async ({
    page,
    testConfig,
  }) => {
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    await expect(header.summaryStatistics).toHaveText(/^Summary statistics: Available/);
    await expect(header.popover).toBeHidden();
    await header.summaryStatisticsTrigger.click();
    await expect(header.popover).toBeVisible();
    await expect(header.popover).toContainText("Harmonised summary statistics");

    const rows = header.popover.locator("tbody tr");
    await expect(rows).toHaveCount(SUMSTAT_LABELS.length);
    const labels = (await rows.locator("td:first-child").allInnerTexts()).map((text) =>
      text.replace(/\?$/, "").trim()
    );
    expect(labels.sort()).toEqual([...SUMSTAT_LABELS].sort());
    const values = await rows.locator("td:last-child").allInnerTexts();
    for (const value of values) expect(value.trim()).toMatch(/^-?[\d,.]+(e-?\d+)?$/);

    await test.step("significant variants never exceed the total harmonised variants", async () => {
      const valueOf = async (label: string) => {
        const row = rows.filter({ hasText: label }).filter({ hasNotText: `${label} SE` });
        return parseNumber((await row.first().locator("td:last-child").innerText()).trim());
      };
      expect(await valueOf("Total variants")).toBeGreaterThan(
        await valueOf("Significant variants")
      );
    });

    await test.step("a row's label has a tooltip that explains it", async () => {
      await rows.filter({ hasText: "Total variants" }).locator("sup").hover();
      await expect(page.getByRole("tooltip")).toHaveText("Number of harmonised variants");
    });

    await page.keyboard.press("Escape");
    await expect(header.popover).toBeHidden();
  });

  test("the QC warnings popover lists the study's quality control messages", async ({
    page,
    testConfig,
  }) => {
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    await expect(header.qcWarnings).toHaveText("QC warnings");
    await header.qcWarningsTrigger.click();
    await expect(header.popover.getByRole("listitem")).toHaveText([
      /^Study has non empty or zero nCases, nControls & nSamples with matching sum$/,
    ]);
    await page.keyboard.press("Escape");
    await expect(header.popover).toBeHidden();
  });

  test("the PubMed id opens the publications drawer for that id and closes again", async ({
    page,
    testConfig,
  }) => {
    const searches = await stubEuropePmc(page);
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    const pubmedId = (await header.pubmed.innerText()).replace("PubMed:", "").trim();
    expect(pubmedId).toMatch(/^\d+$/);
    await expect(header.pubmedDrawerTrigger).toHaveText(pubmedId);
    await header.pubmedDrawerTrigger.click();

    const drawer = header.publicationsDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Publications");
    await expect(drawer).toContainText(`Stubbed publication ${pubmedId}`);
    expect(searches.at(-1)).toEqual([pubmedId]);

    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("the disease link in the header goes to the disease page, and back returns", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(study);

    await header.diseases.getByRole("link", { name: MYOCARDIAL_INFARCTION.name }).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${MYOCARDIAL_INFARCTION.id}$`));
    await expect(studyPage.title).toHaveText(MYOCARDIAL_INFARCTION.name);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/study/${study}(#.*)?$`));
    await expect(studyPage.title).toHaveText(study);
    await expectSectionLoaded(page, "gwas-credible-sets");

    await page.goForward();
    await expect(studyPage.title).toHaveText(MYOCARDIAL_INFARCTION.name);
  });

  test("the links under the title name the disease and the source of the study", async ({
    page,
    testConfig,
  }) => {
    const facts = GWAS_STUDIES.primary;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(testConfig.study.gwas.primary);

    await expect(studyPage.diseaseLinks).toHaveText([MYOCARDIAL_INFARCTION.name]);
    await expect(studyPage.diseaseLinks).toHaveAttribute(
      "href",
      `../disease/${MYOCARDIAL_INFARCTION.id}`
    );
    const source = studyPage.sourceLink(facts.source.label);
    await expect(source).toHaveAttribute("href", facts.source.href);
  });

  test("the header does not show placeholder text", async ({ page, testConfig }) => {
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(testConfig.study.gwas.primary);
    await expect(header.studyType).toBeVisible();

    await expect(
      header.root,
      "the header shows a '?API?' placeholder for fields it cannot fill"
    ).not.toContainText("?API?");
    await expect(header.backgroundTrait).toHaveCount(0);
  });

  test("a study without summary statistics says so and still lists its warnings", async ({
    page,
  }) => {
    const facts = GWAS_STUDIES.noSumstatsNoCredibleSets;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    await expect(header.summaryStatistics).toHaveText("Summary statistics: Not Available");
    await expect(header.summaryStatisticsTrigger).toHaveCount(0);
    await expect(header.reportedTrait).toHaveText(`Reported trait: ${facts.traitFromSource}`);
    await expect(header.ldChips).toHaveCount(3);

    await header.qcWarningsTrigger.click();
    await expect(header.popover.getByRole("listitem")).toContainText([
      "Harmonized summary statistics are not available or empty",
      "Study has non empty or zero nCases, nControls & nSamples with matching sum",
    ]);
  });

  test("a study without credible sets renders only the shared trait studies, and its summary card is inactive", async ({
    page,
  }) => {
    const facts = GWAS_STUDIES.noSumstatsNoCredibleSets;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));
    await expectSectionLoaded(page, "shared-trait-studies");

    await expect(studyPage.section("gwas-credible-sets")).toHaveCount(0);
    await expect(studyPage.summaryCards).toHaveCount(2);
    await expect(studyPage.summaryCard("gwas_credible_sets")).toContainText("GWAS Credible Sets");
  });

  test("a FinnGen study links to FinnGen and has no publication", async ({ page }) => {
    const facts = GWAS_STUDIES.finngen;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    await expect(header.reportedTrait).toHaveText(`Reported trait: ${facts.traitFromSource}`);
    await expect(studyPage.sourceLink(facts.source.label)).toHaveAttribute(
      "href",
      facts.source.href
    );
    await expect(studyPage.traitLinks("Trait")).toHaveText([MYOCARDIAL_INFARCTION.name]);
    await expect(header.publication).toHaveCount(0);
    await expect(header.sampleSize).toContainText("(cohorts: FinnGen)");
    await expect(header.ldChip("fin")).toContainText("100%");
    await expect(
      header.summaryStatistics,
      "summary statistics without QC values are just 'Available'"
    ).toHaveText("Summary statistics: Available");
    await expect(header.summaryStatisticsTrigger).toHaveCount(0);
  });

  test("a study with zero cases and controls hides both fields", async ({ page }) => {
    const facts = GWAS_STUDIES.noCases;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    await expect(header.sampleSize).toHaveText(/^Sample size: [\d,]+ \(cohorts: UKB\)/);
    await expect(header.nCases).toHaveCount(0);
    await expect(header.nControls).toHaveCount(0);
    await header.qcWarningsTrigger.click();
    await expect(header.popover).toContainText(
      "Study has non empty or zero nSamples with empty nCases and nControls"
    );
  });

  test("a study with an analysis flag shows it", async ({ page }) => {
    const facts = GWAS_STUDIES.withAnalysisFlag;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    await expect(header.analysis).toHaveText("Analysis: wgsGWAS");
  });

  test("a study linked to two diseases links to both", async ({ page }) => {
    const facts = GWAS_STUDIES.twoDiseases;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(facts.id);
    await expectSections(page, expectedSectionsFor(facts.id));

    const names = facts.diseases.map(({ name }) => name);
    await expect(studyPage.diseaseLinks).toHaveText(names);
    await expect(header.diseases).toHaveText(`Disease or phenotype: ${names.join(", ")}`);
    for (const [index, disease] of facts.diseases.entries()) {
      await expect(studyPage.diseaseLinks.nth(index)).toHaveAttribute(
        "href",
        `../disease/${disease.id}`
      );
    }
  });

  test("summary cards list both sections and jump to the one clicked", async ({
    page,
    testConfig,
  }) => {
    const study = testConfig.study.gwas.primary;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(study);
    await expectSections(page, expectedSectionsFor(study));

    await expect(studyPage.summaryCards).toHaveCount(GWAS_STUDY_SECTIONS.length);
    for (const section of GWAS_STUDY_SECTIONS) {
      await expect(studyPage.summaryCard(section.anchor)).toContainText(section.name);
      await expect(studyPage.summaryCard(section.anchor)).toContainText(section.shortName);
    }

    const target = GWAS_STUDY_SECTIONS[1];
    await studyPage.summaryCard(target.anchor).click();
    await expect(page).toHaveURL(new RegExp(`/study/${study}#${target.anchor}$`));
    await expect(studyPage.sectionTitle(target.id)).toBeInViewport();
  });

  test("the sticky header names the study and links to its source", async ({
    page,
    testConfig,
  }) => {
    const facts = GWAS_STUDIES.primary;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(testConfig.study.gwas.primary);
    await expectSections(page, expectedSectionsFor(facts.id));
    await expect(studyPage.stickyHeader, "hidden at the top of the page").toHaveCount(0);

    await studyPage.section("shared-trait-studies").scrollIntoViewIfNeeded();
    const sticky = studyPage.stickyHeader;
    await expect(sticky).toBeVisible();
    await expect(sticky).toContainText(facts.id);
    await expect(sticky.getByRole("link", { name: facts.source.label })).toHaveAttribute(
      "href",
      facts.source.href
    );

    await sticky.getByTestId("sticky-section-selector").click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(
      GWAS_STUDY_SECTIONS.map((section) => new RegExp(`${section.name}$`))
    );
    await menu.getByRole("menuitem", { name: "GWAS Credible Sets" }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/study/${facts.id}#gwas_credible_sets$`));
    await expect(studyPage.sectionTitle("gwas-credible-sets")).toBeInViewport();
  });

  test("a deep link with a section hash scrolls to that section", async ({ page, testConfig }) => {
    const study = testConfig.study.gwas.primary;
    const studyPage = new GwasStudyPage(page);
    await studyPage.goto(study, "#shared_trait_studies");

    await expectSectionLoaded(page, "shared-trait-studies");
    await expect(studyPage.sectionTitle("shared-trait-studies")).toBeInViewport();
    await expect(page).toHaveURL(new RegExp(`/study/${study}#shared_trait_studies$`));
  });

  test("reloading keeps the study, its header and its sections", async ({ page, testConfig }) => {
    const study = testConfig.study.gwas.primary;
    const studyPage = new GwasStudyPage(page);
    const header = new GwasStudyHeader(page);
    await studyPage.goto(study);
    await expectSections(page, expectedSectionsFor(study));

    await page.reload();
    await expect(studyPage.title).toHaveText(study);
    await expect(header.studyType).toHaveText("Study type: GWAS");
    await expectSections(page, expectedSectionsFor(study));
  });

  test("a study id that does not exist shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a study that does not exist", "error-ui");
    const studyPage = new GwasStudyPage(page);
    await page.goto(`/study/${UNKNOWN_STUDY_ID}`);

    await expect(studyPage.notFound).toBeVisible();
    await expect(
      studyPage.notFound.getByRole("heading", { name: "404: Page not found" })
    ).toBeVisible();
    await expect(
      studyPage.notFound.getByRole("link", { name: "Go back to Home Page" })
    ).toHaveAttribute("href", "/");
    await expect(studyPage.title, "no study header on the 404 page").toHaveCount(0);
    await expect(page.locator("section[data-testid^='section-']")).toHaveCount(0);
  });

  test("an unknown sub-route of a study shows the 404 page", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "opens a study sub-route that does not exist",
      "error-ui"
    );
    const studyPage = new GwasStudyPage(page);
    await page.goto(`/study/${testConfig.study.gwas.primary}/this-tab-does-not-exist`);

    await expect(studyPage.notFound).toBeVisible();
  });
});

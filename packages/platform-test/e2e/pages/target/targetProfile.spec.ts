import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { ProfileHeader } from "../../../POM/objects/components/ProfileHeader/profileHeader";
import {
  requireTarget,
  TARGET_WIDGETS,
  TargetPage,
  targetIdentity,
  targetWidget,
} from "../../../POM/page/target";
import { expectSections } from "../../../utils/sections";

/** "Chr7: 140719327-140925199,-" */
const LOCATION_PATTERN = /^Chr(\d{1,2}|X|Y|MT): (\d+)-(\d+),([+-])$/;

type Coordinates = { chromosome: string; start: number; end: number; strand: string };

function parseLocation(text: string): Coordinates {
  const match = LOCATION_PATTERN.exec(text.trim());
  if (!match) throw new Error(`"${text}" is not a genomic location`);
  return { chromosome: match[1], start: Number(match[2]), end: Number(match[3]), strand: match[4] };
}

/**
 * The profile tab of the target page around its sections: the profile header
 * (description, genomic location, synonyms), the summary chips and the sticky header.
 * Each section has its own spec under sections/.
 */
test.describe("Target profile", () => {
  test.describe("profile header", () => {
    test("the description is shown clipped, with its references linked, and expands and collapses", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      await test.step("text and references", async () => {
        await expect(profile.descriptionHeading).toBeVisible();
        await expect(profile.targetDescriptionText).toHaveText(/\w{3,}.{60,}/s);
        // UniProt evidence codes are stripped; PubMed references become links
        await expect(profile.targetDescriptionText).not.toContainText("ECO:");
        await expect(profile.targetDescriptionText).not.toContainText("{");
        const references = profile.targetDescriptionText.getByRole("link");
        await expect(references.first()).toBeVisible();
        for (const reference of await references.all()) {
          await expect(reference).toHaveText(/^\d+$/);
          const pubmedId = (await reference.innerText()).trim();
          await expect(reference).toHaveAttribute(
            "href",
            `https://europepmc.org/abstract/med/${pubmedId}`
          );
          await expect(reference).toHaveAttribute("target", "_blank");
        }
      });

      await test.step("show more expands the text, hide clips it again", async () => {
        await expect(profile.targetDescriptionToggle).toHaveText("show more");
        const clipped = await profile.targetDescriptionText.boundingBox();
        if (!clipped) throw new Error("the description text has no box");

        await profile.targetDescriptionToggle.click();
        await expect(profile.targetDescriptionToggle).toHaveText("hide");
        await expect
          .poll(async () => (await profile.targetDescriptionText.boundingBox())?.height, {
            message: "the expanded description should be taller than the clipped one",
          })
          .toBeGreaterThan(clipped.height);

        await profile.targetDescriptionToggle.click();
        await expect(profile.targetDescriptionToggle).toHaveText("show more");
        await expect
          .poll(async () => (await profile.targetDescriptionText.boundingBox())?.height, {
            message: "the collapsed description should be clipped to its original height",
          })
          .toBe(clipped.height);
      });
    });

    test("the gene body and canonical transcript show GRCh38 coordinates on the right chromosome", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const { chromosome } = targetIdentity(ensgId);
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      const readLocation = async (label: "Gene body" | "Canonical transcript") => {
        const location = profile.genomicLocation(label);
        await expect(location, `the ${label} location should be shown`).toBeVisible();
        await expect(profile.root.getByText(`${label}:`, { exact: true })).toBeVisible();
        await expect(location.getByText("GRCh38", { exact: true })).toBeVisible();
        const coordinates = location.getByText(LOCATION_PATTERN);
        await expect(coordinates).toBeVisible();
        return parseLocation(await coordinates.innerText());
      };

      const gene = await readLocation("Gene body");
      const transcript = await readLocation("Canonical transcript");

      expect(gene.chromosome).toBe(chromosome);
      expect(gene.start, "the gene body should start before it ends").toBeLessThan(gene.end);
      expect(gene.start).toBeGreaterThan(0);
      expect(transcript.chromosome).toBe(chromosome);
      expect(transcript.strand).toBe(gene.strand);
      expect(transcript.start).toBeLessThan(transcript.end);
      expect(transcript.start, "the canonical transcript should lie within the gene body").toBeGreaterThanOrEqual(gene.start);
      expect(transcript.end, "the canonical transcript should lie within the gene body").toBeLessThanOrEqual(gene.end);

      await test.step("hovering a location explains its format", async () => {
        await profile.genomicLocation("Gene body").hover();
        await expect(profile.tooltip).toHaveText("Gene body: build | chromosome:start-end,strand");
      });
    });

    test("synonyms are listed ten at a time, expand to the full unique list, and name their sources", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      await expect(profile.synonyms.getByRole("heading", { name: "Synonyms", exact: true })).toBeVisible();
      await expect(profile.synonymChips).toHaveCount(10);
      await expect(profile.synonymsToggle).toHaveText(/show more/);

      await test.step("every chip has a label and a source tooltip", async () => {
        await expect(profile.synonymChips.first()).toHaveText(/\S/);
        await profile.synonymChips.first().hover();
        await expect(profile.tooltip).toHaveText(
          /^Source: (HGNC|UniProt|Entrez)(, (HGNC|UniProt|Entrez))*$/
        );
        await page.mouse.move(0, 0);
        await expect(profile.tooltip).toHaveCount(0);
      });

      await test.step("show more reveals the rest, without duplicates", async () => {
        await profile.synonymsToggle.click();
        await expect(profile.synonymsToggle).toHaveText(/hide/);
        await expect
          .poll(() => profile.synonymChips.count(), {
            message: "expanding should show more than the first ten synonyms",
          })
          .toBeGreaterThan(10);
        const labels = (await profile.synonymChips.allInnerTexts()).map((label) =>
          label.trim().toLowerCase()
        );
        expect(labels.every((label) => label.length > 0)).toBe(true);
        expect(new Set(labels).size, "synonyms should be listed once each").toBe(labels.length);
      });

      await test.step("hide goes back to ten", async () => {
        await profile.synonymsToggle.click();
        await expect(profile.synonymsToggle).toHaveText(/show more/);
        await expect(profile.synonymChips).toHaveCount(10);
      });
    });

    test("a core essential gene is flagged, with DepMap named as the source", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "coreEssential");
      const { symbol } = targetIdentity(ensgId);
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      await expect(target.symbol).toHaveText(symbol);
      await expect(profile.coreEssentialChip).toBeVisible();
      await profile.coreEssentialChip.hover();
      await expect(profile.tooltip).toHaveText("Source: Cancer DepMap");
    });
  });

  test.describe("summary chips", () => {
    test("there is one chip per widget, in page order, active only where the target has data", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const target = new TargetPage(page);

      await target.goto(ensgId);

      await expect(target.summaryChips).toHaveText(
        TARGET_WIDGETS.map((widget) => new RegExp(`^${widget.shortName}\\s*${widget.name}\\s*$`))
      );
      const chipIds = await target.summaryChips.evaluateAll((chips) =>
        chips.map((chip) => chip.getAttribute("data-testid"))
      );
      expect(chipIds).toEqual(TARGET_WIDGETS.map((widget) => widget.summary));
      await target.expectActiveSummaryChips(expectedSectionsFor(ensgId));
    });

    test("clicking a chip scrolls to its section and records it in the URL", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const target = new TargetPage(page);

      await target.goto(ensgId);
      // wait for every section, so nothing above the destination grows after the scroll
      await expectSections(page, expectedSectionsFor(ensgId));

      await target.followSummaryChip(targetWidget("bibliography"));
      await target.followSummaryChip(targetWidget("cancerhallmarks"));
      await target.followSummaryChip(targetWidget("qtl-credible-sets"));
    });

    test("opening a link to a section scrolls to that section", async ({ page, testConfig }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const widget = targetWidget("mousephenotypes");
      const target = new TargetPage(page);

      await target.gotoSection(ensgId, widget.id);
      await expectSections(page, expectedSectionsFor(ensgId));

      await expect(
        page.getByTestId(`section-${widget.section}-header`),
        "the section named in the URL hash should be in view once the page has loaded"
      ).toBeInViewport();
      await expect(target.stickyHeader, "the page should have scrolled past the tabs").toBeVisible();
    });
  });

  test.describe("sticky header", () => {
    test("it appears once the tabs scroll away, names the target and the section in view, and jumps between sections", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "primary");
      const { symbol } = targetIdentity(ensgId);
      const sectionsWithData = expectedSectionsFor(ensgId);
      const target = new TargetPage(page);

      await target.goto(ensgId);
      await expectSections(page, sectionsWithData);

      await test.step("hidden at the top of the page", async () => {
        await expect(target.stickyHeader).toHaveCount(0);
      });

      await test.step("shown after scrolling to a section, with the target and that section", async () => {
        const widget = targetWidget("cancerhallmarks");
        await target.followSummaryChip(widget);
        await expect(target.stickyHeader).toBeVisible();
        await expect(target.stickyHeader).toContainText(symbol);
        await expect(
          target.stickyHeader.getByRole("link", { name: ensgId, exact: true })
        ).toHaveAttribute("href", `https://identifiers.org/ensembl:${ensgId}`);
        await expect(target.stickySectionSelector).toHaveText(
          new RegExp(`^${widget.shortName}\\s*${widget.name}$`)
        );
      });

      await test.step("the section menu lists every widget and disables those without data", async () => {
        await target.stickySectionSelector.click();
        const items = target.stickySectionMenu.getByRole("menuitem");
        await expect(items).toHaveText(
          TARGET_WIDGETS.map((widget) => new RegExp(`^${widget.shortName}\\s*${widget.name}$`))
        );
        for (const widget of TARGET_WIDGETS) {
          const item = target.stickySectionMenu.getByRole("menuitem", {
            name: new RegExp(`${widget.name}$`),
          });
          if (sectionsWithData.includes(widget.section)) {
            await expect(item, `"${widget.name}" has data and should be selectable`).not.toHaveAttribute(
              "aria-disabled",
              "true"
            );
          } else {
            await expect(item, `"${widget.name}" has no data and should be disabled`).toHaveAttribute(
              "aria-disabled",
              "true"
            );
          }
        }
        await expect(
          target.stickySectionMenu.getByRole("menuitem", { name: /Cancer Hallmarks$/ }),
          "the section in view should be the selected menu item"
        ).toHaveClass(/Mui-selected/);
      });

      await test.step("the filter narrows the menu and choosing an item jumps to that section", async () => {
        const widget = targetWidget("compgenomics");
        await target.stickySectionFilter.fill("genomics");
        await expect(target.stickySectionMenu.getByRole("menuitem")).toHaveText([
          new RegExp(`${widget.name}$`),
        ]);
        await target.stickySectionFilter.fill("no such widget");
        await expect(target.stickySectionMenu.getByRole("menuitem")).toHaveCount(0);
        await target.stickySectionFilter.fill("GENOMICS");
        await target.stickySectionMenu.getByRole("menuitem", { name: new RegExp(`${widget.name}$`) }).click();

        await expect(target.stickySectionMenu).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`#${widget.id}$`));
        await expect(page.getByTestId(`section-${widget.section}-header`)).toBeInViewport();
        await expect(target.stickySectionSelector).toHaveText(new RegExp(`${widget.name}$`));
      });

      await test.step("hidden again back at the top", async () => {
        await page.keyboard.press("Home");
        await expect(target.symbol).toBeInViewport();
        await expect(target.stickyHeader).toHaveCount(0);
      });
    });
  });

  test.describe("targets with little data", () => {
    test("a non-coding target has no description and only the sections it has data for", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "nonCoding");
      const { symbol, name, chromosome } = targetIdentity(ensgId);
      const sectionsWithData = expectedSectionsFor(ensgId);
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      await expect(target.symbol).toHaveText(symbol);
      await expect(target.name).toHaveText(name);
      await expect(target.externalLinks.getByRole("link")).toHaveText([ensgId, symbol, symbol]);
      await expect(target.uniprotLinks.getByRole("link")).toHaveCount(0);

      await expect(profile.targetDescription).toHaveText("No description available");
      await expect(profile.targetDescriptionToggle).toHaveCount(0);
      await expect(profile.coreEssentialChip).toHaveCount(0);
      await expect(profile.genomicLocation("Gene body").getByText(LOCATION_PATTERN)).toHaveText(
        new RegExp(`^Chr${chromosome}: `)
      );
      await expect(profile.synonymChips).toHaveCount(10);

      await expectSections(page, sectionsWithData);
      await target.expectActiveSummaryChips(sectionsWithData);
      for (const absent of ["cancerhallmarks", "mousephenotypes", "compgenomics", "pharmacogenetics"]) {
        expect(sectionsWithData, `the manifest should not list "${absent}" for ${symbol}`).not.toContain(absent);
      }
    });

    test("a non-coding target does not show a UniProt label with no accession", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "nonCoding");
      const { symbol } = targetIdentity(ensgId);
      const target = new TargetPage(page);

      await target.goto(ensgId);

      await expect(target.externalLinks.getByRole("link")).toHaveText([ensgId, symbol, symbol]);
      await expect(
        target.externalLinks,
        "a target without a reviewed UniProt entry should not show an empty \"UniProt:\" label"
      ).not.toContainText("UniProt");
    });

    test("a target with no synonyms, literature or credible sets renders only what it has", async ({
      page,
      testConfig,
    }) => {
      const ensgId = requireTarget(testConfig, "withoutLiteratureOrQtl");
      const { symbol, name } = targetIdentity(ensgId);
      const sectionsWithData = expectedSectionsFor(ensgId);
      const target = new TargetPage(page);
      const profile = new ProfileHeader(page);

      await target.goto(ensgId);

      await expect(target.symbol).toHaveText(symbol);
      await expect(target.name).toHaveText(name);
      await expect(profile.targetDescription).toHaveText("No description available");
      await expect(profile.genomicLocation("Gene body").getByText(LOCATION_PATTERN)).toBeVisible();

      await expectSections(page, sectionsWithData);
      await expect(profile.synonyms, "a target without synonyms should not show the Synonyms block").toHaveCount(0);
      await target.expectActiveSummaryChips(sectionsWithData);
      for (const absent of ["bibliography", "qtl-credible-sets"]) {
        expect(sectionsWithData, `the manifest should not list "${absent}" for ${symbol}`).not.toContain(absent);
      }
    });
  });
});

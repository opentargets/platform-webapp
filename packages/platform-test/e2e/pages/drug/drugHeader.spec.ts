import { expect, test } from "../../../fixtures";
import { DrugHeader } from "../../../POM/objects/components/DrugHeader/drugHeader";
import { expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import { type DrugIds, drugFacts, drugIds } from "../../../POM/page/drug/drugData";

/** Where each cross reference of the header must point. */
const CROSS_REFERENCE_URL: Record<string, (id: string) => string> = {
  DrugBank: (id) => `https://identifiers.org/drugbank:${id}`,
  "Probes & Drugs": (id) => `https://www.probes-drugs.org/compound/${id}`,
};

const VISIBLE_CHIPS = 10;

test.describe("Drug page header", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  const headerScenarios: Exclude<keyof DrugIds, "withManyWarnings" | "withNonHumanTarget">[] = [
    "primary",
    "smallMolecule",
    "withParentMolecule",
    "withMultipleMechanisms",
    "sparse",
  ];

  for (const role of headerScenarios) {
    test(`shows name, external links, type, stage and relatives (${role})`, async ({
      page,
      testConfig,
    }) => {
      const chemblId = drugIds(testConfig)[role];
      const facts = drugFacts(chemblId);
      const header = new DrugHeader(page);
      await new DrugPage(page).goto(chemblId);

      await test.step("name", async () => {
        await expect(header.title).toHaveText(facts.name);
        await expect(header.title).toHaveAttribute("title", facts.name);
      });

      await test.step("external links: ChEMBL first, then exactly the recorded cross references", async () => {
        const labels = ["ChEMBL", ...Object.keys(facts.crossReferences)];
        const ids = [chemblId, ...Object.values(facts.crossReferences)];
        await expect(header.externalLinks.getByRole("link")).toHaveText(ids);
        await expect(header.externalLinks).toHaveText(
          labels.map((label, index) => `${label}: ${ids[index]}`).join("")
        );
        await expectExternalLink(
          header.externalLink(chemblId),
          `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`
        );
        for (const [label, id] of Object.entries(facts.crossReferences)) {
          await expectExternalLink(header.externalLink(id), CROSS_REFERENCE_URL[label](id));
        }
      });

      await test.step("description, molecule type and max stage", async () => {
        await expect(header.description).toContainText(
          new RegExp(
            `^Description\\s*${facts.moleculeType} drug with a maximum clinical stage of ${facts.maxStage}`
          )
        );
        await expect(header.moleculeType).toHaveText(`Molecule type: ${facts.moleculeType}`);
        await expect(header.maxStage).toHaveText(`Max stage: ${facts.maxStage}`);
      });

      await test.step("parent molecule", async () => {
        if (facts.parent) {
          await expect(header.parentMolecule).toHaveText(`Parent molecule: ${facts.parent.name}`);
          await expect(header.parentMolecule.getByRole("link")).toHaveAttribute(
            "href",
            `/drug/${facts.parent.id}`
          );
        } else {
          await expect(header.parentMolecule).toHaveCount(0);
        }
      });

      await test.step("child molecules", async () => {
        if (facts.children) {
          await expect(header.childMolecules).toHaveText(
            `Child molecules: ${facts.children.map((child) => child.name).join(", ")}`
          );
          const links = header.childMolecules.getByRole("link");
          await expect(links).toHaveText(facts.children.map((child) => child.name));
          for (const [index, child] of facts.children.entries()) {
            await expect(links.nth(index)).toHaveAttribute("href", `/drug/${child.id}`);
          }
        } else {
          await expect(header.childMolecules).toHaveCount(0);
        }
      });
    });
  }

  test("synonyms show ten chips, expand to all of them and collapse again", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(primary);

    await expect(header.synonyms).toContainText("Synonyms:");
    await expect(header.synonymChips).toHaveCount(VISIBLE_CHIPS);
    await expect(header.synonymsToggle).toHaveText("... [ show more ]");
    const collapsed = await header.synonymChips.allInnerTexts();
    expect(new Set(collapsed).size, "synonyms are de-duplicated").toBe(VISIBLE_CHIPS);
    expect(collapsed, "synonyms are listed alphabetically").toEqual(
      [...collapsed].sort((a, b) => a.localeCompare(b))
    );

    await header.synonymsToggle.click();
    await expect(header.synonymsToggle).toHaveText("[ hide ]");
    await expect
      .poll(() => header.synonymChips.count(), { message: "expanding reveals the hidden synonyms" })
      .toBeGreaterThan(VISIBLE_CHIPS);
    const expanded = await header.synonymChips.allInnerTexts();
    expect(expanded.slice(0, VISIBLE_CHIPS)).toEqual(collapsed);
    expect(new Set(expanded.map((label) => label.toLowerCase())).size).toBe(expanded.length);
    expect(
      expanded.some((label) => label.toLowerCase() === drugFacts(primary).name.toLowerCase()),
      "the drug's own name is among its synonyms"
    ).toBe(true);

    await header.synonymsToggle.click();
    await expect(header.synonymsToggle).toHaveText("... [ show more ]");
    await expect(header.synonymChips).toHaveCount(VISIBLE_CHIPS);
  });

  test("a synonym chip names its source on hover", async ({ page, testConfig }) => {
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);

    await expect(header.synonymChips).toHaveCount(VISIBLE_CHIPS);
    await header.synonymChips.first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(/^Source: \S.*/);
  });

  test("trade names show ten chips and expand to the rest", async ({ page, testConfig }) => {
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);

    await expect(header.tradeNames).toContainText("Known trade names:");
    await expect(header.tradeNameChips).toHaveCount(VISIBLE_CHIPS);
    await expect(header.tradeNameChips.filter({ hasText: /^Herceptin$/ })).toHaveCount(1);

    await header.tradeNamesToggle.click();
    await expect(header.tradeNamesToggle).toHaveText("[ hide ]");
    await expect.poll(() => header.tradeNameChips.count()).toBeGreaterThan(VISIBLE_CHIPS);

    await header.tradeNamesToggle.click();
    await expect(header.tradeNameChips).toHaveCount(VISIBLE_CHIPS);
  });

  test("a drug with four synonyms and no trade names has no toggle and no trade-name box", async ({
    page,
    testConfig,
  }) => {
    const { sparse } = drugIds(testConfig);
    const header = new DrugHeader(page);
    const drugPage = new DrugPage(page);
    await drugPage.goto(sparse);
    await expect(header.moleculeType).toBeVisible();
    await expect(header.synonymChips).toHaveText([
      "XL-092 FUMARATE",
      "XL092 fumarate",
      "Zanzalintinib fumarate",
      "Zanzalintinib hemifumarate",
    ]);
    await expect(header.synonymsToggle).toHaveCount(0);
    await expect(header.tradeNames).toHaveCount(0);
  });

  test("a drug with a single trade name has no trade-name toggle", async ({ page, testConfig }) => {
    const { smallMolecule } = drugIds(testConfig);
    const header = new DrugHeader(page);
    const drugPage = new DrugPage(page);
    await drugPage.goto(smallMolecule);
    await expect(header.title).toHaveText(drugFacts(smallMolecule).name);
    await expect(header.tradeNameChips).toHaveText(["Choice"]);
    await expect(header.tradeNamesToggle).toHaveCount(0);
    await expect(header.synonymsToggle).toHaveText("... [ show more ]");
  });

  test("a small molecule shows its chemical structure, which enlarges and closes", async ({
    page,
    testConfig,
  }) => {
    const { smallMolecule } = drugIds(testConfig);
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(smallMolecule);
    const src = `https://www.ebi.ac.uk/chembl/api/data/image/${smallMolecule}.svg`;

    await test.step("the thumbnail loads from ChEMBL", async () => {
      await expect(header.structureButton, "enabled once the image has loaded").toBeEnabled();
      await expect(header.structureImage).toHaveAttribute("src", src);
      await expect(header.structureImage).toHaveAttribute(
        "alt",
        `Chemical structure of ${smallMolecule}`
      );
      await expect
        .poll(() => header.structureImage.evaluate((img: HTMLImageElement) => img.naturalWidth), {
          message: "the structure image should have decoded",
        })
        .toBeGreaterThan(0);
      await expect(header.structureButton.locator(".MuiSkeleton-root")).toHaveCount(0);
    });

    await test.step("clicking it opens the enlarged structure", async () => {
      await header.structureButton.click();
      await expect(header.structureModal).toBeVisible();
      const enlarged = header.structureModal.getByRole("img", {
        name: `Chemical structure of ${smallMolecule}`,
      });
      await expect(enlarged).toHaveAttribute("src", src);
      const thumbnail = await header.structureButton.boundingBox();
      const modal = await header.structureModal.boundingBox();
      expect(modal?.width ?? 0, "the enlarged view is larger than the thumbnail").toBeGreaterThan(
        thumbnail?.width ?? Number.POSITIVE_INFINITY
      );
    });

    await test.step("the close button dismisses it", async () => {
      await header.structureModal.getByRole("button", { name: "Close" }).click();
      await expect(header.structureModal).toBeHidden();
    });

    await test.step("Escape dismisses it too", async () => {
      await header.structureButton.click();
      await expect(header.structureModal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(header.structureModal).toBeHidden();
    });
  });

  test("a biologic has no chemical structure box", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(primary);

    await expect(header.moleculeType).toHaveText(
      `Molecule type: ${drugFacts(primary).moleculeType}`
    );
    await expect(header.synonymChips).toHaveCount(VISIBLE_CHIPS);
    // ChEMBL answers 404 for the image of an antibody, and the box is dropped.
    await expect(header.structureButton).toHaveCount(0);
    await expect(header.profile.locator(".MuiSkeleton-root")).toHaveCount(0);
  });

  test("the parent molecule link opens the parent, whose child link leads back", async ({
    page,
    testConfig,
  }) => {
    const { withParentMolecule } = drugIds(testConfig);
    const facts = drugFacts(withParentMolecule);
    const parent = facts.parent;
    if (!parent) throw new Error(`${withParentMolecule} must have a recorded parent molecule`);
    const header = new DrugHeader(page);
    await new DrugPage(page).goto(withParentMolecule);

    await header.parentMolecule.getByRole("link", { name: parent.name }).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${parent.id}$`));
    await expect(header.title).toHaveText(parent.name);
    await expect(header.externalLinks.getByRole("link").first()).toHaveText(parent.id);
    await expect(
      header.structureImage,
      "the structure is replaced with the parent's, not kept from the previous drug"
    ).toHaveAttribute("src", `https://www.ebi.ac.uk/chembl/api/data/image/${parent.id}.svg`);
    await expect(header.parentMolecule).toHaveCount(0);

    await header.childMolecules.getByRole("link", { name: facts.name }).click();
    await expect(page).toHaveURL(new RegExp(`/drug/${withParentMolecule}$`));
    await expect(header.title).toHaveText(facts.name);
    await expect(header.parentMolecule).toHaveText(`Parent molecule: ${parent.name}`);
  });
});

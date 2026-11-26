import type { Locator } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import {
  ENTITY_ROUTE_PATTERN,
  entityRoute,
  SEARCH,
  SEARCH_ENTITIES,
  type SearchEntity,
} from "../../../POM/page/search/searchData";
import {
  expectEntityPage,
  expectPath,
  FILTER_LABEL,
  RESULTS_PER_PAGE,
  SearchPage,
  searchPath,
} from "../../../POM/page/search/searchPage";

/**
 * The search results page, /search?q=&page=&entities=: what it renders for a term, the
 * result card of each entity type and the top hit card of each entity type.
 * Filters, pagination and the URL are in searchNavigation.spec.ts.
 */

const STUDY_META = /Study type: \S+ • Credible sets count: [\d,]+ • Sample size: [\d,]+/;

/**
 * Every card on the page is of this entity type, is titled by a link to an entity of
 * that type, and says what in the entity matched the term.
 */
async function expectCardsOf(results: SearchPage, entity: SearchEntity, count: number): Promise<void> {
  await expect(results.cardsOf(entity), `every result should be a ${entity} card`).toHaveCount(count);
  await expect(results.cards, `only ${entity} cards should be listed`).toHaveCount(count);
  const hrefs = await results.cardHrefs();
  expect(hrefs).toHaveLength(count);
  for (const href of hrefs) expect(href, `${entity} card link`).toMatch(ENTITY_ROUTE_PATTERN[entity]);
  expect(new Set(hrefs).size, "each result should be a different entity").toBe(count);
  for (let index = 0; index < count; index++) {
    const card = results.cards.nth(index);
    await expect(card.locator("> a"), `card ${index + 1} should be titled`).not.toBeEmpty();
    await expect(card, `card ${index + 1} should say what matched`).toContainText("Matches:");
    await expect(results.highlights(card).locator("em").first()).not.toBeEmpty();
  }
}

/** The title link of a card (or of the top hit card) names the entity and leads to its page. */
async function expectTitleLink(link: Locator, text: string | RegExp, href: string): Promise<void> {
  await expect(link).toHaveText(text);
  await expect(link).toHaveAttribute("href", href);
}

test.describe("Search results page", () => {
  test("lists the results for a term with the total, the entity filters, pagination and the top hit @smoke", async ({
    page,
  }) => {
    const results = new SearchPage(page);
    await results.goto({ q: SEARCH.disease.term });
    const total = await results.total(SEARCH.disease.term);
    expect(total).toBeGreaterThan(RESULTS_PER_PAGE);

    await test.step("the entity filters are listed in order with counts that add up to the total", async () => {
      await expect(results.filters.getByRole("checkbox")).toHaveCount(SEARCH_ENTITIES.length);
      const labels = await results.filters.locator("label").allInnerTexts();
      expect(labels.map((label) => label.trim().replace(/ \(\d+\)$/, ""))).toEqual(
        SEARCH_ENTITIES.map((entity) => FILTER_LABEL[entity])
      );
      let sum = 0;
      for (const entity of SEARCH_ENTITIES) {
        await expect(results.filter(entity)).not.toBeChecked();
        sum += await results.filterCount(entity);
      }
      expect(sum, "the entity counts should add up to the total").toBe(total);
      expect(await results.filterCount("disease")).toBeGreaterThan(0);
    });

    await test.step("the first page lists ten results between two pagination bars", async () => {
      await expect(results.cards).toHaveCount(RESULTS_PER_PAGE);
      await results.expectRange(1, RESULTS_PER_PAGE, total);
      await expect(results.previousButton("top")).toBeDisabled();
      await expect(results.nextButton("top")).toBeEnabled();
      await expect(results.previousButton("bottom")).toBeDisabled();
      await expect(results.nextButton("bottom")).toBeEnabled();
    });

    await test.step("the best match comes first and is detailed in the top hit card", async () => {
      await expectTitleLink(
        results.cards.first().locator("> a"),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.disease.id)
      );
      await expectTitleLink(
        results.topHitDetail("disease").getByRole("link").first(),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.disease.id)
      );
    });

    await expect(results.noResults).toHaveCount(0);
  });

  test("a target term renders target results and the target top hit", async ({ page }) => {
    const results = new SearchPage(page);
    await results.goto({ q: SEARCH.target.term });
    const total = await results.total(SEARCH.target.term);
    expect(total).toBeGreaterThan(0);
    expect(await results.filterCount("target")).toBeGreaterThan(0);

    await expect(results.cards).toHaveCount(Math.min(total, RESULTS_PER_PAGE));
    const first = results.cards.first();
    await expect(first).toHaveAttribute("data-testid", "search-result-target");
    await expectTitleLink(
      first.locator("> a"),
      SEARCH.target.symbol,
      entityRoute("target", SEARCH.target.id)
    );
    await expect(results.topHitDetail("target")).toContainText(SEARCH.target.symbol);
  });

  test.describe("result cards", () => {
    test("target: symbol linking to the target's associations, its function description and the match", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.target.term, entities: ["target"] });
      const total = await results.total(SEARCH.target.term);
      expect(total).toBe(await results.filterCount("target"));
      await expectCardsOf(results, "target", Math.min(total, RESULTS_PER_PAGE));

      const first = results.cardsOf("target").first();
      await expectTitleLink(
        first.locator("> a"),
        SEARCH.target.symbol,
        entityRoute("target", SEARCH.target.id)
      );
      await expect(first.getByTestId("target-description-text")).not.toBeEmpty();
      await expect(results.highlights(first)).toContainText(SEARCH.target.symbol);
    });

    test("disease: name linking to the disease's associations, its description and the match", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["disease"] });
      await expectCardsOf(results, "disease", RESULTS_PER_PAGE);

      const first = results.cardsOf("disease").first();
      await expectTitleLink(
        first.locator("> a"),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.disease.id)
      );
      await expect(first).toContainText(SEARCH.disease.descriptionStart);
      await expect(results.highlights(first)).toContainText(/asthma/i);
    });

    test("drug: name linking to the drug page, its description and the match", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.drug.term, entities: ["drug"] });
      const total = await results.total(SEARCH.drug.term);
      expect(total).toBe(await results.filterCount("drug"));
      await expectCardsOf(results, "drug", Math.min(total, RESULTS_PER_PAGE));

      const first = results.cardsOf("drug").first();
      await expectTitleLink(first.locator("> a"), SEARCH.drug.name, entityRoute("drug", SEARCH.drug.id));
      await expect(first).toContainText(SEARCH.drug.descriptionStart);
      await expect(results.highlights(first)).toContainText(/aspirin/i);
    });

    test("variant: id linking to the variant page, its description, rsID and the match", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.variant.term, entities: ["variant"] });
      await expectCardsOf(results, "variant", RESULTS_PER_PAGE);

      const first = results.cardsOf("variant").first();
      await expectTitleLink(
        first.locator("> a"),
        SEARCH.variant.id,
        entityRoute("variant", SEARCH.variant.id)
      );
      await expect(first).toContainText(SEARCH.variant.descriptionStart);
      await expect(first).toContainText(`Ensembl: ${SEARCH.variant.rsId}`);
      await expect(results.highlights(first)).toHaveText(SEARCH.variant.rsId);
    });

    test("study: trait linking to the study page, study facts and the publication", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["study"] });
      await expectCardsOf(results, "study", RESULTS_PER_PAGE);
      for (let index = 0; index < RESULTS_PER_PAGE; index++) {
        await expect(results.cards.nth(index), `study card ${index + 1}`).toContainText(STUDY_META);
      }

      const study = results.cardsOf("study").filter({
        has: page.locator(`a[href="${entityRoute("study", SEARCH.study.id)}"]`),
      });
      await expect(study).toHaveCount(1);
      await expect(study.locator("> a")).toHaveText(SEARCH.study.trait);
      await expect(study).toContainText("Study type: GWAS");
      await expect(study).toContainText(SEARCH.study.publication);
    });

    test("molQTL study: names the gene and the cell or tissue it affects", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.molQtlGene.term, entities: ["study"] });
      await expectCardsOf(results, "study", RESULTS_PER_PAGE);

      const first = results.cardsOf("study").first();
      await expect(first).toContainText(STUDY_META);
      await expect(first).toContainText(`Affected gene: ${SEARCH.molQtlGene.symbol}`);
      await expect(first).toContainText(/Affected cell\/tissue: \S+/);
    });

    test("a long description is clipped until show more is clicked", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["disease"] });
      const first = results.cardsOf("disease").first();
      await expect(first.locator("> a")).toHaveText(SEARCH.disease.name);

      const toggle = first.getByText("show more", { exact: true });
      await expect(toggle).toBeVisible();
      const clipped = await first.boundingBox();
      await toggle.click();
      await expect(first.getByText("hide", { exact: true })).toBeVisible();
      await expect(toggle).toHaveCount(0);
      await expect
        .poll(async () => (await first.boundingBox())?.height, {
          message: "the card should grow to show the whole description",
        })
        .toBeGreaterThan(clipped?.height as number);

      await first.getByText("hide", { exact: true }).click();
      await expect(first.getByText("show more", { exact: true })).toBeVisible();
    });

    test("more lists every match of a result and hide returns to the first one", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["disease"] });
      const first = results.cardsOf("disease").first();
      await expect(first.locator("> a")).toHaveText(SEARCH.disease.name);
      const matches = results.highlights(first);
      await expect(matches.locator(".separator")).toHaveCount(0);
      const firstMatch = await matches.innerText();
      expect(firstMatch).toMatch(/asthma/i);

      await first.getByText("more", { exact: true }).click();
      await expect(matches.locator(".separator").first()).toBeVisible();
      await expect(matches).toContainText(firstMatch);

      // The description of this card has its own hide control only after "show more".
      await first.getByText("hide", { exact: true }).click();
      await expect(matches.locator(".separator")).toHaveCount(0);
      await expect(matches).toHaveText(firstMatch);
    });

    test("a result link opens the entity's page, and back returns to the same results", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["disease"] });
      const before = await results.cardHrefs();

      await results.cardsOf("disease").first().locator("> a").click();
      await expectEntityPage(page, "disease", SEARCH.disease.id, SEARCH.disease.name);

      await page.goBack();
      await expectPath(page, searchPath({ q: SEARCH.disease.term, entities: ["disease"] }));
      await results.expectResultsFor(SEARCH.disease.term);
      expect(await results.cardHrefs()).toEqual(before);
      await expect(results.filter("disease")).toBeChecked();
    });
  });

  test.describe("top hit card", () => {
    test("target: symbol, approved name, description, biotype and UniProt accession", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.target.term });
      const card = results.topHitDetail("target");

      await expectTitleLink(
        card.getByRole("link").first(),
        SEARCH.target.symbol,
        entityRoute("target", SEARCH.target.id)
      );
      await expect(card).toContainText(SEARCH.target.name);
      await expect(card.getByText("Target", { exact: true })).toBeVisible();
      await expect(card.getByTestId("target-description-text")).not.toBeEmpty();
      await expect(card).toContainText(`Biotype${SEARCH.target.biotype}`);
      await expect(card).toContainText(`UniProt accession${SEARCH.target.uniprotAccession}`);
    });

    test("disease: name, description and therapeutic areas linking to their pages", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term });
      const card = results.topHitDetail("disease");

      await expectTitleLink(
        card.getByRole("link").first(),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.disease.id)
      );
      await expect(card.getByText("Disease or phenotype", { exact: true })).toBeVisible();
      await expect(card).toContainText(SEARCH.disease.descriptionStart);
      await expect(card).toContainText("Therapeutic areas");
      const area = card.getByRole("link", { name: SEARCH.disease.therapeuticArea.name, exact: true });
      await expect(area).toHaveAttribute("href", `/disease/${SEARCH.disease.therapeuticArea.id}`);
      const areaHrefs = await card
        .getByRole("link")
        .evaluateAll((links) => links.slice(1).map((link) => link.getAttribute("href") ?? ""));
      expect(areaHrefs.length).toBeGreaterThan(0);
      for (const href of areaHrefs) expect(href).toMatch(/^\/disease\/[A-Za-z]+_\d+$/);
    });

    test("drug: name, description, drug type, maximum clinical stage and indications", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.drug.term });
      const card = results.topHitDetail("drug");

      await expectTitleLink(
        card.getByRole("link").first(),
        SEARCH.drug.name,
        entityRoute("drug", SEARCH.drug.id)
      );
      await expect(card.getByText("Drug", { exact: true })).toBeVisible();
      await expect(card).toContainText(SEARCH.drug.descriptionStart);
      await expect(card).toContainText(`Drug Type${SEARCH.drug.drugType}`);
      await expect(card).toContainText(`Maximum Clinical Stage${SEARCH.drug.maximumClinicalStage}`);
      await expect(card).toContainText("Indications");
      const indications = card.locator("a[href^='/disease/']");
      await expect(indications.first()).not.toBeEmpty();
      await expect(indications.first()).toHaveAttribute("href", /^\/disease\/[A-Za-z]+_\d+$/);
      await expect(card).toContainText("Synonyms");
      await expect(card).toContainText("Trade names");
    });

    test("variant: id, description, rsID, location, alleles and most severe consequence", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.variant.term });
      const card = results.topHitDetail("variant");

      await expectTitleLink(
        card.getByRole("link").first(),
        SEARCH.variant.id,
        entityRoute("variant", SEARCH.variant.id)
      );
      await expect(card.getByText("Variant", { exact: true })).toBeVisible();
      await expect(card).toContainText(SEARCH.variant.descriptionStart);
      await expect(card).toContainText(`Ensembl${SEARCH.variant.rsId}`);
      await expect(card).toContainText(`GRCh38${SEARCH.variant.location}`);
      await expect(card).toContainText(`Reference Allele${SEARCH.variant.referenceAllele}`);
      await expect(card).toContainText(`Alternate Allele${SEARCH.variant.alternateAllele}`);
      await expect(card).toContainText(
        `Most Severe Consequence${SEARCH.variant.mostSevereConsequence}`
      );
    });

    test("study: the study is the first result and no other entity's detail is shown for it", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.study.term });

      const first = results.cards.first();
      await expect(first).toHaveAttribute("data-testid", "search-result-study");
      await expectTitleLink(
        first.locator("> a"),
        SEARCH.study.trait,
        entityRoute("study", SEARCH.study.id)
      );
      await expect(first).toContainText(SEARCH.study.publication);
      await expect(results.highlights(first)).toHaveText(SEARCH.study.id);
      await expectTitleLink(
        results.cardsOf("disease").locator("> a"),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.study.diseaseId)
      );
      // There is no detail card for studies: the top hit card must not detail anything else.
      await expect(results.topHit).toBeAttached();
      await expect(results.topHit.locator("[data-testid^='search-top-hit-']")).toHaveCount(0);
    });

    test("follows the entity filter: filtering to another type details that type's best match", async ({
      page,
    }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.study.term, entities: ["disease"] });

      await expect(results.cardsOf("disease")).toHaveCount(1);
      await expectTitleLink(
        results.topHitDetail("disease").getByRole("link").first(),
        SEARCH.disease.name,
        entityRoute("disease", SEARCH.study.diseaseId)
      );
    });

    test("a therapeutic area link opens that disease's page", async ({ page }) => {
      const results = new SearchPage(page);
      await results.goto({ q: SEARCH.disease.term, entities: ["disease"] });

      await results
        .topHitDetail("disease")
        .getByRole("link", { name: SEARCH.disease.therapeuticArea.name, exact: true })
        .click();
      await expectPath(page, `/disease/${SEARCH.disease.therapeuticArea.id}`);
      await expect(page.getByTestId("profile-page-header-text")).toHaveText(
        SEARCH.disease.therapeuticArea.name
      );
    });
  });

  test("a term that matches nothing shows the no-results guidance and zero counts", async ({ page }) => {
    const results = new SearchPage(page);
    await results.goto({ q: SEARCH.noMatch });

    await expect(results.heading).toHaveText(`0 results for "${SEARCH.noMatch}"`);
    for (const entity of SEARCH_ENTITIES) {
      expect(await results.filterCount(entity), `${entity} count`).toBe(0);
      await expect(results.filter(entity)).not.toBeChecked();
    }
    await expect(results.results).toHaveCount(0);
    await expect(results.topHit).toHaveCount(0);

    const message = results.noResults;
    await expect(message).toContainText(
      `We could not find a match in the Platform for "${SEARCH.noMatch}"`
    );
    await expect(message).toContainText(
      "Note that you can only search for: targets, diseases/phenotypes, drugs, variants, or studies."
    );
    await expect(message.getByRole("listitem")).toHaveText([
      "Checking for any accidentally misspelt terms",
      "Broadening your search by using more general terms",
      "Searching for a therapeutic area and refining from there",
    ]);
    await expect(message.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org"
    );
    await expect(message.getByRole("link", { name: "Open Targets Community" })).toHaveAttribute(
      "href",
      "https://community.opentargets.org"
    );
  });
});

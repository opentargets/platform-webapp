import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { TargetPage } from "../../../POM/page/target";
import { expectSections } from "../../../utils/sections";

/**
 * opentargets/issues#4470: Target Enabling Packages (TEPs) were dropped. The API no longer
 * has `Target.tep` or the `hasTEP` prioritisation flag, and the target page header no longer
 * flags or links a TEP ("Target Enabling Package: <name>", a link to thesgc.org/tep).
 *
 * These targets are SGC TEP targets, so the old page showed the TEP flag for them. The
 * release the TEP list came from no longer exists to confirm that, which is why the tests
 * assert what must be gone and that nothing around it broke.
 */
const TEP_TARGETS = [
  { ensgId: "ENSG00000196363", symbol: "WDR5", name: "WD repeat domain 5", uniprotId: "P61964" },
  { ensgId: "ENSG00000156802", symbol: "ATAD2", name: "ATPase family AAA domain containing 2", uniprotId: "Q6PL18" },
] as const;

const TEP_TEXT = /Target Enabling Package|\bTEPs?\b/i;
const TEP_QUERY = /\btep\b|\bhasTEP\b/i;

/** The query text and variables of every GraphQL request the page sends, which the monitor does not keep. */
function recordQueries(page: Page): string[] {
  const queries: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const body = request.postData() ?? "";
    if (!body.includes('"query"')) return;
    queries.push(body);
  });
  return queries;
}

test.describe("Target page: no Target Enabling Package", () => {
  for (const { ensgId, symbol, name, uniprotId } of TEP_TARGETS) {
    test(`${symbol}: the header and the profile render with no TEP link, chip or text`, async ({ page }) => {
      const target = new TargetPage(page);
      await target.goto(ensgId);

      await test.step("the header is intact: names, and the four cross-references only", async () => {
        await expect(target.symbol).toHaveText(symbol);
        await expect(target.name).toHaveText(name);
        await expect(target.externalLinks.getByRole("link")).toHaveText([ensgId, uniprotId, symbol, symbol]);
        await expect(target.externalLinks).toHaveText(
          new RegExp(`^Ensembl:\\s*${ensgId}\\s*UniProt:\\s*${uniprotId}\\s*GeneCards:\\s*${symbol}\\s*HGNC:\\s*${symbol}$`)
        );
      });

      await test.step("the profile renders every expected section, none broken", async () => {
        await expectSections(page, expectedSectionsFor(ensgId));
      });

      await test.step("nothing on the page mentions a TEP or links to one", async () => {
        await expect(target.header, "header text").not.toContainText(TEP_TEXT);
        await expect(page.locator("body"), "page text").not.toContainText(TEP_TEXT);
        await expect(page.locator("a[href*='thesgc.org']"), "links to the SGC").toHaveCount(0);
      });
    });

    test(`${symbol}: the page asks the API nothing about a TEP and gets nothing back`, async ({
      page,
      graphqlMonitor,
    }) => {
      const queries = recordQueries(page);
      await new TargetPage(page).goto(ensgId);
      await expectSections(page, expectedSectionsFor(ensgId));
      await graphqlMonitor.settle();

      expect(queries.length, "the page should have issued GraphQL queries").toBeGreaterThan(0);
      expect(
        graphqlMonitor.operationNames(),
        "the page should have asked for the target and its profile"
      ).toContain("TargetPageQuery");
      expect(
        queries.filter((query) => TEP_QUERY.test(query)),
        "no GraphQL request may ask for tep or hasTEP"
      ).toEqual([]);
      for (const operation of graphqlMonitor.operations()) {
        expect(
          JSON.stringify(operation.data ?? null),
          `${operation.name} should not return a TEP`
        ).not.toMatch(/"(tep|hasTEP)"/i);
      }
    });
  }
});

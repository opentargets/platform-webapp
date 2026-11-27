import { expect, test } from "../../fixtures";
import { expectedSectionsFor } from "../../fixtures/expectedSections";
import { stubEuropePmc } from "../../POM/objects/widgets/shared/sectionDataControls";
import type { TestConfig } from "../../types";
import { expectSections } from "../../utils/sections";

/**
 * All-routes health sweep. One test per route of the app. The pageHealth guard fails a
 * test on any uncaught exception, console error, GraphQL error, failed request or error
 * UI; the assertions here prove the page actually rendered what it should: its header
 * and, for profile pages, exactly the sections its entity has data for.
 */
test.describe("Route health sweep", () => {
  // Bibliography sections ask Europe PMC, a third party that throttles: stub it so the
  // sweep depends only on the app and its API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  type DeepRequired<T> = T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> } : T;
  type Config = DeepRequired<TestConfig>;
  type Profile = {
    kind: string;
    id: string;
    header: (config: Config) => string | RegExp | undefined;
  };

  // One entry per entity id in fixtures/testConfig.ts. The ids come from the resolved
  // config, so a run against another scenario sweeps that scenario's entities.
  const profiles: { title: string; get: (c: Config) => Profile }[] = [
    {
      title: "drug primary",
      get: (c) => ({ kind: "drug", id: c.drug.primary, header: () => undefined }),
    },
    ...(
      [
        "smallMolecule",
        "withParentMolecule",
        "withManyWarnings",
        "withMultipleMechanisms",
        "withNonHumanTarget",
        "sparse",
      ] as const
    ).map((role) => ({
      title: `drug ${role}`,
      get: (c: Config): Profile => ({
        kind: "drug",
        id: c.drug.alternatives[role],
        header: () => undefined,
      }),
    })),
    {
      title: "target primary",
      get: (c) => ({ kind: "target", id: c.target.primary, header: () => "BRAF" }),
    },
    {
      title: "target alternative",
      get: (c) => ({ kind: "target", id: c.target.alternatives[0], header: () => undefined }),
    },
    {
      title: "disease primary",
      get: (c) => ({
        kind: "disease",
        id: c.disease.primary,
        header: (x) => new RegExp(x.disease.name, "i"),
      }),
    },
    {
      title: "disease alternative",
      get: (c) => ({ kind: "disease", id: c.disease.alternatives[0], header: () => undefined }),
    },
    {
      title: "variant primary",
      get: (c) => ({ kind: "variant", id: c.variant.primary, header: () => undefined }),
    },
    {
      title: "variant with molecular structure",
      get: (c) => ({
        kind: "variant",
        id: c.variant.withMolecularStructure,
        header: () => undefined,
      }),
    },
    {
      title: "variant with pharmacogenomics",
      get: (c) => ({
        kind: "variant",
        id: c.variant.withPharmacogenomics,
        header: () => undefined,
      }),
    },
    {
      title: "GWAS study",
      get: (c) => ({
        kind: "study",
        id: c.study.gwas.primary,
        header: (x) => x.study.gwas.primary,
      }),
    },
    {
      title: "QTL study",
      get: (c) => ({ kind: "study", id: c.study.qtl.primary, header: (x) => x.study.qtl.primary }),
    },
    {
      title: "GWAS credible set",
      get: (c) => ({ kind: "credible-set", id: c.credibleSet.primary, header: () => undefined }),
    },
    {
      title: "QTL credible set",
      get: (c) => ({ kind: "credible-set", id: c.credibleSet.qtl, header: () => undefined }),
    },
  ];

  for (const { title, get } of profiles) {
    test(`${title} profile renders its header and exact sections @smoke`, async ({
      page,
      testConfig,
    }) => {
      const config = testConfig as Config;
      const profile = get(config);
      expect(profile.id, `the test config should define the ${title}`).toEqual(expect.any(String));
      await page.goto(`/${profile.kind}/${profile.id}`);

      const header = page.getByTestId("profile-page-header-text");
      await expect(header).toBeVisible();
      const expectedHeader = profile.header(config);
      if (expectedHeader) await expect(header).toContainText(expectedHeader);
      else await expect(header).not.toBeEmpty();

      await expectSections(page, expectedSectionsFor(profile.id));
    });
  }

  test("target associations tab lists associated diseases @smoke", async ({ page, testConfig }) => {
    await page.goto(`/target/${(testConfig as Config).target.primary}/associations`);
    await expect(page.getByTestId("profile-page-header-text")).toContainText("BRAF");
    await expect(page.getByRole("tab", { name: /associated diseases/i })).toBeVisible();
    await expect(page.getByTestId("associations-table")).toBeVisible();
    const firstRow = page.getByTestId("table-row-core-0");
    await expect(firstRow, "the table should have data rows").toBeVisible();
    await expect(firstRow.getByTestId("name-cell")).not.toBeEmpty();
  });

  test("disease associations tab lists associated targets @smoke", async ({ page, testConfig }) => {
    await page.goto(`/disease/${testConfig.disease.primary}/associations`);
    await expect(page.getByTestId("profile-page-header-text")).toContainText(
      new RegExp((testConfig as Config).disease.name, "i")
    );
    await expect(page.getByRole("tab", { name: /associated targets/i })).toBeVisible();
    await expect(page.getByTestId("associations-table")).toBeVisible();
    const firstRow = page.getByTestId("table-row-core-0");
    await expect(firstRow, "the table should have data rows").toBeVisible();
    await expect(firstRow.getByTestId("name-cell")).not.toBeEmpty();
  });

  test("evidence page shows the target-disease evidence sections @smoke", async ({ page }) => {
    // The literature evidence table also asks Europe PMC with a GET search, which throttles
    // without CORS headers. Answer it so the test depends only on the app and its API.
    await page.route("https://www.ebi.ac.uk/europepmc/webservices/rest/search?*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hitCount: 0, resultList: { result: [] } }),
      })
    );
    await page.goto("/evidence/ENSG00000157764/MONDO_0005105");
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(
      /^Evidence for BRAF in melanoma$/i
    );
    // The sections this target-disease pair has evidence for (data release 26.12).
    await expectSections(page, [
      "eva",
      "cancer-gene-census",
      "intogen",
      "eva-somatic",
      "clinical-precedence",
      "crispr",
      "cancer-biomarkers",
      "europe-pmc",
    ]);
  });

  test("search results for BRAF render result cards @smoke", async ({ page }) => {
    await page.goto("/search?q=BRAF&page=1");
    await expect(page.getByTestId("search-results-heading")).toHaveText(
      /^[1-9][\d,]* results for "BRAF"$/
    );
    await expect(page.getByTestId("search-filters")).toBeVisible();
  });

  test("downloads page shows its title and datasets @smoke", async ({ page }) => {
    await page.goto("/downloads");
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".MuiSkeleton-root")).toHaveCount(0);
  });

  test("api page shows the playground @smoke", async ({ page }) => {
    await page.goto("/api");
    await expect(page.getByText("API", { exact: true }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /GraphQL API documentation/i })).toBeVisible();
  });

  test("metrics page shows its title and metric cards @smoke", async ({ page }) => {
    await page.goto("/metrics");
    await expect(page.getByTestId("metrics-page-title")).toBeVisible();
    await expect(page.getByTestId("metrics-card-value").first()).toBeVisible();
  });

  test("home page shows the search box and about section @smoke", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "About the Open Targets Platform" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Get started with the Platform" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Search\.\.\./ }).first()).toBeVisible();
  });
});

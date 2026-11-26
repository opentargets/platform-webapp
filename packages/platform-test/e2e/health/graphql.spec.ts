import type { TestConfig } from "../../types";
import { expect, test } from "../../fixtures";
import { stubEuropePmc } from "../../POM/objects/widgets/shared/sectionDataControls";
import { expectedSectionsFor } from "../../fixtures/expectedSections";
import { expectAllSectionsSettled, expectSections } from "../../utils/sections";

/**
 * What each route asks the API for on a plain load.
 *
 * The page health guard already fails any test on a GraphQL error or a non-2xx answer.
 * These tests check what the guard cannot see: that the page issued the queries it must
 * (a route that silently stops asking renders an empty page without any error), that the
 * root entity came back (a null entity renders the 404 or nothing), and that no query is
 * issued more than twice with identical variables (a render loop or a lost cache).
 */

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`the test config has no "${name}" entity`);
  return value;
}

type Route = {
  name: string;
  path: (config: TestConfig) => string;
  /** Operations that must be issued, with the root field of the response that must not be null. */
  root: { operation: string; field: string }[];
  /** Further operations the route issues for its sections. */
  also: string[];
  /** Profile pages mount the sections the entity has data for: the id to look them up by. */
  sectionsOf?: (config: TestConfig) => string;
  /** Association pages: the field of the root entity that must hold rows. */
  rowsField?: string;
};

const ROUTES: Route[] = [
  {
    name: "target profile",
    path: (c) => `/target/${required(c.target, "target").primary}`,
    root: [
      { operation: "TargetPageQuery", field: "target" },
      { operation: "TargetProfileQuery", field: "target" },
    ],
    also: ["DataVersion", "TargetDrugsQuery", "TargetBibliographyQuery"],
    sectionsOf: (c) => required(required(c.target, "target").primary, "target.primary"),
  },
  {
    name: "target associations",
    path: (c) => `/target/${required(c.target, "target").primary}/associations`,
    root: [
      { operation: "TargetPageQuery", field: "target" },
      { operation: "TargetAssociationsQuery", field: "target" },
    ],
    also: ["DataVersion"],
    rowsField: "associatedDiseases",
  },
  {
    name: "disease profile",
    path: (c) => `/disease/${c.disease.primary}`,
    root: [
      { operation: "DiseasePageQuery", field: "disease" },
      { operation: "DiseaseProfileQuery", field: "disease" },
    ],
    also: ["DataVersion", "OntologyQuery", "drugsQuery", "GWASStudiesQuery", "DiseaseBibliographyQuery"],
    sectionsOf: (c) => c.disease.primary,
  },
  {
    name: "disease associations",
    path: (c) => `/disease/${c.disease.primary}/associations`,
    root: [
      { operation: "DiseasePageQuery", field: "disease" },
      { operation: "DiseaseAssociationsQuery", field: "disease" },
    ],
    also: ["DataVersion"],
    rowsField: "associatedTargets",
  },
  {
    name: "drug profile",
    path: (c) => `/drug/${c.drug.primary}`,
    root: [
      { operation: "DrugPageQuery", field: "drug" },
      { operation: "DrugProfileQuery", field: "drug" },
    ],
    also: ["DataVersion", "MechanismsOfActionSectionQuery", "IndicationsQuery", "DrugBibliographyQuery"],
    sectionsOf: (c) => c.drug.primary,
  },
  {
    name: "variant profile",
    path: (c) => `/variant/${c.variant.primary}`,
    root: [
      { operation: "VariantPageQuery", field: "variant" },
      { operation: "VariantProfileQuery", field: "variant" },
    ],
    also: ["DataVersion", "VariantEffectQuery", "GWASCredibleSetsTableQuery", "VariantQTLCredibleSetsQuery"],
    sectionsOf: (c) => c.variant.primary,
  },
  {
    name: "GWAS study",
    path: (c) => `/study/${c.study.gwas.primary}`,
    root: [
      { operation: "StudyPageQuery", field: "study" },
      { operation: "StudyProfileQuery", field: "study" },
    ],
    also: ["DataVersion", "StudyGWASCredibleSetsQuery", "SharedTraitStudiesQuery"],
    sectionsOf: (c) => c.study.gwas.primary,
  },
  {
    name: "QTL study",
    path: (c) => `/study/${required(c.study.qtl, "study.qtl").primary}`,
    root: [
      { operation: "StudyPageQuery", field: "study" },
      { operation: "StudyProfileQuery", field: "study" },
    ],
    also: ["DataVersion", "StudyQTLCredibleSetsQuery"],
    sectionsOf: (c) => required(required(c.study.qtl, "study.qtl").primary, "study.qtl.primary"),
  },
  {
    name: "credible set",
    path: (c) => `/credible-set/${required(c.credibleSet, "credibleSet").primary}`,
    root: [
      { operation: "CredibleSetPageQuery", field: "credibleSet" },
      { operation: "CredibleSetProfileQuery", field: "credibleSet" },
    ],
    also: ["DataVersion", "VariantsQuery", "Locus2GeneQuery", "GWASColocQuery", "MolQTLColocQuery"],
    sectionsOf: (c) => required(required(c.credibleSet, "credibleSet").primary, "credibleSet.primary"),
  },
];

test.describe("GraphQL operations on page load", () => {
  // Bibliography sections ask Europe PMC, which throttles and then answers without CORS
  // headers. It is stubbed so these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  for (const route of ROUTES) {
    test(`${route.name}: issues its queries, gets its entity, repeats nothing`, async ({
      page,
      testConfig,
      graphqlMonitor,
    }) => {
      await page.goto(route.path(testConfig));

      // Wait on conditions, not time: every root query answered, then every section settled.
      for (const { operation } of route.root) {
        await expect
          .poll(
            async () => {
              await graphqlMonitor.settle();
              return graphqlMonitor.named(operation).filter((request) => request.data !== undefined).length;
            },
            { message: `${operation} should be issued and answered` }
          )
          .toBeGreaterThan(0);
      }
      if (route.sectionsOf) {
        // A page whose queries came back empty renders no sections: the manifest says which it must have.
        await expectSections(page, expectedSectionsFor(route.sectionsOf(testConfig)));
        await expectAllSectionsSettled(page);
      }
      await graphqlMonitor.settle();

      await test.step("every expected operation was issued", () => {
        const issued = graphqlMonitor.operationNames();
        const expected = [...route.root.map((root) => root.operation), ...route.also];
        for (const operation of expected) expect(issued, `${operation} was not issued`).toContain(operation);
      });

      await test.step("the root entity is in every root response", () => {
        for (const { operation, field } of route.root) {
          for (const request of graphqlMonitor.named(operation).filter((answered) => answered.data !== undefined)) {
            expect(request.errors, `${operation} errors`).toEqual([]);
            expect(request.data, `${operation} returned no data`).toBeTruthy();
            expect(
              (request.data as Record<string, unknown>)[field],
              `${operation} returned a null ${field}`
            ).not.toBeNull();
            expect((request.data as Record<string, unknown>)[field]).toBeTruthy();
          }
        }
      });

      if (route.rowsField) {
        const rowsField = route.rowsField;
        await test.step("the association query returned rows", () => {
          const answered = graphqlMonitor
            .named(route.root[1].operation)
            .filter((request) => request.data !== undefined);
          expect(answered.length).toBeGreaterThan(0);
          for (const request of answered) {
            const entity = (request.data as Record<string, Record<string, { count: number; rows: unknown[] }>>)[
              route.root[1].field
            ];
            expect(entity[rowsField].count).toBeGreaterThan(0);
            expect(entity[rowsField].rows.length).toBeGreaterThan(0);
          }
        });
      }

      await test.step("no identical request is issued more than twice", () => {
        expect(graphqlMonitor.repeatedRequests(2)).toEqual([]);
      });
    });
  }

  test("the home page asks only for the data version", async ({ page, graphqlMonitor }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect
      .poll(async () => {
        await graphqlMonitor.settle();
        return graphqlMonitor.named("DataVersion").filter((request) => request.data !== undefined).length;
      })
      .toBeGreaterThan(0);
    expect(graphqlMonitor.repeatedRequests(2)).toEqual([]);
  });
});

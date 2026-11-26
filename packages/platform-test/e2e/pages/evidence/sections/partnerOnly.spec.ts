import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { expectSections, sectionLocator } from "../../../../utils/sections";

/**
 * Open Targets CRISPR, ENCORE and Validation CRISPR are partner-only evidence sections.
 *
 * Two things keep them off the public site. The evidence page profile
 * (apps/platform/src/pages/EvidencePage/Profile.tsx) does not register them at all, because
 * the public API's Datasource enum lacks their datasources and asking for them would fail
 * the whole profile query. And the `platform` profile script (`/profiles/platform.js`) lists
 * them in `partnerEvidenceSectionIds` with `isPartnerPreview` false, which makes the sections
 * renderer drop any widget marked private. So the page must show none of them and must never
 * ask the API for their data.
 */
const PARTNER_SECTIONS = [
  { id: "ot_crispr", name: "Open Targets CRISPR", datasource: "ot_crispr" },
  { id: "encore", name: "Open Targets ENCORE", datasource: "encore" },
  { id: "ot_crispr_validation", name: "Open Targets Validation CRISPR", datasource: "ot_crispr_validation" },
] as const;

/** FGFR3 in cancer or benign tumor: a rich evidence page with fifteen public sections. */
const FGFR3_NEOPLASM = { ensgId: "ENSG00000068078", efoId: "MONDO_0045024" };

/** The text of every GraphQL request the page sends, collected from now on. */
function collectGraphqlRequests(page: Page): string[] {
  const bodies: string[] = [];
  page.on("request", (request) => {
    const body = request.postData();
    if (request.method() === "POST" && body?.includes('"query"')) bodies.push(body);
  });
  return bodies;
}

test.describe("Evidence page: partner-only sections", () => {
  test("the public profile lists the partner sections as private and has partner preview off", async ({
    page,
  }) => {
    await stubEuropePmc(page);
    await page.goto(`/evidence/${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}`);
    const profile = await page.evaluate(
      () =>
        (
          window as unknown as {
            configProfile: { isPartnerPreview: boolean; partnerEvidenceSectionIds: string[] };
          }
        ).configProfile
    );
    expect(profile.isPartnerPreview, "the public profile is not a partner preview").toBe(false);
    expect([...profile.partnerEvidenceSectionIds].sort()).toEqual(
      PARTNER_SECTIONS.map((section) => section.id).sort()
    );
  });

  test("a public evidence page renders none of them, and never asks the API for their data", async ({
    page,
  }) => {
    await stubEuropePmc(page);
    const requests = collectGraphqlRequests(page);
    await page.goto(`/evidence/${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}`);
    await expectSections(
      page,
      expectedSectionsFor(`${FGFR3_NEOPLASM.ensgId}/${FGFR3_NEOPLASM.efoId}`)
    );

    for (const section of PARTNER_SECTIONS) {
      await test.step(section.name, async () => {
        await expect(sectionLocator(page, section.id), `${section.name} should not render`).toHaveCount(0);
        await expect(
          page.getByText(section.name, { exact: false }),
          `${section.name} should not be named anywhere on the page`
        ).toHaveCount(0);
      });
    }

    // The same page does ask for its public evidence, so an empty list would prove nothing.
    expect(requests.some((body) => body.includes("reactome")), "the page asked for Reactome").toBe(true);
    for (const section of PARTNER_SECTIONS) {
      expect(
        requests.filter((body) => body.includes(section.datasource)),
        `no request should ask for the ${section.datasource} datasource`
      ).toEqual([]);
    }
    expect(
      requests.filter((body) => /OtCrispr|OTCrispr|OtEncore|OTEncore|OtValidation|OTValidation/.test(body)),
      "no request should run a partner section's query"
    ).toEqual([]);
  });

  test("a public evidence page of a pair with CRISPR screens still shows only the public CRISPR sections", async ({
    page,
  }) => {
    await stubEuropePmc(page);
    await page.goto("/evidence/ENSG00000130294/MONDO_0005559");
    await expectSections(page, expectedSectionsFor("ENSG00000130294/MONDO_0005559"));
    await expect(sectionLocator(page, "crispr_screen")).toBeVisible();
    for (const section of PARTNER_SECTIONS) {
      await expect(sectionLocator(page, section.id)).toHaveCount(0);
    }
  });
});

import { expect, test } from "../../../fixtures";
import { GeneBurdenSection } from "../../../POM/objects/widgets/Evidence/geneBurdenSection";
import { EvidencePage } from "../../../POM/page/evidence/evidence";

// Pinned: SETD1A / schizophrenia has one SCHEMA gene burden row whose evidence
// carries a browser link in `urls`
const TARGET = "ENSG00000099381"; // SETD1A
const DISEASE = "MONDO_0005090"; // schizophrenia
const SCHEMA_SOURCE = "SCHEMA2 (SCHEMA)";

test.describe("Evidence Page - Gene Burden section", () => {
  test("Cohort/Project links to the url from the evidence", { tag: "@smoke" }, async ({ page }) => {
    const geneBurden = new GeneBurdenSection(page);
    await new EvidencePage(page).goToEvidencePage(TARGET, DISEASE);
    await geneBurden.waitForLoad();

    await expect(geneBurden.getRowBySource(SCHEMA_SOURCE)).toBeVisible();
    await expect(geneBurden.getSourceLink(SCHEMA_SOURCE)).toHaveAttribute(
      "href",
      `https://schema.broadinstitute.org/gene/${TARGET}`
    );
  });
});

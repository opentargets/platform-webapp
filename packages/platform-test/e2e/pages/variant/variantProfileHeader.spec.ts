import { expect, test } from "../../../fixtures";
import { VariantProfileHeader } from "../../../POM/objects/components/VariantProfileHeader/variantProfileHeader";
import { VariantPage } from "../../../POM/page/variant/variant";
import {
  CROSS_REFERENCE_URL,
  POPULATIONS,
  VARIANTS,
  type VariantFacts,
} from "../../../POM/page/variant/variantData";

const HEADER_SCENARIOS: { name: string; facts: VariantFacts }[] = [
  { name: "intron variant", facts: VARIANTS.intron },
  { name: "missense variant with many ClinVar records", facts: VARIANTS.missense },
  { name: "missense variant with an OMIM entry", facts: VARIANTS.pharmacogenomic },
  { name: "long insertion", facts: VARIANTS.longInsertion },
  { name: "long deletion", facts: VARIANTS.longDeletion },
];

test.describe("Variant profile header", () => {
  for (const { name, facts } of HEADER_SCENARIOS) {
    test(`shows description, location, alleles and consequence (${name})`, async ({ page }) => {
      const variantPage = new VariantPage(page);
      const header = new VariantProfileHeader(page);
      await variantPage.goToVariantPage(facts.id);

      await expect(variantPage.title).toHaveText(facts.title);
      await expect(page).toHaveTitle(`${facts.id} profile page | Open Targets Platform`);

      await test.step("description", async () => {
        await expect(header.getVariantDescriptionField()).toContainText(facts.descriptionStart);
      });

      await test.step("GRCh38 location is chromosome and position", async () => {
        await expect(header.getGRCh38LocationField()).toHaveText(
          `GRCh38: ${facts.chromosome}:${facts.position}`
        );
      });

      await test.step("reference and alternate alleles", async () => {
        await expect(header.getReferenceAlleleField()).toContainText("Reference allele");
        await expect(header.getReferenceAlleleField()).toContainText(facts.referenceAllele);
        await expect(header.getAlternativeAlleleField()).toContainText(
          "Alternative allele (effect allele)"
        );
        await expect(header.getAlternativeAlleleField()).toContainText(facts.alternateAllele);
      });

      await test.step("most severe consequence links to its Sequence Ontology term", async () => {
        const link = header.getMostSevereConsequenceLink();
        await expect(link).toHaveText(facts.consequence);
        await expect(link).toHaveAttribute("href", `https://identifiers.org/SO:${facts.consequenceId}`);
      });
    });
  }

  test("a long alternate allele is shown whole in the header, a short one inline", async ({
    page,
  }) => {
    const header = new VariantProfileHeader(page);
    const variantPage = new VariantPage(page);
    await variantPage.goToVariantPage(VARIANTS.longInsertion.id);

    await expect(header.getAlternativeAlleleField()).toContainText(
      VARIANTS.longInsertion.alternateAllele
    );
    await expect(header.getReferenceAlleleField()).toHaveText("Reference allele: T");
    // The title abbreviates the 36 base allele instead of printing it.
    await expect(variantPage.title).not.toContainText(VARIANTS.longInsertion.alternateAllele);
  });

  test("population allele frequencies list every population with a valid frequency @smoke", async ({
    page,
  }) => {
    const header = new VariantProfileHeader(page);
    await new VariantPage(page).goToVariantPage(VARIANTS.intron.id);

    const plot = header.getAlleleFrequenciesSection();
    await expect(plot).toContainText("Population Allele Frequencies");
    await expect(plot.getByRole("link", { name: "gnomAD" })).toHaveAttribute(
      "href",
      "https://gnomad.broadinstitute.org/"
    );

    const bars = header.getAlleleFrequencyBars();
    await expect(bars).toHaveCount(POPULATIONS.length);

    await test.step("populations are alphabetical with Other last", async () => {
      const labels = await bars.evaluateAll((els) =>
        els.map((el) => el.children[0]?.textContent ?? "")
      );
      expect(labels).toEqual([...POPULATIONS]);
    });

    await test.step("each frequency is a fraction and the bar is as wide as it", async () => {
      const rows = await bars.evaluateAll((els) =>
        els.map((el) => ({
          value: el.children[2]?.textContent ?? "",
          width: (() => {
            const track = el.children[1] as HTMLElement;
            const fill = track.firstElementChild as HTMLElement;
            return `${(fill.getBoundingClientRect().width / track.getBoundingClientRect().width) * 100}%`;
          })(),
        }))
      );
      for (const row of rows) {
        expect(row.value).toMatch(/^(0|0\.\d+)$/);
        const fraction = Number(row.value);
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThan(1);
        expect(Number.parseFloat(row.width) / 100).toBeCloseTo(fraction, 2);
      }
    });
  });

  test("the missense variant shows the same populations", async ({ page }) => {
    const header = new VariantProfileHeader(page);
    await new VariantPage(page).goToVariantPage(VARIANTS.missense.id);
    await expect(header.getAlleleFrequencyBars()).toHaveCount(POPULATIONS.length);
  });

  test.describe("external links in the header", () => {
    for (const { name, facts } of HEADER_SCENARIOS) {
      test(`cross references link to the right records (${name})`, async ({ page }) => {
        const variantPage = new VariantPage(page);
        await variantPage.goToVariantPage(facts.id);

        await expect(variantPage.allCrossReferenceGroups).toHaveCount(
          Object.keys(facts.crossReferences).length
        );
        for (const [label, ids] of Object.entries(facts.crossReferences)) {
          const group = variantPage.crossReferences(label);
          await expect(group).toContainText(`${label}:`);
          for (const id of ids) {
            const link = group.getByRole("link", { name: id, exact: true, includeHidden: true });
            await expect(link).toHaveAttribute("href", CROSS_REFERENCE_URL[label](id, facts));
          }
        }
      });
    }

    test("more than three ClinVar records are folded behind a show more toggle", async ({
      page,
    }) => {
      const variantPage = new VariantPage(page);
      await variantPage.goToVariantPage(VARIANTS.missense.id);
      const clinvar = variantPage.crossReferences("ClinVar");
      const [first, second, third, fourth] = VARIANTS.missense.crossReferences.ClinVar;

      for (const id of [first, second, third]) {
        await expect(clinvar.getByRole("link", { name: id })).toBeVisible();
      }
      await expect(clinvar.getByRole("link", { name: fourth })).toBeHidden();

      await clinvar.getByText("show more").click();
      await expect(clinvar.getByRole("link", { name: fourth })).toBeVisible();
      await expect(clinvar.getByText("hide")).toBeVisible();

      await clinvar.getByText("hide").click();
      await expect(clinvar.getByRole("link", { name: fourth })).toBeHidden();
      await expect(clinvar.getByText("show more")).toBeVisible();
    });

    test("a variant with a single ClinVar record has no toggle", async ({ page }) => {
      const variantPage = new VariantPage(page);
      await variantPage.goToVariantPage(VARIANTS.pharmacogenomic.id);
      await expect(variantPage.crossReferences("ClinVar").getByRole("link")).toHaveCount(1);
      await expect(variantPage.crossReferences("ClinVar").getByText("show more")).toHaveCount(0);
    });
  });
});

import type { Locator, Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";
import { SectionDataControls } from "./sectionDataControls";

/** The "Transcript consequences" section (variant_effect_predictor) of the variant page. */
export class VariantEffectPredictorSection {
  static readonly id = "variant_effect_predictor";
  static readonly operation = "VariantEffectPredictorQuery";
  static readonly headers = [
    "Gene",
    "Predicted consequence",
    "Impact",
    "Distance from footprint (bp)",
    "Distance from start site (bp)",
  ] as const;
  static readonly pageSize = 10;

  constructor(readonly page: Page) {}

  get section(): Locator {
    return sectionLocator(this.page, VariantEffectPredictorSection.id);
  }

  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, VariantEffectPredictorSection.id);
    await this.table.expectLoaded();
  }

  get title(): Locator {
    return this.section.getByTestId("section-variant-effect-predictor-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get table(): OtTable {
    return new OtTable(this.section);
  }

  get controls(): SectionDataControls {
    return new SectionDataControls(this.page, this.section);
  }

  /** The gene link (to /target/:id) of a row. */
  geneLink(rowIndex: number): Locator {
    return this.table.cell(rowIndex, 0).locator("a[href*='/target/']");
  }
}

import type { Locator } from "@playwright/test";
import { DrugBibliographySection } from "../Drug/drugBibliographySection";

/**
 * Disease page: Bibliography section. It is the shared literature widget, so it offers
 * the same controls as the drug page's: the entity filter, tag categories, date range,
 * publications and pagination.
 */
export class DiseaseBibliographySection extends DrugBibliographySection {
  /** The chip of the disease itself; it cannot be removed. */
  get diseaseChip(): Locator {
    return this.drugChip;
  }

  /** The range slider's thumbs: first the start, then the end of the date range. */
  get startThumb(): Locator {
    return this.dateSliderThumbs.first();
  }
}

import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Column order of the chemical probes table. The Quality header carries a "?" help icon. */
export const CHEMICAL_PROBES_COLUMNS = [
  "Probe ID",
  "Quality?",
  "Mechanism of action",
  "Probe origin",
  "Score",
] as const;

/** The labels the column picker and the export use for the same columns. */
export const CHEMICAL_PROBES_COLUMN_LABELS = [
  "Probe ID",
  "Quality",
  "Mechanism of action",
  "Probe origin",
  "Score",
] as const;

export const QUALITY_HEADER_TOOLTIP =
  "Chemical probes selection based on the union of following criteria: compound belongs to one of the high-quality probe sets; use in Cells or Organisms rating ≥ 75%; P&D approved experimental probe; not labelled as obsolete.";

const COLUMN = { id: 0, quality: 1, mechanism: 2, origin: 3, score: 4 } as const;

export type ChemicalProbe = {
  id: string;
  control: string | null;
  drugId: string | null;
  isHighQuality: boolean;
  mechanismOfAction: string[];
  origin: string[];
  probesDrugsScore: number | null;
};

export type ChemicalProbesData = { target: { id: string; chemicalProbes: ChemicalProbe[] } };

/**
 * The order the widget shows probes in: score, then quality, then experimental origin,
 * all descending, keeping the API order between equals (see ChemicalProbes/Body.tsx).
 */
export function inDisplayOrder(probes: readonly ChemicalProbe[]): ChemicalProbe[] {
  const isExperimental = (probe: ChemicalProbe) =>
    probe.origin.some((origin) => origin.toLowerCase() === "experimental");
  return [...probes].sort(
    (a, b) =>
      (b.probesDrugsScore ?? Number.NEGATIVE_INFINITY) -
        (a.probesDrugsScore ?? Number.NEGATIVE_INFINITY) ||
      Number(b.isHighQuality) - Number(a.isHighQuality) ||
      Number(isExperimental(b)) - Number(isExperimental(a))
  );
}

/** The Chemical Probes widget of the target profile page. */
export class ChemicalProbesSection {
  static readonly id = "chemicalprobes";
  static readonly operation = "TargetChemicalProbesQuery";

  readonly section: Locator;
  readonly header: Locator;
  readonly description: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(private readonly page: Page) {
    this.section = sectionLocator(page, ChemicalProbesSection.id);
    this.header = this.section.getByTestId("section-chemicalprobes-header");
    this.description = this.section.getByTestId("section-description");
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  /** Assert the section is rendered with data and has finished loading. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, ChemicalProbesSection.id);
    await expect(this.table.headers).toHaveText([...CHEMICAL_PROBES_COLUMNS]);
  }

  /** The row of the probe with exactly this id (on the current page). */
  rowForProbe(probeId: string): Locator {
    return this.table.rows.filter({
      has: this.page.locator("td:nth-child(1)").getByText(probeId, { exact: true }),
    });
  }

  idCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.id);
  }

  qualityCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.quality);
  }

  mechanismCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.mechanism);
  }

  originCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.origin);
  }

  scoreCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.score);
  }

  /** The "?" icon shown next to a probe id that has a control compound. */
  controlHelpIcon(row: Locator): Locator {
    return this.idCell(row).locator("sup");
  }

  /** The "?" icon in the Quality column header. */
  get qualityHeaderHelpIcon(): Locator {
    return this.table.headers.nth(COLUMN.quality).locator("sup");
  }

  /** The tooltip MUI renders in a portal while an element is hovered. */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }
}

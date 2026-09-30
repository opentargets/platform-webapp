import type { SectionExportAdapter } from "ui";

type LiteratureRow = { pmid?: string; pmcid?: string; publicationDate?: string };

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// request.data is `{ [entity]: { literatureOcurrences: { rows } } }` for disease, drug and target
const literatureRows = (data: unknown): LiteratureRow[] => {
  if (!isObject(data)) return [];
  const entityData = Object.values(data).find(
    (value) => isObject(value) && isObject(value.literatureOcurrences)
  );
  const rows = entityData?.literatureOcurrences?.rows;
  return Array.isArray(rows) ? rows : [];
};

const DEFAULT_CATEGORIES = ["disease", "drug", "target"];

const monthYear = (year?: number | null, month?: number | null) =>
  year ? (month ? `${month}/${year}` : String(year)) : "";

/**
 * Bibliography sections: one PMID reference per publication in the captured
 * result. Title/authors/journal are looked up from Europe PMC at export time.
 */
export const literatureExportAdapter: SectionExportAdapter = {
  // Bibliography filters, saved under "literature" by common/Literature/Body
  describeState: (state) => {
    const filters = state.literature;
    if (!isObject(filters)) return [];
    const out: string[] = [];
    if (Array.isArray(filters.selectedEntities) && filters.selectedEntities.length) {
      const names = filters.selectedEntities.map(
        (e: any) => e?.object?.name || e?.object?.approvedSymbol || e?.object?.id
      );
      out.push(`entities = ${names.join(", ")}`);
    }
    if (Array.isArray(filters.category) && filters.category.join() !== DEFAULT_CATEGORIES.join()) {
      out.push(`categories = ${filters.category.join(", ") || "none"}`);
    }
    const from = monthYear(filters.startYear, filters.startMonth);
    const to = monthYear(filters.endYear, filters.endMonth);
    if (from || to) out.push(`published = ${from || "…"} – ${to || "…"}`);
    return out;
  },
  references: (data) =>
    literatureRows(data)
      .filter((row) => row.pmid)
      .map((row) => {
        const year = Number.parseInt(row.publicationDate?.slice(0, 4) ?? "", 10);
        return {
          id: `pmid:${row.pmid}`,
          pmid: String(row.pmid),
          title: "",
          year: Number.isFinite(year) ? year : undefined,
        };
      }),
};

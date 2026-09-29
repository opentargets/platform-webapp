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

/**
 * Bibliography sections: one PMID reference per publication in the captured
 * result. Title/authors/journal are looked up from Europe PMC at export time.
 */
export const literatureExportAdapter: SectionExportAdapter = {
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

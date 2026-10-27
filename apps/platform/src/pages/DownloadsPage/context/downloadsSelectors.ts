/**
 * Pure, derived views over DownloadsState: ids, per-chip counts, basket rows,
 * file locations and the multi-dataset access scripts. Kept out of the
 * reducer so the components can compute them from plain
 * rows without a context.
 */

import { DownloadRow } from "../types/downloadTypes";

/** A dataset's id as the graph and the dialog routes know it: the FileSet id without "-fileset". */
export const getDatasetId = (row: Pick<DownloadRow, "@id">): string =>
  String(row["@id"]).replace(/-fileset$/, "");

export const matchesQuery = (row: DownloadRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (row.name ?? "").toLowerCase().includes(q) ||
    (row.description ?? "").toLowerCase().includes(q) ||
    getDatasetId(row).toLowerCase().includes(q)
  );
};

export const rowsMatchingQuery = (rows: DownloadRow[], query: string): DownloadRow[] =>
  query.trim() ? rows.filter(row => matchesQuery(row, query)) : rows;

/**
 * Chip counts: rows matching the current search text that carry each
 * category. Deliberately ignores the selected categories so a user can see
 * where the results are before clicking a chip.
 */
export const selectCategoryCounts = (
  rows: DownloadRow[],
  query: string,
  categories: string[]
): Record<string, number> => {
  const counts: Record<string, number> = Object.fromEntries(categories.map(c => [c, 0]));
  rowsMatchingQuery(rows, query).forEach(row => {
    (row.categories ?? []).forEach(category => {
      counts[category] = (counts[category] ?? 0) + 1;
    });
  });
  return counts;
};

export const selectRowsById = (rows: DownloadRow[]): Map<string, DownloadRow> =>
  new Map(rows.map(row => [getDatasetId(row), row]));

/** The basket's rows in basket (insertion) order, skipping ids that no longer resolve. */
export const selectBasketRows = (rows: DownloadRow[], basket: string[]): DownloadRow[] => {
  const byId = selectRowsById(rows);
  return basket.map(id => byId.get(id)).filter((row): row is DownloadRow => Boolean(row));
};

/* ------------------------------------------------------------------ */
/* File locations and access scripts                                    */
/* ------------------------------------------------------------------ */

export const FTP_LOCATION = "ftp-location";
export const GCP_LOCATION = "gcp-location";
export const AWS_LOCATION = "aws-location";

export type LocationType = typeof FTP_LOCATION | typeof GCP_LOCATION | typeof AWS_LOCATION;

export const getContainedIn = (row: DownloadRow): string[] => {
  const raw = row.containedIn;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(entry => entry?.["@id"]).filter((id): id is string => Boolean(id));
};

/** Same precedence as the Access dialog: GCP when published there, else FTP, else AWS. */
export const getLocationType = (row: DownloadRow): LocationType => {
  const containedIn = getContainedIn(row);
  if (containedIn.includes(GCP_LOCATION)) return GCP_LOCATION;
  if (containedIn.includes(FTP_LOCATION)) return FTP_LOCATION;
  return AWS_LOCATION;
};

/** Built the way DownloadsAccessOptions.getLink() does: `locationURLs[loc] + datasetId`. */
export const getLocationLink = (
  row: DownloadRow,
  locationURLs: Record<string, string>,
  location: LocationType
): string => `${locationURLs[location] ?? ""}${getDatasetId(row)}`;

export const getFileLocation = (row: DownloadRow, locationURLs: Record<string, string>): string =>
  getLocationLink(row, locationURLs, getLocationType(row));

export type ScriptType = "gcp" | "aws" | "rsync" | "wget";

export const SCRIPT_TYPES: ScriptType[] = ["gcp", "aws", "rsync", "wget"];

export const SCRIPT_LABELS: Record<ScriptType, string> = {
  gcp: "Google Cloud CLI",
  aws: "AWS CLI",
  rsync: "Rsync",
  wget: "Wget",
};

const SCRIPT_LOCATION: Record<ScriptType, LocationType> = {
  gcp: GCP_LOCATION,
  aws: AWS_LOCATION,
  rsync: FTP_LOCATION,
  wget: FTP_LOCATION,
};

/** Script types a single dataset can be fetched with, from its `containedIn` locations. */
export const getSupportedScripts = (row: DownloadRow): ScriptType[] => {
  const containedIn = getContainedIn(row);
  return SCRIPT_TYPES.filter(type => containedIn.includes(SCRIPT_LOCATION[type]));
};

/** Script types every one of the given datasets supports (intersection). */
export const getCommonScripts = (rows: DownloadRow[]): ScriptType[] => {
  if (!rows.length) return [];
  return SCRIPT_TYPES.filter(type => rows.every(row => getSupportedScripts(row).includes(type)));
};

const ftpToRsyncModule = (link: string): string =>
  link.replace(/^(?:https?|ftp):\/\/ftp\.ebi\.ac\.uk\//, "");

/** Build the one command (or command list) that fetches every given dataset with the given tool. */
export const buildAccessScript = (
  type: ScriptType,
  rows: DownloadRow[],
  locationURLs: Record<string, string>
): string => {
  const links = rows.map(row => getLocationLink(row, locationURLs, SCRIPT_LOCATION[type]));
  switch (type) {
    case "gcp":
      return [
        "gcloud storage cp -r \\",
        "  --billing-project ${PROJECT_ID} \\",
        ...links.map(link => `  ${link}/ \\`),
        "  .",
      ].join("\n");
    case "aws":
      // `aws s3 cp` only takes one source, so chain one copy per dataset
      return links.map(link => `aws s3 cp --recursive --no-sign-request ${link}/ .`).join(" && \\\n  ");
    case "rsync":
      return links
        .map(link => `rsync -rpltvz --delete rsync.ebi.ac.uk::${ftpToRsyncModule(link)} .`)
        .join("\n");
    case "wget":
      return links
        .map(
          link =>
            `wget --recursive --no-parent --no-host-directories --cut-dirs 6 ${link.replace(
              /^http/,
              "ftp"
            )} .`
        )
        .join("\n");
    default:
      return "";
  }
};

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

export const LOCATION_LABELS: Record<LocationType, string> = {
  [GCP_LOCATION]: "Google Cloud",
  [FTP_LOCATION]: "FTP",
  [AWS_LOCATION]: "AWS",
};

/** Display and precedence order: GCP first, then FTP, then AWS. */
const LOCATION_ORDER: LocationType[] = [GCP_LOCATION, FTP_LOCATION, AWS_LOCATION];

/** Every location a dataset is published in, in precedence order; AWS when it names none. */
export const getLocationTypes = (row: DownloadRow): LocationType[] => {
  const containedIn = getContainedIn(row);
  const types = LOCATION_ORDER.filter(type => containedIn.includes(type));
  return types.length ? types : [AWS_LOCATION];
};

/** Same precedence as the Access dialog: GCP when published there, else FTP, else AWS. */
export const getLocationType = (row: DownloadRow): LocationType => getLocationTypes(row)[0];

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

/** `locationURLs` values end in "/" (e.g. "gs://…/26.09/output/"); the scripts want a bare base. */
const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

/** "http://ftp.ebi.ac.uk/pub/…/output" -> "rsync.ebi.ac.uk::pub/…/output" */
const ftpToRsyncModule = (base: string): string =>
  `rsync.ebi.ac.uk::${base.replace(/^(?:https?|ftp):\/\/ftp\.ebi\.ac\.uk\//, "")}`;

/** "http://ftp.ebi.ac.uk/pub/…" -> "ftp://ftp.ebi.ac.uk/pub/…" */
const ftpToFtpScheme = (base: string): string => base.replace(/^https?:\/\//, "ftp://");

/** Number of path segments wget must drop so datasets land directly in "." (6 for /pub/databases/opentargets/platform/<release>/output). */
const wgetCutDirs = (base: string): number =>
  base
    .replace(/^[a-z]+:\/\/[^/]+/, "")
    .split("/")
    .filter(Boolean).length;

/**
 * The dataset ids, one per line, piped into each script's `while read` loop:
 *
 *   printf '%s\n' \
 *     target \
 *     disease |
 */
const datasetListLines = (rows: DownloadRow[]): string[] => {
  const ids = rows.map(getDatasetId);
  return ["printf '%s\\n' \\", ...ids.map((id, i) => `  ${id} ${i === ids.length - 1 ? "|" : "\\"}`)];
};

const FAIL = (verb: string) => `    { printf '${verb} failed: %s\\n' "\${dataset}" >&2; exit 1; }`;

/**
 * Build the shell snippet that fetches every given dataset with the given
 * tool. Each script declares a BASE, lists the datasets once and loops over
 * them, so a user can edit the list in place and a failed dataset stops the
 * run instead of being silently skipped.
 */
export const buildAccessScript = (
  type: ScriptType,
  rows: DownloadRow[],
  locationURLs: Record<string, string>
): string => {
  const base = stripTrailingSlash(locationURLs[SCRIPT_LOCATION[type]] ?? "");
  const list = datasetListLines(rows);
  switch (type) {
    case "gcp":
      // gcloud takes the whole list at once from stdin; one process, one bill
      return [
        `BASE="${base}"`,
        "",
        ...list,
        "while read -r dataset; do",
        "  printf '%s/%s\\n' \"${BASE}\" \"${dataset}\"",
        "done |",
        "gcloud storage cp \\",
        "  --recursive \\",
        '  --billing-project "${PROJECT_ID}" \\',
        "  --read-paths-from-stdin \\",
        "  .",
      ].join("\n");
    case "aws":
      // `aws s3 cp` only takes one source, so copy each dataset in turn
      return [
        `BASE="${base}"`,
        "",
        ...list,
        "while read -r dataset; do",
        "  aws s3 cp \\",
        '    "${BASE}/${dataset}/" \\',
        '    "./${dataset}/" \\',
        "    --recursive \\",
        "    --no-sign-request ||",
        FAIL("Download"),
        "done",
      ].join("\n");
    case "rsync":
      return [
        `BASE="${ftpToRsyncModule(base)}"`,
        "",
        ...list,
        "while read -r dataset; do",
        "  rsync -rpltvz \\",
        "    --delete \\",
        '    "${BASE}/${dataset}" \\',
        "    ./ ||",
        FAIL("Sync"),
        "done",
      ].join("\n");
    case "wget":
      return [
        `BASE="${ftpToFtpScheme(base)}"`,
        "",
        ...list,
        "while read -r dataset; do",
        "  wget \\",
        "    --recursive \\",
        "    --level=inf \\",
        "    --no-parent \\",
        "    --no-host-directories \\",
        `    --cut-dirs=${wgetCutDirs(base)} \\`,
        '    "${BASE}/${dataset}/" ||',
        FAIL("Download"),
        "done",
      ].join("\n");
    default:
      return "";
  }
};

import Papa from "papaparse";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isArrayOfObjects = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.length > 0 && isPlainObject(value[0]);

/**
 * Dot paths (breadth-first) to every array of objects in `data`. "" is the root.
 */
export const detectArrayPaths = (data: unknown, maxDepth = 6, maxPaths = 20): string[] => {
  const found: string[] = [];
  const queue: { value: unknown; path: string; depth: number }[] = [{ value: data, path: "", depth: 0 }];
  while (queue.length > 0 && found.length < maxPaths) {
    const { value, path, depth } = queue.shift()!;
    if (isArrayOfObjects(value)) {
      found.push(path);
      continue;
    }
    if (isPlainObject(value) && depth < maxDepth) {
      Object.entries(value).forEach(([key, child]) =>
        queue.push({ value: child, path: path ? `${path}.${key}` : key, depth: depth + 1 })
      );
    }
  }
  return found;
};

export const getAtPath = (data: unknown, path: string): unknown =>
  path
    ? path.split(".").reduce<unknown>((value, key) => (isPlainObject(value) ? value[key] : undefined), data)
    : data;

export const setAtPath = (data: unknown, path: string, next: unknown): unknown => {
  if (!path) return next;
  const [head, ...rest] = path.split(".");
  const obj = isPlainObject(data) ? data : {};
  return { ...obj, [head]: setAtPath(obj[head], rest.join("."), next) };
};

/**
 * The rows shown as a table: at `rowsPath` if that's an array of objects,
 * else at the first detected array.
 */
export const resolveRows = (
  data: unknown,
  rowsPath?: string
): { path: string | null; rows: Record<string, unknown>[] | null; paths: string[] } => {
  const paths = detectArrayPaths(data);
  if (rowsPath !== undefined) {
    const value = getAtPath(data, rowsPath);
    if (isArrayOfObjects(value)) return { path: rowsPath, rows: value, paths };
  }
  if (paths.length === 0) return { path: null, rows: null, paths };
  return { path: paths[0], rows: getAtPath(data, paths[0]) as Record<string, unknown>[], paths };
};

/**
 * Column keys from the first `sample` rows, in first-seen order
 */
export const inferColumnKeys = (rows: Record<string, unknown>[], sample = 50): string[] => {
  const keys = new Set<string>();
  rows.slice(0, sample).forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
  return Array.from(keys);
};

export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const saveBlob = (content: string, type: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadCsv = (
  rows: Record<string, unknown>[],
  fileStem: string,
  keys = inferColumnKeys(rows, rows.length)
) =>
  saveBlob(
    Papa.unparse({ fields: keys, data: rows.map((row) => keys.map((key) => cellText(row[key]))) }),
    "text/csv",
    `${fileStem}.csv`
  );

export const downloadJson = (data: unknown, fileStem: string) =>
  saveBlob(JSON.stringify(data, null, 2), "application/json", `${fileStem}.json`);

export const SNAPSHOT_MAX_ROWS = 5000;
export const SNAPSHOT_MAX_BYTES = 1024 * 1024;

/**
 * Cap a result for storage: at most 5,000 rows under rowsPath and ~1 MB of JSON
 */
export const makeSnapshotData = (
  data: unknown,
  rowsPath: string | null
): { data: unknown; truncated: boolean } | { error: string } => {
  let truncated = false;
  let next = data;
  const rows = rowsPath !== null ? getAtPath(data, rowsPath) : undefined;
  if (Array.isArray(rows) && rows.length > SNAPSHOT_MAX_ROWS) {
    next = setAtPath(data, rowsPath as string, rows.slice(0, SNAPSHOT_MAX_ROWS));
    truncated = true;
  }
  let size = JSON.stringify(next).length;
  if (size <= SNAPSHOT_MAX_BYTES) return { data: next, truncated };

  const current = rowsPath !== null ? getAtPath(next, rowsPath) : undefined;
  if (!Array.isArray(current) || current.length === 0) {
    return { error: "This result is too large to save as a snapshot (over 1 MB)." };
  }
  // Shrink the row array until the whole result fits
  let keep = Math.floor(current.length * (SNAPSHOT_MAX_BYTES / size) * 0.95);
  while (keep > 0) {
    next = setAtPath(data, rowsPath as string, current.slice(0, keep));
    size = JSON.stringify(next).length;
    if (size <= SNAPSHOT_MAX_BYTES) return { data: next, truncated: true };
    keep = Math.floor(keep * 0.8);
  }
  return { error: "This result is too large to save as a snapshot (over 1 MB)." };
};

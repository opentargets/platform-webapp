/**
 * Parse comma-separated values into an array
 */
export function parseCsvStringToArray(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

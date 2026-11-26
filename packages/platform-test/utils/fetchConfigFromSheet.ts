import Papa from "papaparse";
import type { CSVRow, TestConfig } from "../types";
import { csvRowToTestConfig } from "./csvRowToTestConfig";

/**
 * Read one scenario from a Google Sheet published as CSV.
 * Throws when the sheet cannot be fetched, parsed, or does not contain the scenario.
 */
export async function fetchConfigFromSheet(url: string, scenarioName: string): Promise<TestConfig> {
  const cacheBustUrl = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
  const response = await fetch(cacheBustUrl, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`GET ${url} returned HTTP ${response.status}`);
  }

  const parseResult = Papa.parse<CSVRow>(await response.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parseResult.errors.length > 0) {
    throw new Error(`The sheet is not valid CSV: ${JSON.stringify(parseResult.errors.slice(0, 3))}`);
  }

  const rows = parseResult.data;
  const matchingRow = rows.find((row) => row["Testing Scenario"] === scenarioName);
  if (!matchingRow) {
    const available = rows.map((row) => row["Testing Scenario"]).join(", ");
    throw new Error(`Scenario "${scenarioName}" is not in the sheet. Available: ${available}`);
  }

  return csvRowToTestConfig(matchingRow);
}

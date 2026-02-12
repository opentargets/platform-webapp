import Papa from "papaparse";
import type { CSVRow, TestConfig } from "../types";
import { CSV_COLUMNS } from "../types";
import { csvRowToTestConfig } from "./csvRowToTestConfig";

/**
 * Fetch test configuration from Google Sheet CSV URL
 * Uses column indices instead of header names for resilience against column name changes
 */
export async function fetchConfigFromSheet(
  url: string,
  scenarioName: string
): Promise<TestConfig | null> {
  try {
    // Add cache-busting parameter to ensure fresh data
    const cacheBustUrl = `${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`;
    const response = await fetch(cacheBustUrl, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    if (!response.ok) {
      console.error(`Failed to fetch config from ${url}: ${response.status}`);
      return null;
    }

    const csvText = await response.text();
    // Parse without headers - we'll use indices instead for resilience
    const parseResult = Papa.parse<CSVRow>(csvText, {
      header: false,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors);
    }

    // Skip the header row (index 0) and get data rows
    const rows = parseResult.data.slice(1);

    // Find the row matching the scenario name using the TESTING_SCENARIO column index
    const matchingRow = rows.find(
      (row) => row[CSV_COLUMNS.TESTING_SCENARIO]?.trim() === scenarioName
    );
    if (!matchingRow) {
      const availableScenarios = rows
        .map((r) => r[CSV_COLUMNS.TESTING_SCENARIO])
        .filter(Boolean)
        .join(", ");
      console.error(
        `Scenario "${scenarioName}" not found in CSV. Available scenarios: ${availableScenarios}`
      );
      return null;
    }

    return csvRowToTestConfig(matchingRow);
  } catch (error) {
    console.error("Error fetching config from sheet:", error);
    return null;
  }
}

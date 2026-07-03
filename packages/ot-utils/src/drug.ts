interface DrugLabelEntry {
  label: string;
  source: string;
}

interface ParsedDrugLabel {
  label: string;
  tooltip: string;
}

// parse array of {source, label} objects into unique labels with tooltip of sources
export function parseDrugLabels(entries: DrugLabelEntry[]): ParsedDrugLabel[] {
  const groupedEntries = Object.groupBy(entries, ({ label }) => label.toLowerCase());

  const sortedEntries =
    Object.values(groupedEntries).sort((a, b) => a[0].label.localeCompare(b[0].label));

  // replace source property with tooltip property
  const parsedEntries = sortedEntries.map(group => {
    return {
      label: group[0].label,
      tooltip: 'Source: ' +
        group
          .map(({ source }) => source)
          .sort((a, b) => a.localeCompare(b))
          .join(', '),
    };
  });

  return parsedEntries;
}
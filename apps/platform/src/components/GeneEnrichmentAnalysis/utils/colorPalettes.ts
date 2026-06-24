// Color palettes and utilities for pathway visualizations

/**
 * Prioritization color palette for NES values (negative to positive)
 */
export const PRIORITISATION_COLORS = [
  "#eceada", // neutral
  "#c5d2c1",
  "#9ebaa8",
  "#78a290",
  "#528b78",
  "#2f735f",
  "#2e5943", // positive (green)
];

/**
 * Root node color
 */
export const ROOT_NODE_COLOR = "#f0f0f0";

/**
 * Maps a value to a color from the prioritization palette
 */
export function mapToPrioritizationColor(
  value: number,
  minValue: number,
  maxValue: number
): string {
  if (maxValue === minValue) {
    return PRIORITISATION_COLORS[Math.floor(PRIORITISATION_COLORS.length / 2)];
  }
  const normalized = (value - minValue) / (maxValue - minValue);
  const colorIndex = Math.floor(normalized * (PRIORITISATION_COLORS.length - 1));
  return PRIORITISATION_COLORS[Math.max(0, Math.min(colorIndex, PRIORITISATION_COLORS.length - 1))];
}

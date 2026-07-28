/**
 * Shared color pool for consistent coloring across graph components
 * Used by both node classification and legend display
 */

const COLOR_PALETTE = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
];

/**
 * Get a color from the palette by index
 * Wraps around if index exceeds palette size
 */
export const getCategoryColor = (index: number): string => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

/**
 * Get color for a specific category by mapping it to an index
 */
export const getCategoryColorByName = (category: string, allCategories: string[]): string => {
  const index = allCategories.indexOf(category);
  return getCategoryColor(index);
};

export default COLOR_PALETTE;

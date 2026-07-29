/**
 * Category color palette shared between the card view (category chips,
 * filter checkboxes) and the graph view (node fill/stroke), so a category
 * means the same thing in both places instead of two disconnected color
 * languages. Disease keeps the platform's primary blue (#3489ca) so the
 * graph reads as part of the same product rather than a standalone widget.
 *
 * Keyed by category name (not index) so a category's color stays stable as
 * the live API's category list grows or shrinks over time - unlike an
 * index-based scheme, where inserting a category upstream would silently
 * reassign every hue after it.
 */

const CATEGORY_COLORS: Record<string, string> = {
  'Target-Disease': '#3E5C8A',
  Target: '#2E7D62',
  Disease: '#3489CA',
  Drug: '#B5613C',
  Genetics: '#4C9E9A',
  Ontology: '#A0688F',
  Literature: '#B08A2E',
};

const OVERFLOW_COLOR = '#757575';

/** Look up a category's color; categories outside the fixed set fold into a shared neutral. */
export const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? OVERFLOW_COLOR;

/** Convert a hex color to an rgba() string at the given alpha, for tinted fills/backgrounds. */
export const tintHex = (hex: string, alpha = 0.12): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default CATEGORY_COLORS;

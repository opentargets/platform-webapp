/**
 * Category color palette shared between the card view (category chips,
 * filter checkboxes) and the graph view (node fill/stroke), so a category
 * means the same thing in both places instead of two disconnected color
 * languages.
 *
 * Keyed by category name (not index) so a category's color stays stable as
 * the live API's category list grows or shrinks over time - unlike an
 * index-based scheme, where inserting a category upstream would silently
 * reassign every hue after it.
 */

const CATEGORY_COLORS: Record<string, string> = {
  'Target-Disease': '#F0BA70',
  Target: '#F55D73',
  Disease: '#92ACC4',
  Drug: '#C77F92',
  Genetics: '#078F91',
  Ontology: '#447899',
  Literature: '#B18FC5',
};

const OVERFLOW_COLOR = '#757575';

/** Look up a category's color; categories outside the fixed set fold into a shared neutral. */
export const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? OVERFLOW_COLOR;

export default CATEGORY_COLORS;

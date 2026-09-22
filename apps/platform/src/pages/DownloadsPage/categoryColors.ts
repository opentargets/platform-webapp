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

/** Convert a hex color to an rgba() string at the given alpha, for tinted fills/backgrounds. */
export const tintHex = (hex: string, alpha = 0.12): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Lighten a hex color by mixing it toward white, returning an opaque rgb() - unlike
 * `tintHex`, nothing behind this fill (e.g. graph edges) shows through. */
export const lightenHex = (hex: string, ratio = 0.14): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

export default CATEGORY_COLORS;

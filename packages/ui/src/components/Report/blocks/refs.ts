import { NOTEBOOK_GLOBALS } from "notebook-runtime/src/protocol";
import { ReportBlock, refOf } from "../../../types/report";

// Refs double as JavaScript identifiers inside notebooks, so these can't be refs
const JS_RESERVED = new Set([
  "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
  "do", "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import",
  "in", "instanceof", "let", "new", "null", "return", "static", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield", "async", "of", "arguments",
  "eval", "undefined", "NaN", "Infinity",
]);

export const RESERVED_REFS = new Set<string>([...JS_RESERVED, ...NOTEBOOK_GLOBALS]);

/**
 * Slugify a title into a ref: lowercase [a-z0-9_], a valid identifier that
 * doesn't shadow a JS keyword or a notebook global
 */
export const slugifyRef = (title: string): string => {
  let slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "block";
  if (/^[0-9]/.test(slug)) slug = `_${slug}`;
  if (RESERVED_REFS.has(slug)) slug = `${slug}_`;
  return slug;
};

export const isValidRef = (ref: string): boolean =>
  /^[a-z_][a-z0-9_]*$/.test(ref) && !RESERVED_REFS.has(ref);

/**
 * A ref not used by any other block in the report: `base`, else `base_2`, `base_3`…
 */
export const uniqueRef = (base: string, blocks: ReportBlock[], excludeId?: string): string => {
  const slug = slugifyRef(base);
  const stem = slug.replace(/_\d+$/, "") || "block";
  const taken = new Set(
    blocks
      .filter((b) => b.reportSectionId !== excludeId)
      .map((b) => refOf(b))
      .filter((ref): ref is string => !!ref)
  );
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${stem}_${n}`)) n += 1;
  return `${stem}_${n}`;
};

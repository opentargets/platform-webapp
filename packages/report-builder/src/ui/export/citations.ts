import type { PaperSettings, Reference } from "./types";

export type CitationStyle = PaperSettings["citationStyle"];

const trimDot = (s: string): string => s.trim().replace(/[.\s]+$/, "");

const vancouverAuthors = (authors: string[]): string =>
  authors.length > 6 ? `${authors.slice(0, 6).join(", ")}, et al` : authors.join(", ");

const apaAuthors = (authors: string[]): string => {
  if (authors.length <= 1) return authors.join("");
  if (authors.length > 20) return `${authors.slice(0, 19).join(", ")}, … ${authors[authors.length - 1]}`;
  return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
};

const locator = (ref: Reference, style: CitationStyle): string[] => {
  const out: string[] = [];
  if (ref.doi) out.push(style === "apa" ? `https://doi.org/${ref.doi}` : `doi:${ref.doi}`);
  if (ref.pmid) out.push(`PMID: ${ref.pmid}`);
  if (!ref.doi && !ref.pmid && ref.url) out.push(ref.url);
  return out;
};

/**
 * One reference as plain text, without its list number (writers add "1." / "[1]").
 * vancouver: "Smith J, Doe A. Title. Journal. 2020. doi:10.x. PMID: 123."
 * apa: "Smith J, & Doe A. (2020). Title. Journal. https://doi.org/10.x"
 */
export function formatReference(ref: Reference, style: CitationStyle): string {
  const authors = ref.authors?.filter(Boolean) ?? [];
  const title = trimDot(ref.title || ref.url || ref.doi || ref.pmid || ref.id);
  if (style === "apa") {
    const parts: string[] = [];
    const year = ref.year ? `(${ref.year})` : "(n.d.)";
    parts.push(authors.length ? `${trimDot(apaAuthors(authors))}. ${year}.` : `${title}. ${year}.`);
    if (authors.length) parts.push(`${title}.`);
    if (ref.journal) parts.push(`${trimDot(ref.journal)}.`);
    parts.push(...locator(ref, style));
    return parts.join(" ");
  }
  const parts: string[] = [];
  if (authors.length) parts.push(`${trimDot(vancouverAuthors(authors))}.`);
  parts.push(`${title}.`);
  if (ref.journal) parts.push(`${trimDot(ref.journal)}.`);
  if (ref.year) parts.push(`${ref.year}.`);
  locator(ref, style).forEach((l) => parts.push(`${trimDot(l)}.`));
  return parts.join(" ");
}

/** vancouver keeps first-cited order; apa sorts by first author, then year. */
export function orderReferences(refs: Reference[], style: CitationStyle): Reference[] {
  if (style !== "apa") return refs.slice();
  const key = (r: Reference) => (r.authors?.[0] || r.title || "").toLowerCase();
  return refs.slice().sort((a, b) => key(a).localeCompare(key(b)) || (a.year ?? 0) - (b.year ?? 0));
}

/** In-text marker: "[3]" (vancouver, 1-based position) or "(Smith et al., 2020)" (apa). */
export function citationMarker(ref: Reference, style: CitationStyle, n: number): string {
  if (style !== "apa") return `[${n}]`;
  const authors = ref.authors ?? [];
  const surname = (a: string) => a.split(/[\s,]+/)[0];
  const who =
    authors.length === 0
      ? trimDot(ref.title).split(" ").slice(0, 3).join(" ")
      : authors.length === 1
      ? surname(authors[0])
      : authors.length === 2
      ? `${surname(authors[0])} & ${surname(authors[1])}`
      : `${surname(authors[0])} et al.`;
  return `(${who}, ${ref.year ?? "n.d."})`;
}

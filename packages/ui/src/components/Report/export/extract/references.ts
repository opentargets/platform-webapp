import type { RichTextDoc } from "../../../../types/report";
import type { Reference } from "../types";

const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
// Ids per Europe PMC request; keeps the query string well under URL limits
const BATCH_SIZE = 40;

const PMID_PATTERNS = [
  /europepmc\.org\/(?:article|abstract)\/MED\/(\d+)/i,
  /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i,
  /ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)/i,
];
const DOI_PATTERN = /(?:dx\.)?doi\.org\/(10\.\d{4,9}\/[^\s?#]+)/i;
const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;
const LITERATURE_HOST = /(europepmc\.org|pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov\/pubmed|doi\.org)/i;

const normaliseDoi = (doi: string) => decodeURIComponent(doi).replace(/[.,;]+$/, "").toLowerCase();

/** Reference key: PMID, then DOI, then URL (the de-duplication order). */
export const referenceKey = (ref: Pick<Reference, "pmid" | "doi" | "url" | "title">): string =>
  ref.pmid
    ? `pmid:${ref.pmid}`
    : ref.doi
      ? `doi:${normaliseDoi(ref.doi)}`
      : ref.url
        ? `url:${ref.url}`
        : `title:${ref.title}`;

/** A literature link (Europe PMC, PubMed, doi.org) → an unresolved reference. */
export const referenceFromUrl = (url: string): Reference | undefined => {
  if (!LITERATURE_HOST.test(url)) return undefined;
  for (const pattern of PMID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return { id: `pmid:${match[1]}`, pmid: match[1], url, title: "" };
  }
  const doi = url.match(DOI_PATTERN)?.[1];
  if (doi) return { id: `doi:${normaliseDoi(doi)}`, doi: normaliseDoi(doi), url, title: "" };
  return { id: `url:${url}`, url, title: "" };
};

/** Literature links in a TipTap doc: link marks plus bare URLs in text. */
export const extractLinkReferences = (doc?: RichTextDoc): Reference[] => {
  const urls = new Set<string>();
  const walk = (node?: RichTextDoc) => {
    if (!node) return;
    node.marks?.forEach((mark) => {
      const href = mark.type === "link" ? mark.attrs?.href : undefined;
      if (typeof href === "string") urls.add(href);
    });
    if (typeof node.text === "string") node.text.match(URL_PATTERN)?.forEach((url) => urls.add(url));
    node.content?.forEach(walk);
  };
  walk(doc);
  return Array.from(urls)
    .map(referenceFromUrl)
    .filter((ref): ref is Reference => !!ref);
};

const mergeReference = (a: Reference, b: Reference): Reference => ({
  ...b,
  ...a,
  pmid: a.pmid ?? b.pmid,
  doi: a.doi ?? b.doi,
  url: a.url ?? b.url,
  title: a.title || b.title,
  authors: a.authors?.length ? a.authors : b.authors,
  journal: a.journal ?? b.journal,
  year: a.year ?? b.year,
});

/**
 * De-duplicate by PMID → DOI → URL, merging fields; first occurrence keeps its position.
 * A DOI-only ref collapses into a PMID ref once resolution has linked the two.
 */
export const dedupeReferences = (refs: Reference[]): Reference[] => {
  const out: Reference[] = [];
  const index = new Map<string, number>();
  refs.forEach((ref) => {
    const keys = [
      ref.pmid && `pmid:${ref.pmid}`,
      ref.doi && `doi:${normaliseDoi(ref.doi)}`,
      !ref.pmid && !ref.doi && ref.url && `url:${ref.url}`,
    ].filter(Boolean) as string[];
    const existing = keys.map((key) => index.get(key)).find((i) => i !== undefined);
    if (existing !== undefined) {
      out[existing] = mergeReference(out[existing], ref);
      keys.forEach((key) => index.set(key, existing));
    } else {
      index.set(keys[0] ?? referenceKey(ref), out.length);
      keys.slice(1).forEach((key) => index.set(key, out.length));
      out.push(ref);
    }
  });
  return out.map((ref) => ({ ...ref, id: referenceKey(ref) }));
};

interface EuropePmcResult {
  pmid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
}

// Session cache: lookup key ("pmid:…" / "doi:…") → metadata (null = looked up, not found)
const metadataCache = new Map<string, EuropePmcResult | null>();

const parseAuthors = (authorString?: string): string[] | undefined =>
  authorString
    ?.replace(/\.$/, "")
    .split(/,\s*/)
    .map((a) => a.trim())
    .filter(Boolean);

const searchEuropePmc = async (query: string, signal?: AbortSignal): Promise<EuropePmcResult[]> => {
  const url = `${EUROPE_PMC_SEARCH}?query=${encodeURIComponent(query)}&format=json&resultType=lite&pageSize=1000`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Europe PMC ${response.status}`);
  const json = await response.json();
  return json?.resultList?.result ?? [];
};

const lookup = async (
  kind: "pmid" | "doi",
  ids: string[],
  signal?: AbortSignal
): Promise<void> => {
  const pending = ids.filter((id) => !metadataCache.has(`${kind}:${id}`));
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const query = batch
      .map((id) => (kind === "pmid" ? `EXT_ID:${id} AND SRC:MED` : `DOI:"${id}"`))
      .map((clause) => `(${clause})`)
      .join(" OR ");
    try {
      const results = await searchEuropePmc(query, signal);
      results.forEach((result) => {
        if (result.pmid) metadataCache.set(`pmid:${result.pmid}`, result);
        if (result.doi) metadataCache.set(`doi:${normaliseDoi(result.doi)}`, result);
      });
      // Only mark misses on a successful response, so a network failure can be retried
      batch.forEach((id) => {
        if (!metadataCache.has(`${kind}:${id}`)) metadataCache.set(`${kind}:${id}`, null);
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      // Graceful failure: the refs stay unresolved (PMID / DOI / URL only)
    }
  }
};

const fallbackTitle = (ref: Reference) =>
  ref.title || (ref.pmid ? `PMID ${ref.pmid}` : ref.doi ? `doi:${ref.doi}` : ref.url ?? "Untitled reference");

/**
 * Fill title/authors/journal/year from Europe PMC for refs missing a title, then
 * de-duplicate. Lookups are cached for the session; failures leave refs as-is.
 */
export const resolveReferences = async (refs: Reference[], signal?: AbortSignal): Promise<Reference[]> => {
  const unresolved = refs.filter((ref) => !ref.title || !ref.authors?.length);
  const pmids = Array.from(new Set(unresolved.map((ref) => ref.pmid).filter(Boolean) as string[]));
  const dois = Array.from(
    new Set(
      unresolved
        .filter((ref) => !ref.pmid && ref.doi)
        .map((ref) => normaliseDoi(ref.doi as string))
    )
  );
  if (typeof fetch === "function") {
    if (pmids.length) await lookup("pmid", pmids, signal);
    if (dois.length) await lookup("doi", dois, signal);
  }

  const resolved = refs.map((ref) => {
    const meta =
      (ref.pmid && metadataCache.get(`pmid:${ref.pmid}`)) ||
      (ref.doi && metadataCache.get(`doi:${normaliseDoi(ref.doi)}`)) ||
      undefined;
    if (!meta) return { ...ref, title: fallbackTitle(ref) };
    const year = Number.parseInt(meta.pubYear ?? "", 10);
    return {
      ...ref,
      pmid: ref.pmid ?? meta.pmid,
      doi: ref.doi ?? (meta.doi ? normaliseDoi(meta.doi) : undefined),
      title: ref.title || meta.title?.replace(/\.$/, "") || fallbackTitle(ref),
      authors: ref.authors?.length ? ref.authors : parseAuthors(meta.authorString),
      journal: ref.journal ?? meta.journalTitle,
      year: ref.year ?? (Number.isFinite(year) ? year : undefined),
    };
  });
  return dedupeReferences(resolved);
};

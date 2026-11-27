import { expect, type Locator, type Page } from "@playwright/test";
import { waitForOperation } from "../shared/sectionDataControls";
import {
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";
import { waitForPageOfOperation } from "./somaticEvidenceSection";

/** Rows per page of the Europe PMC table (the other evidence tables show ten). */
export const EP_PAGE_SIZE = 5;

/** BRAF in melanoma: thousands of text-mined publications. */
export const BRAF_MELANOMA_EP: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000157764",
  efoId: "MONDO_0005105",
  symbol: "BRAF",
  name: "melanoma",
};
/** BRAF in myocardial infarction: five publications, one page. */
export const BRAF_MI_EP: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000157764",
  efoId: "MONDO_0005068",
  symbol: "BRAF",
  name: "myocardial infarction",
};

/** Columns of the Europe PMC table. The third (the year) has no header text. */
export const EP_HEADERS = ["Disease/phenotype", "Publication", "", "Score"] as const;
export const EP_COLUMN = { disease: 0, publication: 1, year: 2, score: 3 } as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/EuropePMC). */
export const EP_OPERATION = "EuropePMCQuery";
export const EP_LIST = "europePmc";

export type TextMiningSentence = {
  section: string;
  text: string;
  tStart: number;
  tEnd: number;
  dStart: number;
  dEnd: number;
};

export type EuropePmcRow = {
  disease: { id: string; name: string };
  target: { id: string; approvedSymbol: string };
  literature: string[];
  textMiningSentences: TextMiningSentence[] | null;
  resourceScore: number;
};

/** What the stub answers for a publication id: the details the section prints. */
export const stubbedTitle = (id: string): string => `Stubbed publication ${id}`;
export const stubbedAbstract = (id: string): string => `Abstract of ${id}`;
export const stubbedYear = (id: string): string => String(2000 + (Number(id) % 20));

export type EuropePmcStub = {
  /** The publication ids of every search the page made, in order. */
  searches: string[][];
};

/**
 * Answer the section's Europe PMC lookups (a GET on /rest/search with one `ext_id:` term per
 * publication) with one deterministic record per requested id, except the ids in `unknown`,
 * which Europe PMC "does not know", and the first id of every search when `omitFirst` is set. Europe PMC is a third-party service that throttles and
 * then answers without CORS headers, which would fail pages that are otherwise fine.
 */
export async function stubEuropePmcSearch(
  page: Page,
  { unknown = [], omitFirst = false }: { unknown?: readonly string[]; omitFirst?: boolean } = {}
): Promise<EuropePmcStub> {
  const stub: EuropePmcStub = { searches: [] };
  await page.route(
    /^https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search\?/,
    async (route) => {
      const query = new URL(route.request().url()).searchParams.get("query") ?? "";
      const ids = query
        .split(" OR ")
        .map((part) => part.replace(/^ext_id:/, "").trim())
        .filter(Boolean);
      stub.searches.push(ids);
      const known = ids.filter(
        (id, position) => !unknown.includes(id) && !(omitFirst && position === 0)
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          hitCount: known.length,
          resultList: {
            result: known.map((id) => ({
              id,
              source: "MED",
              pmid: id,
              title: stubbedTitle(id),
              pubYear: stubbedYear(id),
              authorList: {
                author: [
                  { fullName: "Tester A", lastName: "Tester", initials: "A" },
                  { fullName: "Checker B", lastName: "Checker", initials: "B" },
                ],
              },
              journalInfo: {
                yearOfPublication: Number(stubbedYear(id)),
                volume: "12",
                issue: "3",
                journal: { title: "Journal of Stubs" },
              },
              pageInfo: "101-110",
              abstractText: stubbedAbstract(id),
              inEPMC: "N",
              inPMC: "N",
              isOpenAccess: "N",
            })),
          },
        }),
      });
    }
  );
  return stub;
}

/** The two highlighted spans of a text-mining sentence, in the order they appear in the text. */
export function expectedMarks(sentence: TextMiningSentence): string[] {
  const spans = [
    { start: sentence.dStart, end: sentence.dEnd },
    { start: sentence.tStart, end: sentence.tEnd },
  ].sort((a, b) => a.start - b.start);
  return spans.map((span) => sentence.text.slice(span.start, span.end + 1));
}

/** Evidence page > Europe PMC (section id "europe_pmc"). */
export class EuropePmcSection extends GeneticEvidenceSection {
  static readonly id = "europe_pmc";

  constructor(page: Page) {
    super(page, EuropePmcSection.id);
  }

  override get chip(): Locator {
    return this.section.getByText("Text mining", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, EP_COLUMN.disease).getByRole("link");
  }

  /** The publication cell of a row. */
  publication(row: number): Locator {
    return this.cell(row, EP_COLUMN.publication);
  }

  /** The title link of a publication, which opens it on Europe PMC. */
  titleLink(row: number): Locator {
    return this.publication(row).getByRole("link");
  }

  button(row: number, name: string | RegExp): Locator {
    return this.publication(row).getByRole("button", { name });
  }

  /** The "Abstract" panel of a publication. */
  abstractPanel(row: number): Locator {
    return this.publication(row).getByText("Abstract", { exact: true });
  }

  /** The "Matches" panel of a publication: one table row per sentence. */
  matchRows(row: number): Locator {
    return this.publication(row).locator("table tbody tr");
  }

  matchMarks(row: number, sentence: number): Locator {
    return this.matchRows(row).nth(sentence).locator("mark");
  }

  /** Assert the row's Europe PMC details have arrived (no skeleton left in its cells). */
  async expectDetailsLoaded(row: number): Promise<void> {
    await expect(this.publication(row).locator(".MuiSkeleton-root")).toHaveCount(0);
    await expect(this.titleLink(row)).toBeVisible();
  }

  /** Click the next page button and return what the API answered for that page. */
  async goToNextPage(pageIndex: number): Promise<EuropePmcRow[]> {
    const next = waitForPageOfOperation<{ disease: Record<string, EvidenceList<EuropePmcRow>> }>(
      this.page,
      EP_OPERATION,
      pageIndex,
      EP_PAGE_SIZE
    );
    await this.table.nextPageButton.click();
    return (await next).disease[EP_LIST].rows;
  }
}

/** Open an evidence page and wait for the Europe PMC section, its first page and its details. */
export async function openEuropePmc(
  page: Page,
  pair: EvidencePair = BRAF_MELANOMA_EP,
  stubOptions: { unknown?: readonly string[]; omitFirst?: boolean } = {}
): Promise<{
  section: EuropePmcSection;
  list: EvidenceList<EuropePmcRow>;
  stub: EuropePmcStub;
}> {
  const stub = await stubEuropePmcSearch(page, stubOptions);
  const section = new EuropePmcSection(page);
  const response = waitForOperation<{ disease: Record<string, EvidenceList<EuropePmcRow>> }>(
    page,
    EP_OPERATION
  );
  await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
  const { data, variables } = await response;
  expect(variables, "the section asks for the first page of its target and disease").toMatchObject({
    ensemblId: pair.ensgId,
    efoId: pair.efoId,
    index: 0,
    size: EP_PAGE_SIZE,
  });
  await section.expectLoaded();
  const list = data.disease[EP_LIST];
  expect(list.count, "the API has text-mined publications for this pair").toBeGreaterThan(0);
  expect(list.rows.length).toBe(Math.min(list.count, EP_PAGE_SIZE));
  return { section, list, stub };
}

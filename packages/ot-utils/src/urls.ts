interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body: string;
}

interface SearchPostResult {
  baseUrl: string;
  formBody: string;
  requestOptions?: RequestOptions;
}

export function epmcUrl(id: string): string {
  return `https://europepmc.org/article/MED/${id}`;
}

export function europePmcLiteratureQuery(ids: string[]): string {
  const baseUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?&format=json&resultType=core&pageSize=${ids.length}&query=ext_id:`;
  return encodeURI(baseUrl + ids.join(" OR ext_id:"));
}

export const encodeParams = (params: Record<string, string>): string => {
  const formBody: string[] = [];
  for (const key of Object.keys(params)) {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(params[key] ?? "");
    formBody.push(`${encodedKey}=${encodedValue}`);
  }
  return formBody.join("&");
};

export function europePmcSearchPOSTQuery(ids: string[]): SearchPostResult {
  const baseUrl = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST";
  const query = ids.join(" OR ext_id:");
  const bodyOptions = {
    resultType: "core",
    format: "json",
    pageSize: "1000",
    query: `ext_id:${query}`,
    sort: "P_PDATE_D desc",
  };
  const formBody = encodeParams(bodyOptions);
  return { baseUrl, formBody };
}

export function europePmcBiblioSearchPOSTQuery(ids: string[], size = 25): SearchPostResult {
  const baseUrl = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST";
  const query = ids.join(" OR ext_id:");
  const bodyOptions = {
    resultType: "core",
    format: "json",
    pageSize: String(size),
    query: `ext_id:${query}`,
  };
  const formBody = encodeParams(bodyOptions);
  const requestOptions: RequestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: formBody,
  };
  return { baseUrl, formBody, requestOptions };
}

function innUrl() {
  return "https://www.who.int/publications/m/item/inn-pl-126";
}

function emaUrl() {
  return "https://www.ema.europa.eu/en/medicines";
}

function usanUrl(id: string) {
  return `https://searchusan.ama-assn.org/finder/usan/search/${id}/relevant/1`;
}

function clinicalTrialsUrl(id: string): string {
  return `https://www.clinicaltrials.gov/study/${id}`;
}

function fdaUrl(id: string): string {
  return `https://api.fda.gov/drug/label.json?search=set_id:${id}`;
}

function atcUrl(id: string): string {
  return `http://www.whocc.no/atc_ddd_index/?code=${id}`;
}

function dailyMedUrl(id: string): string {
  return `http://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${id}`;
}

export const referenceUrls: Record<string, (id: string) => string> = {
  ClinicalTrials: clinicalTrialsUrl,
  FDA: fdaUrl,
  ATC: atcUrl,
  DailyMed: dailyMedUrl,
  INN: innUrl,
  EMA: emaUrl,
  USAN: usanUrl,
};

export function alphaFoldCifUrl(uniprotId: string) {
  return `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`;
}

export function alphaFoldPathogenicityUrl(uniprotId: string) {
  return `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-aa-substitutions.csv`;
}

export function alphaFoldDomainsUrl(uniprotId: string) {
  return `https://rest.uniprot.org/uniprotkb/${uniprotId}.json?fields=ft_domain`;
}

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faDiscourse,
  faGithubSquare,
  faLinkedin,
  faTwitterSquare,
  faYoutubeSquare,
} from "@fortawesome/free-brands-svg-icons";
import { faBook, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { getConfig } from "@ot/config";
import type { IGeneomicLocation } from "./types/geneLoc";

const config = getConfig();

// Interfaces for structured data
interface ExternalLink {
  label: string;
  url: string;
  icon?: IconDefinition;
  external?: boolean;
  showOnlyPartner?: boolean;
}

interface MenuItem {
  name: string;
  url: string;
  external: boolean;
  showOnlyPartner?: boolean;
}

export const PPP_API_URL = "https://api.partner-platform.opentargets.org/api/v4/graphql";
export const PPP_WEB_URL = "https://partner-platform.opentargets.org";

export const PHARM_GKB_COLOR = {
  green: "#52a237",
  yellow: "#f0c584",
  red: "#ec2746",
};

export const colorRange = [
  "#e5edf4",
  "#ccdcea",
  "#b2cbe0",
  "#99b9d6",
  "#7fa8cc",
  "#6697c1",
  "#4c85b7",
  "#3274ad",
  "#1963a3",
  "#005299",
];

// External Links Configuration
export const externalLinks = {
  about: [
    {
      label: "Community forum",
      url: "https://community.opentargets.org",
    },
    {
      label: "Privacy notice",
      url: "https://www.ebi.ac.uk/data-protection/privacy-notice/embl-ebi-public-website/",
    },
    {
      label: "Terms of use",
      url: "https://platform-docs.opentargets.org/licence/terms-of-use",
    },
  ] as ExternalLink[],
  license: {
    label: "Open Targets Platform",
    url: "https://platform.opentargets.org/",
  } as ExternalLink,
  network: [
    { label: "Science", url: "https://www.opentargets.org/science" },
    { label: "Publications", url: "https://www.opentargets.org/publications" },
    { label: "Jobs", url: "https://www.opentargets.org/jobs" },
    { label: "Blog", url: "https://blog.opentargets.org" },
  ] as ExternalLink[],
  partners: [
    { label: "EMBL-EBI", url: "https://www.ebi.ac.uk" },
    { label: "Genentech", url: "https://www.gene.com" },
    { label: "GSK", url: "https://www.gsk.com" },
    { label: "MSD", url: "https://www.msd.com/" },
    { label: "Pfizer", url: "https://pfizer.com" },
    { label: "Sanofi", url: "https://www.sanofi.com" },
    { label: "Wellcome Sanger Institute", url: "https://www.sanger.ac.uk" },
  ] as ExternalLink[],
  help: [
    {
      label: "Documentation",
      icon: faBook,
      url: "https://platform-docs.opentargets.org",
    },
    {
      label: "Community",
      icon: faDiscourse,
      url: "https://community.opentargets.org",
      external: true,
    },
    {
      label: "Contact us",
      icon: faEnvelope,
      url: `mailto: ${config.profile.helpdeskEmail}`,
      external: true,
      showOnlyPartner: true,
    },
  ] as ExternalLink[],
  social: [
    {
      icon: faTwitterSquare,
      url: "https://twitter.com/opentargets",
      label: "Go to OpenTargets twitter",
    },
    {
      icon: faLinkedin,
      url: "https://www.linkedin.com/company/open-targets",
      label: "Go to OpenTargets linkedin",
    },
    {
      icon: faYoutubeSquare,
      url: "https://www.youtube.com/opentargets",
      label: "Go to OpenTargets youtube",
    },
    {
      icon: faGithubSquare,
      url: "https://github.com/opentargets",
      label: "Go to OpenTargets github",
    },
  ] as ExternalLink[],
};

// Main Menu Items Configuration
export const mainMenuItems: MenuItem[] = config.profile.mainMenuItems ?? [
  {
    name: "Projects",
    url: "/projects",
    external: false,
    showOnlyPartner: true,
  },
  {
    name: "Documentation",
    url: "https://platform-docs.opentargets.org/getting-started",
    external: true,
  },
  {
    name: "PPP Documentation",
    url: "https://home.opentargets.org/ppp-documentation",
    external: true,
    showOnlyPartner: true,
  },
  {
    name: "Data downloads",
    url: "/downloads",
    external: false,
  },
  {
    name: "API",
    url: "/api",
    external: false,
  },
  {
    name: "Community",
    url: "https://community.opentargets.org/",
    external: true,
  },
  {
    name: "Contact us",
    url: `mailto:${config.profile.helpdeskEmail}`,
    external: true,
    showOnlyPartner: true,
  },
];

export const QTLStudyType = [
  "scsqtl",
  "sceqtl",
  "scpqtl",
  "sctuqtl",
  "sqtl",
  "eqtl",
  "pqtl",
  "tuqtl",
];

export const initialResponse = {
  data: null,
  error: null,
  loading: true,
};

// App Metadata
export const appTitle = "Open Targets Platform";
export const appDescription =
  "The Open Targets Platform is a data integration tool that supports systematic drug target identification and prioritisation";
export const appCanonicalUrl = "https://platform.opentargets.org";

// Chunk Sizes
export const tableChunkSize = 100;
export const table2HChunkSize = 200;
export const table3HChunkSize = 300;
export const table5HChunkSize = 500;
export const downloaderChunkSize = 2500;
export const sectionsBaseSizeQuery = 3500;
export const sections5kSizeQuery = 5000;
export const sections7kSizeQuery = 7000;
export const sections10kSizeQuery = 10000;

// NA Label
export const naLabel = "N/A";

// Rows Per Page Options
export const defaultRowsPerPageOptions = [10, 25, 100];

// Decimal Places
export const decimalPlaces = 3;

export const clinicalStageCategories = {
  UNKNOWN: { index: 0, label: "Unknown" },
  PRECLINICAL: { index: 1, label: "Preclinical" },
  IND: { index: 2, label: "IND" },
  EARLY_PHASE_1: { index: 3, label: "Early phase I" },
  PHASE_1: { index: 4, label: "Phase I" },
  PHASE_1_2: { index: 5, label: "Phase I/II" },
  PHASE_2: { index: 6, label: "Phase II" },
  PHASE_2_3: { index: 7, label: "Phase II/III" },
  PHASE_3: { index: 8, label: "Phase III" },
  PREAPPROVAL: { index: 9, label: "Preapproval" },
  APPROVAL: { index: 10, label: "Approval" },
  PHASE_4: { index: 11, label: "Phase IV" },
  WITHDRAWAL: { index: 12, label: "Withdrawal" },
};

// Stop Reason Categories Mapping
const stopReasonCategories: { [key: string]: string } = {
  Another_Study: "Another study",
  Business_Administrative: "Business or administrative",
  Covid19: "COVID-19",
  Endpoint_Met: "Met endpoint",
  Ethical_Reason: "Ethical reason",
  Insufficient_Data: "Insufficient data",
  Insufficient_Enrollment: "Insufficient enrollment",
  Interim_Analysis: "Interim analysis",
  Invalid_Reason: "Invalid reason",
  Logistics_Resources: "Logistics or resources",
  Negative: "Negative",
  No_Context: "No context",
  Regulatory: "Regulatory",
  Safety_Sideeffects: "Safety or side effects",
  Study_Design: "Study design",
  Study_Staff_Moved: "Study staff moved",
  Success: "Success",
  Uncategorised: "Uncategorised",
};

export const stopReasonMap = (category: string): string =>
  stopReasonCategories[category] || category;

export const clinicalReportsSourcesInfo = {
  AACT: {
    name: "Aggregate Content of ClinicalTrials.gov",
    url: "https://aact.ctti-clinicaltrials.org/",
  },
  TTD: {
    name: "Therapeutic Target Database",
    url: "https://ttd.idrblab.cn/",
  },
  DailyMed: {
    name: "DailyMed",
    url: "https://dailymed.nlm.nih.gov/dailymed/",
  },
  ATC: {
    name: "Anatomical Therapeutic Chemical",
    url: "https://atcddd.fhi.no/",
  },
  PMDA: {
    name: "Pharmaceutical and Medical Devices Agency",
    url: "https://www.pmda.go.jp/english/about-pmda/index.html",
  },
  "EMA Human Drugs": {
    name: "European Medicines Agency Human Drugs",
    url: "https://www.ema.europa.eu/en/medicines",
  },
  FDA: {
    name: "Food and Drug Administration",
    url: "https://www.fda.gov/",
  },
  USAN: {
    name: "United States Adopted Names",
    url: "https://www.ama-assn.org/about/united-states-adopted-names-usan",
  },
  EMA: {
    name: "European Medicine Agency",
    url: "https://www.ema.europa.eu/en/medicines",
  },
  INN: {
    name: "International Nonproprietary Names",
    url: "https://www.who.int/teams/health-product-and-policy-standards/inn",
  },
  WHO: {
    name: "World Health Organisation",
    url: "https://www.who.int/",
  },
  DOI: {
    name: "Withdrawal from Drug Information Association Journal",
    url: "https://link.springer.com/journal/43441",
  },
  USGPO: {
    name: "United States Government Publishing Office",
    url: "https://www.gpo.gov/",
  },
  PubMed: {
    name: "PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  "Health Canada": {
    name: "Health Canada",
    url: "https://www.canada.ca/en/health-canada.html",
  },
  MHRA: {
    name: "Medicines and Healthcare products Regulatory Agency",
    url: "https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency",
  },
  TGA: {
    name: "Therapeutic Goods Administration",
    url: "https://www.tga.gov.au/",
  },
  MEDSAFE: {
    name: "New Zealand Medicines and Medical Devices Safety Authority",
    url: "https://www.medsafe.govt.nz/",
  },
  HPRA: {
    name: "Health Products Regulatory Authority",
    url: "https://www.hpra.ie/",
  },
  NICE: {
    name: "National Institute for Health and Care Excellence",
    url: "https://www.nice.org.uk/",
  },
  HIS: {
    name: "Haute Autorité de Santé",
    url: "https://www.has-sante.fr/",
  },
  NTP: {
    name: "National Toxicology Program",
    url: "https://ntp.niehs.nih.gov/",
  },
};

// ClinVar Star Mapping
export const clinvarStarMap: { [key: string]: number } = {
  "practice guideline": 4,
  "reviewed by expert panel": 3,
  "criteria provided, multiple submitters, no conflicts": 2,
  "criteria provided, conflicting interpretations": 1,
  "criteria provided, single submitter": 1,
  "no assertion for the individual variant": 0,
  "no assertion criteria provided": 0,
  "no assertion provided": 0,
};

// Credset Confidence Mapping
export const credsetConfidenceMap: { [key: string]: number } = {
  "SuSiE fine-mapped credible set with in-sample LD": 4,
  "SuSiE fine-mapped credible set with out-of-sample LD": 3,
  "PICS fine-mapped credible set extracted from summary statistics": 2,
  "PICS fine-mapped credible set based on reported top hit": 1,
};

// Format Mapping
export const formatMap: { [key: string]: string } = {
  json: "JSON",
  parquet: "Parquet",
};

// Study Source Mapping
export const studySourceMap: { [key: string]: string } = {
  FINNGEN: "FinnGen",
  GCST: "GWAS Catalog",
  SAIGE: "UK Biobank",
  NEALE: "UK Biobank",
};

// Variant Consequence Source
export const variantConsequenceSource = {
  VEP: {
    label: "VEP",
    tooltip: "Ensembl variant effect predictor",
  },
  ProtVar: {
    label: "ProtVar",
    tooltip: "Variant effect on protein function",
  },
  QTL: {
    label: "QTL",
    tooltip:
      "The direction is inferred from the strongest effect across all the co-localising QTLs",
  },
};

// Population Mapping
export const populationMap: { [key: string]: string } = {
  fin: "Finnish",
  afr: "African",
  nfe: "non-Finnish Europeans",
  eas: "East Asian",
  amr: "Admixed American",
};

export const VIEW = {
  chart: "Visualisation",
  table: "Table",
};

export const getStudyTypeDisplay = (
  studyType: string | null | undefined
): string | null | undefined => {
  if (studyType) return studyType?.replace(/(qtl|gwas)/gi, (match: string) => match.toUpperCase());
  return studyType;
};

export const getStudyItemMetaData = ({
  studyType,
  credibleSetsCount,
  nSamples,
}: {
  studyType?: string;
  credibleSetsCount: number;
  nSamples: number;
}) => {
  let metaData = "";
  if (studyType) metaData += `Study type: ${getStudyTypeDisplay(studyType)}`;
  if (credibleSetsCount > -1)
    metaData += ` • Credible sets count: ${credibleSetsCount.toLocaleString()}`;
  if (studyType) metaData += ` • Sample size: ${nSamples.toLocaleString()}`;

  return metaData;
};

export const getGenomicLocation = (genomicLocation: IGeneomicLocation | null | undefined) => {
  if (!genomicLocation) return "";
  try {
    const strandInt = parseInt(genomicLocation.strand?.toString() || "1", 10);
    const strand = Math.sign(strandInt) === 1 ? "+" : "-";
    const chromosomeString = `Chr${genomicLocation.chromosome}: ${genomicLocation.start}-${genomicLocation.end},${strand}`;
    return ["GRCh38", chromosomeString];
  } catch (e) {
    console.error("Error formatting gene location", e);
    return "";
  }
};

export const baselineUnits = {
  "scrna-seq": "CPM",
  "bulk rna-seq": "TPM",
  "mass-spectrometry proteomics": "PPB",
};

export * from "./alphaFold";
export * from "./dataTypes";
export * from "./particlesBackground";
export * from "./partnerPreviewUtils";
export * from "./searchSuggestions";
export * from "./types";
export * from "./types/geneLoc";
export * from "./types/sections";
export * from "./variant";

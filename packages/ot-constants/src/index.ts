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

// from Ensembl: https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html
export const PREDICTED_CONSEQUENCE_LOOKUP = {
  "SO:0001893": { color: "#ff0000", displayTerm: "Transcript ablation", impact: "HIGH", rank: 0 },
  "SO:0001574": {
    color: "#ff581a",
    displayTerm: "Splice acceptor variant",
    impact: "HIGH",
    rank: 1,
  },
  "SO:0001575": { color: "#ff581a", displayTerm: "Splice donor variant", impact: "HIGH", rank: 2 },
  "SO:0001587": { color: "#ff0000", displayTerm: "Stop gained", impact: "HIGH", rank: 3 },
  "SO:0001589": { color: "#9400d3", displayTerm: "Frameshift variant", impact: "HIGH", rank: 4 },
  "SO:0001578": { color: "#ff0000", displayTerm: "Stop lost", impact: "HIGH", rank: 5 },
  "SO:0002012": { color: "#ffd700", displayTerm: "Start lost", impact: "HIGH", rank: 6 },
  "SO:0001889": {
    color: "#ff69b4",
    displayTerm: "Transcript amplification",
    impact: "HIGH",
    rank: 7,
  },
  "SO:0001907": { color: "#7f7f7f", displayTerm: "Feature elongation", impact: "HIGH", rank: 8 },
  "SO:0001906": { color: "#7f7f7f", displayTerm: "Feature truncation", impact: "HIGH", rank: 9 },
  "SO:0001821": {
    color: "#ff69b4",
    displayTerm: "Inframe insertion",
    impact: "MODERATE",
    rank: 10,
  },
  "SO:0001822": { color: "#ff69b4", displayTerm: "Inframe deletion", impact: "MODERATE", rank: 11 },
  "SO:0001583": { color: "#ffd700", displayTerm: "Missense variant", impact: "MODERATE", rank: 12 },
  "SO:0001818": {
    color: "#ff0080",
    displayTerm: "Protein altering variant",
    impact: "MODERATE",
    rank: 13,
  },
  "SO:0001787": {
    color: "#ff7f50",
    displayTerm: "Splice donor 5th base variant",
    impact: "LOW",
    rank: 14,
  },
  "SO:0001630": { color: "#ff7f50", displayTerm: "Splice region variant", impact: "LOW", rank: 15 },
  "SO:0002170": {
    color: "#ff7f50",
    displayTerm: "Splice donor region variant",
    impact: "LOW",
    rank: 16,
  },
  "SO:0002169": {
    color: "#ff7f50",
    displayTerm: "Splice polypyrimidine tract variant",
    impact: "LOW",
    rank: 17,
  },
  "SO:0001626": {
    color: "#ff00ff",
    displayTerm: "Incomplete terminal codon variant",
    impact: "LOW",
    rank: 18,
  },
  "SO:0002019": {
    color: "#76ee00",
    displayTerm: "Start retained variant",
    impact: "LOW",
    rank: 19,
  },
  "SO:0001567": { color: "#76ee00", displayTerm: "Stop retained variant", impact: "LOW", rank: 20 },
  "SO:0001819": { color: "#76ee00", displayTerm: "Synonymous variant", impact: "LOW", rank: 21 },
  "SO:0001580": {
    color: "#458b00",
    displayTerm: "Coding sequence variant",
    impact: "MODIFIER",
    rank: 22,
  },
  "SO:0001620": {
    color: "#458b00",
    displayTerm: "Mature miRNA variant",
    impact: "MODIFIER",
    rank: 23,
  },
  "SO:0001623": {
    color: "#7ac5cd",
    displayTerm: "5 prime UTR variant",
    impact: "MODIFIER",
    rank: 24,
  },
  "SO:0001624": {
    color: "#7ac5cd",
    displayTerm: "3 prime UTR variant",
    impact: "MODIFIER",
    rank: 25,
  },
  "SO:0001792": {
    color: "#32cd32",
    displayTerm: "Non coding transcript exon variant",
    impact: "MODIFIER",
    rank: 26,
  },
  "SO:0001627": { color: "#02599c", displayTerm: "Intron variant", impact: "MODIFIER", rank: 27 },
  "SO:0001621": {
    color: "#ff4500",
    displayTerm: "NMD transcript variant",
    impact: "MODIFIER",
    rank: 28,
  },
  "SO:0001619": {
    color: "#32cd32",
    displayTerm: "Non coding transcript variant",
    impact: "MODIFIER",
    rank: 29,
  },
  "SO:0001968": {
    color: "#458b00",
    displayTerm: "Coding transcript variant",
    impact: "MODIFIER",
    rank: 30,
  },
  "SO:0001631": {
    color: "#a2b5cd",
    displayTerm: "Upstream gene variant",
    impact: "MODIFIER",
    rank: 31,
  },
  "SO:0001632": {
    color: "#a2b5cd",
    displayTerm: "Downstream gene variant",
    impact: "MODIFIER",
    rank: 32,
  },
  "SO:0001895": { color: "#a52a2a", displayTerm: "TFBS ablation", impact: "MODIFIER", rank: 33 },
  "SO:0001892": {
    color: "#a52a2a",
    displayTerm: "TFBS amplification",
    impact: "MODIFIER",
    rank: 34,
  },
  "SO:0001782": {
    color: "#a52a2a",
    displayTerm: "TF binding site variant",
    impact: "MODIFIER",
    rank: 35,
  },
  "SO:0001894": {
    color: "#a52a2a",
    displayTerm: "Regulatory region ablation",
    impact: "MODIFIER",
    rank: 36,
  },
  "SO:0001891": {
    color: "#a52a2a",
    displayTerm: "Regulatory region amplification",
    impact: "MODIFIER",
    rank: 37,
  },
  "SO:0001566": {
    color: "#a52a2a",
    displayTerm: "Regulatory region variant",
    impact: "MODIFIER",
    rank: 38,
  },
  "SO:0001628": {
    color: "#636363",
    displayTerm: "Intergenic variant",
    impact: "MODIFIER",
    rank: 39,
  },
  "SO:0001060": { color: "#636363", displayTerm: "Sequence variant", impact: "MODIFIER", rank: 40 },
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

export const therapeuticPriorities = {
  EFO_0001444: { name: "measurement", rank: 1 },
  MONDO_0045024: { name: "cancer or benign tumor", rank: 2 },
  OTAR_0000018: { name: "genetic, familial or congenital", rank: 3 },
  MONDO_0005550: { name: "infectious disease", rank: 4 },
  OTAR_0000009: { name: "injury, poisoning or complication", rank: 5 },
  OTAR_0000014: { name: "pregnancy or perinatal", rank: 6 },
  MONDO_0024458: { name: "visual system", rank: 7 },
  MONDO_0004995: { name: "cardiovascular", rank: 8 },
  MONDO_0002356: { name: "pancreas", rank: 9 },
  MONDO_0002515: { name: "liver", rank: 10 },
  EFO_0010282: { name: "gastrointestinal", rank: 11 },
  OTAR_0000017: { name: "reproductive system or breast", rank: 12 },
  MONDO_0002051: { name: "integumentary system", rank: 13 },
  MONDO_0005151: { name: "endocrine system", rank: 14 },
  OTAR_0000010: { name: "respiratory or thoracic", rank: 15 },
  MONDO_0002118: { name: "urinary system", rank: 16 },
  OTAR_0000006: { name: "musculoskeletal or connective ...", rank: 17 },
  MONDO_0021205: { name: "disorder of ear", rank: 18 },
  MONDO_0005046: { name: "immune system", rank: 19 },
  MONDO_0005570: { name: "hematologic", rank: 20 },
  MONDO_0005071: { name: "nervous system", rank: 21 },
  MONDO_0002025: { name: "psychiatric", rank: 22 },
  OTAR_0000020: { name: "nutritional or metabolic", rank: 23 },
  GO_0008150: { name: "biological process", rank: 24 },
  EFO_0000651: { name: "phenotype", rank: 25 },
  EFO_0002571: { name: "medical procedure", rank: 26 },
  MONDO_0005583: { name: "animal disease", rank: 27 },
};

export const therapeuticAreas: Record<string, string> = {
  EFO_0001444: "measurement",
  MONDO_0045024: "cancer or benign tumor",
  OTAR_0000018: "genetic, familial or congenital",
  MONDO_0005550: "infectious disease",
  OTAR_0000009: "injury, poisoning or complication",
  OTAR_0000014: "pregnancy or perinatal",
  MONDO_0024458: "visual system",
  MONDO_0004995: "cardiovascular",
  MONDO_0002356: "pancreas",
  MONDO_0002515: "liver",
  EFO_0010282: "gastrointestinal",
  OTAR_0000017: "reproductive system or breast",
  MONDO_0002051: "integumentary system",
  MONDO_0005151: "endocrine system",
  OTAR_0000010: "respiratory or thoracic",
  MONDO_0002118: "urinary system",
  OTAR_0000006: "musculoskeletal or connective tissue",
  MONDO_0021205: "disorder of ear",
  MONDO_0005046: "immune system",
  MONDO_0005570: "hematologic",
  MONDO_0005071: "nervous system",
  MONDO_0002025: "psychiatric",
  OTAR_0000020: "nutritional or metabolic",
  GO_0008150: "biological process",
  EFO_0000651: "phenotype",
  EFO_0002571: "medical procedure",
  MONDO_0005583: "animal disease",
  EFO_0000319: "cardiovascular",
  EFO_0000540: "immune system",
  EFO_0000618: "nervous system",
  EFO_0001379: "endocrine system",
  EFO_0005741: "infectious disease",
  EFO_0005803: "hematologic",
  EFO_0005932: "animal disease",
  EFO_0009690: "urinary system",
  EFO_0010284: "liver",
  EFO_0010285: "integumentary system",
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

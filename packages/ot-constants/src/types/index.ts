import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  NaiveDate: { input: any; output: any; }
};

/**
 * Significant adverse events associated with drugs sharing the same pharmacological target. This
 * dataset is based on the FDA's Adverse Event Reporting System (FAERS) reporting post-marketing
 * surveillance data and it's filtered to include only reports submitted by health professionals.
 * The significance of a given target-ADR is estimated using a Likelihood Ratio Test (LRT) using
 * all reports associated with the drugs with the same target.
 */
export type AdverseEvent = {
  __typename?: 'AdverseEvent';
  /** Number of reports mentioning drug and adverse event. */
  count: Scalars['Int']['output'];
  /** Log-likelihood ratio. */
  logLR: Scalars['Float']['output'];
  /** 8 digit unique meddra identification number. */
  meddraCode: Scalars['String']['output'];
  /** Meddra term on adverse event. */
  name: Scalars['String']['output'];
};

/**
 * The result of a paginated query, containing the total number of items, the items, and statistics
 * about the query.
 */
export type AdverseEventPage = {
  __typename?: 'AdverseEventPage';
  count: Scalars['Int']['output'];
  rows: Array<AdverseEvent>;
  stats: AdverseEventStats;
};

/** Statistics for a set of adverse events. */
export type AdverseEventStats = {
  __typename?: 'AdverseEventStats';
  /** LLR critical value to define significance. */
  criticalValue: Scalars['Float']['output'];
};

/** Type of aggregation used to calculate the yearly evidence count. */
export enum AggregationType {
  /** Aggregates the evidence of each datasource separately. */
  DatasourceId = 'datasourceId',
  /** Aggregates all the evidence of all datasources into an overall score. */
  Overall = 'overall'
}

/** Allele frequencies of the variant in different populations. */
export type AlleleFrequency = {
  __typename?: 'AlleleFrequency';
  /** Frequency of the alternate allele in the population (ranging from 0 to 1). */
  alleleFrequency?: Maybe<Scalars['Float']['output']>;
  /** Name of the population where the allele frequency was measured. */
  populationName?: Maybe<Scalars['String']['output']>;
};

/** Assays used in the study. */
export type Assay = {
  __typename?: 'Assay';
  /** Description of the assay. */
  description?: Maybe<Scalars['String']['output']>;
  /** Indicates if the assay was positive or negative for the target. */
  isHit?: Maybe<Scalars['Boolean']['output']>;
  /** Short name of the assay. */
  shortName?: Maybe<Scalars['String']['output']>;
};

/** Sort types. Contain the sort field and direction. */
export type AssociationSort = {
  /** The direction to sort in. */
  direction: SortDirection;
  /**
   * The key to sort by. Can either be `score` to use the overall association score (default) or
   * a datasource id (e.g., `impc`).
   */
  key?: Scalars['String']['input'];
};

/** Association time series entry for a target-disease association. */
export type AssociationTimeseries = {
  __typename?: 'AssociationTimeseries';
  /** Type of aggregation used to calculate the yearly evidence count. */
  aggregationType: AggregationType;
  /**
   * Datasource identifier of the aggregation: eg. `gwas_credible_set` or `None` if the
   * aggregation is by overall score.
   */
  aggregationValue?: Maybe<Datasource>;
  /** Association score based on evidence up until a given year. */
  associationScore: Scalars['Float']['output'];
  /** EFO ID of the association disease. */
  diseaseId: Scalars['String']['output'];
  /**
   * Flag indicating whether the novelty calculation is based on direct evidence only or
   * includes indirect evidence.
   */
  isDirect: Scalars['Boolean']['output'];
  /** Novelty of the association at the given year. */
  novelty?: Maybe<Scalars['Float']['output']>;
  /** Ensembl ID of the association target. */
  targetId: Scalars['String']['output'];
  /** Year up to and including which evidence is considered. */
  year?: Maybe<Scalars['Int']['output']>;
  /**
   * Yearly count of evidence supporting the disease/target association (for a given
   * datasource).
   */
  yearlyEvidenceCount?: Maybe<Scalars['Int']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type AssociationTimeseriesPage = {
  __typename?: 'AssociationTimeseriesPage';
  count: Scalars['Int']['output'];
  rows: Array<AssociationTimeseries>;
};

/** Attributes of the hallmark annotation. */
export type Attributes = {
  __typename?: 'Attributes';
  /** Description of the hallmark attribute. */
  description: Scalars['String']['output'];
  /** Name of the hallmark attribute. */
  name: Scalars['String']['output'];
  /** PubMed ID of the supporting literature for the hallmark attribute [bioregistry:pubmed]. */
  pmid?: Maybe<Scalars['Int']['output']>;
};

/** Aggregated expression data generated from RNA-seq and mass spectrometry proteomic data. */
export type BaselineExpression = {
  __typename?: 'BaselineExpression';
  /** Cell type biosample reported by study. */
  celltypeBiosample?: Maybe<Biosample>;
  /** Tissue or cell type reported by study. */
  celltypeBiosampleFromSource?: Maybe<Scalars['String']['output']>;
  /** Cell type biosample parent reported by study. */
  celltypeBiosampleParent?: Maybe<Biosample>;
  /** Origin of expression data. */
  datasourceId: Scalars['String']['output'];
  /** Type of expression data. */
  datatypeId: Scalars['String']['output'];
  /**
   * Proportion of biosamples, within the dataset, that display median expression above a
   * threshold.
   */
  distributionScore: Scalars['Float']['output'];
  /** Maximum value of expression. */
  max?: Maybe<Scalars['Float']['output']>;
  /** Median value of expression. */
  median?: Maybe<Scalars['Float']['output']>;
  /** Minimum value of expression. */
  min?: Maybe<Scalars['Float']['output']>;
  /** First quantile of expression. */
  q1?: Maybe<Scalars['Float']['output']>;
  /** Third quantile of expression. */
  q3?: Maybe<Scalars['Float']['output']>;
  /** Quality control flags or notes for baseline expression. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Measure of how specific expression is to a biosample. */
  specificityScore?: Maybe<Scalars['Float']['output']>;
  /** Target identifier from the source. */
  targetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the target. */
  targetId: Scalars['String']['output'];
  /** Tissue biosample reported by study. */
  tissueBiosample?: Maybe<Biosample>;
  /** Cell type reported by study. */
  tissueBiosampleFromSource?: Maybe<Scalars['String']['output']>;
  /** Tissue biosample parent reported by study. */
  tissueBiosampleParent?: Maybe<Biosample>;
  /** Unit for the target expression. */
  unit: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type BaselineExpressionPage = {
  __typename?: 'BaselineExpressionPage';
  count: Scalars['Int']['output'];
  rows: Array<BaselineExpression>;
};

/** Container for all biological model-related attributes. */
export type BiologicalModels = {
  __typename?: 'BiologicalModels';
  /** The specific allelic composition of the mouse model. */
  allelicComposition: Scalars['String']['output'];
  /** The genetic background strain of the mouse model. */
  geneticBackground: Scalars['String']['output'];
  /** Unique identifier for the biological model [bioregistry:mgi]. */
  id?: Maybe<Scalars['String']['output']>;
  /** References related to the mouse model [bioregistry:pubmed]. */
  literature: Array<Scalars['String']['output']>;
};

export type BiomarkerGeneExpression = {
  __typename?: 'BiomarkerGeneExpression';
  id?: Maybe<GeneOntology>;
  /** Raw gene expression annotation from the source. */
  name?: Maybe<Scalars['String']['output']>;
};

/** List of biomarkers. */
export type Biomarkers = {
  __typename?: 'Biomarkers';
  /** List of gene expression altering biomarkers. */
  geneExpression: Array<BiomarkerGeneExpression>;
  /** List of genetic variation biomarkers. */
  geneticVariation: Array<GeneticVariation>;
};

/**
 * Integration of biosample metadata about tissues or cell types derived from multiple ontologies
 * including EFO, UBERON, CL, GO and others.
 */
export type Biosample = {
  __typename?: 'Biosample';
  /** List of ancestor biosample IDs in the ontology. */
  ancestors: Array<Scalars['String']['output']>;
  /** Unique identifier for the biosample. */
  biosampleId: Scalars['String']['output'];
  /** Name of the biosample. */
  biosampleName: Scalars['String']['output'];
  /** Direct child biosample IDs in the ontology. */
  children: Array<Scalars['String']['output']>;
  /** List of descendant biosample IDs in the ontology. */
  descendants: Array<Scalars['String']['output']>;
  /** Description of the biosample. */
  description?: Maybe<Scalars['String']['output']>;
  /** Direct parent biosample IDs in the ontology. */
  parents: Array<Scalars['String']['output']>;
  /** List of synonymous names for the term. */
  synonyms: Array<Scalars['String']['output']>;
  /** Cross-reference IDs from other ontologies. */
  xrefs: Array<Scalars['String']['output']>;
};

/** Cancer hallmarks associated with the target gene. */
export type CancerHallmarks = {
  __typename?: 'CancerHallmarks';
  /** Description of the cancer hallmark. */
  description: Scalars['String']['output'];
  /** Impact of the cancer hallmark on the target. */
  impact?: Maybe<Scalars['String']['output']>;
  /** Label associated with the cancer hallmark. */
  label: Scalars['String']['output'];
  /** PubMed ID of the supporting literature for the cancer hallmark [bioregistry:pubmed]. */
  pmid: Scalars['Int']['output'];
};

/** The Ensembl canonical transcript of the target gene. */
export type CanonicalTranscript = {
  __typename?: 'CanonicalTranscript';
  /** Chromosome location of the canonical transcript. */
  chromosome: Scalars['String']['output'];
  /** Genomic end position of the canonical transcript. */
  end: Scalars['Int']['output'];
  /** The Ensembl transcript identifier for the canonical transcript. */
  id: Scalars['String']['output'];
  /** Genomic start position of the canonical transcript. */
  start: Scalars['Int']['output'];
  /** Strand orientation of the canonical transcript. */
  strand: Strand;
};

/** Entity category this similarity refers to (`Target`, `Disease` or `Drug`). */
export enum Category {
  /** The similarity refers to a `Disease` entity. */
  Disease = 'DISEASE',
  /** The similarity refers to a `Drug` entity. */
  Drug = 'DRUG',
  /** The similarity refers to a `Target` entity. */
  Target = 'TARGET'
}

/**
 * Chemical probes related to the target. High-quality chemical probes are small molecules that can
 * be used to modulate and study the function of proteins.
 */
export type ChemicalProbe = {
  __typename?: 'ChemicalProbe';
  /** Whether the chemical probe serves as a control. */
  control?: Maybe<Scalars['String']['output']>;
  /** Probe identifier from the source, used to cross-reference drug information. */
  drugFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Drug ID associated with the chemical probe. */
  drugId?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the chemical probe. */
  id: Scalars['String']['output'];
  /** Indicates if the chemical probe is high quality. */
  isHighQuality: Scalars['Boolean']['output'];
  /** Mechanism of action of the chemical probe. */
  mechanismOfAction: Array<Scalars['String']['output']>;
  /** Origin of the chemical probe. */
  origin: Array<Scalars['String']['output']>;
  /** Score for chemical probes related to druggability. */
  probesDrugsScore?: Maybe<Scalars['Float']['output']>;
  /** Score indicating chemical probe activity in cells. */
  scoreInCells?: Maybe<Scalars['Float']['output']>;
  /** Score indicating chemical probe activity in organisms. */
  scoreInOrganisms?: Maybe<Scalars['Float']['output']>;
  /** Ensembl gene ID of the target for the chemical probe. */
  targetFromSourceId: Scalars['String']['output'];
  /** URLs linking to more information about the chemical probe. */
  urls: Array<Url>;
};

/** Chromosome type. */
export enum Chromosome {
  Chr1 = 'chr1',
  Chr2 = 'chr2',
  Chr3 = 'chr3',
  Chr4 = 'chr4',
  Chr5 = 'chr5',
  Chr6 = 'chr6',
  Chr7 = 'chr7',
  Chr8 = 'chr8',
  Chr9 = 'chr9',
  Chr10 = 'chr10',
  Chr11 = 'chr11',
  Chr12 = 'chr12',
  Chr13 = 'chr13',
  Chr14 = 'chr14',
  Chr15 = 'chr15',
  Chr16 = 'chr16',
  Chr17 = 'chr17',
  Chr18 = 'chr18',
  Chr19 = 'chr19',
  Chr20 = 'chr20',
  Chr21 = 'chr21',
  Chr22 = 'chr22',
  Chrmt = 'chrmt',
  Chrx = 'chrx',
  Chry = 'chry'
}

/** Diseases associated with the clinical report. */
export type ClinicalDiseaseListItem = {
  __typename?: 'ClinicalDiseaseListItem';
  /** Disease in the clinical report. */
  disease: Disease;
  /** Disease name as reported in the source. */
  diseaseFromSource: Scalars['String']['output'];
};

/** A drug-disease pair as reported by clinical trial records. */
export type ClinicalIndication = {
  __typename?: 'ClinicalIndication';
  clinicalReports: Array<ClinicalReport>;
  /** The disease entity related to this clinical indication. */
  disease: Disease;
  /** The molecule entity related to this clinical indication. */
  drug: Drug;
  /** Hash of drugId and diseaseId. */
  id: Scalars['String']['output'];
  /** Maximum Clinical Development Status for the association. */
  maxClinicalStage: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type ClinicalIndicationPage = {
  __typename?: 'ClinicalIndicationPage';
  count: Scalars['Int']['output'];
  rows: Array<ClinicalIndication>;
};

/** A clinical record (e.g. trial, drug label) reporting on drugs and diseases. */
export type ClinicalReport = {
  __typename?: 'ClinicalReport';
  /** Clinical stage of the report. */
  clinicalStage: ClinicalStage;
  /** Countries associated with the clinical report. */
  countries: Array<Scalars['String']['output']>;
  /** Diseases associated with the clinical report. */
  diseases: Array<ClinicalDiseaseListItem>;
  /** Drugs associated with the clinical report. */
  drugs: Array<ClinicalReportDrugListItem>;
  /**
   * Kind of evidence the report describes: INDICATION for a drug/disease claim, SAFETY for a
   * drug warning.
   */
  evidenceType?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the clinical report. */
  id: Scalars['String']['output'];
  /** Nature of the record the report originates from. */
  origin: Origin;
  /** Clinical phase as reported in the source. */
  phaseFromSource?: Maybe<Scalars['String']['output']>;
  /** Resource or organisation that distributes the data fetched from the primary source. */
  provider: Provider;
  /** Quality control flags or notes for the clinical report. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Side effects or adverse events associated with the clinical report. */
  sideEffects: Array<ClinicalSideEffectListItem>;
  /** Source database or registry from which the clinical report was obtained. */
  source: Scalars['String']['output'];
  /** Title of the clinical report. */
  title?: Maybe<Scalars['String']['output']>;
  /** Brief description of the clinical trial. */
  trialDescription?: Maybe<Scalars['String']['output']>;
  /** Literature references associated with the clinical trial. */
  trialLiterature: Array<TrialLiterature>;
  /** Number of arms in the clinical trial. */
  trialNumberOfArms?: Maybe<Scalars['Int']['output']>;
  /** Official title of the clinical trial as registered. */
  trialOfficialTitle?: Maybe<Scalars['String']['output']>;
  /** Overall status of the clinical trial (e.g. Completed, Terminated). */
  trialOverallStatus?: Maybe<Scalars['String']['output']>;
  /** Phase of the clinical trial. */
  trialPhase?: Maybe<Scalars['String']['output']>;
  /** Primary purpose of the clinical trial (e.g. Treatment, Prevention). */
  trialPrimaryPurpose?: Maybe<Scalars['String']['output']>;
  /** Lead sponsor associated with the clinical trial. */
  trialSponsor: TrialSponsor;
  /** Start date of the clinical trial. */
  trialStartDate?: Maybe<Scalars['NaiveDate']['output']>;
  /** Categories describing reasons why the trial was stopped. */
  trialStopReasonCategories: Array<Scalars['String']['output']>;
  /** Type of clinical study (e.g. Interventional, Observational). */
  trialStudyType?: Maybe<TrialStudyType>;
  /** Reason provided for stopping the clinical trial. */
  trialWhyStopped?: Maybe<Scalars['String']['output']>;
  /** URL linking to the source record. */
  url?: Maybe<Scalars['String']['output']>;
  /** Year the report was registered or published. */
  year?: Maybe<Scalars['Int']['output']>;
};

export type ClinicalReportDrugListItem = {
  __typename?: 'ClinicalReportDrugListItem';
  /** Drug name as reported in the source. */
  drugFromSource: Scalars['String']['output'];
};

/** Side effects or adverse events associated with the clinical report. */
export type ClinicalSideEffectListItem = {
  __typename?: 'ClinicalSideEffectListItem';
  /** Disease for the reported side effect. */
  disease?: Maybe<Disease>;
  /** Side effect disease name as reported in the source. */
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
};

/** Clinical stage of the report. */
export enum ClinicalStage {
  /** The drog is approved for general use. */
  Approval = 'APPROVAL',
  /** Early phase 1. */
  EarlyPhase_1 = 'EARLY_PHASE_1',
  /** Ind. */
  Ind = 'IND',
  /** Phase 1. */
  Phase_1 = 'PHASE_1',
  /** Phase 1/2. */
  Phase_1_2 = 'PHASE_1_2',
  /** Phase 2. */
  Phase_2 = 'PHASE_2',
  /** Phase 2/3. */
  Phase_2_3 = 'PHASE_2_3',
  /** Phase 3. */
  Phase_3 = 'PHASE_3',
  /** Phase 4. */
  Phase_4 = 'PHASE_4',
  /** Preapproval. */
  Preapproval = 'PREAPPROVAL',
  /** Preclinical stage. */
  Preclinical = 'PRECLINICAL',
  /** Unknown phase. */
  Unknown = 'UNKNOWN',
  /** The drug has been Withdrawn. */
  Withdrawal = 'WITHDRAWAL'
}

/**
 * GWAS-GWAS and GWAS-molQTL credible set colocalisation results. Dataset includes colocalising
 * pairs as well as the method and statistics used to estimate the colocalisation.
 */
export type Colocalisation = {
  __typename?: 'Colocalisation';
  /** Average sign of the beta ratio between colocalised variants. */
  betaRatioSignAverage: Scalars['Float']['output'];
  /** Chromosome where the colocalisation occurs. */
  chromosome: Chromosome;
  /**
   * Colocalisation posterior probability (CLPP) score estimating the probability of shared
   * causal variants. Used in eCAVIAR method.
   */
  clpp: Scalars['Float']['output'];
  /** Method used to estimate colocalisation (e.g., coloc, eCAVIAR). */
  colocalisationMethod: Scalars['String']['output'];
  /**
   * Posterior probability that both traits are associated, but with different causal variants
   * (H3). Used in coloc method.
   */
  h3: Scalars['Float']['output'];
  /**
   * Posterior probability that both traits are associated and share a causal variant (H4). Used
   * in coloc method.
   */
  h4: Scalars['Float']['output'];
  /** Number of variants intersecting between two overlapping study-loci. */
  numberColocalisingVariants: Scalars['Int']['output'];
  /** The other credible set (study-locus) in the colocalisation pair. */
  otherStudyLocus?: Maybe<CredibleSet>;
  /** The other credible set (study-locus) in the colocalisation pair. */
  otherStudyLocusId: Scalars['String']['output'];
  /** Type of the right-side study (e.g., gwas, eqtl, pqtl). */
  rightStudyType: StudyType;
  /** Credible set (study-locus) on the left side of the colocalisation pair. */
  studyLocusId: Scalars['String']['output'];
};

/** Filter for colocalisations. */
export type ColocalisationFilter = {
  /** Keep colocalisations whose study type is one of these. */
  studyTypes?: Array<StudyType>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type ColocalisationPage = {
  __typename?: 'ColocalisationPage';
  count: Scalars['Int']['output'];
  rows: Array<Colocalisation>;
};

/**
 * Constraint scores for the target gene from GnomAD. Indicates gene intolerance to
 * loss-of-function mutations.
 */
export type Constraint = {
  __typename?: 'Constraint';
  /** Type of constraint applied to the target. */
  constraintType: Scalars['String']['output'];
  /** Expected constraint score. */
  exp?: Maybe<Scalars['Float']['output']>;
  /** Observed constraint score. */
  obs?: Maybe<Scalars['Int']['output']>;
  /** Observed/Expected (OE) constraint score. */
  oe?: Maybe<Scalars['Float']['output']>;
  /** Lower bound of the OE constraint score. */
  oeLower?: Maybe<Scalars['Float']['output']>;
  /** Upper bound of the OE constraint score. */
  oeUpper?: Maybe<Scalars['Float']['output']>;
  /** Constraint score indicating gene intolerance. */
  score?: Maybe<Scalars['Float']['output']>;
  /** Upper bin classification going from more constrained to less constrained. */
  upperBin?: Maybe<Scalars['Int']['output']>;
  /**
   * Interpretable classification of constraint based on 6 bins. [GnomAD labels: 0: `very high`,
   * 1: `high`, 2: `medium`, 3: `low`, 4: `very low`, 5: `very low`].
   */
  upperBin6?: Maybe<Scalars['Int']['output']>;
  /**
   * Upper rank classification for every coding gene assessed by GnomAD going from more
   * constrained to less constrained.
   */
  upperRank?: Maybe<Scalars['Int']['output']>;
};

/**
 * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
 * credible set (locus) as well as the fine-mapping method and derived statistics.
 */
export type CredibleSet = {
  __typename?: 'CredibleSet';
  /** Beta coefficient of the lead variant. */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Chromosome which the credible set is located. */
  chromosome: Chromosome;
  /**
   * GWAS-GWAS and GWAS-molQTL credible set colocalisation results. Dataset includes colocalising
   * pairs as well as the method and statistics used to estimate the colocalisation.
   */
  colocalisation: ColocalisationPage;
  /** Description of how this credible set was derived in terms of data and fine-mapping method. */
  confidence: Scalars['String']['output'];
  /** Integer label for the order of credible sets from study-region. */
  credibleSetIndex?: Maybe<Scalars['Int']['output']>;
  /** Log10 Bayes factor for the entire credible set. */
  credibleSetlog10BF?: Maybe<Scalars['Float']['output']>;
  /** Allele frequency of the lead variant from the GWAS. */
  effectAlleleFrequencyFromSource?: Maybe<Scalars['Float']['output']>;
  /** Method used for fine-mapping of credible set. */
  finemappingMethod: Scalars['String']['output'];
  /** Boolean for whether this credible set is a trans-pQTL or not. */
  isTransQtl?: Maybe<Scalars['Boolean']['output']>;
  /** Predictions from Locus2gene gene assignment model. */
  l2GPredictions: L2GPredictionPage;
  /** Array of structs which denote the variants in LD with the credible set lead variant. */
  ldSet: Array<Ldset>;
  /** Locus information for all variants in the credible set. */
  locus: LocusPage;
  /** End position of the region that was fine-mapped for this credible set. */
  locusEnd?: Maybe<Scalars['Int']['output']>;
  /** Start position of the region that was fine-mapped for this credible set. */
  locusStart?: Maybe<Scalars['Int']['output']>;
  /** Exponent value of the lead variant P-value. */
  pValueExponent: Scalars['Int']['output'];
  /** Mantissa value of the lead variant P-value. */
  pValueMantissa: Scalars['Float']['output'];
  /** Position of the lead variant for the credible set (`GRCh38`). */
  position: Scalars['Int']['output'];
  /** Mean R-squared linkage disequilibrium for variants in the credible set. */
  purityMeanR2?: Maybe<Scalars['Float']['output']>;
  /** Minimum R-squared linkage disequilibrium for variants in the credible set. */
  purityMinR2?: Maybe<Scalars['Float']['output']>;
  /**
   * Ensembl identifier of the gene representing a specific gene whose molecular is being
   * analysed in molQTL study.
   */
  qtlGeneId?: Maybe<Scalars['String']['output']>;
  /** Quality control flags for this credible set. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Start and end positions of the region used for fine-mapping. */
  region?: Maybe<Scalars['String']['output']>;
  /** Sample size of the study which this credible set is derived. */
  sampleSize?: Maybe<Scalars['Int']['output']>;
  /** Standard error of the lead variant. */
  standardError?: Maybe<Scalars['Float']['output']>;
  /** GWAS or molQTL study in which the credible set was identified. */
  study?: Maybe<Study>;
  /** Identifier of the GWAS or molQTL study in which the credible set was identified. */
  studyId: Scalars['String']['output'];
  /** Identifier of the credible set (`StudyLocus`). */
  studyLocusId: Scalars['String']['output'];
  /** Descriptor for whether the credible set is derived from GWAS or molecular QTL. */
  studyType: StudyType;
  /** [Deprecated] */
  subStudyDescription?: Maybe<Scalars['String']['output']>;
  /** The lead variant for the credible set, by posterior probability. */
  variant?: Maybe<Variant>;
  /** Z-score of the lead variant from the GWAS. */
  zScore?: Maybe<Scalars['Float']['output']>;
};


/**
 * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
 * credible set (locus) as well as the fine-mapping method and derived statistics.
 */
export type CredibleSetColocalisationArgs = {
  filter?: ColocalisationFilter;
  page?: Page;
};


/**
 * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
 * credible set (locus) as well as the fine-mapping method and derived statistics.
 */
export type CredibleSetL2GPredictionsArgs = {
  page?: Page;
};


/**
 * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
 * credible set (locus) as well as the fine-mapping method and derived statistics.
 */
export type CredibleSetLocusArgs = {
  filter?: InputMaybe<LocusFilter>;
  page?: Page;
};

/** Filter for credible sets. */
export type CredibleSetFilter = {
  /** Keep credible sets whose study type is one of these. */
  studyTypes?: InputMaybe<Array<StudyType>>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type CredibleSetPage = {
  __typename?: 'CredibleSetPage';
  count: Scalars['Int']['output'];
  rows: Array<CredibleSet>;
};

/** Represents a datasource for association scoring. */
export enum Datasource {
  /**
   * Expert-curated cancer biomarkers of drug sensitivity, resistance, and toxicity from Cancer
   * Genome Interpreter, by cancer type.
   * See <https://platform-docs.opentargets.org/evidence#cancer-biomarkers>.
   */
  CancerBiomarkers = 'cancer_biomarkers',
  /**
   * Cancer Gene Census (CGC, part of COSMIC): curated genes with mutations causally implicated
   * in cancer, aggregated per target-disease.
   * See <https://platform-docs.opentargets.org/evidence#cancer-gene-census>.
   */
  CancerGeneCensus = 'cancer_gene_census',
  /**
   * ClinGen gene-disease validity curation: evaluates the strength of evidence for a gene
   * causing a disease, classified via a semi-quantitative framework.
   * See <https://platform-docs.opentargets.org/evidence#clingen>.
   */
  Clingen = 'clingen',
  /**
   * Clinical evidence linking a target/disease via a drug that targets the gene product and is
   * indicated for the disease (approved or in development); inferred from clinical reports +
   * drug MoA data.
   * See <https://platform-docs.opentargets.org/evidence#clinical-precedence>.
   */
  ClinicalPrecedence = 'clinical_precedence',
  /**
   * Cancer target dependencies from whole-genome CRISPR-Cas9 fitness screens in cell lines
   * (Project Score, Sanger), mapped to tumours; targets scoring ≥ 36.0.
   * See <https://platform-docs.opentargets.org/evidence#project-score>.
   */
  Crispr = 'crispr',
  /**
   * Target-disease evidence from genome-wide CRISPRi/a/KO functional genomics screens in human
   * brain cell types (CRISPRbrain), linking cell types to diseases.
   * See <https://platform-docs.opentargets.org/evidence#crispr-screens>.
   */
  CrisprScreen = 'crispr_screen',
  /**
   * Target-disease co-occurrences mined from Europe PMC literature via deep-learning NER,
   * aggregated per publication with a confidence assessment.
   * See <https://platform-docs.opentargets.org/evidence#europe-pmc>.
   */
  Europepmc = 'europepmc',
  /**
   * Germline variant-phenotype relationships from ClinVar (NIH archive), the germline subset;
   * each evidence captures a single RCV record.
   * See <https://platform-docs.opentargets.org/evidence#clinvar>.
   */
  Eva = 'eva',
  /**
   * Somatic variant-phenotype relationships from ClinVar (NIH archive), the somatic subset; each
   * evidence captures a single RCV record.
   * See <https://platform-docs.opentargets.org/evidence#clinvar-somatic>.
   */
  EvaSomatic = 'eva_somatic',
  /**
   * Target-disease evidence from differentially expressed genes (disease vs control) in EMBL-EBI
   * Expression Atlas; each study contrast is one evidence.
   * See <https://platform-docs.opentargets.org/evidence#expression-atlas>.
   */
  ExpressionAtlas = 'expression_atlas',
  /**
   * Gene-disease relationships from Gene2Phenotype (G2P), literature-curated by expert clinical
   * geneticist panels.
   * See <https://platform-docs.opentargets.org/evidence#gene2phenotype>.
   */
  Gene2phenotype = 'gene2phenotype',
  /**
   * Gene–phenotype relationships observed in gene-level association tests using rare variant
   * collapsing analyses.
   * See <https://platform-docs.opentargets.org/evidence#gene-burden>.
   */
  GeneBurden = 'gene_burden',
  /**
   * Gene-disease relationships from Genomics England PanelApp expert-reviewed gene panels.
   * See <https://platform-docs.opentargets.org/evidence#genomics-england-gel-panelapp>.
   */
  GenomicsEngland = 'genomics_england',
  /**
   * Target-disease relationships from GWAS-significant signals, fine-mapped, colocalised against
   * molQTL, and scored by the Locus-to-Gene (L2G) ML method; evidence is any credible set with
   * L2G > 0.05.
   * See <https://platform-docs.opentargets.org/evidence#gwas-associations>.
   */
  GwasCredibleSets = 'gwas_credible_sets',
  /**
   * Target-disease evidence from mouse knockout genotype-phenotype associations (IMPC), scored
   * by human-mouse phenotypic similarity (PhenoDigm).
   * See <https://platform-docs.opentargets.org/evidence#impc>.
   */
  Impc = 'impc',
  /**
   * IntOGen consensus cancer driver genes from harmonised tumour sequencing (PCAWG and others);
   * each evidence is a significant driver in one cohort.
   * See <https://platform-docs.opentargets.org/evidence#intogen>.
   */
  Intogen = 'intogen',
  /**
   * Orphanet gene-disease associations for rare disorders of genetic origin, with relationship
   * classification, mutation type, and supporting references.
   * See <https://platform-docs.opentargets.org/evidence#orphanet>.
   */
  Orphanet = 'orphanet',
  /**
   * Reactome-curated reaction pathways affected by disease, linking target to disease via
   * protein-coding mutation or altered expression.
   * See <https://platform-docs.opentargets.org/evidence#reactome>.
   */
  Reactome = 'reactome',
  /**
   * UniProt-curated target-disease relationships from publications supporting a protein's
   * involvement in disease, aggregated per evidence.
   * See <https://platform-docs.opentargets.org/evidence#uniprot-literature>.
   */
  UniprotLiterature = 'uniprot_literature',
  /**
   * UniProt-curated variants known to alter protein function in disease, aggregated from
   * supporting publications.
   * See <https://platform-docs.opentargets.org/evidence#uniprot-curated-variants>.
   */
  UniprotVariants = 'uniprot_variants'
}

/** Represents the policy for a datasource. */
export type DatasourcePolicy = {
  /** Whether the datasource is required for the association to be considered valid. */
  required: Scalars['Boolean']['input'];
  /** The weight of the datasource in association scoring. Range is [0.0, 1.0]. */
  weight: Scalars['Float']['input'];
};

/** Policy override for a datasource. */
export type DatasourcePolicyOverride = {
  /** The datasource to override the policy for. */
  id: Datasource;
  /** The policy to override with. */
  policy: DatasourcePolicy;
};

/** Cross-references for the variant in different databases. */
export type DbXref = {
  __typename?: 'DbXref';
  /** Identifier of the variant in the given database. */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the database the variant is referenced in. */
  source?: Maybe<Scalars['String']['output']>;
};

export type DepMapEssentiality = {
  __typename?: 'DepMapEssentiality';
  /** List of CRISPR screening experiments supporting the essentiality assessment. */
  screens: Array<GeneEssentialityScreen>;
  /** Identifier of the tissue from where the cells were sampled for assay [bioregistry:uberon]. */
  tissueId?: Maybe<Scalars['String']['output']>;
  /** Name of the tissue from where the cells were sampled for assay. */
  tissueName?: Maybe<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DepMapEssentialityPage = {
  __typename?: 'DepMapEssentialityPage';
  count: Scalars['Int']['output'];
  rows: Array<DepMapEssentiality>;
};

/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type Disease = {
  __typename?: 'Disease';
  /** List of all ancestral disease terms. */
  ancestors: Array<Scalars['String']['output']>;
  /**
   * Disease-target associations computed on the fly with configurable datasource weights and
   * filters.
   */
  associatedTargets: TargetAssociationPage;
  /** Association time series. */
  associationTimeSeries: AssociationTimeseriesPage;
  /** Direct child terms in the disease ontology. */
  children: Array<Disease>;
  /** Cross-references in other disease ontologies. */
  dbXRefs: Array<Scalars['String']['output']>;
  /** List of all descendant terms. */
  descendants: Array<Scalars['String']['output']>;
  /** Description of the disease. */
  description?: Maybe<Scalars['String']['output']>;
  /** EFO terms for direct anatomical locations. */
  directLocationIds: Array<Scalars['String']['output']>;
  /** Clinical indications for this disease as reported by clinical trial records. */
  drugAndClinicalCandidates: ClinicalIndicationPage;
  evidences: EvidencePage;
  /** Open Targets disease identifier [bioregistry:efo]. */
  id: Scalars['String']['output'];
  /** EFO terms for indirect anatomical locations (propagated). */
  indirectLocationIds: Array<Scalars['String']['output']>;
  /** List of studies associated with the disease and its descendants. */
  indirectStudyIds: Array<Scalars['String']['output']>;
  /** Boolean column indicating if a disease is root of the ontology tree, a therapeutic area. */
  isTherapeuticArea: Scalars['Boolean']['output'];
  /**
   * Return the list of publications that mention the main entity, alone or in combination with
   * other entities.
   */
  literatureOcurrences: PublicationPage;
  /** Name of the disease. */
  name: Scalars['String']['output'];
  /** List of obsoleted terms. */
  obsoleteTerms: Array<Scalars['String']['output']>;
  /** Direct parent terms in the disease ontology. */
  parents: Array<Disease>;
  /**
   * Clinical signs and symptoms observed in diseases or phenotypes. Signs and symptoms are
   * integrated from multiple sources including EFO, MONDO and HPO.
   */
  phenotypes: DiseasePhenotypePage;
  /** Semantically similar diseases based on a PubMed word embedding model. */
  similarEntities: SimilarEntityPage;
  /** List of studies associated with the disease. */
  studyIds: Array<Scalars['String']['output']>;
  /** List of synonyms for the disease. */
  synonyms: Array<DiseaseSynonym>;
  /** List of major therapeutic areas the disease belongs to. */
  therapeuticAreas: Array<Scalars['String']['output']>;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseAssociatedTargetsArgs = {
  BFilter?: InputMaybe<Scalars['String']['input']>;
  Bs?: Array<Scalars['String']['input']>;
  datasourcePolicyOverrides?: Array<DatasourcePolicyOverride>;
  facetFilters?: Array<Scalars['String']['input']>;
  page?: Page;
  sort?: AssociationSort;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseAssociationTimeSeriesArgs = {
  aggregationTypes?: InputMaybe<Array<AggregationType>>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  ensemblId: Scalars['String']['input'];
  isDirect: Scalars['Boolean']['input'];
  page?: Page;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseDrugAndClinicalCandidatesArgs = {
  page?: Page;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseEvidencesArgs = {
  datasourceIds?: Array<Datasource>;
  ensemblIds: Array<Scalars['String']['input']>;
  page?: Page;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  page?: Page;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseasePhenotypesArgs = {
  page?: Page;
};


/**
 * Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood
 * as any disease, phenotype, biological process or measurement that might have any type of
 * causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO)
 * (slim version) is used as scaffold for the disease or phenotype entity.
 */
export type DiseaseSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: Page;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** A scored association between a disease and a target or vice versa. */
export type DiseaseAssociation = {
  __typename?: 'DiseaseAssociation';
  /** Association scores computed for every datasource (e.g., IMPC, ChEMBL, Gene2Phenotype). */
  datasourceScores: Array<Score>;
  /** Associated disease entity. */
  disease?: Maybe<Disease>;
  /**
   * Overall association score aggregated across all evidence types. A higher score indicates a
   * stronger association between target and disease. Scores are normalized to a range of 0-1.
   */
  score: Scalars['Float']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DiseaseAssociationPage = {
  __typename?: 'DiseaseAssociationPage';
  count: Scalars['Int']['output'];
  rows: Array<DiseaseAssociation>;
};

/** Cancer cell lines used to generate evidence. */
export type DiseaseCellLine = {
  __typename?: 'DiseaseCellLine';
  /** Cell type identifier in cell ontology or in cell model database. */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the cell model. */
  name?: Maybe<Scalars['String']['output']>;
  /** Name of the tissue from which the cells were sampled. */
  tissue?: Maybe<Scalars['String']['output']>;
  /** Anatomical identifier of the sampled organ/tissue [bioregistry:uberon]. */
  tissueId?: Maybe<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DiseasePage = {
  __typename?: 'DiseasePage';
  count: Scalars['Int']['output'];
  rows: Array<Disease>;
};

/**
 * Clinical signs and symptoms observed in diseases or phenotypes. Signs and symptoms are
 * integrated from multiple sources including EFO, MONDO and HPO.
 */
export type DiseasePhenotype = {
  __typename?: 'DiseasePhenotype';
  /**
   * A container for all evidence-related attributes supporting the disease-phenotype
   * association.
   */
  evidence: Array<PhenotypeEvidence>;
  /** Resolved EFO term. Null when the phenotype id is an HPO. */
  phenotypeEFO?: Maybe<Disease>;
  /** Resolved HPO term. Null when the phenotype id is not an HPO (e.g. MONDO). */
  phenotypeHPO?: Maybe<Hpo>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DiseasePhenotypePage = {
  __typename?: 'DiseasePhenotypePage';
  count: Scalars['Int']['output'];
  rows: Array<DiseasePhenotype>;
};

/** Sort types. Contain the sort field and direction. */
export type DiseaseSort = {
  /** The direction to sort in. */
  direction?: SortDirection;
  /** The field to sort by. */
  key: DiseaseSortField;
};

/** Contains the fields available for sorting diseases. */
export enum DiseaseSortField {
  Id = 'ID',
  IsTherapeuticArea = 'IS_THERAPEUTIC_AREA',
  Name = 'NAME'
}

/** List of synonymous disease labels. */
export type DiseaseSynonym = {
  __typename?: 'DiseaseSynonym';
  relation: Scalars['String']['output'];
  terms: Array<Maybe<Scalars['String']['output']>>;
};

/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type Drug = {
  __typename?: 'Drug';
  /** Significant adverse events estimated from pharmacovigilance reports deposited in FAERS. */
  adverseEvents?: Maybe<AdverseEventPage>;
  /** List of molecules corresponding to derivative compounds. */
  childMolecules: Array<Drug>;
  /** Cross-reference information for this molecule from external databases. */
  crossReferences: Array<DrugReferences>;
  /** Summary of the drug's clinical development. */
  description?: Maybe<Scalars['String']['output']>;
  /** Classification of the molecule's therapeutic category or chemical class (e.g. Antibody). */
  drugType: Scalars['String']['output'];
  /** Warnings present on drug as identified by ChEMBL. */
  drugWarnings: DrugWarningPage;
  /** Drug or clinical candidate molecule identifier. */
  id: Scalars['String']['output'];
  /** Clinical indications for this drug as reported by clinical trial records. */
  indications: ClinicalIndicationPage;
  /**
   * Return the list of publications that mention the main entity, alone or in combination with
   * other entities.
   */
  literatureOcurrences: PublicationPage;
  /** Highest clinical stage reached by the drug or clinical candidate molecule. */
  maximumClinicalStage: Scalars['String']['output'];
  /**
   * Mechanisms of action to produce intended pharmacological effects. Curated from scientific
   * literature and post-marketing package inserts.
   */
  mechanismsOfAction?: Maybe<MechanismsOfAction>;
  /**
   * Mol Block is a chemical structure file format that serves as a connection table,
   * representing molecules through a list of atoms, bonds, and spatial coordinates.
   */
  molblock?: Maybe<Scalars['String']['output']>;
  /** Generic name of the drug molecule. */
  name: Scalars['String']['output'];
  /** Parent molecule for derivative compounds. */
  parentMolecule?: Maybe<Drug>;
  /**
   * Pharmacogenomics data linking genetic variants to responses to this drug. Data is integrated
   * from sources including ClinPGx and describes how genetic variants influence individual
   * responses to this drug.
   */
  pharmacogenomics: PharmacogenomicsPage;
  /** Semantically similar drugs based on a PubMed word embedding model. */
  similarEntities: SimilarEntityPage;
  /**
   * List of alternative names for the drug, each with its source (e.g. ChEMBL, or AACT for
   * names mined from clinical trials).
   */
  synonyms: Array<DrugLabelAndSource>;
  /** List of brand names for the drug, each with its source. */
  tradeNames: Array<DrugLabelAndSource>;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugAdverseEventsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugDrugWarningsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugIndicationsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  page?: Page;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugPharmacogenomicsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug or clinical candidate molecules. A drug in the platform is understood
 * as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database.
 * All ChEMBL molecules fullfilling any of the next criteria are included in the database: a)
 * Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL
 * molecules included in the DrugBank database d) Molecules that are acknowledged as chemical
 * probes.
 */
export type DrugSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: Page;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** Drug label with source information. */
export type DrugLabelAndSource = {
  __typename?: 'DrugLabelAndSource';
  /** Label value (e.g., synonym, symbol). */
  label: Scalars['String']['output'];
  /** Source database of the label. */
  source: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DrugPage = {
  __typename?: 'DrugPage';
  count: Scalars['Int']['output'];
  rows: Array<Drug>;
};

/** Cross-reference information for a drug molecule. */
export type DrugReferences = {
  __typename?: 'DrugReferences';
  /** List of identifiers from the source database. */
  ids: Array<Scalars['String']['output']>;
  /** Source database providing the cross-reference. */
  source: Scalars['String']['output'];
};

/** Blackbox and withdrawn information for drugs molecules included in ChEMBL database. */
export type DrugWarning = {
  __typename?: 'DrugWarning';
  /** List of molecule identifiers associated with the warning. */
  chemblIds: Array<Scalars['String']['output']>;
  /** Country where the warning was issued. */
  country?: Maybe<Scalars['String']['output']>;
  /** Description of the drug adverse effect. */
  description?: Maybe<Scalars['String']['output']>;
  /** List of disease identifiers associated with the warning [bioregistry:efo]. */
  efoId?: Maybe<Scalars['String']['output']>;
  /** Disease identifier categorising the type of warning [bioregistry:efo] */
  efoIdForWarningClass?: Maybe<Scalars['String']['output']>;
  /** List of disease labels associated with the warning. */
  efoTerm?: Maybe<Scalars['String']['output']>;
  /** Internal identifier for the drug warning record. */
  id?: Maybe<Scalars['Int']['output']>;
  /** List of sources supporting the warning information. */
  references: Array<DrugWarningReference>;
  /** Classification of toxicity type associated with the drug. */
  toxicityClass?: Maybe<Scalars['String']['output']>;
  /** Classification of action taken (drug is withdrawn or has a black box warning). */
  warningType: Scalars['String']['output'];
  /** Year when the warning was issued. */
  year?: Maybe<Scalars['Int']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type DrugWarningPage = {
  __typename?: 'DrugWarningPage';
  count: Scalars['Int']['output'];
  rows: Array<DrugWarning>;
};

export type DrugWarningReference = {
  __typename?: 'DrugWarningReference';
  id: Scalars['String']['output'];
  source: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

/** Drug with drug identifiers. */
export type DrugWithIdentifiers = {
  __typename?: 'DrugWithIdentifiers';
  /** Drug or clinical candidate entity */
  drug?: Maybe<Drug>;
  /** Drug identifier from the original data source. */
  drugFromSource: Scalars['String']['output'];
  /** Drug or clinical candidate identifier. */
  drugId: Scalars['String']['output'];
};

/**
 * Regulatory enhancer/promoter regions to gene (target) predictions for
 * a specific tissue/cell type based on the integration of experimental sources.
 */
export type EnhancerToGene = {
  __typename?: 'EnhancerToGene';
  /** Cell type or tissue where the regulatory region to gene prediction was identified. */
  biosample?: Maybe<Biosample>;
  /** Identifier of the biosample defined by the datasource provider. */
  biosampleFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Name of the biosample where the interval was identified. */
  biosampleName: Scalars['String']['output'];
  /** Chromosome containing the regulatory region. */
  chromosome: Chromosome;
  /** Identifier of the data source providing the regulatory region to gene prediction. */
  datasourceId: Scalars['String']['output'];
  /** Distance from the regulatory region to the transcription start site. */
  distanceToTss: Scalars['Int']['output'];
  /** Genomic end position of the regulatory region. */
  end: Scalars['Int']['output'];
  /** Type of regulatory region (e.g., enhancer, promoter). */
  intervalType: Scalars['String']['output'];
  /** PubMed identifier for the study providing the evidence [bioregistry:pubmed]. */
  pmid: Scalars['String']['output'];
  /** Quality control flags for this interval. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Scores from individual resources used in prediction. */
  resourceScore: Array<ResourceScore>;
  /** Combined score for the enhancer/promoter region to gene prediction. */
  score: Scalars['Float']['output'];
  /** Genomic start position of the regulatory region. */
  start: Scalars['Int']['output'];
  /** Identifier of the study providing the experimental data. */
  studyId: Scalars['String']['output'];
  /** Predicted gene (target). */
  target?: Maybe<Target>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type EnhancerToGenePage = {
  __typename?: 'EnhancerToGenePage';
  count: Scalars['Int']['output'];
  rows: Array<EnhancerToGene>;
};

/** Union of core Platform entities (target, disease, drug, variant, study). */
export type EntityObject = Disease | Study;

export type Evidence = {
  __typename?: 'Evidence';
  /** Origin of the variant allele. */
  alleleOrigins: Array<Scalars['String']['output']>;
  /** Inheritance patterns. */
  allelicRequirements: Array<Scalars['String']['output']>;
  /** Genetic origin of a population. */
  ancestry?: Maybe<Scalars['String']['output']>;
  /** Identifier of the ancestry in the HANCESTRO ontology [bioregistry:hancestro]. */
  ancestryId?: Maybe<Scalars['String']['output']>;
  /** Assays used in the study. */
  assays: Array<Assay>;
  /** Short name of the assay. */
  assessments: Array<Scalars['String']['output']>;
  /** Effect size of numeric traits. */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Lower value of the confidence interval. */
  betaConfidenceIntervalLower?: Maybe<Scalars['Float']['output']>;
  /** Upper value of the confidence interval. */
  betaConfidenceIntervalUpper?: Maybe<Scalars['Float']['output']>;
  /** Allelic composition of the model organism. */
  biologicalModelAllelicComposition?: Maybe<Scalars['String']['output']>;
  /** Genetic background of the model organism. */
  biologicalModelGeneticBackground?: Maybe<Scalars['String']['output']>;
  /** Identifier of the biological model (eg. in MGI). */
  biologicalModelId?: Maybe<Scalars['String']['output']>;
  /** List of biomarkers associated with the biological model. */
  biomarkerList: Array<NameDescription>;
  /** Altered characteristics that influences the disease process. */
  biomarkerName?: Maybe<Scalars['String']['output']>;
  /** List of biomarkers. */
  biomarkers: Biomarkers;
  /** Identifier of the referenced biological material. */
  biosamplesFromSource: Array<Scalars['String']['output']>;
  /** Background of the derived cell lines. */
  cellLineBackground?: Maybe<Scalars['String']['output']>;
  /** The studied cell type. Preferably the cell line ontology label. */
  cellType?: Maybe<Scalars['String']['output']>;
  /** Identifier of the clinical report. */
  clinicalReportId?: Maybe<Scalars['String']['output']>;
  /** Standard terms to define clinical significance. */
  clinicalSignificances: Array<Scalars['String']['output']>;
  /** Clinical stage of the drug-disease pair. */
  clinicalStage?: Maybe<Scalars['String']['output']>;
  /** Description of the studied cohort. */
  cohortDescription?: Maybe<Scalars['String']['output']>;
  /** Identifier of the studied cohort */
  cohortId?: Maybe<Scalars['String']['output']>;
  /** Clinical features/phenotypes observed in studied individuals. */
  cohortPhenotypes: Array<Scalars['String']['output']>;
  /** Short name of the studied cohort. */
  cohortShortName?: Maybe<Scalars['String']['output']>;
  /** Confidence qualifier on the reported evidence. */
  confidence?: Maybe<Scalars['String']['output']>;
  /** Experiment contrast. */
  contrast?: Maybe<Scalars['String']['output']>;
  /** Applied screening library in the CRISPR/Cas9 project. */
  crisprScreenLibrary?: Maybe<Scalars['String']['output']>;
  /** Identifer of the evidence source. */
  datasourceId: Scalars['String']['output'];
  /** Datatype of the evidence. */
  datatypeId: Scalars['String']['output'];
  /**
   * Gain or loss of function effect of the evidence on the target resulting from genetic
   * variants, pharmacological modulation, or other perturbations.
   */
  directionOnTarget?: Maybe<Scalars['String']['output']>;
  /** Predicted direction of effect on the trait. */
  directionOnTrait?: Maybe<Scalars['String']['output']>;
  /** Disease for which the target is associated in this evidence. */
  disease?: Maybe<Disease>;
  /** Cancer cell lines used to generate evidence. */
  diseaseCellLines: Array<DiseaseCellLine>;
  /** Disease label from the original source. */
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
  /** Disease identifier from the original source. */
  diseaseFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Mapped Open Targets disease identifier. */
  diseaseFromSourceMappedId?: Maybe<Scalars['String']['output']>;
  /** Human phenotypes equivalent to those observed in animal models. */
  diseaseModelAssociatedHumanPhenotypes: Array<LabelledElement>;
  /** Phenotypes observed in genetically modified animal models. */
  diseaseModelAssociatedModelPhenotypes: Array<LabelledElement>;
  /**
   * Drug or clinical candidate targeting the target and studied/approved for the specific
   * disease as potential indication [bioregistry:chembl].
   */
  drug?: Maybe<Drug>;
  /** Drug name/family in resource of origin. */
  drugFromSource?: Maybe<Scalars['String']['output']>;
  /** Observed patterns of drug response. */
  drugResponse?: Maybe<Drug>;
  /** Earliest data for the evidence. */
  evidenceDate?: Maybe<Scalars['String']['output']>;
  /**
   * The strength of the genetic interaction. Directionality is captured as well: antagonistics
   * < 0 < cooperative.
   */
  geneticInteractionScore?: Maybe<Scalars['Float']['output']>;
  /** Description of the interaction between the two genes. */
  geneticInteractionType?: Maybe<Scalars['String']['output']>;
  /** Identifer of the disease/target evidence. */
  id: Scalars['String']['output'];
  /** Identifer of the interacting target. */
  interactingTargetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Role of a target in the genetic interaction test. */
  interactingTargetRole?: Maybe<Scalars['String']['output']>;
  /** List of PubMed or preprint reference identifiers. */
  literature: Array<Scalars['String']['output']>;
  /** Percentile of top differentially regulated genes (transcripts) within experiment. */
  log2FoldChangePercentileRank?: Maybe<Scalars['Int']['output']>;
  /** Log 2 fold expression change in contrast experiment. */
  log2FoldChangeValue?: Maybe<Scalars['Float']['output']>;
  /** Samples with a given mutation tested. */
  mutatedSamples: Array<EvidenceVariation>;
  /** Size of effect captured as odds ratio. */
  oddsRatio?: Maybe<Scalars['Float']['output']>;
  /** Lower value of the confidence interval for odds ratio. */
  oddsRatioConfidenceIntervalLower?: Maybe<Scalars['Float']['output']>;
  /** Upper value of the confidence interval for odds ratio. */
  oddsRatioConfidenceIntervalUpper?: Maybe<Scalars['Float']['output']>;
  /** Exponent of the p-value. */
  pValueExponent?: Maybe<Scalars['Int']['output']>;
  /** Mantissa of the p-value. */
  pValueMantissa?: Maybe<Scalars['Float']['output']>;
  /** List of pooled pathways. */
  pathways: Array<Pathway>;
  /** Log 2 fold change of the cell survival. */
  phenotypicConsequenceLogFoldChange?: Maybe<Scalars['Float']['output']>;
  /** P-value of the the cell survival test. */
  phenotypicConsequencePValue?: Maybe<Scalars['Float']['output']>;
  /** If a given target was found to be a hit in the primary project. */
  primaryProjectHit?: Maybe<Scalars['Boolean']['output']>;
  /** Open Targets project identifier of the primary project. */
  primaryProjectId?: Maybe<Scalars['String']['output']>;
  /** Description of the project that generated the data. */
  projectDescription?: Maybe<Scalars['String']['output']>;
  /** The identifer of the project that generated the data. */
  projectId?: Maybe<Scalars['String']['output']>;
  /** Date of the earliest publication supporting the evidence. */
  publicationDate?: Maybe<Scalars['String']['output']>;
  /** Last name and initials of the author of the publication that references the study. */
  publicationFirstAuthor?: Maybe<Scalars['String']['output']>;
  /** Year of publication. */
  publicationYear?: Maybe<Scalars['Int']['output']>;
  /** Evidence quality flags. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Pathway, gene set or reaction identifier in Reactome. */
  reactionId?: Maybe<Scalars['String']['output']>;
  /** Name of the reaction, patway or gene set in Reactome. */
  reactionName?: Maybe<Scalars['String']['output']>;
  /** Date of the release of the data in a 'YYYY-MM-DD' format. */
  releaseDate?: Maybe<Scalars['String']['output']>;
  /** Open Targets data release version */
  releaseVersion?: Maybe<Scalars['String']['output']>;
  /** Score provided by datasource indicating strength of target-disease association. */
  resourceScore?: Maybe<Scalars['Float']['output']>;
  /** Score of the evidence reflecting the strength of the disease/target relationship. */
  score: Scalars['Float']['output'];
  /** Methods to detect cancer driver genes producing significant results. */
  significantDriverMethods: Array<Scalars['String']['output']>;
  /** Statistical method used to calculate the association. */
  statisticalMethod?: Maybe<Scalars['String']['output']>;
  /** Overview of the statistical method used to calculate the association. */
  statisticalMethodOverview?: Maybe<Scalars['String']['output']>;
  /** End of the distribution the target was picked from. */
  statisticalTestTail?: Maybe<Scalars['String']['output']>;
  /** Number of cases in case-control study. */
  studyCases?: Maybe<Scalars['Int']['output']>;
  /**
   * Number of cases in case-control study that carry at least one allele of the qualifying
   * variant.
   */
  studyCasesWithQualifyingVariants?: Maybe<Scalars['Int']['output']>;
  /** Identifier of the study generating the data. */
  studyId?: Maybe<Scalars['String']['output']>;
  /** Description of the study. */
  studyOverview?: Maybe<Scalars['String']['output']>;
  /** Sample size of study. */
  studySampleSize?: Maybe<Scalars['Int']['output']>;
  /** Start date of study in a YYYY-MM-DD format. */
  studyStartDate?: Maybe<Scalars['String']['output']>;
  /** Target for which the disease is associated in this evidence. */
  target?: Maybe<Target>;
  /** Target name/synonym or non HGNC symbol in resource of origin. */
  targetFromSource?: Maybe<Scalars['String']['output']>;
  /**
   * Target ID in resource of origin (accepted sources include Ensembl gene ID, Uniprot ID, gene
   * symbol), only capital letters are accepted.
   */
  targetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Target name/synonym in animal model. */
  targetInModel?: Maybe<Scalars['String']['output']>;
  /** Description of target modulation event. */
  targetModulation?: Maybe<Scalars['String']['output']>;
  /** Role of a target in the genetic interaction test. */
  targetRole?: Maybe<Scalars['String']['output']>;
  /** Sentences of a publication supporting the disease/target relationship. */
  textMiningSentences: Array<EvidenceTextMiningSentence>;
  /** Categorised reason(s) why the trial was stopped. */
  trialStopReasonCategories: Array<Scalars['String']['output']>;
  /** Reason why the trial was stopped, as reported. */
  trialWhyStopped?: Maybe<Scalars['String']['output']>;
  /**
   * Reference to linked external resource (e.g. clinical trials, studies, package inserts,
   * reports, etc.).
   */
  urls: Array<LabelledUri>;
  /** Descriptions of variant consequences at protein level. */
  variantAminoacidDescriptions: Array<Scalars['String']['output']>;
  /** Sequence ontology (SO) term of the functional consequence of the variant. */
  variantFunctionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** Sequence ontology (SO) term of the functional consequence of the variant from QTL. */
  variantFunctionalConsequenceFromQtl?: Maybe<SequenceOntologyTerm>;
  /** Variant reference SNP cluster ID (Rsid). */
  variantRsId?: Maybe<Scalars['String']['output']>;
  /** @deprecated empty */
  warningMessage?: Maybe<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type EvidencePage = {
  __typename?: 'EvidencePage';
  count: Scalars['Int']['output'];
  rows: Array<Evidence>;
};

/** Sentences of a publication supporting the disease/target relationship. */
export type EvidenceTextMiningSentence = {
  __typename?: 'EvidenceTextMiningSentence';
  /** End position of the disease label in sentence. */
  dEnd: Scalars['Int']['output'];
  /** Start position of the disease label in the sentence. */
  dStart: Scalars['Int']['output'];
  /** Section of the publication the sentence was extracted from. */
  section: Scalars['String']['output'];
  /** End position of the target label in the sentence. */
  tEnd: Scalars['Int']['output'];
  /** Start position of the target label in the sentence. */
  tStart: Scalars['Int']['output'];
  /** Text of the sentence with the disease/target relationship. */
  text: Scalars['String']['output'];
};

/** Mutation counts for a single functional consequence, across a tested sample cohort. */
export type EvidenceVariation = {
  __typename?: 'EvidenceVariation';
  /** Functional consequene of the pooled mutations [bioregistry:so]. */
  functionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** Number of cohort samples in which target is mutated with a mutation of any type. */
  numberMutatedSamples?: Maybe<Scalars['Int']['output']>;
  /** Number of cohort samples tested. */
  numberSamplesTested?: Maybe<Scalars['Int']['output']>;
  /** Number of cohort samples in which target is mutated with a specific mutation type. */
  numberSamplesWithMutationType?: Maybe<Scalars['Int']['output']>;
};

/** The different product flavors served by the API (platform/ppp). */
export enum Flavor {
  /** Open Targets Platform Public version. */
  Platform = 'PLATFORM',
  /** Open Targets Partner Preview Platform version. */
  Ppp = 'PPP'
}

export type GeneEssentialityScreen = {
  __typename?: 'GeneEssentialityScreen';
  /** Name of the cancer cell line in which the gene essentiality was assessed. */
  cellLineName?: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the assay in DepMap. */
  depmapId?: Maybe<Scalars['String']['output']>;
  /** Cell model passport identifier of a cell line modelling a disease. */
  diseaseCellLineId?: Maybe<Scalars['String']['output']>;
  /** Disease associated with the cell line as reported in the source data. */
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
  /** Gene expression level in the corresponding cell line. */
  expression?: Maybe<Scalars['Float']['output']>;
  /** Gene effect score indicating the impact of gene knockout. */
  geneEffect?: Maybe<Scalars['Float']['output']>;
  /** Background mutation in the tested cell line. */
  mutation?: Maybe<Scalars['String']['output']>;
};

/** A term from the Gene Ontology (GO) TODO DESCRIPTION */
export type GeneOntology = {
  __typename?: 'GeneOntology';
  /** Gene Ontology term identifier [bioregistry:so]. */
  id: Scalars['String']['output'];
  /** Human-readable label for the term (e.g. `missense_variant`). */
  label: Scalars['String']['output'];
};

/** Gene Ontology (GO) annotations related to the target. */
export type GeneOntologyAnnotation = {
  __typename?: 'GeneOntologyAnnotation';
  /**
   * Type of the GO annotation: molecular function (F), biological process (P) and cellular
   * localisation (C).
   */
  aspect: Scalars['String']['output'];
  /** Evidence supporting the GO annotation. */
  evidence: Scalars['String']['output'];
  /** Gene product associated with the GO annotation [bioregistry:uniprot]. */
  geneProduct: Scalars['String']['output'];
  /** Source database and identifier where the ontology term was sourced from. */
  source: Scalars['String']['output'];
};

/** List of gene expression altering biomarkers. */
export type GeneticVariation = {
  __typename?: 'GeneticVariation';
  functionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** Variant identifier. */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the variant biomarker. */
  name?: Maybe<Scalars['String']['output']>;
};

/** Genomic location information of the target gene. */
export type GenomicLocation = {
  __typename?: 'GenomicLocation';
  /** Chromosome on which the target is located. */
  chromosome: Scalars['String']['output'];
  /** Genomic end position of the target gene. */
  end: Scalars['Int']['output'];
  /** Genomic start position of the target gene. */
  start: Scalars['Int']['output'];
  /** Strand orientation of the canonical transcript. */
  strand: Strand;
};

/** Hallmarks related to the target gene sourced from COSMIC. */
export type Hallmark = {
  __typename?: 'Hallmark';
  /** Attributes of the hallmark annotation. */
  attributes: Array<Attributes>;
  /** Cancer hallmarks associated with the target gene. */
  cancerHallmarks: Array<CancerHallmarks>;
};

/** Homologues of the target gene in other species according to Ensembl Compara. */
export type Homologue = {
  __typename?: 'Homologue';
  /** Type of homology relationship. */
  homologyType: Scalars['String']['output'];
  /** Indicates if the homology is high confidence according to Ensembl Compara. */
  isHighConfidence?: Maybe<Scalars['String']['output']>;
  /** Percentage identity of the query gene in the homologue. */
  queryPercentageIdentity: Scalars['Float']['output'];
  /** Species ID for the homologue. */
  speciesId: Scalars['String']['output'];
  /** Species name for the homologue. */
  speciesName: Scalars['String']['output'];
  /** Gene ID of the homologue. */
  targetGeneId: Scalars['String']['output'];
  /** Gene symbol of the homologous target. */
  targetGeneSymbol: Scalars['String']['output'];
  /** Percentage identity of the homologue in the query gene. */
  targetPercentageIdentity: Scalars['Float']['output'];
};

/** Human Phenotype Ontology subset of information included in the Platform. */
export type Hpo = {
  __typename?: 'Hpo';
  /** Description of the disease. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the disease in the Human Phenotype Ontology (HPO). */
  id: Scalars['String']['output'];
  /** Name of the disease (in HPO). */
  name: Scalars['String']['output'];
  /** @deprecated empty */
  namespace: Array<Scalars['String']['output']>;
};

/** Identifier with source information. */
export type IdAndSource = {
  __typename?: 'IdAndSource';
  /** Identifier value. */
  id: Scalars['String']['output'];
  /** Source database or organization providing the identifier. */
  source: Scalars['String']['output'];
};

/** Filter for an integer field. */
export type IntFilter = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<Scalars['Int']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  ne?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Molecular interactions reporting experimental or functional interactions between this target and
 * other molecules. This dataset contains pair-wise interactions deposited in several databases
 * capturing: physical interactions (e.g. IntAct), directional interactions (e.g. Signor), pathway
 * relationships (e.g. Reactome) or functional interactions (e.g. STRINGdb).
 */
export type Interaction = {
  __typename?: 'Interaction';
  /** Number of interaction occurrences reported in the source databases. */
  count: Scalars['Int']['output'];
  /** Evidence supporting the molecular interaction. */
  evidences: Array<InteractionEvidence>;
  /** Identifier for target A in source. */
  intA: Scalars['String']['output'];
  /** Biological role of target A in the interaction. */
  intABiologicalRole: Scalars['String']['output'];
  /** Identifier for target B in source. */
  intB: Scalars['String']['output'];
  /** Biological role of target B in the interaction. */
  intBBiologicalRole: Scalars['String']['output'];
  /** Scoring or confidence value assigned to the interaction. */
  score?: Maybe<Scalars['Float']['output']>;
  /** Source database reporting the molecular interaction. */
  sourceDatabase: InteractionSourceDatabase;
  /** Taxonomic annotation of target A. */
  speciesA: InteractionSpeciesA;
  /** Taxonomic annotation of target B. */
  speciesB: InteractionSpeciesB;
  targetA?: Maybe<Target>;
  targetB?: Maybe<Target>;
};

/**
 * Evidence supporting molecular interactions between targets. Contains detailed information about
 * how the interaction was detected, the experimental context, and supporting publications.
 */
export type InteractionEvidence = {
  __typename?: 'InteractionEvidence';
  /** Score indicating the confidence or strength of the interaction evidence. */
  evidenceScore?: Maybe<Scalars['Float']['output']>;
  /** Molecular Interactions (MI) identifier for the expansion method used [bioregistry:mi]. */
  expansionMethodMiIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of the method used to expand the interaction dataset. */
  expansionMethodShortName?: Maybe<Scalars['String']['output']>;
  /** Scientific name of the host organism in which the interaction was observed. */
  hostOrganismScientificName?: Maybe<Scalars['String']['output']>;
  /** NCBI taxon ID of the host organism. */
  hostOrganismTaxId?: Maybe<Scalars['Int']['output']>;
  /**
   * Molecular Interactions (MI) identifier for the interaction detection method
   * [bioregistry:mi].
   */
  interactionDetectionMethodMiIdentifier: Scalars['String']['output'];
  /** Short name of the method used to detect the interaction. */
  interactionDetectionMethodShortName: Scalars['String']['output'];
  /** Unique identifier for the interaction evidence entry at the source. */
  interactionIdentifier?: Maybe<Scalars['String']['output']>;
  /** Molecular Interactions (MI) identifier for the type of interaction [bioregistry:mi]. */
  interactionTypeMiIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of the interaction type. */
  interactionTypeShortName?: Maybe<Scalars['String']['output']>;
  /** Detection method used to identify participant A in the interaction. */
  participantDetectionMethodA: Array<ParticipantDetectionMethod>;
  /** Detection method used to identify participant B in the interaction. */
  participantDetectionMethodB: Array<ParticipantDetectionMethod>;
  /** PubMed ID of the publication supporting the interaction evidence. */
  pubmedId?: Maybe<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type InteractionPage = {
  __typename?: 'InteractionPage';
  count: Scalars['Int']['output'];
  rows: Array<Interaction>;
};

/** Source database reporting the molecular interaction. */
export enum InteractionSourceDatabase {
  /** IntAct: <https://www.ebi.ac.uk/intact/>. */
  Intact = 'intact',
  /** Reactome: <https://reactome.org/>. */
  Reactome = 'reactome',
  /** Signor: <https://signor.uniroma2.it/>. */
  Signor = 'signor',
  /** String: <https://string-db.org/>. */
  String = 'string'
}

/** Taxonomic annotation of the first interaction participant. */
export type InteractionSpeciesA = {
  __typename?: 'InteractionSpeciesA';
  /** Short mnemonic name of the associated species. */
  mnemonic: Scalars['String']['output'];
  /** Scientific name of the associated species. */
  scientificName: Scalars['String']['output'];
  /** NCBI taxon ID of the associated species. */
  taxonId: Scalars['Int']['output'];
};

/** Taxonomic annotation of the second interaction participant. */
export type InteractionSpeciesB = {
  __typename?: 'InteractionSpeciesB';
  /** Short mnemonic name of the associated species. */
  mnemonic: Scalars['String']['output'];
  /** Scientific name of the associated species. */
  scientificName?: Maybe<Scalars['String']['output']>;
  /** NCBI taxon ID of the associated species. */
  taxonId?: Maybe<Scalars['Int']['output']>;
};

/** Relevance of a publication to one of the queried ids. */
export type KeywordRelevance = {
  __typename?: 'KeywordRelevance';
  /** Queried id. */
  id: Scalars['String']['output'];
  /** Relevance of the publication to this id. */
  relevance: Scalars['Float']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type L2GPredictionPage = {
  __typename?: 'L2GPredictionPage';
  count: Scalars['Int']['output'];
  rows: Array<L2Gprediction>;
};

/** Feature used in Locus2gene model predictions. */
export type L2Gfeature = {
  __typename?: 'L2Gfeature';
  /** Name of the feature. */
  name: Scalars['String']['output'];
  /**
   * SHAP (Shapley Additive exPlanations) value indicating the feature's contribution to the
   * prediction.
   */
  shapValue: Scalars['Float']['output'];
  /** Value of the feature. */
  value: Scalars['Float']['output'];
};

/**
 * Predictions from Locus2gene gene assignment model. The dataset contains all predictions for
 * every combination of credible set and genes in the region as well as statistics to explain the
 * model interpretation of the predictions.
 */
export type L2Gprediction = {
  __typename?: 'L2Gprediction';
  /** Features used in the Locus2gene model prediction. */
  features: Array<L2Gfeature>;
  /**
   * Locus2gene prediction score for the gene assignment. Higher scores indicate a stronger
   * association between the credible set and the gene. Scores range from 0 to 1.
   */
  score: Scalars['Float']['output'];
  /**
   * SHAP base value for the prediction. This value is common to all predictions for a given
   * credible set.
   */
  shapBaseValue: Scalars['Float']['output'];
  /** Study-locus identifier for the credible set. */
  studyLocusId: Scalars['String']['output'];
  /** Target entity of the L2G predicted gene. */
  target?: Maybe<Target>;
};

/** Label with source information. */
export type LabelSource = {
  __typename?: 'LabelSource';
  /** Label value (e.g., synonym, symbol). */
  label: Scalars['String']['output'];
  /** Source database of the label. */
  source: Scalars['String']['output'];
};

/** An element with a label. */
export type LabelledElement = {
  __typename?: 'LabelledElement';
  /** The unique identifier of the element. */
  id: Scalars['String']['output'];
  /** The human-readable label of the element. */
  label: Scalars['String']['output'];
};

/**
 * Reference to linked external resource (e.g. clinical trials, studies, package inserts, reports,
 * etc.).
 */
export type LabelledUri = {
  __typename?: 'LabelledUri';
  /** Human readable label of the remote reference. */
  niceName?: Maybe<Scalars['String']['output']>;
  /** URL to remote resource. */
  url?: Maybe<Scalars['String']['output']>;
};

/** Collection of populations. */
export type LdPopulationStructure = {
  __typename?: 'LdPopulationStructure';
  /** Population identifier. */
  ldPopulation: Scalars['String']['output'];
  /** Fraction of the total sample represented by the population. */
  relativeSampleSize?: Maybe<Scalars['Float']['output']>;
};

/** Variants in linkage disequilibrium (LD) with the credible set lead variant. */
export type Ldset = {
  __typename?: 'Ldset';
  /** The R-squared value for the tag variants with the credible set lead variant. */
  r2Overall: Scalars['Float']['output'];
  /** The variant ID for tag variants in LD with the credible set lead variant. */
  tagVariantId: Scalars['String']['output'];
};

/** Subcellular location information with source. */
export type LocationAndSource = {
  __typename?: 'LocationAndSource';
  /** Subcellular location category from SwissProt. */
  labelSL?: Maybe<Scalars['String']['output']>;
  /** Name of the subcellular compartment where the protein was found. */
  location: Scalars['String']['output'];
  /** Source database for the subcellular location. */
  source: Scalars['String']['output'];
  /** Protein isoform or modification that specific for the given subcellular location. */
  targetModifier?: Maybe<Scalars['String']['output']>;
  /** Subcellular location term identifier from SwissProt [bioregistry:sl]. */
  termSL?: Maybe<Scalars['String']['output']>;
};

/** List of variants within the credible set. */
export type Locus = {
  __typename?: 'Locus';
  /** Beta coefficient of this variant in the credible set. */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Boolean for if the variant is part of the 95% credible set. */
  is95CredibleSet: Scalars['Boolean']['output'];
  /** Boolean for if the variant is part of the 99% credible set. */
  is99CredibleSet: Scalars['Boolean']['output'];
  /** Log (natural) Bayes factor for the variant from fine-mapping. */
  logBF?: Maybe<Scalars['Float']['output']>;
  /** Exponent of the P-value for this variant in the credible set. */
  pValueExponent?: Maybe<Scalars['Int']['output']>;
  /** Mantissa of the P-value for this variant in the credible set. */
  pValueMantissa?: Maybe<Scalars['Float']['output']>;
  /** Posterior inclusion probability for the variant within this credible set. */
  posteriorProbability: Scalars['Float']['output'];
  /** R-squared (LD) between this credible set variant and the lead variant. */
  r2Overall?: Maybe<Scalars['Float']['output']>;
  /** Standard error of this variant in the credible set. */
  standardError?: Maybe<Scalars['Float']['output']>;
  /** Variant in the credible set. */
  variant?: Maybe<Variant>;
};

/** Filter for locus. */
export type LocusFilter = {
  /** Keep loci whose variant ID is one of these. */
  variantIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type LocusPage = {
  __typename?: 'LocusPage';
  count: Scalars['Int']['output'];
  rows: Array<Locus>;
};

/** Mechanism of action information for a drug. */
export type MechanismOfActionRow = {
  __typename?: 'MechanismOfActionRow';
  /** Classification of how the drug interacts with its target (e.g., ACTIVATOR, INHIBITOR). */
  actionType?: Maybe<Scalars['String']['output']>;
  /** Description of the mechanism of action. */
  mechanismOfAction: Scalars['String']['output'];
  /** Reference information supporting the mechanism of action. */
  references: Array<Reference>;
  /** Name of the target molecule. */
  targetName?: Maybe<Scalars['String']['output']>;
  /**
   * List of on-target (genes or proteins) involved in the drug or clinical candidate
   * mechanism of action.
   */
  targets: Array<Target>;
};

/** Collection of mechanisms of action for a drug molecule. */
export type MechanismsOfAction = {
  __typename?: 'MechanismsOfAction';
  /** List of mechanism of action entries. */
  rows: Array<MechanismOfActionRow>;
  /** Unique list of action types across all mechanisms. */
  uniqueActionTypes: Array<Scalars['String']['output']>;
  /** Unique list of target types across all mechanisms. */
  uniqueTargetTypes: Array<Scalars['String']['output']>;
};

/** Metadata for the API and its underlying data sources. */
export type Meta = {
  __typename?: 'Meta';
  /** API version information. */
  apiVersion: Version;
  /** Data release namespace. */
  dataNamespace: Scalars['String']['output'];
  /** Data release version information. */
  dataVersion: Version;
  /** Platform datasets described following MLCroissant metadata format. */
  downloads?: Maybe<Scalars['String']['output']>;
  /** Name of the API. */
  name: Scalars['String']['output'];
  /** Open Targets platform API product name. */
  product: Flavor;
};

/** Container for phenotype class-related attributes. */
export type ModelPhenotypeClasses = {
  __typename?: 'ModelPhenotypeClasses';
  /** Unique identifier for the phenotype class [bioregistry:mp]. */
  id: Scalars['String']['output'];
  /** Descriptive label for the phenotype class. */
  label: Scalars['String']['output'];
};

/** Mouse phenotype information linking human targets to observed phenotypes in mouse models. */
export type MousePhenotype = {
  __typename?: 'MousePhenotype';
  /** Container for all biological model-related attributes. */
  biologicalModels: Array<BiologicalModels>;
  /** Container for phenotype class-related attributes. */
  modelPhenotypeClasses: Array<ModelPhenotypeClasses>;
  /** Identifier for the specific phenotype observed in the model [bioregistry:mp]. */
  modelPhenotypeId: Scalars['String']['output'];
  /** Human-readable label describing the observed phenotype. */
  modelPhenotypeLabel: Scalars['String']['output'];
  /** Name of the target gene as represented in the mouse model. */
  targetInModel: Scalars['String']['output'];
  /** Ensembl identifier for the target gene in the mouse model. */
  targetInModelEnsemblId?: Maybe<Scalars['String']['output']>;
  /** MGI identifier for the target gene in the mouse model [bioregistry:mgi]. */
  targetInModelMgiId: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type MousePhenotypePage = {
  __typename?: 'MousePhenotypePage';
  count: Scalars['Int']['output'];
  rows: Array<MousePhenotype>;
};

/** An element with name and description. */
export type NameDescription = {
  __typename?: 'NameDescription';
  /** Description of the element. */
  description: Scalars['String']['output'];
  /** Name of the element. */
  name: Scalars['String']['output'];
};

/** A bucket for a distribution of values. */
export type OptBoolBucket = {
  __typename?: 'OptBoolBucket';
  /** The number of occurrences of the value. */
  count: Scalars['Int']['output'];
  /** The value of the bucket. */
  value?: Maybe<Scalars['Boolean']['output']>;
};

/** Nature of the record the report originates from. */
export enum Origin {
  /** TODO DESCRIPTION: Clinical trial record. */
  ClinicalTrial = 'CLINICAL_TRIAL',
  /** TODO DESCRIPTION: Curated resource record. */
  CuratedResource = 'CURATED_RESOURCE',
  /** TODO DESCRIPTION: Drug label record. */
  DrugLabel = 'DRUG_LABEL',
  /** TODO DESCRIPTION: Regulatory agency record. */
  RegulatoryAgency = 'REGULATORY_AGENCY'
}

/** Represents a paginated list of items. */
export type Page = {
  /** The index of the page to fetch, starting from 0. */
  index?: Scalars['Int']['input'];
  /** The number of items per page. */
  size?: Scalars['Int']['input'];
};

/** Detection method used to identify participants in the interaction. */
export type ParticipantDetectionMethod = {
  __typename?: 'ParticipantDetectionMethod';
  /**
   * Molecular Interactions (MI) identifier for participant B's detection method
   * [bioregistry:mi].
   */
  miIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of participant A's detection method. */
  shortName?: Maybe<Scalars['String']['output']>;
};

/** Pathway annotations for a target. */
export type Pathway = {
  __typename?: 'Pathway';
  /** Name of the pathway. */
  id?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the pathway. */
  name?: Maybe<Scalars['String']['output']>;
};

/**
 * Pharmacogenomics data linking genetic variants to drug responses. Data is integrated from
 * sources including ClinPGx.
 */
export type Pharmacogenomics = {
  __typename?: 'Pharmacogenomics';
  /** Identifier for the data provider. */
  datasourceId: Scalars['String']['output'];
  /** Classification of the type of pharmacogenomic data (e.g., `clinical_annotation`). */
  datatypeId: Scalars['String']['output'];
  /** List of drugs or clinical candidates associated with the pharmacogenomic data. */
  drugs: Array<DrugWithIdentifiers>;
  /** Strength of the scientific support for the variant/drug response. */
  evidenceLevel: Scalars['String']['output'];
  /** Genetic variant configuration. */
  genotype?: Maybe<Scalars['String']['output']>;
  /** Explanation of the genotype's clinical significance. */
  genotypeAnnotationText?: Maybe<Scalars['String']['output']>;
  /** Identifier for the specific genetic variant combination (e.g., `1_1500_A_A,T`). */
  genotypeId?: Maybe<Scalars['String']['output']>;
  /** Haplotype ID in the ClinPGx dataset. */
  haplotypeFromSourceId?: Maybe<Scalars['String']['output']>;
  /**
   * Combination of genetic variants that constitute a particular allele of a gene (e.g.,
   * CYP2C9*3).
   */
  haplotypeId?: Maybe<Scalars['String']['output']>;
  /** Whether the target is directly affected by the variant. */
  isDirectTarget: Scalars['Boolean']['output'];
  /** PubMed identifier (PMID) of the literature entry [bioregistry:pubmed]. */
  literature: Array<Scalars['String']['output']>;
  /** Classification of the drug response type (e.g., Toxicity). */
  pgxCategory: Scalars['String']['output'];
  /** Phenotype identifier from the source. */
  phenotypeFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Description of the phenotype associated with the variant. */
  phenotypeText?: Maybe<Scalars['String']['output']>;
  /** Identifier of the study providing the pharmacogenomic evidence. */
  studyId?: Maybe<Scalars['String']['output']>;
  /** Target entity. */
  target?: Maybe<Target>;
  /** Target (gene/protein) identifier as reported by the data source. */
  targetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Annotation details about the variant effect on drug response. */
  variantAnnotation: Array<VariantAnnotation>;
  /**
   * The sequence ontology identifier of the consequence of the variant based on Ensembl VEP in
   * the context of the transcript [bioregistry:so]
   */
  variantFunctionalConsequence?: Maybe<SequenceOntologyTerm>;
  /**
   * The sequence ontology identifier of the consequence of the variant based on Ensembl VEP in
   * the context of the transcript [bioregistry:so].
   */
  variantFunctionalConsequenceId?: Maybe<Scalars['String']['output']>;
  /** Variant identifier in CHROM_POS_REF_ALT notation. */
  variantId?: Maybe<Scalars['String']['output']>;
  /** dbSNP rsID identifier for the variant. */
  variantRsId?: Maybe<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type PharmacogenomicsPage = {
  __typename?: 'PharmacogenomicsPage';
  count: Scalars['Int']['output'];
  rows: Array<Pharmacogenomics>;
};

/** A container for all evidence-related attributes supporting the disease-phenotype association. */
export type PhenotypeEvidence = {
  __typename?: 'PhenotypeEvidence';
  /** The category of biological information being provided (e.g., clinical, genetic, etc.). */
  aspect?: Maybe<Scalars['String']['output']>;
  /** Indicates whether the evidence has been manually curated. */
  bioCuration?: Maybe<Scalars['String']['output']>;
  /** The disease name as recorded in the original source. */
  diseaseFromSource: Scalars['String']['output'];
  /** Unique identifier for the disease from the original source. */
  diseaseFromSourceId: Scalars['String']['output'];
  /** Standardised disease name. */
  diseaseName: Scalars['String']['output'];
  /** The type of evidence supporting the disease-phenotype relationship. */
  evidenceType?: Maybe<Scalars['String']['output']>;
  /** The observed frequency of the phenotype in individuals with the disease. */
  frequency?: Maybe<Scalars['String']['output']>;
  /** Additional characteristics or modifiers related to the phenotype. */
  modifiers: Array<Hpo>;
  /** Age or stage of disease onset for the phenotype. */
  onset: Array<Hpo>;
  /** Specifies if a phenotype is not observed in a given disease. */
  qualifierNot: Scalars['Boolean']['output'];
  /** References or citations supporting the evidence [bioregistry:pubmed]. */
  references: Array<Scalars['String']['output']>;
  /** The data source from which the evidence was obtained. */
  resource: Scalars['String']['output'];
  /** Indicates if the association is specific to a biological sex. */
  sex?: Maybe<Scalars['String']['output']>;
};

/** Data source information for protein coding coordinates. */
export type ProteinCodingCoordinateDatasource = {
  __typename?: 'ProteinCodingCoordinateDatasource';
  /** Count of evidence from this data source. */
  datasourceCount: Scalars['Int']['output'];
  /** Identifier of the data source. */
  datasourceId: Scalars['String']['output'];
  /** Human-readable name of the data source. */
  datasourceNiceName: Scalars['String']['output'];
};

/**
 * Protein coding coordinates linking this variant to its amino acid-level consequences in protein
 * products. Describes variant consequences at the protein level including amino acid changes and
 * their positions.
 */
export type ProteinCodingCoordinates = {
  __typename?: 'ProteinCodingCoordinates';
  /** Amino acid resulting from the variant. */
  alternateAminoAcid: Scalars['String']['output'];
  /** Position of the amino acid affected by the variant in the protein sequence. */
  aminoAcidPosition: Scalars['Int']['output'];
  /** Data sources providing evidence for the protein coding coordinate. */
  datasources: Array<ProteinCodingCoordinateDatasource>;
  /** Disease the protein coding variant has been associated with. */
  diseases: Array<Disease>;
  /** Reference amino acid at this position. */
  referenceAminoAcid: Scalars['String']['output'];
  /** Target (gene/protein) the protein coding variant has been associated with. */
  target?: Maybe<Target>;
  /** Therapeutic areas associated with the variant-consequence relationship. */
  therapeuticAreas: Array<Scalars['String']['output']>;
  /** UniProt protein accessions for the affected protein [bioregistry:uniprot]. */
  uniprotAccessions: Array<Scalars['String']['output']>;
  /** Protein coding variant */
  variant?: Maybe<Variant>;
  /**
   * The sequence ontology term capturing the consequence of the variant based on Ensembl VEP in
   * the context of the transcript [bioregistry:so].\
   */
  variantConsequences: Array<SequenceOntologyTerm>;
  /** Score indicating the predicted effect of the variant on the protein. */
  variantEffect?: Maybe<Scalars['Float']['output']>;
  variantFunctionalConsequenceIds: Array<Scalars['String']['output']>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type ProteinCodingCoordinatesPage = {
  __typename?: 'ProteinCodingCoordinatesPage';
  count: Scalars['Int']['output'];
  rows: Array<ProteinCodingCoordinates>;
};

/** Source that provided the clinical report. */
export enum Provider {
  /** Aggregate Analysis of ClinicalTrials.gov. */
  Aact = 'AACT',
  /** ChEMBL. */
  Chembl = 'CHEMBL',
  /** European Medicines Agency. */
  Ema = 'EMA',
  /** Pharmaceuticals and Medical Devices Agency. */
  Pmda = 'PMDA',
  /** Therapeutic Target Database. */
  Ttd = 'TTD'
}

/** Referenced publication information. */
export type Publication = {
  __typename?: 'Publication';
  /** PubMed Central identifier (if available) [bioregistry:pmc]. */
  pmcid?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier [bioregistry:pubmed]. */
  pmid: Scalars['String']['output'];
  /** Publication date. */
  publicationDate: Scalars['String']['output'];
  /** Relevance to each queried id. */
  relevances: Array<KeywordRelevance>;
};

/**
 * The result of a paginated query, containing the total number of items, the items, and statistics
 * about the query.
 */
export type PublicationPage = {
  __typename?: 'PublicationPage';
  count: Scalars['Int']['output'];
  rows: Array<Publication>;
  stats: PublicationStats;
};

/** Statistics for a set of publications. */
export type PublicationStats = {
  __typename?: 'PublicationStats';
  /** Earliest publication date for the target without considering the time range. */
  earliestPubDate: Scalars['Int']['output'];
};

/** The query root for the `Platform` product. */
export type Query = {
  __typename?: 'Query';
  /** Retrieve a clinical report by an identifier. */
  clinicalReport?: Maybe<ClinicalReport>;
  /** Retrieve a list of clinical reports by identifiers. */
  clinicalReports: Array<ClinicalReport>;
  /** Retrieve a credible set by its identifier. */
  credibleSet?: Maybe<CredibleSet>;
  /** Retrieve a list of credible sets by their identifier. */
  credibleSets: CredibleSetPage;
  disease?: Maybe<Disease>;
  /** Fetch diseases by EFO ID. */
  diseases: DiseasePage;
  /** Retrieve a drug or a clinical candidate by an identifier. */
  drug?: Maybe<Drug>;
  /** Retrieve multiple drugs or clinical candidates by identifiers. */
  drugs: DrugPage;
  /** Search sets of targets or diseases used to facet associations. */
  facets: SearchFacetsResults;
  meta: Meta;
  /**
   * Full-text, multi-entity search across all types of entities (targets, diseases, drugs,
   * variants or studies).
   */
  search: SearchResults;
  studies: StudyPage;
  study?: Maybe<Study>;
  /** Retrieve a target (gene/protein) by target identifier (e.g. ENSG00000139618). */
  target?: Maybe<Target>;
  /** Retrieve multiple targets by target identifiers. */
  targets: TargetPage;
  /**
   * Retrieve a variant by identifier in the format of CHROM_POS_REF_ALT for SNPs and short
   * indels (e.g. 19_44908684_T_C).
   */
  variant?: Maybe<Variant>;
  /**
   * Retrieve a list of variants by their identifier in the format of CHROM_POS_REF_ALT for SNPs
   * and short indels (e.g. 19_44908684_T_C).
   */
  variants: VariantPage;
};


/** The query root for the `Platform` product. */
export type QueryClinicalReportArgs = {
  clinicalReportId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryClinicalReportsArgs = {
  clinicalReportsIds: Array<Scalars['String']['input']>;
};


/** The query root for the `Platform` product. */
export type QueryCredibleSetArgs = {
  studyLocusId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryCredibleSetsArgs = {
  page?: Page;
  studyLocusIds: Array<Scalars['String']['input']>;
};


/** The query root for the `Platform` product. */
export type QueryDiseaseArgs = {
  efoId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryDiseasesArgs = {
  efoIds: Array<Scalars['String']['input']>;
  page?: Page;
  search?: InputMaybe<Scalars['String']['input']>;
  sort: Array<DiseaseSort>;
};


/** The query root for the `Platform` product. */
export type QueryDrugArgs = {
  chemblId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryDrugsArgs = {
  chemblIds: Array<Scalars['String']['input']>;
  page?: Page;
};


/** The query root for the `Platform` product. */
export type QueryFacetsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: Page;
  queryString: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QuerySearchArgs = {
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: Page;
  queryString: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryStudiesArgs = {
  diseaseIds?: InputMaybe<Array<Scalars['String']['input']>>;
  enableIndirect?: Scalars['Boolean']['input'];
  filter?: InputMaybe<StudyFilter>;
  page?: Page;
  search?: InputMaybe<Scalars['String']['input']>;
  sort: Array<StudySort>;
  studyIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


/** The query root for the `Platform` product. */
export type QueryStudyArgs = {
  studyId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryTargetArgs = {
  ensemblId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryTargetsArgs = {
  ensemblIds: Array<Scalars['String']['input']>;
  page?: Page;
};


/** The query root for the `Platform` product. */
export type QueryVariantArgs = {
  variantId: Scalars['String']['input'];
};


/** The query root for the `Platform` product. */
export type QueryVariantsArgs = {
  page?: Page;
  variantIds: Array<Scalars['String']['input']>;
};

/** Pathway metadata from Reactome pathway database. */
export type ReactomePathway = {
  __typename?: 'ReactomePathway';
  /** Reactome pathway name. */
  pathway: Scalars['String']['output'];
  /** Reactome pathway identifier [bioregistry:reactome]. */
  pathwayId: Scalars['String']['output'];
  topLevelTerm: Scalars['String']['output'];
};

/** Reference information supporting the drug mechanisms of action. */
export type Reference = {
  __typename?: 'Reference';
  /** List of reference identifiers. */
  ids: Array<Scalars['String']['output']>;
  /** Source of the reference (e.g., PubMed, FDA, package inserts). */
  source: Scalars['String']['output'];
  /** List of URLs linking to the reference. */
  urls: Array<Scalars['String']['output']>;
};

/** Score from a specific datasource. */
export type ResourceScore = {
  __typename?: 'ResourceScore';
  /** Name of the resource providing the score. */
  name: Scalars['String']['output'];
  /** Score value from the resource. */
  value: Scalars['Float']['output'];
};

/** Biosamples used in safety assessments. */
export type SafetyBiosamples = {
  __typename?: 'SafetyBiosamples';
  /** Format of the biosample cells. */
  cellFormat?: Maybe<Scalars['String']['output']>;
  /** Cell identifier for the biosample. */
  cellId?: Maybe<Scalars['String']['output']>;
  /** Label of the biosample cell. */
  cellLabel?: Maybe<Scalars['String']['output']>;
  /** Tissue ID for the biosample. */
  tissueId?: Maybe<Scalars['String']['output']>;
  /** Label of the biosample tissue. */
  tissueLabel?: Maybe<Scalars['String']['output']>;
};

/** Effects reported for safety events. */
export type SafetyEffects = {
  __typename?: 'SafetyEffects';
  /** Direction of the reported effect (e.g., increase or decrease). */
  direction: Scalars['String']['output'];
  /** Dosing conditions related to the reported effect. */
  dosing?: Maybe<Scalars['String']['output']>;
};

/** Safety liabilities associated with the target. */
export type SafetyLiability = {
  __typename?: 'SafetyLiability';
  /** Biosamples used in safety assessments. */
  biosamples: Array<SafetyBiosamples>;
  /** Data source reporting the safety liability. */
  datasource: Scalars['String']['output'];
  /** Effects reported for the safety event. */
  effects: Array<SafetyEffects>;
  /** Safety event associated with the target. */
  event?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the safety event. */
  eventId?: Maybe<Scalars['String']['output']>;
  /** Literature references for the safety liability. */
  literature?: Maybe<Scalars['String']['output']>;
  /** Studies related to safety assessments. */
  studies: Array<SafetyStudies>;
  /** URL linking to more details on safety liabilities. */
  url?: Maybe<Scalars['String']['output']>;
};

/** Studies related to safety assessments. */
export type SafetyStudies = {
  __typename?: 'SafetyStudies';
  /** Description of the safety study. */
  description?: Maybe<Scalars['String']['output']>;
  /** Name of the safety study. */
  name?: Maybe<Scalars['String']['output']>;
  /** Type of safety study. */
  type?: Maybe<Scalars['String']['output']>;
};

/** Represents a sample of biological material. */
export type Sample = {
  __typename?: 'Sample';
  /** Sample ancestry name. */
  ancestry: Scalars['String']['output'];
  /** Sample size. */
  sampleSize: Scalars['Int']['output'];
};

/** A score for a datasource, used in association scoring. */
export type Score = {
  __typename?: 'Score';
  /** Identifier of the Datasource (e.g., `impc`, `chembl`). */
  id: Scalars['String']['output'];
  /**
   * Association score for the Datasource. Scores are normalized to a range of 0-1. The higher
   * the score, the stronger the association.
   */
  score: Scalars['Float']['output'];
};

/** Facet search hit for a single category item. */
export type SearchFacetResult = {
  __typename?: 'SearchFacetResult';
  /** Facet category this item belongs to (e.g., target, disease). */
  category: Scalars['String']['output'];
  /** Identifier of the datasource contributing this facet. */
  datasourceId: Scalars['String']['output'];
  /** Optional list of underlying entity identifiers represented by this facet. */
  entityIds: Array<Scalars['String']['output']>;
  /** Highlighted text snippets showing why this facet matched the query. */
  highlights: Array<Scalars['String']['output']>;
  /** Facet identifier. */
  id: Scalars['String']['output'];
  /** Human-readable facet label. */
  label: Scalars['String']['output'];
  /** Relevance score of the facet hit for the current query. */
  score: Scalars['Float']['output'];
};

/** Facet search category with result count. */
export type SearchFacetsCategory = {
  __typename?: 'SearchFacetsCategory';
  /** Facet category name. */
  name: Scalars['String']['output'];
  /** Total number of results in this category. */
  total: Scalars['Int']['output'];
};

/** Facet search results including hits and category counts. */
export type SearchFacetsResults = {
  __typename?: 'SearchFacetsResults';
  /** Facet categories with their result counts. */
  categories: Array<SearchFacetsCategory>;
  /** List of facetable hits matching the query. */
  hits: Array<SearchFacetResult>;
  /** Total number of facetable results for the current query. */
  total: Scalars['Int']['output'];
};

/**
 * Full-text search hit describing a single entity and its relevance to the
 * query.
 */
export type SearchResult = {
  __typename?: 'SearchResult';
  /** List of categories the hit belongs to. */
  category: Array<Scalars['String']['output']>;
  /** Short description or summary of the entity. */
  description?: Maybe<Scalars['String']['output']>;
  /** Entity type (target, disease, drug, variant, study). */
  entity: Scalars['String']['output'];
  /** Highlighted text snippets showing where the query matched. */
  highlights: Array<Scalars['String']['output']>;
  /** Entity identifier (e.g., Ensembl, EFO, ChEMBL, variant or study ID). */
  id: Scalars['String']['output'];
  /** Additional keywords associated with the entity. */
  keywords: Array<Scalars['String']['output']>;
  /** Score boosting multiplier applied to the hit during ranking. */
  multiplier: Scalars['Float']['output'];
  /** Primary display name for the entity. */
  name: Scalars['String']['output'];
  /** List of n-grams derived from the name used for fuzzy matching. */
  ngrams: Array<Scalars['String']['output']>;
  /** Resolved entity corresponding to the search hit. */
  object?: Maybe<EntityObject>;
  /** List of name prefixes used for prefix matching. */
  prefixes: Array<Scalars['String']['output']>;
  /** Relevance score returned from the search engine for this hit. */
  score: Scalars['Float']['output'];
};

/** Search result aggregation category with result count. */
export type SearchResultAggCategory = {
  __typename?: 'SearchResultAggCategory';
  /** Category name (e.g., target, disease, drug). */
  name: Scalars['String']['output'];
  /** Total number of search results in this category. */
  total: Scalars['Int']['output'];
};

/** Search result aggregation by entity type with category breakdown. */
export type SearchResultAggEntity = {
  __typename?: 'SearchResultAggEntity';
  /** List of category aggregations within this entity type. */
  categories: Array<SearchResultAggCategory>;
  /** Entity type name (e.g., target, disease, drug, variant, study). */
  name: Scalars['String']['output'];
  /** Total number of search results in this entity type. */
  total: Scalars['Int']['output'];
};

/** Search result aggregations grouped by entity type. */
export type SearchResultAggs = {
  __typename?: 'SearchResultAggs';
  /** List of entity type aggregations with category breakdowns. */
  entities: Array<SearchResultAggEntity>;
  /** Total number of search results across all entities. */
  total: Scalars['Int']['output'];
};

/** Search results including hits and facet aggregations. */
export type SearchResults = {
  __typename?: 'SearchResults';
  /** Facet aggregations by entity and category for the current query. */
  aggregations?: Maybe<SearchResultAggs>;
  /** Combined list of search hits across requested entities. */
  hits: Array<SearchResult>;
  /** Total number of results for the current query and entity filter. */
  total: Scalars['Int']['output'];
};

/**
 * A term from the Sequence Ontology (SO), a controlled vocabulary of sequence features and variant
 * consequences.
 */
export type SequenceOntologyTerm = {
  __typename?: 'SequenceOntologyTerm';
  /** Sequence Ontology term identifier [bioregistry:so]. */
  id: Scalars['String']['output'];
  /** Human-readable label for the term (e.g. `missense_variant`). */
  label: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type SimilarEntityPage = {
  __typename?: 'SimilarEntityPage';
  count: Scalars['Int']['output'];
  rows: Array<Similarity>;
};

/** Semantic similarity score between labels, used to suggest related entities. */
export type Similarity = {
  __typename?: 'Similarity';
  /** Entity category this similarity refers to (`Target`, `Disease` or `Drug`). */
  category: Category;
  /** Identifier of the similar entity (e.g., Ensembl, EFO, ChEMBL ID). */
  id: Scalars['String']['output'];
  /** Resolved Platform entity corresponding to this similar label. */
  object?: Maybe<SimilarityUnion>;
  /**
   * Similarity score between this entity and the query label. Scores are normalised between 0
   * and 1; higher scores indicate more similar entities.
   */
  score: Scalars['Float']['output'];
};

/** The union of `Target`, `Disease` and `Drug` entities. */
export type SimilarityUnion = Disease | Drug | Target;

/** Sort direction: ascending or descending. */
export enum SortDirection {
  /** Ascending order. */
  Ascending = 'ASCENDING',
  /** Descending order. */
  Descending = 'DESCENDING'
}

/** Strand orientation of a genomic feature. */
export enum Strand {
  /** Negative strand orientation. */
  Negative = 'NEGATIVE',
  /** Positive strand orientation. */
  Positive = 'POSITIVE',
  /** Unknown strand orientation. */
  Unknown = 'UNKNOWN'
}

/** Filter for a string field. */
export type StringFilter = {
  contains?: InputMaybe<Scalars['String']['input']>;
  eq?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  ne?: InputMaybe<Scalars['String']['input']>;
  notContains?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Metadata for all complex trait GWAS and molecular QTL studies in the Platform. The dataset
 * includes study metadata, phenotype information, sample sizes, publication information and more.
 * Molecular QTL studies are split by their target trait (e.g. gene, splice junction, etc),
 * biosample (tissue, cell type or cell line) and condition (e.g. stimulation, time period, etc),
 * potentially leading to tens of thousands of studies derived from the same publication.
 */
export type Study = {
  __typename?: 'Study';
  /** Mapping of quality control flags. */
  SumstatQCValues: Array<SumStatQc>;
  /** Collection of flags indicating the type of the analysis conducted in the association study. */
  analysisFlags: Array<Scalars['String']['output']>;
  /** List of cohort(s) represented in the discovery sample. */
  cohorts: Array<Scalars['String']['output']>;
  /** Reported sample conditions. */
  condition?: Maybe<Scalars['String']['output']>;
  /**
   * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
   * credible set as well as the fine-mapping method and statistics used to estimate the credible
   * set.
   */
  credibleSets: CredibleSetPage;
  /** Collection of ancestries reported by the study discovery phase. */
  discoverySamples: Array<Sample>;
  /** Disease associated with a studied trait. */
  diseases: Array<Disease>;
  /** Indication whether the summary statistics exist in the source. */
  hasSumstats?: Maybe<Scalars['Boolean']['output']>;
  /** The GWAS or molQTL study identifier (e.g. GCST004132). */
  id: Scalars['String']['output'];
  /** Study initial sample size. */
  initialSampleSize?: Maybe<Scalars['String']['output']>;
  /** Collection of populations referenced by the study. */
  ldPopulationStructure: Array<LdPopulationStructure>;
  /** The number of cases in this broad ancestry group. */
  nCases?: Maybe<Scalars['Int']['output']>;
  /** The number of controls in this broad ancestry group. */
  nControls?: Maybe<Scalars['Int']['output']>;
  /** The number of samples tested in GWAS analysis. */
  nSamples?: Maybe<Scalars['Int']['output']>;
  /** Identifier of the source project collection that the study information is derived from. */
  projectId: Scalars['String']['output'];
  /** Publication in the narrative-in-text author-date style. */
  publicationAuthorDate?: Maybe<Scalars['String']['output']>;
  /** Date of the publication that references the study. */
  publicationDate?: Maybe<Scalars['String']['output']>;
  /** First name and initials of the author of the publication that references the study. */
  publicationFirstAuthor?: Maybe<Scalars['String']['output']>;
  /** Abbreviated journal name where the publication referencing study was published. */
  publicationJournal?: Maybe<Scalars['String']['output']>;
  /** Title of the publication that references the study. */
  publicationTitle?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier of the publication that references the study [bioregistry:pubmed]. */
  pubmedId?: Maybe<Scalars['String']['output']>;
  /** Control metrics refining study validation. */
  qualityControls: Array<Scalars['String']['output']>;
  /** Collection of ancestries reported by the study replication phase. */
  replicationSamples: Array<Sample>;
  /** Field specifying if study contains phenotype/disease or molecular genetic associations. */
  studyType: StudyType;
  /** Path to the source study summary statistics (if exists at the source). */
  summarystatsLocation?: Maybe<Scalars['String']['output']>;
  /** Molecular or phenotypic trait, derived from source, analysed in the study. */
  traitFromSource: Scalars['String']['output'];
  /** Phenotypic trait IDs that map to the analysed trait reported by study. */
  traitFromSourceMappedIds: Array<Scalars['String']['output']>;
};


/**
 * Metadata for all complex trait GWAS and molecular QTL studies in the Platform. The dataset
 * includes study metadata, phenotype information, sample sizes, publication information and more.
 * Molecular QTL studies are split by their target trait (e.g. gene, splice junction, etc),
 * biosample (tissue, cell type or cell line) and condition (e.g. stimulation, time period, etc),
 * potentially leading to tens of thousands of studies derived from the same publication.
 */
export type StudyCredibleSetsArgs = {
  page?: Page;
};

/** Filter for studies. */
export type StudyFilter = {
  /** Keep studies whose number of samples matches this filter. */
  nSamples?: InputMaybe<IntFilter>;
  /** Keep studies whose project ID matches this filter. */
  projectId?: InputMaybe<StringFilter>;
  /** Keep studies whose type is one of these. */
  studyType?: InputMaybe<Array<StudyType>>;
};

/**
 * The result of a paginated query, containing the total number of items, the items, and statistics
 * about the query.
 */
export type StudyPage = {
  __typename?: 'StudyPage';
  count: Scalars['Int']['output'];
  rows: Array<Study>;
  stats: StudyStats;
};

/** Sort types. Contain the sort field and direction. */
export type StudySort = {
  /** The direction to sort in. */
  direction?: SortDirection;
  /** The field to sort by. */
  key: StudySortField;
};

/** Contains the fields available for sorting studies. */
export enum StudySortField {
  NCases = 'N_CASES',
  NControls = 'N_CONTROLS',
  NSamples = 'N_SAMPLES',
  PublicationAuthorDate = 'PUBLICATION_AUTHOR_DATE',
  StudyType = 'STUDY_TYPE',
  TraitFromSource = 'TRAIT_FROM_SOURCE'
}

/** Statistics for a set of studies. */
export type StudyStats = {
  __typename?: 'StudyStats';
  /** The distribution of studies with sumstats. */
  hasSumstats: Array<OptBoolBucket>;
  /** The summary statistics of sample sizes. */
  nSamples: Sumstats;
  /** The samples to cases ratio. */
  samplesByCase: Sumstats;
  /** The distribution of study types. */
  studyType: Array<StudyTypeBucket>;
};

/** Field specifying if study contains phenotype/disease or molecular genetic associations. */
export enum StudyType {
  /** Bulk tissue expression quantitative trait locus (eQTL) study. */
  Eqtl = 'eqtl',
  /** Genome-wide association study (GWAS) of complex traits or diseases. */
  Gwas = 'gwas',
  /** Bulk tissue protein quantitative trait locus (pQTL) study. */
  Pqtl = 'pqtl',
  /** Single-cell expression quantitative trait locus (sc-eQTL) study. */
  Sceqtl = 'sceqtl',
  /** Single-cell protein quantitative trait locus (sc-pQTL) study. */
  Scpqtl = 'scpqtl',
  /** Single-cell splicing quantitative trait locus (sc-sQTL) study. */
  Scsqtl = 'scsqtl',
  /** Single-cell transcript uptake quantitative trait locus (sc-tuQTL) study. */
  Sctuqtl = 'sctuqtl',
  /** Bulk tissue splicing quantitative trait locus (sQTL) study. */
  Sqtl = 'sqtl',
  /** Bulk tissue transcript uptake quantitative trait locus (tuQTL) study. */
  Tuqtl = 'tuqtl'
}

/** A bucket for a distribution of values. */
export type StudyTypeBucket = {
  __typename?: 'StudyTypeBucket';
  /** The number of occurrences of the value. */
  count: Scalars['Int']['output'];
  /** The value of the bucket. */
  value: StudyType;
};

/** Mapping of quality control flags. */
export type SumStatQc = {
  __typename?: 'SumStatQC';
  /** Quality control metric identifier. */
  QCCheckName: Scalars['String']['output'];
  /** Quality control metric value. */
  QCCheckValue: Scalars['Float']['output'];
};

/** Summary statistics for a set of values. */
export type Sumstats = {
  __typename?: 'Sumstats';
  /** The 25th percentile value. */
  _25: Scalars['Float']['output'];
  /** The 50th percentile value. */
  _50: Scalars['Float']['output'];
  /** The 75th percentile value. */
  _75: Scalars['Float']['output'];
  /** The number of values. */
  count: Scalars['Int']['output'];
  /** The maximum value. */
  max: Scalars['Float']['output'];
  /** The mean of the values. */
  mean: Scalars['Float']['output'];
  /** The minimum value. */
  min: Scalars['Float']['output'];
  /** The standard deviation of the values. */
  std: Scalars['Float']['output'];
};

/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type Target = {
  __typename?: 'Target';
  /** List of alternative Ensembl gene identifiers mapped to non-canonical chromosomes. */
  alternativeGenes: Array<Scalars['String']['output']>;
  /** Approved full name of the target gene. */
  approvedName: Scalars['String']['output'];
  /** Approved gene symbol of the target. */
  approvedSymbol: Scalars['String']['output'];
  /**
   * Target-disease associations calculated on-the-fly using configurable data source weights and
   * evidence filters. Returns associations with aggregated scores and evidence counts supporting
   * the target-disease relationship.
   */
  associatedDiseases: DiseaseAssociationPage;
  /** Association time series. */
  associationTimeSeries: AssociationTimeseriesPage;
  /** Baseline expression */
  baselineExpression: BaselineExpressionPage;
  /** Biotype classification of the target gene, indicating if the gene is protein coding. */
  biotype: Scalars['String']['output'];
  /** The Ensembl canonical transcript of the target gene. */
  canonicalTranscript: CanonicalTranscript;
  /** Chemical probes with high selectivity and specificity for the target. */
  chemicalProbes: Array<ChemicalProbe>;
  /**
   * 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the
   * credible set as well as the fine-mapping method and statistics used to estimate the credible
   * set.
   */
  credibleSets: CredibleSetPage;
  /** Database cross-references for the target. */
  dbXrefs: Array<IdAndSource>;
  /**
   * Essentiality measurements extracted from DepMap, stratified by tissue or anatomical units.
   * Gene essentiality is assessed based on dependencies exhibited when knocking out genes in
   * cancer cellular models using CRISPR screenings from the Cancer Dependency Map (DepMap)
   * Project. Gene effects below -1 can be considered dependencies.
   */
  depMapEssentiality: DepMapEssentialityPage;
  /**
   * Target-disease evidence from all data sources supporting associations between this target
   * and diseases or phenotypes. Evidence entries are reported and scored according to confidence
   * in the association.
   */
  evidences: EvidencePage;
  /** Functional descriptions of the target gene sourced from UniProt. */
  functionDescriptions: Array<Scalars['String']['output']>;
  /** List of Gene Ontology (GO) annotations related to the target. */
  geneOntology: Array<GeneOntologyAnnotation>;
  /** Constraint scores for the target gene from GnomAD based on loss-of-function intolerance. */
  geneticConstraint: Array<Constraint>;
  /** Genomic location information of the target gene. */
  genomicLocation: GenomicLocation;
  /** Hallmarks related to the target gene sourced from COSMIC. */
  hallmarks: Hallmark;
  /** Homologues of the target gene in other species. */
  homologues: Array<Homologue>;
  /** Unique identifier for the target [bioregistry:ensembl]. */
  id: Scalars['String']['output'];
  /**
   * Molecular interactions reporting experimental or functional interactions between this target
   * and other molecules. This dataset contains pair-wise interactions deposited in several
   * databases capturing: physical interactions (e.g. IntAct), directional interactions (e.g.
   * Signor), pathway relationships (e.g. Reactome) or functional interactions (e.g.
   * STRINGdb).
   */
  interactions: InteractionPage;
  /**
   * Flag indicating whether this target is essential based on CRISPR screening data from cancer
   * cell line models. Essential genes are those that show dependency when knocked out in
   * cellular models.
   */
  isEssential?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Return the list of publications that mention the main entity, alone or in combination with
   * other entities.
   */
  literatureOcurrences: PublicationPage;
  /**
   * Mouse phenotype information linking this human target to observed phenotypes in mouse
   * models. Provides data on phenotypes observed when the target gene is modified in mouse
   * models.
   */
  mousePhenotypes: MousePhenotypePage;
  /** List of name-based synonyms for the target gene. */
  nameSynonyms: Array<LabelSource>;
  /** List of obsolete names previously used for the target gene. */
  obsoleteNames: Array<LabelSource>;
  /** List of obsolete symbols previously used for the target gene. */
  obsoleteSymbols: Array<LabelSource>;
  /** Pathway annotations for the target. */
  pathways: Array<ReactomePathway>;
  /**
   * Pharmacogenomics data linking genetic variants affecting this target to drug responses. Data
   * is integrated from sources including ClinPGx and describes how genetic variants influence
   * individual drug responses when targeting this gene product.
   */
  pharmacogenomics: PharmacogenomicsPage;
  /**
   * Target-specific properties used to prioritise targets for further investigation.
   * Prioritisation factors cover several areas around clinical precedence, tractability,
   * do-ability, and safety of the target. Values range from -1 (unfavourable/deprioritised) to 1
   * (favourable/prioritised).
   */
  prioritisation: TargetPrioritisations;
  /** Protein identifiers associated with the target. */
  proteinIds: Array<IdAndSource>;
  /** Known target safety effects and target safety risk information. */
  safetyLiabilities: Array<SafetyLiability>;
  /** Return similar labels using a model Word2CVec trained with PubMed. */
  similarEntities: SimilarEntityPage;
  /** List of subcellular locations where the target protein is found. */
  subcellularLocations: Array<LocationAndSource>;
  /** List of symbol-based synonyms for the target gene. */
  symbolSynonyms: Array<LabelSource>;
  /** List of synonyms for the target gene. */
  synonyms: Array<LabelSource>;
  /** Target classification categories from ChEMBL. */
  targetClass: Array<TargetClass>;
  /** Tractability information for the target. */
  tractability: Array<Tractability>;
  /** List of Ensembl transcript identifiers associated with the target. */
  transcriptIds: Array<Scalars['String']['output']>;
  /** List of transcripts associated with the target including protein and structure annotations. */
  transcripts: Array<Transcript>;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetAssociatedDiseasesArgs = {
  BFilter?: InputMaybe<Scalars['String']['input']>;
  Bs?: Array<Scalars['String']['input']>;
  datasourcePolicyOverrides?: Array<DatasourcePolicyOverride>;
  facetFilters?: Array<Scalars['String']['input']>;
  includeMeasurements?: Scalars['Boolean']['input'];
  page?: Page;
  sort?: AssociationSort;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetAssociationTimeSeriesArgs = {
  aggregationTypes?: InputMaybe<Array<AggregationType>>;
  efoId: Scalars['String']['input'];
  endYear?: InputMaybe<Scalars['Int']['input']>;
  isDirect: Scalars['Boolean']['input'];
  page?: Page;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetBaselineExpressionArgs = {
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetCredibleSetsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetDepMapEssentialityArgs = {
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetEvidencesArgs = {
  datasourceIds?: Array<Datasource>;
  efoIds: Array<Scalars['String']['input']>;
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetInteractionsArgs = {
  page?: Page;
  scoreThreshold?: InputMaybe<Scalars['Float']['input']>;
  sourceDatabase?: InputMaybe<InteractionSourceDatabase>;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  page?: Page;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetMousePhenotypesArgs = {
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetPharmacogenomicsArgs = {
  page?: Page;
};


/**
 * Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl
 * database and uses the Ensembl gene ID as the primary identifier. An Ensembl gene ID is
 * considered potential drug target if included in the canonical assembly or if present alternative
 * assemblies but encoding for a reviewed protein product according to the UniProt database.
 */
export type TargetSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: Page;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** A scored association between a disease and a target or vice versa. */
export type TargetAssociation = {
  __typename?: 'TargetAssociation';
  /** Association scores computed for every datasource (e.g., IMPC, ChEMBL, Gene2Phenotype). */
  datasourceScores: Array<Score>;
  /**
   * Overall association score aggregated across all evidence types. A higher score indicates a
   * stronger association between target and disease. Scores are normalized to a range of 0-1.
   */
  score: Scalars['Float']['output'];
  /** Associated target entity. */
  target?: Maybe<Target>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type TargetAssociationPage = {
  __typename?: 'TargetAssociationPage';
  count: Scalars['Int']['output'];
  rows: Array<TargetAssociation>;
};

/** Target classification categories from ChEMBL. */
export type TargetClass = {
  __typename?: 'TargetClass';
  /** Unique identifier for the target class. */
  id: Scalars['Int']['output'];
  /** Label for the target class. */
  label: Scalars['String']['output'];
  /** Hierarchical level of the target class. */
  level: Scalars['String']['output'];
};

/** The result of a paginated query, containing the total number of items and the items. */
export type TargetPage = {
  __typename?: 'TargetPage';
  count: Scalars['Int']['output'];
  rows: Array<Target>;
};

/** A target prioritisation factor. */
export type TargetPrioritisation = {
  __typename?: 'TargetPrioritisation';
  /** Key for the area of prioritisation. */
  key: Scalars['String']['output'];
  /** Score for the prioritisation factor. */
  value: Scalars['String']['output'];
};

/**
 * Target-specific properties used to prioritise targets for further investigation. Prioritisation
 * factors cover several areas around clinical precedence, tractability, do-ability, and safety of
 * the target. Values range from -1 (unfavourable/deprioritised) to 1 (favourable/prioritised).
 */
export type TargetPrioritisations = {
  __typename?: 'TargetPrioritisations';
  items: Array<TargetPrioritisation>;
};

/**
 * Tractability information for the target. Indicates the feasibility of targeting the gene/protein
 * with different therapeutic modalities.
 */
export type Tractability = {
  __typename?: 'Tractability';
  /** Tractability category label. */
  label: Scalars['String']['output'];
  /** Modality of the tractability assessment. */
  modality: Scalars['String']['output'];
  /** Tractability value assigned to the target (true indicates tractable). */
  value: Scalars['Boolean']['output'];
};

/** Transcript annotation for a target gene. */
export type Transcript = {
  __typename?: 'Transcript';
  /** AlphaFold structure prediction identifier. */
  alphafoldId?: Maybe<Scalars['String']['output']>;
  /** Biotype classification of the transcript. */
  biotype: Scalars['String']['output'];
  /** Whether this is the Ensembl canonical transcript. */
  isEnsemblCanonical?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the UniProt entry is reviewed (Swiss-Prot). */
  isUniprotReviewed?: Maybe<Scalars['Boolean']['output']>;
  /** Ensembl transcript identifier. */
  transcriptId: Scalars['String']['output'];
  /** Ensembl translation identifier. */
  translationId?: Maybe<Scalars['String']['output']>;
  /** UniProt accession mapped to the transcript. */
  uniprotId?: Maybe<Scalars['String']['output']>;
  /** UniProt isoform identifier. */
  uniprotIsoformId?: Maybe<Scalars['String']['output']>;
};

/** Predicted consequences on transcript context. */
export type TranscriptConsequence = {
  __typename?: 'TranscriptConsequence';
  /** Amino acid change caused by this variant on this gene. */
  aminoAcidChange?: Maybe<Scalars['String']['output']>;
  /** Affected codon in the transcript. */
  codons?: Maybe<Scalars['String']['output']>;
  /** Score assigned to transcript based on Ensembl VEP consequence. */
  consequenceScore: Scalars['Float']['output'];
  /** Distance of the variant from the transcript. */
  distanceFromFootprint: Scalars['Int']['output'];
  /** Distance of the variant from the transcription start site. */
  distanceFromTss: Scalars['Int']['output'];
  /** Ensembl VEP predicted impact of the variant on the transcript. */
  impact?: Maybe<Scalars['String']['output']>;
  /** Flagging if the transcript is the canonical transcript for the gene. */
  isEnsemblCanonical: Scalars['Boolean']['output'];
  /** Loss-of-function prediction based on LOFTEE. */
  lofteePrediction?: Maybe<Scalars['String']['output']>;
  /** Polyphen prediction of the variant impact on the transcript. */
  polyphenPrediction?: Maybe<Scalars['Float']['output']>;
  /** SIFT prediction of the variant impact on the transcript. */
  siftPrediction?: Maybe<Scalars['Float']['output']>;
  /** The target (gene/protein) associated with the transcript. */
  target?: Maybe<Target>;
  /** Ensembl transcript identifier [bioregistry:ensembl]. */
  transcriptId?: Maybe<Scalars['String']['output']>;
  /** Index of the transcript in the list of transcripts around the gene. */
  transcriptIndex: Scalars['Int']['output'];
  /** Uniprot identifiers of the gene product [bioregistry:uniprot]. */
  uniprotAccessions: Array<Scalars['String']['output']>;
  /**
   * The sequence ontology term of the consequence of the variant based on Ensembl VEP in the
   * context of the transcript.
   */
  variantConsequences: Array<SequenceOntologyTerm>;
};

/** Sort types. Contain the sort field and direction. */
export type TranscriptConsequenceSort = {
  /** The direction to sort in. */
  direction?: SortDirection;
  /** The field to sort by. */
  key: TranscriptConsequenceSortField;
};

export enum TranscriptConsequenceSortField {
  /** Distance of the variant from the transcript. */
  DistanceFromFootprint = 'DISTANCE_FROM_FOOTPRINT',
  /** Distance of the variant from the transcription start site. */
  DistanceFromTss = 'DISTANCE_FROM_TSS',
  /** Approved gene symbol of the target (gene/protein) associated with the transcript. */
  TargetApprovedSymbol = 'TARGET_APPROVED_SYMBOL'
}

/** Literature references associated with the clinical trial. */
export type TrialLiterature = {
  __typename?: 'TrialLiterature';
  /** PubMed identifier of the reference, when the source records one. */
  id: Scalars['String']['output'];
  /**
   * How the reference relates to the trial: RESULT and DERIVED report its outcome, BACKGROUND
   * is literature its authors cited.
   */
  referenceType: Scalars['String']['output'];
};

/** Lead sponsor associated with the clinical trial. */
export type TrialSponsor = {
  __typename?: 'TrialSponsor';
  /** Classification of the lead trial sponsor (e.g. INDUSTRY, NIH, OTHER). */
  agencyClass?: Maybe<Scalars['String']['output']>;
  /** Name of the lead sponsor associated with the clinical trial. */
  name?: Maybe<Scalars['String']['output']>;
};

/** Type of clinical study. */
export enum TrialStudyType {
  /** Expanded access. */
  ExpandedAccess = 'EXPANDED_ACCESS',
  /** Interventional. */
  Interventional = 'INTERVENTIONAL',
  /** Observational. */
  Observational = 'OBSERVATIONAL'
}

/** External resource link with an optional display name. */
export type Url = {
  __typename?: 'Url';
  /** Optional human-readable label for the URL. */
  niceName: Scalars['String']['output'];
  /** URL to the external resource. */
  url?: Maybe<Scalars['String']['output']>;
};

/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type Variant = {
  __typename?: 'Variant';
  /** Allele frequencies of the variant in different populations. */
  alleleFrequencies: Array<AlleleFrequency>;
  /** Alternate allele for the variant. */
  alternateAllele: Scalars['String']['output'];
  /** Chromosome on which the variant is located. */
  chromosome: Chromosome;
  /**
   * 95% credible sets for GWAS and molQTL studies that contain this variant. Credible sets
   * include all variants in the credible set (locus) as well as the fine-mapping method and
   * derived statistics.
   */
  credibleSets: CredibleSetPage;
  /** Cross-references for the variant in different databases. */
  dbXrefs: Array<DbXref>;
  enhancerToGene: EnhancerToGenePage;
  /** HGVS identifier of the variant. */
  hgvsId?: Maybe<Scalars['String']['output']>;
  /**
   * The sequence ontology term of the most severe consequence of the variant based on Ensembl
   * VEP.
   */
  mostSevereConsequence?: Maybe<SequenceOntologyTerm>;
  /**
   * Pharmacogenomics data linking this genetic variant to drug responses. Data is integrated
   * from sources including ClinPGx and describes how genetic variants influence individual drug
   * responses.
   */
  pharmacogenomics: PharmacogenomicsPage;
  /** Variant's position on the chromosome. */
  position: Scalars['Int']['output'];
  /**
   * Protein coding coordinates linking this variant to its amino acid-level consequences in
   * protein products. Describes variant consequences at the protein level including amino acid
   * changes and their positions.
   */
  proteinCodingCoordinates: ProteinCodingCoordinatesPage;
  /** Reference allele for the variant. */
  referenceAllele: Scalars['String']['output'];
  /** `RsIds` for the variant. */
  rsIds: Array<Scalars['String']['output']>;
  /** Predicted consequences on transcript context. */
  transcriptConsequences: Array<TranscriptConsequence>;
  /** Short summary of the variant effect. */
  variantDescription: Scalars['String']['output'];
  /** List of predicted or measured effects of the variant based on various methods. */
  variantEffect: Array<VariantEffect>;
  /**
   * Unique identifier for the variant following schema:
   * {chromosome}-{position}-{referenceAllele}-{alternateAllele}.
   */
  variantId: Scalars['String']['output'];
};


/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type VariantCredibleSetsArgs = {
  filter?: InputMaybe<CredibleSetFilter>;
  page?: Page;
};


/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type VariantEnhancerToGeneArgs = {
  page?: Page;
};


/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type VariantPharmacogenomicsArgs = {
  page?: Page;
};


/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type VariantProteinCodingCoordinatesArgs = {
  page?: Page;
};


/**
 * Core variant information for all variants in the Platform.
 * Variants are included if any phenotypic information is available for the variant,
 * including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx.
 * The dataset includes variant metadata as well as variant effects derived from Ensembl VEP.
 */
export type VariantTranscriptConsequencesArgs = {
  sort?: Array<TranscriptConsequenceSort>;
};

/**
 * Genetic variants influencing individual drug responses. Pharmacogenetics data is integrated from
 * sources including Pharmacogenomics Knowledgebase (`PharmGKB`).
 */
export type VariantAnnotation = {
  __typename?: 'VariantAnnotation';
  /** Allele or genotype in the base case. */
  baseAlleleOrGenotype?: Maybe<Scalars['String']['output']>;
  /** Allele or genotype in the comparison case. */
  comparisonAlleleOrGenotype?: Maybe<Scalars['String']['output']>;
  /** Indicates in which direction the genetic variant increases or decreases drug response. */
  directionality?: Maybe<Scalars['String']['output']>;
  /** Allele observed effect. */
  effect?: Maybe<Scalars['String']['output']>;
  /** Summary of the impact of the allele on the drug response. */
  effectDescription?: Maybe<Scalars['String']['output']>;
  /** Type of effect. */
  effectType?: Maybe<Scalars['String']['output']>;
  /** Entity affected by the effect. */
  entity?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier (PMID) of the literature entry. */
  literature?: Maybe<Scalars['String']['output']>;
};

/** Predicted or measured effect of the variant based on various methods. */
export type VariantEffect = {
  __typename?: 'VariantEffect';
  /** Textual assessment of the variant effect. */
  assessment?: Maybe<Scalars['String']['output']>;
  /** Flagging if the variant effect is considered pathogenic. */
  assessmentFlag?: Maybe<Scalars['String']['output']>;
  /** Method name used to predict the effect of the variant. */
  method?: Maybe<Scalars['String']['output']>;
  /** Variant effect normalised between -1 and 1. */
  normalisedScore?: Maybe<Scalars['Float']['output']>;
  /** Score of the variant effect. */
  score?: Maybe<Scalars['Float']['output']>;
  /** The target (gene/protein) on which the variant effect is interpreted. */
  target?: Maybe<Target>;
};

/** The result of a paginated query, containing the total number of items and the items. */
export type VariantPage = {
  __typename?: 'VariantPage';
  count: Scalars['Int']['output'];
  rows: Array<Variant>;
};

/** Version information for the API and its underlying data sources. */
export type Version = {
  __typename?: 'Version';
  /** Month of the version, e.g. `06`. */
  month: Scalars['String']['output'];
  /**
   * Revision of the version, e.g. `0`. This field is optional for data releases and may be
   * omitted, but not for the API version, which always has a revision even if it is `0`.
   */
  revision: Scalars['String']['output'];
  /** Year of the version, e.g. `23`. */
  year: Scalars['String']['output'];
};

export type InteractionsSectionQueryVariables = Exact<{
  ensgId: Scalars['String']['input'];
  sourceDatabase?: InputMaybe<InteractionSourceDatabase>;
  index?: InputMaybe<Scalars['Int']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
  scoreThreshold?: InputMaybe<Scalars['Float']['input']>;
}>;


export type InteractionsSectionQuery = { __typename?: 'Query', target?: { __typename?: 'Target', id: string, approvedName: string, approvedSymbol: string, interactions: { __typename?: 'InteractionPage', count: number, rows: Array<{ __typename?: 'Interaction', intA: string, intABiologicalRole: string, intB: string, intBBiologicalRole: string, score?: number | null, count: number, sourceDatabase: InteractionSourceDatabase, targetA?: { __typename?: 'Target', id: string, approvedSymbol: string } | null, speciesA: { __typename?: 'InteractionSpeciesA', mnemonic: string }, targetB?: { __typename?: 'Target', id: string, approvedSymbol: string } | null, speciesB: { __typename?: 'InteractionSpeciesB', mnemonic: string }, evidences: Array<{ __typename?: 'InteractionEvidence', evidenceScore?: number | null, hostOrganismScientificName?: string | null, interactionDetectionMethodMiIdentifier: string, interactionDetectionMethodShortName: string, interactionIdentifier?: string | null, interactionTypeShortName?: string | null, expansionMethodShortName?: string | null, pubmedId?: string | null, participantDetectionMethodA: Array<{ __typename?: 'ParticipantDetectionMethod', miIdentifier?: string | null, shortName?: string | null }>, participantDetectionMethodB: Array<{ __typename?: 'ParticipantDetectionMethod', miIdentifier?: string | null, shortName?: string | null }> }> }> } } | null };

export type GeneEnrichmentAnalysisDiseaseAssociationsQueryVariables = Exact<{
  efoId: Scalars['String']['input'];
  index: Scalars['Int']['input'];
  size: Scalars['Int']['input'];
  sortBy: Scalars['String']['input'];
  datasources?: Array<DatasourcePolicyOverride> | DatasourcePolicyOverride;
  rowsFilter?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  facetFilters?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  entitySearch: Scalars['String']['input'];
}>;


export type GeneEnrichmentAnalysisDiseaseAssociationsQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, name: string, associatedTargets: { __typename?: 'TargetAssociationPage', count: number, rows: Array<{ __typename?: 'TargetAssociation', score: number, target?: { __typename?: 'Target', id: string, approvedSymbol: string, approvedName: string, prioritisation: { __typename?: 'TargetPrioritisations', items: Array<{ __typename?: 'TargetPrioritisation', key: string, value: string }> } } | null, datasourceScores: Array<{ __typename?: 'Score', score: number, componentId: string }> }> } } | null };

export type DiseaseAssociationsQueryVariables = Exact<{
  id: Scalars['String']['input'];
  index: Scalars['Int']['input'];
  size: Scalars['Int']['input'];
  sortBy: Scalars['String']['input'];
  datasources?: Array<DatasourcePolicyOverride> | DatasourcePolicyOverride;
  rowsFilter?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  facetFilters?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  entitySearch: Scalars['String']['input'];
}>;


export type DiseaseAssociationsQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, name: string, associatedTargets: { __typename?: 'TargetAssociationPage', count: number, rows: Array<{ __typename?: 'TargetAssociation', score: number, target?: { __typename?: 'Target', id: string, approvedSymbol: string, approvedName: string, prioritisation: { __typename?: 'TargetPrioritisations', items: Array<{ __typename?: 'TargetPrioritisation', key: string, value: string }> } } | null, datasourceScores: Array<{ __typename?: 'Score', score: number, componentId: string }> }> } } | null };

export type DiseasePageQueryVariables = Exact<{
  efoId: Scalars['String']['input'];
}>;


export type DiseasePageQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, name: string, dbXRefs: Array<string> } | null };

export type DiseaseProfileHeaderFragment = { __typename?: 'Disease', description?: string | null, synonyms: Array<{ __typename?: 'DiseaseSynonym', relation: string, terms: Array<string | null> }> };

export type TargetAssociationsQueryVariables = Exact<{
  id: Scalars['String']['input'];
  index: Scalars['Int']['input'];
  size: Scalars['Int']['input'];
  sortBy: Scalars['String']['input'];
  datasources?: Array<DatasourcePolicyOverride> | DatasourcePolicyOverride;
  rowsFilter?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  facetFilters?: Array<Scalars['String']['input']> | Scalars['String']['input'];
  entitySearch: Scalars['String']['input'];
  includeMeasurements?: Scalars['Boolean']['input'];
}>;


export type TargetAssociationsQuery = { __typename?: 'Query', target?: { __typename?: 'Target', id: string, approvedSymbol: string, associatedDiseases: { __typename?: 'DiseaseAssociationPage', count: number, rows: Array<{ __typename?: 'DiseaseAssociation', score: number, disease?: { __typename?: 'Disease', id: string, name: string } | null, datasourceScores: Array<{ __typename?: 'Score', score: number, componentId: string }> }> } } | null };

export type DiseaseBibliographyQueryVariables = Exact<{
  id: Scalars['String']['input'];
  ids?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
  size?: Scalars['Int']['input'];
  entityNames?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  index?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
}>;


export type DiseaseBibliographyQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, name: string, similarEntities: { __typename?: 'SimilarEntityPage', count: number, rows: Array<{ __typename?: 'Similarity', score: number, id: string, object?: { __typename?: 'Disease', id: string, name: string } | { __typename?: 'Drug', id: string, name: string } | { __typename?: 'Target', id: string, approvedSymbol: string } | null }> }, literatureOcurrences: { __typename?: 'PublicationPage', count: number, stats: { __typename?: 'PublicationStats', earliestPubDate: number }, rows: Array<{ __typename?: 'Publication', pmid: string, pmcid?: string | null, publicationDate: string }> } } | null };

export type DiseaseBibliography = { __typename?: 'Disease', literatureOcurrences: { __typename?: 'PublicationPage', count: number } };

export type DrugsQueryVariables = Exact<{
  efoId: Scalars['String']['input'];
  index?: Scalars['Int']['input'];
  size?: Scalars['Int']['input'];
}>;


export type DrugsQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', name: string, drugAndClinicalCandidates: { __typename?: 'ClinicalIndicationPage', count: number, rows: Array<{ __typename?: 'ClinicalIndication', id: string, maxClinicalStage: string, drug: { __typename?: 'Drug', id: string, name: string }, clinicalReports: Array<{ __typename?: 'ClinicalReport', id: string }> }> } } | null };

export type DrugsSummaryFragment = { __typename?: 'Disease', drugAndClinicalCandidates: { __typename?: 'ClinicalIndicationPage', count: number } };

export type GwasStudiesQueryVariables = Exact<{
  diseaseIds: Array<Scalars['String']['input']> | Scalars['String']['input'];
  size: Scalars['Int']['input'];
  index: Scalars['Int']['input'];
  sort?: Array<StudySort> | StudySort;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GwasStudiesQuery = { __typename?: 'Query', studies: { __typename?: 'StudyPage', count: number, rows: Array<{ __typename?: 'Study', id: string, projectId: string, traitFromSource: string, publicationFirstAuthor?: string | null, publicationDate?: string | null, publicationJournal?: string | null, nSamples?: number | null, cohorts: Array<string>, pubmedId?: string | null, ldPopulationStructure: Array<{ __typename?: 'LdPopulationStructure', ldPopulation: string, relativeSampleSize?: number | null }>, credibleSets: { __typename?: 'CredibleSetPage', count: number } }> } };

export type OntologyAncestorsQueryVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
  size: Scalars['Int']['input'];
}>;


export type OntologyAncestorsQuery = { __typename?: 'Query', diseases: { __typename?: 'DiseasePage', count: number, rows: Array<{ __typename?: 'Disease', id: string, name: string, isTherapeuticArea: boolean, parents: Array<{ __typename?: 'Disease', id: string }> }> } };

export type OntologyQueryVariables = Exact<{
  efoId: Scalars['String']['input'];
}>;


export type OntologyQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, name: string, isTherapeuticArea: boolean, ancestors: Array<string>, parents: Array<{ __typename?: 'Disease', id: string }>, children: Array<{ __typename?: 'Disease', id: string, name: string, isTherapeuticArea: boolean, parents: Array<{ __typename?: 'Disease', id: string }> }> } | null };

export type OntologySummaryFragment = { __typename?: 'Disease', id: string, name: string, isTherapeuticArea: boolean, therapeuticAreas: Array<string> };

export type PhenotypesQueryVariables = Exact<{
  efoId: Scalars['String']['input'];
  index?: Scalars['Int']['input'];
  size?: Scalars['Int']['input'];
}>;


export type PhenotypesQuery = { __typename?: 'Query', disease?: { __typename?: 'Disease', id: string, phenotypes: { __typename?: 'DiseasePhenotypePage', count: number, rows: Array<{ __typename?: 'DiseasePhenotype', phenotypeHPO?: { __typename?: 'Hpo', id: string, name: string, description?: string | null, namespace: Array<string> } | null, phenotypeEFO?: { __typename?: 'Disease', id: string, name: string } | null, evidence: Array<{ __typename?: 'PhenotypeEvidence', aspect?: string | null, bioCuration?: string | null, diseaseFromSourceId: string, diseaseFromSource: string, evidenceType?: string | null, frequency?: string | null, qualifierNot: boolean, references: Array<string>, sex?: string | null, resource: string, onset: Array<{ __typename?: 'Hpo', name: string, id: string }>, modifiers: Array<{ __typename?: 'Hpo', name: string, id: string }> }> }> } } | null };

export type PhenotypesSummaryFragment = { __typename?: 'Disease', phenotypes: { __typename?: 'DiseasePhenotypePage', count: number } };

export type DrugBibliographyQueryVariables = Exact<{
  id: Scalars['String']['input'];
  ids?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
  size?: Scalars['Int']['input'];
  entityNames?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  index?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
}>;


export type DrugBibliographyQuery = { __typename?: 'Query', drug?: { __typename?: 'Drug', id: string, name: string, similarEntities: { __typename?: 'SimilarEntityPage', count: number, rows: Array<{ __typename?: 'Similarity', score: number, id: string, object?: { __typename?: 'Disease', id: string, name: string } | { __typename?: 'Drug', id: string, name: string } | { __typename?: 'Target', id: string, approvedSymbol: string } | null }> }, literatureOcurrences: { __typename?: 'PublicationPage', count: number, stats: { __typename?: 'PublicationStats', earliestPubDate: number }, rows: Array<{ __typename?: 'Publication', pmid: string, pmcid?: string | null, publicationDate: string }> } } | null };

export type DrugBibliography = { __typename?: 'Drug', literatureOcurrences: { __typename?: 'PublicationPage', count: number } };

export type TargetBibliographyQueryVariables = Exact<{
  id: Scalars['String']['input'];
  ids?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
  size?: Scalars['Int']['input'];
  entityNames?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  index?: Scalars['Int']['input'];
  pageSize?: Scalars['Int']['input'];
}>;


export type TargetBibliographyQuery = { __typename?: 'Query', target?: { __typename?: 'Target', id: string, approvedName: string, similarEntities: { __typename?: 'SimilarEntityPage', count: number, rows: Array<{ __typename?: 'Similarity', score: number, id: string, object?: { __typename?: 'Disease', id: string, name: string } | { __typename?: 'Drug', id: string, name: string } | { __typename?: 'Target', id: string, approvedSymbol: string } | null }> }, literatureOcurrences: { __typename?: 'PublicationPage', count: number, stats: { __typename?: 'PublicationStats', earliestPubDate: number }, rows: Array<{ __typename?: 'Publication', pmid: string, pmcid?: string | null, publicationDate: string }> } } | null };

export type EntitiesSummaryFragment = { __typename?: 'Target', literatureOcurrences: { __typename?: 'PublicationPage', count: number } };

export type ClinicalRecordsQueryVariables = Exact<{
  clinicalReportsIds: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type ClinicalRecordsQuery = { __typename?: 'Query', clinicalReports: Array<{ __typename?: 'ClinicalReport', clinicalStage: ClinicalStage, id: string, source: string, title?: string | null, trialOverallStatus?: string | null, trialStartDate?: any | null, year?: number | null, type?: string | null }> };

export type RecordDetailQueryVariables = Exact<{
  clinicalReportId: Scalars['String']['input'];
}>;


export type RecordDetailQuery = { __typename?: 'Query', clinicalReport?: { __typename?: 'ClinicalReport', clinicalStage: ClinicalStage, countries: Array<string>, id: string, phaseFromSource?: string | null, source: string, trialDescription?: string | null, title?: string | null, trialOverallStatus?: string | null, trialPrimaryPurpose?: string | null, trialStartDate?: any | null, trialWhyStopped?: string | null, trialStopReasonCategories: Array<string>, trialStudyType?: TrialStudyType | null, url?: string | null, year?: number | null, type?: string | null, diseases: Array<{ __typename?: 'ClinicalDiseaseListItem', diseaseFromSource: string, disease: { __typename?: 'Disease', id: string, name: string } }>, drugs: Array<{ __typename?: 'ClinicalReportDrugListItem', drugFromSource: string }>, sideEffects: Array<{ __typename?: 'ClinicalSideEffectListItem', diseaseFromSource?: string | null, disease?: { __typename?: 'Disease', name: string } | null }>, trialLiterature: Array<{ __typename?: 'TrialLiterature', id: string, type: string }>, trialSponsor: { __typename?: 'TrialSponsor', agencyClass?: string | null, name?: string | null } } | null };

export const DiseaseProfileHeaderFragment = gql`
    fragment DiseaseProfileHeaderFragment on Disease {
  description
  synonyms {
    relation
    terms
  }
}
    `;
export const DiseaseBibliography = gql`
    fragment DiseaseBibliography on Disease {
  literatureOcurrences(page: {index: 0, size: 1}) {
    count
  }
}
    `;
export const DrugsSummaryFragment = gql`
    fragment DrugsSummaryFragment on Disease {
  drugAndClinicalCandidates {
    count
  }
}
    `;
export const OntologySummaryFragment = gql`
    fragment OntologySummaryFragment on Disease {
  id
  name
  isTherapeuticArea
  therapeuticAreas
}
    `;
export const PhenotypesSummaryFragment = gql`
    fragment PhenotypesSummaryFragment on Disease {
  phenotypes(page: {index: 0, size: 1}) {
    count
  }
}
    `;
export const DrugBibliography = gql`
    fragment DrugBibliography on Drug {
  literatureOcurrences(page: {index: 0, size: 1}) {
    count
  }
}
    `;
export const EntitiesSummaryFragment = gql`
    fragment EntitiesSummaryFragment on Target {
  literatureOcurrences(page: {index: 0, size: 1}) {
    count
  }
}
    `;
export const InteractionsSectionQueryDocument = gql`
    query InteractionsSectionQuery($ensgId: String!, $sourceDatabase: InteractionSourceDatabase, $index: Int = 0, $size: Int = 10, $scoreThreshold: Float) {
  target(ensemblId: $ensgId) {
    id
    approvedName
    approvedSymbol
    interactions(
      sourceDatabase: $sourceDatabase
      scoreThreshold: $scoreThreshold
      page: {index: $index, size: $size}
    ) {
      count
      rows {
        intA
        intABiologicalRole
        targetA {
          id
          approvedSymbol
        }
        speciesA {
          mnemonic
        }
        intB
        intBBiologicalRole
        targetB {
          id
          approvedSymbol
        }
        speciesB {
          mnemonic
        }
        score
        count
        sourceDatabase
        evidences {
          evidenceScore
          hostOrganismScientificName
          interactionDetectionMethodMiIdentifier
          interactionDetectionMethodShortName
          interactionIdentifier
          interactionTypeShortName
          participantDetectionMethodA {
            miIdentifier
            shortName
          }
          participantDetectionMethodB {
            miIdentifier
            shortName
          }
          interactionDetectionMethodShortName
          expansionMethodShortName
          pubmedId
        }
      }
    }
  }
}
    `;
export const GeneEnrichmentAnalysisDiseaseAssociationsQueryDocument = gql`
    query GeneEnrichmentAnalysisDiseaseAssociationsQuery($efoId: String!, $index: Int!, $size: Int!, $sortBy: String!, $datasources: [DatasourcePolicyOverride!]! = [], $rowsFilter: [String!]! = [], $facetFilters: [String!]! = [], $entitySearch: String!) {
  disease(efoId: $efoId) {
    id
    name
    associatedTargets(
      page: {index: $index, size: $size}
      sort: {key: $sortBy, direction: DESCENDING}
      datasourcePolicyOverrides: $datasources
      Bs: $rowsFilter
      facetFilters: $facetFilters
      BFilter: $entitySearch
    ) {
      count
      rows {
        target {
          id
          approvedSymbol
          approvedName
          prioritisation {
            items {
              key
              value
            }
          }
        }
        score
        datasourceScores {
          componentId: id
          score
        }
      }
    }
  }
}
    `;
export const DiseaseAssociationsQueryDocument = gql`
    query DiseaseAssociationsQuery($id: String!, $index: Int!, $size: Int!, $sortBy: String!, $datasources: [DatasourcePolicyOverride!]! = [], $rowsFilter: [String!]! = [], $facetFilters: [String!]! = [], $entitySearch: String!) {
  disease(efoId: $id) {
    id
    name
    associatedTargets(
      page: {index: $index, size: $size}
      sort: {key: $sortBy, direction: DESCENDING}
      datasourcePolicyOverrides: $datasources
      Bs: $rowsFilter
      facetFilters: $facetFilters
      BFilter: $entitySearch
    ) {
      count
      rows {
        target {
          id
          approvedSymbol
          approvedName
          prioritisation {
            items {
              key
              value
            }
          }
        }
        score
        datasourceScores {
          componentId: id
          score
        }
      }
    }
  }
}
    `;
export const DiseasePageQueryDocument = gql`
    query DiseasePageQuery($efoId: String!) {
  disease(efoId: $efoId) {
    id
    name
    dbXRefs
  }
}
    `;
export const TargetAssociationsQueryDocument = gql`
    query TargetAssociationsQuery($id: String!, $index: Int!, $size: Int!, $sortBy: String!, $datasources: [DatasourcePolicyOverride!]! = [], $rowsFilter: [String!]! = [], $facetFilters: [String!]! = [], $entitySearch: String!, $includeMeasurements: Boolean! = false) {
  target(ensemblId: $id) {
    id
    approvedSymbol
    associatedDiseases(
      page: {index: $index, size: $size}
      sort: {key: $sortBy, direction: DESCENDING}
      datasourcePolicyOverrides: $datasources
      Bs: $rowsFilter
      facetFilters: $facetFilters
      BFilter: $entitySearch
      includeMeasurements: $includeMeasurements
    ) {
      count
      rows {
        disease {
          id
          name
        }
        score
        datasourceScores {
          componentId: id
          score
        }
      }
    }
  }
}
    `;
export const DiseaseBibliographyQueryDocument = gql`
    query DiseaseBibliographyQuery($id: String!, $ids: [String!] = [], $startYear: Int = null, $startMonth: Int = null, $endYear: Int = null, $endMonth: Int = null, $threshold: Float = 0.5, $size: Int! = 15, $entityNames: [String!] = [], $index: Int! = 0, $pageSize: Int! = 5) {
  disease(efoId: $id) {
    id
    name
    similarEntities(
      additionalIds: $ids
      threshold: $threshold
      page: {index: 0, size: $size}
      entityNames: $entityNames
    ) {
      count
      rows {
        score
        id
        object {
          ... on Target {
            id
            approvedSymbol
          }
          ... on Drug {
            id
            name
          }
          ... on Disease {
            id
            name
          }
        }
      }
    }
    literatureOcurrences(
      additionalIds: $ids
      page: {index: $index, size: $pageSize}
      startYear: $startYear
      startMonth: $startMonth
      endYear: $endYear
      endMonth: $endMonth
    ) {
      count
      stats {
        earliestPubDate
      }
      rows {
        pmid
        pmcid
        publicationDate
      }
    }
  }
}
    `;
export const DrugsQueryDocument = gql`
    query drugsQuery($efoId: String!, $index: Int! = 0, $size: Int! = 10) {
  disease(efoId: $efoId) {
    name
    drugAndClinicalCandidates(page: {index: $index, size: $size}) {
      count
      rows {
        id
        maxClinicalStage
        drug {
          id
          name
        }
        clinicalReports {
          id
        }
      }
    }
  }
}
    `;
export const GwasStudiesQueryDocument = gql`
    query GWASStudiesQuery($diseaseIds: [String!]!, $size: Int!, $index: Int!, $sort: [StudySort!]! = [], $search: String) {
  studies(
    diseaseIds: $diseaseIds
    page: {size: $size, index: $index}
    sort: $sort
    search: $search
  ) {
    count
    rows {
      id
      projectId
      traitFromSource
      publicationFirstAuthor
      publicationDate
      publicationJournal
      nSamples
      cohorts
      pubmedId
      ldPopulationStructure {
        ldPopulation
        relativeSampleSize
      }
      credibleSets {
        count
      }
    }
  }
}
    `;
export const OntologyAncestorsQueryDocument = gql`
    query OntologyAncestorsQuery($ids: [String!]!, $size: Int!) {
  diseases(efoIds: $ids, page: {index: 0, size: $size}, sort: []) {
    count
    rows {
      id
      name
      isTherapeuticArea
      parents {
        id
      }
    }
  }
}
    `;
export const OntologyQueryDocument = gql`
    query OntologyQuery($efoId: String!) {
  disease(efoId: $efoId) {
    id
    name
    isTherapeuticArea
    ancestors
    parents {
      id
    }
    children {
      id
      name
      isTherapeuticArea
      parents {
        id
      }
    }
  }
}
    `;
export const PhenotypesQueryDocument = gql`
    query PhenotypesQuery($efoId: String!, $index: Int! = 0, $size: Int! = 10) {
  disease(efoId: $efoId) {
    id
    phenotypes(page: {index: $index, size: $size}) {
      count
      rows {
        phenotypeHPO {
          id
          name
          description
          namespace
        }
        phenotypeEFO {
          id
          name
        }
        evidence {
          aspect
          bioCuration
          diseaseFromSourceId
          diseaseFromSource
          evidenceType
          frequency
          qualifierNot
          onset {
            name
            id
          }
          modifiers {
            name
            id
          }
          references
          sex
          resource
        }
      }
    }
  }
}
    `;
export const DrugBibliographyQueryDocument = gql`
    query DrugBibliographyQuery($id: String!, $ids: [String!] = [], $startYear: Int = null, $startMonth: Int = null, $endYear: Int = null, $endMonth: Int = null, $threshold: Float = 0.5, $size: Int! = 15, $entityNames: [String!] = [], $index: Int! = 0, $pageSize: Int! = 5) {
  drug(chemblId: $id) {
    id
    name
    similarEntities(
      additionalIds: $ids
      threshold: $threshold
      page: {index: 0, size: $size}
      entityNames: $entityNames
    ) {
      count
      rows {
        score
        id
        object {
          ... on Target {
            id
            approvedSymbol
          }
          ... on Drug {
            id
            name
          }
          ... on Disease {
            id
            name
          }
        }
      }
    }
    literatureOcurrences(
      additionalIds: $ids
      page: {index: $index, size: $pageSize}
      startYear: $startYear
      startMonth: $startMonth
      endYear: $endYear
      endMonth: $endMonth
    ) {
      count
      stats {
        earliestPubDate
      }
      rows {
        pmid
        pmcid
        publicationDate
      }
    }
  }
}
    `;
export const TargetBibliographyQueryDocument = gql`
    query TargetBibliographyQuery($id: String!, $ids: [String!] = [], $startYear: Int = null, $startMonth: Int = null, $endYear: Int = null, $endMonth: Int = null, $threshold: Float = 0.5, $size: Int! = 15, $entityNames: [String!] = [], $index: Int! = 0, $pageSize: Int! = 5) {
  target(ensemblId: $id) {
    id
    approvedName
    similarEntities(
      additionalIds: $ids
      threshold: $threshold
      page: {index: 0, size: $size}
      entityNames: $entityNames
    ) {
      count
      rows {
        score
        id
        object {
          ... on Target {
            id
            approvedSymbol
          }
          ... on Drug {
            id
            name
          }
          ... on Disease {
            id
            name
          }
        }
      }
    }
    literatureOcurrences(
      additionalIds: $ids
      page: {index: $index, size: $pageSize}
      startYear: $startYear
      startMonth: $startMonth
      endYear: $endYear
      endMonth: $endMonth
    ) {
      count
      stats {
        earliestPubDate
      }
      rows {
        pmid
        pmcid
        publicationDate
      }
    }
  }
}
    `;
export const ClinicalRecordsQueryDocument = gql`
    query ClinicalRecordsQuery($clinicalReportsIds: [String!]!) {
  clinicalReports(clinicalReportsIds: $clinicalReportsIds) {
    clinicalStage
    id
    source
    title
    trialOverallStatus
    trialStartDate
    type: evidenceType
    year
  }
}
    `;
export const RecordDetailQueryDocument = gql`
    query RecordDetailQuery($clinicalReportId: String!) {
  clinicalReport(clinicalReportId: $clinicalReportId) {
    clinicalStage
    countries
    diseases {
      diseaseFromSource
      disease {
        id
        name
      }
    }
    drugs {
      drugFromSource
    }
    id
    phaseFromSource
    sideEffects {
      diseaseFromSource
      disease {
        name
      }
    }
    source
    trialDescription
    trialLiterature {
      id
      type: referenceType
    }
    title
    trialOverallStatus
    trialPrimaryPurpose
    trialSponsor {
      agencyClass
      name
    }
    trialStartDate
    trialWhyStopped
    trialStopReasonCategories
    type: evidenceType
    trialStudyType
    url
    year
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    InteractionsSectionQuery(variables: InteractionsSectionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<InteractionsSectionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InteractionsSectionQuery>({ document: InteractionsSectionQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'InteractionsSectionQuery', 'query', variables);
    },
    GeneEnrichmentAnalysisDiseaseAssociationsQuery(variables: GeneEnrichmentAnalysisDiseaseAssociationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GeneEnrichmentAnalysisDiseaseAssociationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GeneEnrichmentAnalysisDiseaseAssociationsQuery>({ document: GeneEnrichmentAnalysisDiseaseAssociationsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GeneEnrichmentAnalysisDiseaseAssociationsQuery', 'query', variables);
    },
    DiseaseAssociationsQuery(variables: DiseaseAssociationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DiseaseAssociationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DiseaseAssociationsQuery>({ document: DiseaseAssociationsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DiseaseAssociationsQuery', 'query', variables);
    },
    DiseasePageQuery(variables: DiseasePageQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DiseasePageQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DiseasePageQuery>({ document: DiseasePageQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DiseasePageQuery', 'query', variables);
    },
    TargetAssociationsQuery(variables: TargetAssociationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TargetAssociationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TargetAssociationsQuery>({ document: TargetAssociationsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TargetAssociationsQuery', 'query', variables);
    },
    DiseaseBibliographyQuery(variables: DiseaseBibliographyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DiseaseBibliographyQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DiseaseBibliographyQuery>({ document: DiseaseBibliographyQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DiseaseBibliographyQuery', 'query', variables);
    },
    drugsQuery(variables: DrugsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DrugsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DrugsQuery>({ document: DrugsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'drugsQuery', 'query', variables);
    },
    GWASStudiesQuery(variables: GwasStudiesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<GwasStudiesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GwasStudiesQuery>({ document: GwasStudiesQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'GWASStudiesQuery', 'query', variables);
    },
    OntologyAncestorsQuery(variables: OntologyAncestorsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OntologyAncestorsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OntologyAncestorsQuery>({ document: OntologyAncestorsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OntologyAncestorsQuery', 'query', variables);
    },
    OntologyQuery(variables: OntologyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OntologyQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OntologyQuery>({ document: OntologyQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OntologyQuery', 'query', variables);
    },
    PhenotypesQuery(variables: PhenotypesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PhenotypesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PhenotypesQuery>({ document: PhenotypesQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'PhenotypesQuery', 'query', variables);
    },
    DrugBibliographyQuery(variables: DrugBibliographyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DrugBibliographyQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DrugBibliographyQuery>({ document: DrugBibliographyQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DrugBibliographyQuery', 'query', variables);
    },
    TargetBibliographyQuery(variables: TargetBibliographyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<TargetBibliographyQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TargetBibliographyQuery>({ document: TargetBibliographyQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'TargetBibliographyQuery', 'query', variables);
    },
    ClinicalRecordsQuery(variables: ClinicalRecordsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ClinicalRecordsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ClinicalRecordsQuery>({ document: ClinicalRecordsQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ClinicalRecordsQuery', 'query', variables);
    },
    RecordDetailQuery(variables: RecordDetailQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RecordDetailQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RecordDetailQuery>({ document: RecordDetailQueryDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RecordDetailQuery', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
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
  Long: { input: any; output: any; }
};

/** API version information */
export type ApiVersion = {
  __typename?: 'APIVersion';
  /** Optional version suffix (e.g., alpha, beta, rc) */
  suffix?: Maybe<Scalars['String']['output']>;
  /** Major version number */
  x: Scalars['String']['output'];
  /** Minor version number */
  y: Scalars['String']['output'];
  /** Patch version number */
  z: Scalars['String']['output'];
};

/** Significant adverse events associated with drugs sharing the same pharmacological target. This dataset is based on the FDA's Adverse Event Reporting System (FAERS) reporting post-marketing surveillance data and it's filtered to include only reports submitted by health professionals. The significance of a given target-ADR is estimated using a Likelihood Ratio Test (LRT) using all reports associated with the drugs with the same target. */
export type AdverseEvent = {
  __typename?: 'AdverseEvent';
  /** Number of reports mentioning drug and adverse event */
  count: Scalars['Long']['output'];
  /** Log-likelihood ratio */
  logLR: Scalars['Float']['output'];
  /** 8 digit unique meddra identification number */
  meddraCode?: Maybe<Scalars['String']['output']>;
  /** Meddra term on adverse event */
  name: Scalars['String']['output'];
};

/** Significant adverse events associated with drugs sharing the same pharmacological target. This dataset is based on the FDA's Adverse Event Reporting System (FAERS) reporting post-marketing surveillance data and it's filtered to include only reports submitted by health professionals. The significance of a given target-ADR is estimated using a Likelihood Ratio Test (LRT) using all reports associated with the drugs with the same target. */
export type AdverseEvents = {
  __typename?: 'AdverseEvents';
  /** Total significant adverse events */
  count: Scalars['Long']['output'];
  /** LLR critical value to define significance */
  criticalValue: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  /** Significant adverse event entries */
  rows: Array<AdverseEvent>;
};

/** Allele frequency of the variant in different populations */
export type AlleleFrequency = {
  __typename?: 'AlleleFrequency';
  /** Frequency of the allele in the population (ranging from 0 to 1) */
  alleleFrequency?: Maybe<Scalars['Float']['output']>;
  /** Name of the population where the allele frequency was measured */
  populationName?: Maybe<Scalars['String']['output']>;
};

/** Associated disease entity */
export type AssociatedDisease = {
  __typename?: 'AssociatedDisease';
  /** Association scores computed for every datasource (e.g., IMPC, ChEMBL, Gene2Phenotype) */
  datasourceScores: Array<ScoredComponent>;
  /** Association scores computed for every datatype (e.g., Genetic associations, Somatic, Literature) */
  datatypeScores: Array<ScoredComponent>;
  /** Associated disease entity */
  disease: Disease;
  /** A measure of how novel the target–disease association is, calculated based on the accumulation of direct evidence over time */
  noveltyDirect?: Maybe<Scalars['Float']['output']>;
  /** A measure of how novel the target–disease association is, calculated based on the accumulation of indirect evidence over time */
  noveltyIndirect?: Maybe<Scalars['Float']['output']>;
  /** Overall association score aggregated across all evidence types. A higher score indicates a stronger association between the target and the disease. Scores are normalized to a range of 0-1. */
  score: Scalars['Float']['output'];
};

/** Target-disease associations computed on-the-fly using configurable datasource weights and evidence filters. Returns associations with aggregated scores and evidence counts supporting the target-disease relationship. */
export type AssociatedDiseases = {
  __typename?: 'AssociatedDiseases';
  /** Total number of target-disease associations matching the query filters */
  count: Scalars['Long']['output'];
  /** List of datasource settings with weights and propagation rules used to compute the associations */
  datasources: Array<DatasourceSettings>;
  /** List of associated diseases with their association scores and evidence breakdowns */
  rows: Array<AssociatedDisease>;
};

/** Associated target entity */
export type AssociatedTarget = {
  __typename?: 'AssociatedTarget';
  /** Association scores computed for every datasource (e.g., IMPC, ChEMBL, Gene2Phenotype) */
  datasourceScores: Array<ScoredComponent>;
  /** Association scores computed for every datatype (e.g., Genetic associations, Somatic, Literature) */
  datatypeScores: Array<ScoredComponent>;
  /** A measure of how novel the target–disease association is, calculated based on the accumulation of direct evidence over time */
  noveltyDirect?: Maybe<Scalars['Float']['output']>;
  /** A measure of how novel the target–disease association is, calculated based on the accumulation of indirect evidence over time */
  noveltyIndirect?: Maybe<Scalars['Float']['output']>;
  /** Overall association score aggregated across all evidence types. A higher score indicates a stronger association between the target and the disease. Scores are normalized to a range of 0-1. */
  score: Scalars['Float']['output'];
  /** Associated target entity */
  target: Target;
};

/** Target-disease associations computed on-the-fly using configurable datasource weights and evidence filters. Returns associations with aggregated scores and evidence counts supporting the target-disease relationship. */
export type AssociatedTargets = {
  __typename?: 'AssociatedTargets';
  /** Total number of target-disease associations matching the query filters */
  count: Scalars['Long']['output'];
  /** List of datasource settings with weights and propagation rules used to compute the associations */
  datasources: Array<DatasourceSettings>;
  /** List of associated targets with their association scores and evidence breakdowns */
  rows: Array<AssociatedTarget>;
};

/** Container for all biological model-related attributes */
export type BiologicalModels = {
  __typename?: 'BiologicalModels';
  /** The specific allelic composition of the mouse model */
  allelicComposition: Scalars['String']['output'];
  /** The genetic background strain of the mouse model */
  geneticBackground: Scalars['String']['output'];
  /** Unique identifier for the biological model [bioregistry:mgi] */
  id?: Maybe<Scalars['String']['output']>;
  /** References related to the mouse model [bioregistry:pubmed] */
  literature?: Maybe<Array<Scalars['String']['output']>>;
};

/** List of gene expression altering biomarkers */
export type BiomarkerGeneExpression = {
  __typename?: 'BiomarkerGeneExpression';
  /** Gene Ontology (GO) identifiers of regulation or background expression processes [bioregistry:go] */
  id?: Maybe<GeneOntologyTerm>;
  /** Raw gene expression annotation from the source */
  name?: Maybe<Scalars['String']['output']>;
};

/** Integration of biosample metadata about tissues or cell types derived from multiple ontologies including EFO, UBERON, CL, GO and others. */
export type Biosample = {
  __typename?: 'Biosample';
  /** List of ancestor biosample IDs in the ontology */
  ancestors?: Maybe<Array<Scalars['String']['output']>>;
  /** Unique identifier for the biosample */
  biosampleId: Scalars['String']['output'];
  /** Name of the biosample */
  biosampleName: Scalars['String']['output'];
  /** Direct child biosample IDs in the ontology */
  children?: Maybe<Array<Scalars['String']['output']>>;
  /** List of descendant biosample IDs in the ontology */
  descendants?: Maybe<Array<Scalars['String']['output']>>;
  /** Description of the biosample */
  description?: Maybe<Scalars['String']['output']>;
  /** Direct parent biosample IDs in the ontology */
  parents?: Maybe<Array<Scalars['String']['output']>>;
  /** List of synonymous names for the term */
  synonyms?: Maybe<Array<Scalars['String']['output']>>;
  /** Cross-reference IDs from other ontologies */
  xrefs?: Maybe<Array<Scalars['String']['output']>>;
};

/** Cancer hallmarks associated with the target gene */
export type CancerHallmark = {
  __typename?: 'CancerHallmark';
  /** Description of the cancer hallmark */
  description: Scalars['String']['output'];
  /** Impact of the cancer hallmark on the target */
  impact?: Maybe<Scalars['String']['output']>;
  /** Label associated with the cancer hallmark */
  label: Scalars['String']['output'];
  /** PubMed ID of the supporting literature for the cancer hallmark [bioregistry:pubmed] */
  pmid: Scalars['Long']['output'];
};

/** The Ensembl canonical transcript of the target gene */
export type CanonicalTranscript = {
  __typename?: 'CanonicalTranscript';
  /** Chromosome location of the canonical transcript */
  chromosome: Scalars['String']['output'];
  /** Genomic end position of the canonical transcript */
  end: Scalars['Long']['output'];
  /** The Ensembl transcript identifier for the canonical transcript */
  id: Scalars['String']['output'];
  /** Genomic start position of the canonical transcript */
  start: Scalars['Long']['output'];
  /** Strand orientation of the canonical transcript */
  strand: Scalars['String']['output'];
};

/** Cell type where protein levels were measured */
export type CellType = {
  __typename?: 'CellType';
  /** Level of expression for this cell type */
  level: Scalars['Int']['output'];
  /** Cell type name */
  name: Scalars['String']['output'];
  /** Reliability of the cell type measurement */
  reliability: Scalars['Boolean']['output'];
};

/** Chemical probes related to the target. High-quality chemical probes are small molecules that can be used to modulate and study the function of proteins. */
export type ChemicalProbe = {
  __typename?: 'ChemicalProbe';
  /** Whether the chemical probe serves as a control */
  control?: Maybe<Scalars['String']['output']>;
  drugFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Drug ID associated with the chemical probe */
  drugId?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the chemical probe */
  id: Scalars['String']['output'];
  /** Indicates if the chemical probe is high quality */
  isHighQuality: Scalars['Boolean']['output'];
  /** Mechanism of action of the chemical probe */
  mechanismOfAction?: Maybe<Array<Scalars['String']['output']>>;
  /** Origin of the chemical probe */
  origin?: Maybe<Array<Scalars['String']['output']>>;
  /** Score from ProbeMiner for chemical probe quality */
  probeMinerScore?: Maybe<Scalars['Float']['output']>;
  /** Score for chemical probes related to druggability */
  probesDrugsScore?: Maybe<Scalars['Float']['output']>;
  /** Score indicating chemical probe activity in cells */
  scoreInCells?: Maybe<Scalars['Float']['output']>;
  /** Score indicating chemical probe activity in organisms */
  scoreInOrganisms?: Maybe<Scalars['Float']['output']>;
  /** Ensembl gene ID of the target for the chemical probe */
  targetFromSourceId: Scalars['String']['output'];
  /** URLs linking to more information about the chemical probe */
  urls: Array<ChemicalProbeUrl>;
};

/** URL information for chemical probe resources */
export type ChemicalProbeUrl = {
  __typename?: 'ChemicalProbeUrl';
  /** Nice name for the linked URL */
  niceName: Scalars['String']['output'];
  /** URL providing details about the chemical probe */
  url?: Maybe<Scalars['String']['output']>;
};

export type ClinRepDrugListItem = {
  __typename?: 'ClinRepDrugListItem';
  drug?: Maybe<Drug>;
  drugFromSource?: Maybe<Scalars['String']['output']>;
};

export type ClinicalDiseaseListItem = {
  __typename?: 'ClinicalDiseaseListItem';
  disease?: Maybe<Disease>;
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
};

export type ClinicalIndicationFromDisease = {
  __typename?: 'ClinicalIndicationFromDisease';
  clinicalReports: Array<ClinicalReport>;
  drug?: Maybe<Drug>;
  id: Scalars['String']['output'];
  maxClinicalStage: Scalars['String']['output'];
};

export type ClinicalIndicationFromDrug = {
  __typename?: 'ClinicalIndicationFromDrug';
  clinicalReports: Array<ClinicalReport>;
  disease?: Maybe<Disease>;
  id: Scalars['String']['output'];
  maxClinicalStage: Scalars['String']['output'];
};

export type ClinicalReport = {
  __typename?: 'ClinicalReport';
  clinicalStage: Scalars['String']['output'];
  countries: Array<Scalars['String']['output']>;
  diseases: Array<ClinicalDiseaseListItem>;
  drugs: Array<ClinRepDrugListItem>;
  hasExpertReview: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  phaseFromSource?: Maybe<Scalars['String']['output']>;
  qualityControls: Array<Scalars['String']['output']>;
  sideEffects: Array<ClinicalDiseaseListItem>;
  source: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  trialDescription?: Maybe<Scalars['String']['output']>;
  trialLiterature: Array<Scalars['String']['output']>;
  trialNumberOfArms?: Maybe<Scalars['Int']['output']>;
  trialOfficialTitle?: Maybe<Scalars['String']['output']>;
  trialOverallStatus?: Maybe<Scalars['String']['output']>;
  trialPhase?: Maybe<Scalars['String']['output']>;
  trialPrimaryPurpose?: Maybe<Scalars['String']['output']>;
  trialStartDate?: Maybe<Scalars['String']['output']>;
  trialStopReasonCategories: Array<Scalars['String']['output']>;
  trialStudyType?: Maybe<Scalars['String']['output']>;
  trialWhyStopped?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type ClinicalTargetFromTarget = {
  __typename?: 'ClinicalTargetFromTarget';
  clinicalReports: Array<ClinicalReport>;
  diseases: Array<ClinicalDiseaseListItem>;
  drug?: Maybe<Drug>;
  id: Scalars['String']['output'];
  maxClinicalStage: Scalars['String']['output'];
};

/** GWAS-GWAS and GWAS-molQTL credible set colocalisation results. Dataset includes colocalising pairs as well as the method and statistics used to estimate the colocalisation. */
export type Colocalisation = {
  __typename?: 'Colocalisation';
  /** Average sign of the beta ratio between colocalised variants */
  betaRatioSignAverage?: Maybe<Scalars['Float']['output']>;
  /** Chromosome where the colocalisation occurs */
  chromosome: Scalars['String']['output'];
  /** Colocalisation posterior probability (CLPP) score estimating the probability of shared causal variants. Used in eCAVIAR method. */
  clpp?: Maybe<Scalars['Float']['output']>;
  /** Method used to estimate colocalisation (e.g., coloc, eCAVIAR) */
  colocalisationMethod: Scalars['String']['output'];
  /** Posterior probability that both traits are associated, but with different causal variants (H3). Used in coloc method. */
  h3?: Maybe<Scalars['Float']['output']>;
  /** Posterior probability that both traits are associated and share a causal variant (H4). Used in coloc method. */
  h4?: Maybe<Scalars['Float']['output']>;
  /** Number of variants intersecting between two overlapping study-loci */
  numberColocalisingVariants: Scalars['Long']['output'];
  /** The other credible set (study-locus) in the colocalisation pair */
  otherStudyLocus?: Maybe<CredibleSet>;
  /** Type of the right-side study (e.g., gwas, eqtl, pqtl) */
  rightStudyType: Scalars['String']['output'];
  studyLocusId: Scalars['String']['output'];
};

/** GWAS-GWAS and GWAS-molQTL credible set colocalisation results. Dataset includes colocalising pairs as well as the method and statistics used to estimate the colocalisation. */
export type Colocalisations = {
  __typename?: 'Colocalisations';
  /** Total number of colocalisation results matching the query filters */
  count: Scalars['Long']['output'];
  id: Scalars['String']['output'];
  /** List of colocalisation results between study-loci pairs */
  rows: Array<Colocalisation>;
};

/** Constraint scores for the target gene from GnomAD. Indicates gene intolerance to loss-of-function mutations. */
export type Constraint = {
  __typename?: 'Constraint';
  /** Type of constraint applied to the target */
  constraintType: Scalars['String']['output'];
  /** Expected constraint score */
  exp?: Maybe<Scalars['Float']['output']>;
  /** Observed constraint score */
  obs?: Maybe<Scalars['Long']['output']>;
  /** Observed/Expected (OE) constraint score */
  oe?: Maybe<Scalars['Float']['output']>;
  /** Lower bound of the OE constraint score */
  oeLower?: Maybe<Scalars['Float']['output']>;
  /** Upper bound of the OE constraint score */
  oeUpper?: Maybe<Scalars['Float']['output']>;
  /** Constraint score indicating gene intolerance */
  score?: Maybe<Scalars['Float']['output']>;
  /** Upper bin classification going from more constrained to less constrained */
  upperBin?: Maybe<Scalars['Long']['output']>;
  /** Interpretable classification of constraint based on 6 bins. [GnomAD labels: 0: `very high`, 1: `high`, 2: `medium`, 3: `low`, 4: `very low`, 5: `very low`] */
  upperBin6?: Maybe<Scalars['Long']['output']>;
  /** Upper rank classification for every coding gene assessed by GnomAD going from more constrained to less constrained */
  upperRank?: Maybe<Scalars['Long']['output']>;
};

/** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set (locus) as well as the fine-mapping method and derived statistics. */
export type CredibleSet = {
  __typename?: 'CredibleSet';
  /** Beta coefficient of the lead variant */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Chromosome which the credible set is located */
  chromosome: Scalars['String']['output'];
  /** GWAS-GWAS and GWAS-molQTL credible set colocalisation results. Dataset includes colocalising pairs as well as the method and statistics used to estimate the colocalisation. */
  colocalisation: Colocalisations;
  /** Description of how this credible set was derived in terms of data and fine-mapping method */
  confidence?: Maybe<Scalars['String']['output']>;
  /** Integer label for the order of credible sets from study-region */
  credibleSetIndex?: Maybe<Scalars['Int']['output']>;
  /** Log10 Bayes factor for the entire credible set */
  credibleSetlog10BF?: Maybe<Scalars['Float']['output']>;
  /** Allele frequency of the lead variant from the GWAS */
  effectAlleleFrequencyFromSource?: Maybe<Scalars['Float']['output']>;
  /** Method used for fine-mapping of credible set */
  finemappingMethod?: Maybe<Scalars['String']['output']>;
  /** Boolean for whether this credible set is a trans-pQTL or not */
  isTransQtl?: Maybe<Scalars['Boolean']['output']>;
  /** Predictions from Locus2gene gene assignment model. */
  l2GPredictions: L2GPredictions;
  /** Array of structs which denote the variants in LD with the credible set lead variant */
  ldSet?: Maybe<Array<LdSet>>;
  /** Locus information for all variants in the credible set */
  locus: Loci;
  /** End position of the region that was fine-mapped for this credible set */
  locusEnd?: Maybe<Scalars['Int']['output']>;
  /** Start position of the region that was fine-mapped for this credible set */
  locusStart?: Maybe<Scalars['Int']['output']>;
  /** Exponent value of the lead variant P-value */
  pValueExponent: Scalars['Int']['output'];
  /** Mantissa value of the lead variant P-value */
  pValueMantissa: Scalars['Float']['output'];
  /** Position of the lead variant for the credible set (GRCh38) */
  position: Scalars['Int']['output'];
  /** Mean R-squared linkage disequilibrium for variants in the credible set */
  purityMeanR2?: Maybe<Scalars['Float']['output']>;
  /** Minimum R-squared linkage disequilibrium for variants in the credible set */
  purityMinR2?: Maybe<Scalars['Float']['output']>;
  /** Ensembl identifier of the gene representing a specific gene whose molecular is being analysed in molQTL study */
  qtlGeneId?: Maybe<Scalars['String']['output']>;
  /** Quality control flags for this credible set */
  qualityControls?: Maybe<Array<Scalars['String']['output']>>;
  /** Start and end positions of the region used for fine-mapping */
  region?: Maybe<Scalars['String']['output']>;
  /** Sample size of the study which this credible set is derived */
  sampleSize?: Maybe<Scalars['Int']['output']>;
  /** Standard error of the lead variant */
  standardError?: Maybe<Scalars['Float']['output']>;
  /** GWAS or molQTL study in which the credible set was identified */
  study?: Maybe<Study>;
  /** Identifier of the GWAS or molQTL study in which the credible set was identified */
  studyId: Scalars['String']['output'];
  /** Identifier of the credible set (StudyLocus) */
  studyLocusId: Scalars['String']['output'];
  /** Descriptor for whether the credible set is derived from GWAS or molecular QTL. */
  studyType?: Maybe<StudyTypeEnum>;
  /** [Deprecated] */
  subStudyDescription?: Maybe<Scalars['String']['output']>;
  /** The lead variant for the credible set, by posterior probability. */
  variant?: Maybe<Variant>;
  /** Z-score of the lead variant from the GWAS */
  zScore?: Maybe<Scalars['Float']['output']>;
};


/** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set (locus) as well as the fine-mapping method and derived statistics. */
export type CredibleSetColocalisationArgs = {
  page?: InputMaybe<Pagination>;
  studyTypes?: InputMaybe<Array<StudyTypeEnum>>;
};


/** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set (locus) as well as the fine-mapping method and derived statistics. */
export type CredibleSetL2GPredictionsArgs = {
  page?: InputMaybe<Pagination>;
};


/** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set (locus) as well as the fine-mapping method and derived statistics. */
export type CredibleSetLocusArgs = {
  page?: InputMaybe<Pagination>;
  variantIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set as well as the fine-mapping method and statistics used to estimate the credible set. */
export type CredibleSets = {
  __typename?: 'CredibleSets';
  /** Total number of credible sets matching the query filters */
  count: Scalars['Long']['output'];
  id: Scalars['String']['output'];
  /** List of credible set entries with their associated statistics and fine-mapping information */
  rows: Array<CredibleSet>;
};

/** Data release version information */
export type DataVersion = {
  __typename?: 'DataVersion';
  /** Iteration number of the Platform data release within the year-month period */
  iteration?: Maybe<Scalars['String']['output']>;
  /** Month of the Platform data release */
  month: Scalars['String']['output'];
  /** Year of the Platform data release */
  year: Scalars['String']['output'];
};

/** Data source information for protein coding coordinates */
export type Datasource = {
  __typename?: 'Datasource';
  /** Count of evidence from this data source */
  datasourceCount: Scalars['Int']['output'];
  /** Identifier of the data source */
  datasourceId: Scalars['String']['output'];
  /** Human-readable name of the data source */
  datasourceNiceName: Scalars['String']['output'];
};

/** Datasource settings configuration used to compute target-disease associations. Allows customization of weights, ontology propagation, and required evidence for each datasource when calculating association scores. Weights must be between 0 and 1, and can control ontology propagation and evidence requirements. */
export type DatasourceSettings = {
  __typename?: 'DatasourceSettings';
  /** Datasource identifier */
  id: Scalars['String']['output'];
  /** Whether evidence from this datasource is propagated through the ontology */
  propagate: Scalars['Boolean']['output'];
  /** Whether evidence from this datasource is required to compute association scores */
  required: Scalars['Boolean']['output'];
  /** Weight assigned to the datasource when computing association scores */
  weight: Scalars['Float']['output'];
};

/** Input type for datasource settings configuration. Allows customization of how individual datasources contribute to target-disease association score calculations. Weights must be between 0 and 1, and can control ontology propagation and evidence requirements. */
export type DatasourceSettingsInput = {
  /** Datasource identifier */
  id: Scalars['String']['input'];
  /** Whether evidence from this datasource is propagated through the ontology */
  propagate: Scalars['Boolean']['input'];
  /** Whether evidence from this datasource is required to compute association scores */
  required?: InputMaybe<Scalars['Boolean']['input']>;
  /** Weight assigned to the datasource. Should be between 0 and 1 */
  weight: Scalars['Float']['input'];
};

/** Cross-reference information for a variant in different databases */
export type DbXref = {
  __typename?: 'DbXref';
  /** Identifier of the variant in the given database */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the database the variant is referenced in */
  source?: Maybe<Scalars['String']['output']>;
};

/** Essentiality measurements extracted from DepMap, stratified by tissue or anatomical units. Gene effects below -1 can be considered dependencies. */
export type DepMapEssentiality = {
  __typename?: 'DepMapEssentiality';
  /** List of CRISPR screening experiments supporting the essentiality assessment */
  screens: Array<GeneEssentialityScreen>;
  /** Identifier of the tissue from where the cells were sampled for assay [bioregistry:uberon] */
  tissueId?: Maybe<Scalars['String']['output']>;
  /** Name of the tissue from where the cells were sampled for assay */
  tissueName?: Maybe<Scalars['String']['output']>;
};

/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type Disease = {
  __typename?: 'Disease';
  /** Ancestor disease nodes in the EFO ontology up to the top-level therapeutic area */
  ancestors: Array<Scalars['String']['output']>;
  /** Target–disease associations computed on the fly with configurable datasource weights and filters */
  associatedTargets: AssociatedTargets;
  /** Direct child disease nodes in the ontology */
  children: Array<Disease>;
  /** Cross-references to external disease ontologies */
  dbXRefs: Array<Scalars['String']['output']>;
  /** Descendant disease nodes in the EFO ontology below this term */
  descendants: Array<Scalars['String']['output']>;
  /** Short description of the disease or phenotype */
  description?: Maybe<Scalars['String']['output']>;
  /** EFO terms for direct anatomical locations */
  directLocationIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Diseases mapped to direct anatomical locations */
  directLocations: Array<Disease>;
  /** Clinical indications for this disease as reported by clinical trial records. */
  drugAndClinicalCandidates: ClinicalIndicationsFromDiseaseImp;
  /** Target–disease evidence items supporting associations for this disease */
  evidences: Evidences;
  /** Open Targets disease identifier [bioregistry:efo] */
  id: Scalars['String']['output'];
  /** EFO terms for indirect anatomical locations (propagated) */
  indirectLocationIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Diseases mapped via indirect (propagated) anatomical locations */
  indirectLocations: Array<Disease>;
  isTherapeuticArea: Scalars['Boolean']['output'];
  /** Publications that mention this disease, alone or alongside other entities */
  literatureOcurrences: Publications;
  /** Preferred disease or phenotype label */
  name: Scalars['String']['output'];
  /** Obsoleted ontology terms replaced by this term */
  obsoleteTerms: Array<Scalars['String']['output']>;
  /** Open Targets (OTAR) projects linked to this disease. Data only available in Partner Platform Preview (PPP) */
  otarProjects: Array<OtarProject>;
  /** Immediate parent disease nodes in the ontology */
  parents: Array<Disease>;
  /** Human Phenotype Ontology (HPO) annotations linked to this disease as clinical signs or symptoms */
  phenotypes: DiseaseHpOs;
  /** All ancestor diseases in the ontology from this term up to the top-level therapeutic area */
  resolvedAncestors: Array<Disease>;
  /** Semantically similar diseases based on a PubMed word embedding model */
  similarEntities: Array<Similarity>;
  /** Synonymous disease or phenotype labels */
  synonyms?: Maybe<Array<DiseaseSynonyms>>;
  /** Ancestor therapeutic area nodes the disease or phenotype term belongs in the EFO ontology */
  therapeuticAreas: Array<Disease>;
};


/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type DiseaseAssociatedTargetsArgs = {
  BFilter?: InputMaybe<Scalars['String']['input']>;
  Bs?: InputMaybe<Array<Scalars['String']['input']>>;
  datasources?: InputMaybe<Array<DatasourceSettingsInput>>;
  enableIndirect?: InputMaybe<Scalars['Boolean']['input']>;
  facetFilters?: InputMaybe<Array<Scalars['String']['input']>>;
  orderByScore?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Pagination>;
};


/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type DiseaseEvidencesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  datasourceIds?: InputMaybe<Array<Scalars['String']['input']>>;
  enableIndirect?: InputMaybe<Scalars['Boolean']['input']>;
  ensemblIds: Array<Scalars['String']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
};


/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type DiseaseLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type DiseasePhenotypesArgs = {
  page?: InputMaybe<Pagination>;
};


/** Core annotation for diseases or phenotypes. A disease or phenotype in the Platform is understood as any disease, phenotype, biological process or measurement that might have any type of causality relationship with a human target. The EMBL-EBI Experimental Factor Ontology (EFO) (slim version) is used as scaffold for the disease or phenotype entity. */
export type DiseaseSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** Cancer cell lines used to generate evidence */
export type DiseaseCellLine = {
  __typename?: 'DiseaseCellLine';
  /** Cell type identifier in cell ontology or in cell model database */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the cell model */
  name?: Maybe<Scalars['String']['output']>;
  /** Name of the tissue from which the cells were sampled */
  tissue?: Maybe<Scalars['String']['output']>;
  /** Anatomical identifier of the sampled organ/tissue */
  tissueId?: Maybe<Scalars['String']['output']>;
};

/** Disease and phenotypes annotations */
export type DiseaseHpo = {
  __typename?: 'DiseaseHPO';
  /** List of phenotype annotations. */
  evidence: Array<DiseaseHpoEvidences>;
  /** Disease Entity */
  phenotypeEFO?: Maybe<Disease>;
  /** Phenotype entity */
  phenotypeHPO?: Maybe<Hpo>;
};

/** the HPO project provides a large set of phenotype annotations. Source: Phenotype.hpoa */
export type DiseaseHpoEvidences = {
  __typename?: 'DiseaseHPOEvidences';
  /** One of P (Phenotypic abnormality), I (inheritance), C (onset and clinical course). Might be null (MONDO) */
  aspect?: Maybe<Scalars['String']['output']>;
  /** This refers to the center or user making the annotation and the date on which the annotation was made */
  bioCuration?: Maybe<Scalars['String']['output']>;
  /** Related name from the field diseaseFromSourceId */
  diseaseFromSource: Scalars['String']['output'];
  /** This field refers to the database and database identifier. EG. OMIM */
  diseaseFromSourceId: Scalars['String']['output'];
  /** This field indicates the level of evidence supporting the annotation. */
  evidenceType?: Maybe<Scalars['String']['output']>;
  /** A term-id from the HPO-sub-ontology */
  frequency?: Maybe<Scalars['String']['output']>;
  /** HPO Entity */
  frequencyHPO?: Maybe<Hpo>;
  /** HP terms from the Clinical modifier subontology */
  modifiers: Array<Hpo>;
  /** A term-id from the HPO-sub-ontology below the term Age of onset. */
  onset: Array<Hpo>;
  /** This optional field can be used to qualify the annotation. Values: [True or False] */
  qualifierNot: Scalars['Boolean']['output'];
  /** This field indicates the source of the information used for the annotation (phenotype.hpoa) */
  references: Array<Scalars['String']['output']>;
  /** Possible source mapping: HPO or MONDO */
  resource: Scalars['String']['output'];
  /** This field contains the strings MALE or FEMALE if the annotation in question is limited to males or females. */
  sex?: Maybe<Scalars['String']['output']>;
};

/** Human Phenotype Ontology (HPO) annotations associated with the disease */
export type DiseaseHpOs = {
  __typename?: 'DiseaseHPOs';
  /** Total number of phenotype annotations */
  count: Scalars['Long']['output'];
  id: Scalars['String']['output'];
  /** List of phenotype annotations for the disease */
  rows: Array<DiseaseHpo>;
};

/** Synonymous disease labels grouped by relationship type */
export type DiseaseSynonyms = {
  __typename?: 'DiseaseSynonyms';
  /** Type of synonym relationship (e.g., exact, related, narrow) */
  relation: Scalars['String']['output'];
  /** List of synonymous disease labels for this relationship type */
  terms: Array<Scalars['String']['output']>;
};

/** Core annotation for drug or clinical candidate molecules. A drug in the platform is understood as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database. All ChEMBL molecules fullfilling any of the next criteria are included in the database: a) Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL molecules included in the DrugBank database d) Molecules that are acknowledged as chemical probes */
export type Drug = {
  __typename?: 'Drug';
  /** Significant adverse events estimated from pharmacovigilance reports deposited in FAERS */
  adverseEvents: AdverseEvents;
  /** List of molecules corresponding to derivative compounds */
  childMolecules: Array<Drug>;
  /** Cross-reference information for this molecule from external databases */
  crossReferences?: Maybe<Array<DrugReferences>>;
  /** Summary of the drug's clinical development */
  description?: Maybe<Scalars['String']['output']>;
  /** Classification of the molecule's therapeutic category or chemical class (e.g. Antibody) */
  drugType: Scalars['String']['output'];
  /** Warnings present on drug as identified by ChEMBL. */
  drugWarnings: Array<DrugWarning>;
  /** Drug or clinical candidate molecule identifier */
  id: Scalars['String']['output'];
  /** Clinical indications for this drug as reported by clinical trial records. */
  indications: ClinicalIndicationsFromDrugImp;
  /** Return the list of publications that mention the main entity, alone or in combination with other entities */
  literatureOcurrences: Publications;
  /** Highest clinical stage reached by the drug or clinical candidate molecule */
  maximumClinicalStage: Scalars['String']['output'];
  /** Mechanisms of action to produce intended pharmacological effects. Curated from scientific literature and post-marketing package inserts */
  mechanismsOfAction?: Maybe<MechanismsOfAction>;
  /** Generic name of the drug molecule */
  name: Scalars['String']['output'];
  /** Parent molecule for derivative compounds */
  parentMolecule?: Maybe<Drug>;
  /** Pharmacogenomics data linking genetic variants to responses to this drug. Data is integrated from sources including ClinPGx and describes how genetic variants influence individual responses to this drug. */
  pharmacogenomics: Array<Pharmacogenomics>;
  /** Semantically similar drugs based on a PubMed word embedding model */
  similarEntities: Array<Similarity>;
  /** List of alternative names for the drug */
  synonyms: Array<Scalars['String']['output']>;
  /** List of brand names for the drug */
  tradeNames: Array<Scalars['String']['output']>;
};


/** Core annotation for drug or clinical candidate molecules. A drug in the platform is understood as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database. All ChEMBL molecules fullfilling any of the next criteria are included in the database: a) Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL molecules included in the DrugBank database d) Molecules that are acknowledged as chemical probes */
export type DrugAdverseEventsArgs = {
  page?: InputMaybe<Pagination>;
};


/** Core annotation for drug or clinical candidate molecules. A drug in the platform is understood as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database. All ChEMBL molecules fullfilling any of the next criteria are included in the database: a) Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL molecules included in the DrugBank database d) Molecules that are acknowledged as chemical probes */
export type DrugLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/** Core annotation for drug or clinical candidate molecules. A drug in the platform is understood as any bioactive molecule with drug-like properties included in the EMBL-EBI ChEMBL database. All ChEMBL molecules fullfilling any of the next criteria are included in the database: a) Molecules with a known indication. b) Molecules with a known mechanism of action c) ChEMBL molecules included in the DrugBank database d) Molecules that are acknowledged as chemical probes */
export type DrugSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** Cross-reference information for a drug molecule */
export type DrugReferences = {
  __typename?: 'DrugReferences';
  /** List of identifiers from the source database */
  ids: Array<Scalars['String']['output']>;
  /** Source database providing the cross-reference */
  source: Scalars['String']['output'];
};

/** Blackbox and withdrawn information for drugs molecules included in ChEMBL database. */
export type DrugWarning = {
  __typename?: 'DrugWarning';
  /** List of molecule identifiers associated with the warning */
  chemblIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Country where the warning was issued */
  country?: Maybe<Scalars['String']['output']>;
  /** Description of the drug adverse effect */
  description?: Maybe<Scalars['String']['output']>;
  /** List of disease identifiers associated with the warning [bioregistry:efo] */
  efoId?: Maybe<Scalars['String']['output']>;
  /** Disease identifier categorising the type of warning [bioregistry:efo] */
  efoIdForWarningClass?: Maybe<Scalars['String']['output']>;
  /** List of disease labels associated with the warning */
  efoTerm?: Maybe<Scalars['String']['output']>;
  /** Internal identifier for the drug warning record */
  id?: Maybe<Scalars['Long']['output']>;
  /** List of sources supporting the warning information */
  references?: Maybe<Array<DrugWarningReference>>;
  /** Classification of toxicity type associated with the drug */
  toxicityClass?: Maybe<Scalars['String']['output']>;
  /** Classification of action taken (drug is withdrawn or has a black box warning) */
  warningType: Scalars['String']['output'];
  /** Year when the warning was issued */
  year?: Maybe<Scalars['Int']['output']>;
};

/** Reference information for drug warnings */
export type DrugWarningReference = {
  __typename?: 'DrugWarningReference';
  /** Reference identifier (e.g., PubMed ID) */
  id: Scalars['String']['output'];
  /** Source of the reference */
  source: Scalars['String']['output'];
  /** URL linking to the reference */
  url: Scalars['String']['output'];
};

/** Drug with drug identifiers */
export type DrugWithIdentifiers = {
  __typename?: 'DrugWithIdentifiers';
  /** Drug or clinical candidate entity */
  drug?: Maybe<Drug>;
  /** Drug identifier from the original data source */
  drugFromSource?: Maybe<Scalars['String']['output']>;
  /** Drug or clinical candidate identifier */
  drugId?: Maybe<Scalars['String']['output']>;
};

/** Regulatory enhancer/promoter regions to gene (target) predictions for a specific tissue/cell type based on the integration of experimental sources */
export type EnhancerToGene = {
  __typename?: 'EnhancerToGene';
  /** Cell type or tissue where the regulatory region to gene prediction was identified */
  biosample?: Maybe<Biosample>;
  /** Identifier of the biosample defined by the datasource provider */
  biosampleFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Name of the biosample where the interval was identified */
  biosampleName: Scalars['String']['output'];
  /** Chromosome containing the regulatory region */
  chromosome: Scalars['String']['output'];
  /** Identifier of the data source providing the regulatory region to gene prediction */
  datasourceId: Scalars['String']['output'];
  /** Distance from the regulatory region to the transcription start site */
  distanceToTss: Scalars['Int']['output'];
  /** Genomic end position of the regulatory region */
  end: Scalars['Int']['output'];
  /** Type of regulatory region (e.g., enhancer, promoter) */
  intervalType: Scalars['String']['output'];
  meta_total: Scalars['Long']['output'];
  /** PubMed identifier for the study providing the evidence [bioregistry:pubmed] */
  pmid: Scalars['String']['output'];
  /** Quality control flags for this interval. */
  qualityControls?: Maybe<Array<Scalars['String']['output']>>;
  /** Scores from individual resources used in prediction */
  resourceScore: Array<ResourceScore>;
  /** Combined score for the enhancer/promoter region to gene prediction */
  score: Scalars['Float']['output'];
  /** Genomic start position of the regulatory region */
  start: Scalars['Int']['output'];
  /** Identifier of the study providing the experimental data */
  studyId: Scalars['String']['output'];
  /** Predicted gene (target) */
  target: Target;
};

/** Collection of regulatory enhancer/promoter regions to gene (target) predictions for a specific tissue/cell type based on the integration of experimental sources */
export type EnhancerToGenes = {
  __typename?: 'EnhancerToGenes';
  /** Total number of enhancer/promoter region to gene predictions */
  count: Scalars['Long']['output'];
  /** List of enhancer/promoter region to gene predictions */
  rows: Array<EnhancerToGene>;
};

/** Union of core Platform entities returned by search or mappings (Target, Drug, Disease, Variant, Study) */
export type EntityUnionType = Disease | Drug | Study | Target | Variant;

/** Target - disease evidence from all data sources. Every piece of evidence supporting an association between a target (gene or protein) and a disease or phenotype is reported and scored according to the confidence we have in the association. Multiple target-disease evidence from the same source can be reported in this dataset. The dataset is partitioned by data source, therefore evidence for individual sources can be retrieved separately. The dataset schema is a superset of all the schemas for all sources. */
export type Evidence = {
  __typename?: 'Evidence';
  /** Origin of the variant allele */
  alleleOrigins?: Maybe<Array<Scalars['String']['output']>>;
  /** Inheritance patterns */
  allelicRequirements?: Maybe<Array<Scalars['String']['output']>>;
  /** Genetic origin of a population */
  ancestry?: Maybe<Scalars['String']['output']>;
  /** Identifier of the ancestry in the HANCESTRO ontology [bioregistry:hancestro] */
  ancestryId?: Maybe<Scalars['String']['output']>;
  /** Assays used in the study */
  assays?: Maybe<Array<Assays>>;
  /** Assessments */
  assessments?: Maybe<Array<Scalars['String']['output']>>;
  /** Effect size of numberic traits */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Lower value of the confidence interval */
  betaConfidenceIntervalLower?: Maybe<Scalars['Float']['output']>;
  /** Upper value of the confidence interval */
  betaConfidenceIntervalUpper?: Maybe<Scalars['Float']['output']>;
  /** Allelic composition of the model organism */
  biologicalModelAllelicComposition?: Maybe<Scalars['String']['output']>;
  /** Genetic background of the model organism */
  biologicalModelGeneticBackground?: Maybe<Scalars['String']['output']>;
  /** Identifier of the biological model (eg. in MGI) */
  biologicalModelId?: Maybe<Scalars['String']['output']>;
  /** List of biomarkers associated with the biological model */
  biomarkerList?: Maybe<Array<NameDescription>>;
  /** Altered characteristics that influences the disease process */
  biomarkerName?: Maybe<Scalars['String']['output']>;
  /** List of biomarkers */
  biomarkers?: Maybe<Biomarkers>;
  /** Identifier of the referenced biological material */
  biosamplesFromSource?: Maybe<Array<Scalars['String']['output']>>;
  /** Background of the derived cell lines */
  cellLineBackground?: Maybe<Scalars['String']['output']>;
  /** The studied cell type. Preferably the cell line ontology label */
  cellType?: Maybe<Scalars['String']['output']>;
  /** Identifier of the clinical report */
  clinicalReportId?: Maybe<Scalars['String']['output']>;
  /** Standard terms to define clinical significance */
  clinicalSignificances?: Maybe<Array<Scalars['String']['output']>>;
  /** Clinical stage of the drug-disease pair */
  clinicalStage?: Maybe<Scalars['String']['output']>;
  /** Description of the studied cohort */
  cohortDescription?: Maybe<Scalars['String']['output']>;
  /** Identifier of the studied cohort */
  cohortId?: Maybe<Scalars['String']['output']>;
  /** Clinical features/phenotypes observed in studied individuals */
  cohortPhenotypes?: Maybe<Array<Scalars['String']['output']>>;
  /** Short name of the studied cohort */
  cohortShortName?: Maybe<Scalars['String']['output']>;
  /** Confidence qualifier on the reported evidence */
  confidence?: Maybe<Scalars['String']['output']>;
  /** Experiment contrast */
  contrast?: Maybe<Scalars['String']['output']>;
  /** Credible set (StudyLocus) supporting this evidence */
  credibleSet?: Maybe<CredibleSet>;
  /** The applied screening library in the CRISPR/CAS9 project */
  crisprScreenLibrary?: Maybe<Scalars['String']['output']>;
  /** Identifer of the evidence source */
  datasourceId: Scalars['String']['output'];
  /** Type of the evidence */
  datatypeId: Scalars['String']['output'];
  /** Gain or loss of function effect of the evidence on the target resulting from genetic variants, pharmacological modulation, or other perturbations */
  directionOnTarget?: Maybe<Scalars['String']['output']>;
  /** Direction On Trait */
  directionOnTrait?: Maybe<Scalars['String']['output']>;
  /** Disease for which the target is associated in this evidence */
  disease: Disease;
  /** Cancer cell lines used to generate evidence */
  diseaseCellLines?: Maybe<Array<DiseaseCellLine>>;
  /** Disease label from the original source */
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
  /** Disease identifier from the original source */
  diseaseFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Mapped Open Targets disease identifier */
  diseaseFromSourceMappedId?: Maybe<Scalars['String']['output']>;
  /** Human phenotypes equivalent to those observed in animal models */
  diseaseModelAssociatedHumanPhenotypes?: Maybe<Array<LabelledElement>>;
  /** Phenotypes observed in genetically-modified animal models */
  diseaseModelAssociatedModelPhenotypes?: Maybe<Array<LabelledElement>>;
  /** Drug or clinical candidate targeting the target and studied/approved for the specific disease as potential indication [bioregistry:chembl] */
  drug?: Maybe<Drug>;
  /** Drug name/family in resource of origin */
  drugFromSource?: Maybe<Scalars['String']['output']>;
  /** Observed patterns of drug response */
  drugResponse?: Maybe<Disease>;
  evidenceDate?: Maybe<Scalars['String']['output']>;
  /** Description of the interaction between the two genes */
  geneInteractionType?: Maybe<Scalars['String']['output']>;
  /** False discovery rate of the genetic interaction test */
  geneticInteractionFDR?: Maybe<Scalars['Float']['output']>;
  /** P-value of the genetic interaction test */
  geneticInteractionPValue?: Maybe<Scalars['Float']['output']>;
  /** The strength of the genetic interaction. Directionality is captured as well: antagonistics < 0 < cooperative */
  geneticInteractionScore?: Maybe<Scalars['Float']['output']>;
  /** Identifer of the disease/target evidence */
  id: Scalars['String']['output'];
  /** Identifer of the interacting target */
  interactingTargetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Role of a target in the genetic interaction test */
  interactingTargetRole?: Maybe<Scalars['String']['output']>;
  /** List of PubMed or preprint reference identifiers */
  literature?: Maybe<Array<Scalars['String']['output']>>;
  /** Percentile of top differentially regulated genes (transcripts) within experiment */
  log2FoldChangePercentileRank?: Maybe<Scalars['Long']['output']>;
  /** Log2 fold expression change in contrast experiment */
  log2FoldChangeValue?: Maybe<Scalars['Float']['output']>;
  metaTotal: Scalars['Int']['output'];
  /** Samples with a given mutation tested */
  mutatedSamples?: Maybe<Array<EvidenceVariation>>;
  /** Size of effect captured as odds ratio */
  oddsRatio?: Maybe<Scalars['Float']['output']>;
  /** Lower value of the confidence interval for odds ratio */
  oddsRatioConfidenceIntervalLower?: Maybe<Scalars['Float']['output']>;
  /** Upper value of the confidence interval for odds ratio */
  oddsRatioConfidenceIntervalUpper?: Maybe<Scalars['Float']['output']>;
  /** Exponent of the p-value */
  pValueExponent?: Maybe<Scalars['Long']['output']>;
  /** Mantissa of the p-value */
  pValueMantissa?: Maybe<Scalars['Float']['output']>;
  /** List of pooled pathways */
  pathways?: Maybe<Array<Pathway>>;
  /** False discovery rate of the genetic test */
  phenotypicConsequenceFDR?: Maybe<Scalars['Float']['output']>;
  /** Log 2 fold change of the cell survival */
  phenotypicConsequenceLogFoldChange?: Maybe<Scalars['Float']['output']>;
  /** P-value of the the cell survival test */
  phenotypicConsequencePValue?: Maybe<Scalars['Float']['output']>;
  /** Primary Project Hit */
  primaryProjectHit?: Maybe<Scalars['Boolean']['output']>;
  /** Primary Project Id */
  primaryProjectId?: Maybe<Scalars['String']['output']>;
  /** Description of the project that generated the data */
  projectDescription?: Maybe<Scalars['String']['output']>;
  /** The identifer of the project that generated the data */
  projectId?: Maybe<Scalars['String']['output']>;
  /** List of PubMed Central identifiers of full text publication [bioregistry:pmc] */
  pubMedCentralIds?: Maybe<Array<Scalars['String']['output']>>;
  publicationDate?: Maybe<Scalars['String']['output']>;
  /** Last name and initials of the first author of the publication that references the evidence */
  publicationFirstAuthor?: Maybe<Scalars['String']['output']>;
  /** Year of the publication */
  publicationYear?: Maybe<Scalars['Long']['output']>;
  qualityControls: Array<Scalars['String']['output']>;
  /** Pathway, gene set or reaction identifier in Reactome */
  reactionId?: Maybe<Scalars['String']['output']>;
  /** Name of the reaction, patway or gene set in Reactome */
  reactionName?: Maybe<Scalars['String']['output']>;
  /** Date of the release of the data in a 'YYYY-MM-DD' format */
  releaseDate?: Maybe<Scalars['String']['output']>;
  /** Open Targets data release version */
  releaseVersion?: Maybe<Scalars['String']['output']>;
  /** Score provided by datasource indicating strength of target-disease association */
  resourceScore?: Maybe<Scalars['Float']['output']>;
  /** Score of the evidence reflecting the strength of the disease/target relationship */
  score: Scalars['Float']['output'];
  /** Methods to detect cancer driver genes producing significant results */
  significantDriverMethods?: Maybe<Array<Scalars['String']['output']>>;
  /** The statistical method used to calculate the association */
  statisticalMethod?: Maybe<Scalars['String']['output']>;
  /** Overview of the statistical method used to calculate the association */
  statisticalMethodOverview?: Maybe<Scalars['String']['output']>;
  /** End of the distribution the target was picked from */
  statisticalTestTail?: Maybe<Scalars['String']['output']>;
  /** Number of cases in case-control study */
  studyCases?: Maybe<Scalars['Long']['output']>;
  /** Number of cases in a case-control study that carry at least one allele of the qualifying variant */
  studyCasesWithQualifyingVariants?: Maybe<Scalars['Long']['output']>;
  /** Identifier of the study generating the data */
  studyId?: Maybe<Scalars['String']['output']>;
  /** Description of the study */
  studyOverview?: Maybe<Scalars['String']['output']>;
  /** Sample size of study */
  studySampleSize?: Maybe<Scalars['Long']['output']>;
  /** Start date of study in a YYYY-MM-DD format */
  studyStartDate?: Maybe<Scalars['String']['output']>;
  /** Target for which the disease is associated in this evidence */
  target: Target;
  /** Target name/synonym or non HGNC symbol in resource of origin */
  targetFromSource?: Maybe<Scalars['String']['output']>;
  /** Target ID in resource of origin (accepted sources include Ensembl gene ID, Uniprot ID, gene symbol), only capital letters are accepted */
  targetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Target name/synonym in animal model */
  targetInModel?: Maybe<Scalars['String']['output']>;
  /** Description of target modulation event */
  targetModulation?: Maybe<Scalars['String']['output']>;
  /** Role of a target in the genetic interaction test */
  targetRole?: Maybe<Scalars['String']['output']>;
  /** Text mining sentences extracted from literature */
  textMiningSentences?: Maybe<Array<EvidenceTextMiningSentence>>;
  /** Categorised reason(s) why the trial was stopped */
  trialStopReasonCategories?: Maybe<Array<Scalars['String']['output']>>;
  /** Reason why the trial was stopped, as reported */
  trialWhyStopped?: Maybe<Scalars['String']['output']>;
  /** Reference to linked external resource (e.g. clinical trials, studies, package inserts, reports, etc.) */
  urls?: Maybe<Array<LabelledUri>>;
  /** Variant supporting the relationship between the target and the disease */
  variant?: Maybe<Variant>;
  /** Descriptions of variant consequences at protein level */
  variantAminoacidDescriptions?: Maybe<Array<Scalars['String']['output']>>;
  /** Sequence ontology (SO) term of the functional consequence of the variant */
  variantFunctionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** Sequence ontology (SO) term of the functional consequence of the variant from QTL */
  variantFunctionalConsequenceFromQtlId?: Maybe<SequenceOntologyTerm>;
  /** Variant reference SNP cluster ID (Rsid) */
  variantRsId?: Maybe<Scalars['String']['output']>;
  /** Warning message */
  warningMessage?: Maybe<Scalars['String']['output']>;
};

/** Evidence datasource and datatype metadata */
export type EvidenceSource = {
  __typename?: 'EvidenceSource';
  /** Name of the evidence datasource */
  datasource: Scalars['String']['output'];
  /** Datatype/category of the evidence (e.g., Genetic association, Somatic, Literature) */
  datatype: Scalars['String']['output'];
};

/** Extracted text snippet from literature supporting a target–disease statement */
export type EvidenceTextMiningSentence = {
  __typename?: 'EvidenceTextMiningSentence';
  /** End character offset of the disease mention in the sentence */
  dEnd: Scalars['Long']['output'];
  /** Start character offset of the disease mention in the sentence */
  dStart: Scalars['Long']['output'];
  /** Publication section where the sentence was found (e.g., abstract, results) */
  section: Scalars['String']['output'];
  /** End character offset of the target mention in the sentence */
  tEnd: Scalars['Long']['output'];
  /** Start character offset of the target mention in the sentence */
  tStart: Scalars['Long']['output'];
  /** Sentence text supporting the association */
  text: Scalars['String']['output'];
};

/** Summary of mutation counts by functional consequence in the cohort */
export type EvidenceVariation = {
  __typename?: 'EvidenceVariation';
  /** Sequence ontology (SO) identifier of the functional consequence of the variant [bioregistry:so] */
  functionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** Number of cohort samples in which the target is mutated with a mutation of any type */
  numberMutatedSamples?: Maybe<Scalars['Long']['output']>;
  /** Number of cohort samples tested */
  numberSamplesTested?: Maybe<Scalars['Long']['output']>;
  /** Number of cohort samples in which the target is mutated with a specific mutation type */
  numberSamplesWithMutationType?: Maybe<Scalars['Long']['output']>;
};

/** Target–disease evidence items with total count and pagination cursor */
export type Evidences = {
  __typename?: 'Evidences';
  /** Total number of evidence items available for the query */
  count: Scalars['Int']['output'];
  /** Opaque pagination cursor to request the next page of results */
  cursor?: Maybe<Scalars['String']['output']>;
  /** List of evidence items supporting the target–disease association */
  rows: Array<Evidence>;
};

/** Array of structs containing expression data relevant to a particular gene and biosample combination */
export type Expression = {
  __typename?: 'Expression';
  /** Protein expression values for the biosample and gene combination */
  protein: ProteinExpression;
  /** RNA expression values for the biosample and gene combination */
  rna: RnaExpression;
  /** Tissue/biosample information for the expression data */
  tissue: Tissue;
};

/** CRISPR screening experiments supporting the essentiality assessment. Represents individual cell line assays from DepMap. */
export type GeneEssentialityScreen = {
  __typename?: 'GeneEssentialityScreen';
  /** Name of the cancer cell line in which the gene essentiality was assessed */
  cellLineName?: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the assay in DepMap */
  depmapId?: Maybe<Scalars['String']['output']>;
  /** Cell model passport identifier of a cell line modelling a disease */
  diseaseCellLineId?: Maybe<Scalars['String']['output']>;
  /** Disease associated with the cell line as reported in the source data */
  diseaseFromSource?: Maybe<Scalars['String']['output']>;
  /** Gene expression level in the corresponding cell line */
  expression?: Maybe<Scalars['Float']['output']>;
  /** Gene effect score indicating the impact of gene knockout */
  geneEffect?: Maybe<Scalars['Float']['output']>;
  /** Background mutation the tested cell line have */
  mutation?: Maybe<Scalars['String']['output']>;
};

/** Gene Ontology (GO) annotations related to the target */
export type GeneOntology = {
  __typename?: 'GeneOntology';
  /** Type of the GO annotation: molecular function (F), biological process (P) and cellular localisation (C) */
  aspect: Scalars['String']['output'];
  /** Evidence supporting the GO annotation */
  evidence: Scalars['String']['output'];
  /** Gene product associated with the GO annotation [bioregistry:uniprot] */
  geneProduct: Scalars['String']['output'];
  /** Source database and identifier where the ontology term was sourced from */
  source: Scalars['String']['output'];
  /** Gene ontology term */
  term: GeneOntologyTerm;
};

/** Gene ontology (GO) term [bioregistry:go] */
export type GeneOntologyTerm = {
  __typename?: 'GeneOntologyTerm';
  /** Gene ontology term identifier [bioregistry:go] */
  id: Scalars['String']['output'];
  /** Gene ontology term label */
  label: Scalars['String']['output'];
};

/** Genomic location information of the target gene */
export type GenomicLocation = {
  __typename?: 'GenomicLocation';
  /** Chromosome on which the target is located */
  chromosome: Scalars['String']['output'];
  /** Genomic end position of the target gene */
  end: Scalars['Long']['output'];
  /** Genomic start position of the target gene */
  start: Scalars['Long']['output'];
  /** Strand orientation of the target gene */
  strand: Scalars['Int']['output'];
};

/** Human Phenotype Ontology subset of information included in the Platform. */
export type Hpo = {
  __typename?: 'HPO';
  /** Phenotype description */
  description?: Maybe<Scalars['String']['output']>;
  /** Open Targets hpo id */
  id: Scalars['String']['output'];
  /** Phenotype name */
  name: Scalars['String']['output'];
  /** namespace */
  namespace?: Maybe<Array<Scalars['String']['output']>>;
};

/** Attributes of the hallmark annotation */
export type HallmarkAttribute = {
  __typename?: 'HallmarkAttribute';
  /** Description of the hallmark attribute */
  description: Scalars['String']['output'];
  /** Name of the hallmark attribute */
  name: Scalars['String']['output'];
  /** PubMed ID of the supporting literature for the hallmark attribute [bioregistry:pubmed] */
  pmid?: Maybe<Scalars['Long']['output']>;
};

/** Hallmarks related to the target gene sourced from COSMIC */
export type Hallmarks = {
  __typename?: 'Hallmarks';
  /** Attributes of the hallmark annotation */
  attributes: Array<HallmarkAttribute>;
  /** Cancer hallmarks associated with the target gene */
  cancerHallmarks: Array<CancerHallmark>;
};

/** Homologues of the target gene in other species according to Ensembl Compara */
export type Homologue = {
  __typename?: 'Homologue';
  /** Type of homology relationship */
  homologyType: Scalars['String']['output'];
  /** Indicates if the homology is high confidence according to Ensembl Compara */
  isHighConfidence?: Maybe<Scalars['String']['output']>;
  /** Percentage identity of the query gene in the homologue */
  queryPercentageIdentity: Scalars['Float']['output'];
  /** Species ID for the homologue */
  speciesId: Scalars['String']['output'];
  /** Species name for the homologue */
  speciesName: Scalars['String']['output'];
  /** Gene ID of the homologue */
  targetGeneId: Scalars['String']['output'];
  /** Gene symbol of the homologous target */
  targetGeneSymbol: Scalars['String']['output'];
  /** Percentage identity of the homologue in the query gene */
  targetPercentageIdentity: Scalars['Float']['output'];
};

/** Identifier with source information */
export type IdAndSource = {
  __typename?: 'IdAndSource';
  /** Identifier value */
  id: Scalars['String']['output'];
  /** Source database or organization providing the identifier */
  source: Scalars['String']['output'];
};

/** Integration of molecular interactions reporting experimental or functional interactions between molecules represented as Platform targets. This dataset contains pair-wise interactions deposited in several databases capturing: physical interactions (e.g. IntAct), directional interactions (e.g. Signor), pathway relationships (e.g. Reactome) or functional interactions (e.g. STRINGdb). */
export type Interaction = {
  __typename?: 'Interaction';
  /** Number of evidence entries supporting this interaction */
  count: Scalars['Long']['output'];
  evidences: Array<InteractionEvidence>;
  /** Identifier for target A in source */
  intA: Scalars['String']['output'];
  /** Biological role of target A in the interaction */
  intABiologicalRole: Scalars['String']['output'];
  /** Identifier for target B in source */
  intB: Scalars['String']['output'];
  /** Biological role of target B in the interaction */
  intBBiologicalRole: Scalars['String']['output'];
  /** Scoring or confidence value assigned to the interaction. Scores are normalized to a range of 0-1. The higher the score, the stronger the support for the interaction. In IntAct, scores are captured with the MI score. */
  score?: Maybe<Scalars['Float']['output']>;
  /** Name of the source database reporting the interaction */
  sourceDatabase: Scalars['String']['output'];
  /** Taxonomic annotation of target A */
  speciesA?: Maybe<InteractionSpecies>;
  /** Taxonomic annotation of target B */
  speciesB?: Maybe<InteractionSpecies>;
  /** Target (gene/protein) of the first molecule (target A) in the interaction */
  targetA?: Maybe<Target>;
  /** Target (gene/protein) of the second molecule (target B) in the interaction */
  targetB?: Maybe<Target>;
};

/** Evidence supporting molecular interactions between targets. Contains detailed information about how the interaction was detected, the experimental context, and supporting publications. */
export type InteractionEvidence = {
  __typename?: 'InteractionEvidence';
  /** Score indicating the confidence or strength of the interaction evidence */
  evidenceScore?: Maybe<Scalars['Float']['output']>;
  /** Molecular Interactions (MI) identifier for the expansion method used [bioregistry:mi] */
  expansionMethodMiIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of the method used to expand the interaction dataset */
  expansionMethodShortName?: Maybe<Scalars['String']['output']>;
  /** Scientific name of the host organism in which the interaction was observed */
  hostOrganismScientificName?: Maybe<Scalars['String']['output']>;
  /** NCBI taxon ID of the host organism */
  hostOrganismTaxId?: Maybe<Scalars['Long']['output']>;
  /** Source where interactor A is identified */
  intASource: Scalars['String']['output'];
  /** Source where interactor B is identified */
  intBSource: Scalars['String']['output'];
  /** Molecular Interactions (MI) identifier for the interaction detection method [bioregistry:mi] */
  interactionDetectionMethodMiIdentifier: Scalars['String']['output'];
  /** Short name of the method used to detect the interaction */
  interactionDetectionMethodShortName: Scalars['String']['output'];
  /** Unique identifier for the interaction evidence entry at the source */
  interactionIdentifier?: Maybe<Scalars['String']['output']>;
  /** Molecular Interactions (MI) identifier for the type of interaction [bioregistry:mi] */
  interactionTypeMiIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of the interaction type */
  interactionTypeShortName?: Maybe<Scalars['String']['output']>;
  /** Detection method used to identify participant A in the interaction */
  participantDetectionMethodA?: Maybe<Array<InteractionEvidencePdm>>;
  /** Detection method used to identify participant B in the interaction */
  participantDetectionMethodB?: Maybe<Array<InteractionEvidencePdm>>;
  /** PubMed ID of the publication supporting the interaction evidence [bioregistry:pubmed] */
  pubmedId?: Maybe<Scalars['String']['output']>;
};

/** Detection method used to identify participants in the interaction */
export type InteractionEvidencePdm = {
  __typename?: 'InteractionEvidencePDM';
  /** Molecular Interactions (MI) identifier for the detection method [bioregistry:mi] */
  miIdentifier?: Maybe<Scalars['String']['output']>;
  /** Short name of the detection method */
  shortName?: Maybe<Scalars['String']['output']>;
};

/** Databases providing evidence for the interaction */
export type InteractionResources = {
  __typename?: 'InteractionResources';
  /** Version of the source database providing interaction evidence */
  databaseVersion: Scalars['String']['output'];
  /** Name of the source database reporting the interaction evidence */
  sourceDatabase: Scalars['String']['output'];
};

/** Source database for molecular interaction evidence */
export enum InteractionSourceEnum {
  /** IntAct molecular interaction database */
  Intact = 'intact',
  /** Reactome pathway database */
  Reactome = 'reactome',
  /** SIGNOR, the SIGnaling Network Open Resource database */
  Signor = 'signor',
  /** STRING, protein-protein interactions database */
  String = 'string'
}

/** Taxonomic annotation of the interaction participants */
export type InteractionSpecies = {
  __typename?: 'InteractionSpecies';
  /** Short mnemonic name of the species */
  mnemonic: Scalars['String']['output'];
  /** Scientific name of the species */
  scientificName?: Maybe<Scalars['String']['output']>;
  /** NCBI taxon ID of the species */
  taxonId?: Maybe<Scalars['Long']['output']>;
};

/** Molecular interactions reported between targets, with total count and rows */
export type Interactions = {
  __typename?: 'Interactions';
  /** Total number of interaction entries available for the query */
  count: Scalars['Long']['output'];
  id: Scalars['String']['output'];
  /** List of molecular interaction entries */
  rows: Array<Interaction>;
};

/** A key-value pair */
export type KeyValuePair = {
  __typename?: 'KeyValuePair';
  /** Key or attribute name */
  key: Scalars['String']['output'];
  /** String representation of the value */
  value: Scalars['String']['output'];
};

/** Feature used in Locus2gene model predictions */
export type L2GFeature = {
  __typename?: 'L2GFeature';
  /** Name of the feature */
  name: Scalars['String']['output'];
  /** SHAP (SHapley Additive exPlanations) value indicating the feature's contribution to the prediction */
  shapValue: Scalars['Float']['output'];
  /** Value of the feature */
  value: Scalars['Float']['output'];
};

/** Predictions from Locus2gene model integrating multiple functional genomic features to estimate the most likely causal gene for a given credible set. The dataset contains all predictions for every combination of credible set and genes in the region as well as statistics to explain the model interpretation of the predictions. */
export type L2GPrediction = {
  __typename?: 'L2GPrediction';
  /** Features used in the Locus2gene model prediction */
  features?: Maybe<Array<L2GFeature>>;
  /** Locus2gene prediction score for the gene assignment. Higher scores indicate a stronger association between the credible set and the gene. Scores range from 0 to 1. */
  score: Scalars['Float']['output'];
  /** SHAP base value for the prediction. This value is common to all predictions for a given credible set. */
  shapBaseValue: Scalars['Float']['output'];
  /** Study-locus identifier for the credible set */
  studyLocusId: Scalars['String']['output'];
  /** Target entity of the L2G predicted gene */
  target?: Maybe<Target>;
};

/** Predictions from Locus2gene gene assignment model. The dataset contains all predictions for every combination of credible set and genes in the region as well as statistics to explain the model interpretation of the predictions. */
export type L2GPredictions = {
  __typename?: 'L2GPredictions';
  /** Total number of Locus2gene predictions */
  count: Scalars['Long']['output'];
  /** Study-locus identifier for the credible set */
  id: Scalars['String']['output'];
  /** List of Locus2gene predictions for credible set and gene combinations */
  rows: Array<L2GPrediction>;
};

/** Label with source information */
export type LabelAndSource = {
  __typename?: 'LabelAndSource';
  /** Label value (e.g., synonym, symbol) */
  label: Scalars['String']['output'];
  /** Source database of the label */
  source: Scalars['String']['output'];
};

/** Identifier and human-readable label pair */
export type LabelledElement = {
  __typename?: 'LabelledElement';
  /** Identifier value */
  id: Scalars['String']['output'];
  /** Human-readable label */
  label: Scalars['String']['output'];
};

/** External resource link with an optional display name */
export type LabelledUri = {
  __typename?: 'LabelledUri';
  /** Optional human-readable label for the URL */
  niceName?: Maybe<Scalars['String']['output']>;
  /** URL to the external resource */
  url: Scalars['String']['output'];
};

/** Collection of populations referenced by the study. Used to describe the linkage disequilibrium (LD) population structure of GWAS studies. */
export type LdPopulationStructure = {
  __typename?: 'LdPopulationStructure';
  /** Population identifier */
  ldPopulation: Scalars['String']['output'];
  /** Fraction of the total sample represented by the population */
  relativeSampleSize?: Maybe<Scalars['Float']['output']>;
};

/** Variants in linkage disequilibrium (LD) with the credible set lead variant. */
export type LdSet = {
  __typename?: 'LdSet';
  /** The R-squared value for the tag variants with the credible set lead variant */
  r2Overall: Scalars['Float']['output'];
  /** The variant ID for tag variants in LD with the credible set lead variant */
  tagVariantId: Scalars['String']['output'];
};

/** Subcellular location information with source */
export type LocationAndSource = {
  __typename?: 'LocationAndSource';
  /** Subcellular location category from SwissProt */
  labelSL?: Maybe<Scalars['String']['output']>;
  /** Name of the subcellular compartment where the protein was found */
  location: Scalars['String']['output'];
  /** Source database for the subcellular location */
  source: Scalars['String']['output'];
  /** Subcellular location term identifier from SwissProt [bioregistry:sl] */
  termSL?: Maybe<Scalars['String']['output']>;
};

/** Collection of variants within a credible set (locus) */
export type Loci = {
  __typename?: 'Loci';
  /** Total number of variants in the credible set */
  count: Scalars['Long']['output'];
  /** Variants within the credible set and their associated statistics */
  rows?: Maybe<Array<Locus>>;
};

/** List of variants within the credible set */
export type Locus = {
  __typename?: 'Locus';
  /** Beta coefficient of this variant in the credible set */
  beta?: Maybe<Scalars['Float']['output']>;
  /** Boolean for if the variant is part of the 95% credible set */
  is95CredibleSet: Scalars['Boolean']['output'];
  /** Boolean for if the variant is part of the 99% credible set */
  is99CredibleSet: Scalars['Boolean']['output'];
  /** Log (natural) Bayes factor for the variant from fine-mapping */
  logBF?: Maybe<Scalars['Float']['output']>;
  /** Exponent of the P-value for this variant in the credible set */
  pValueExponent?: Maybe<Scalars['Int']['output']>;
  /** Mantissa of the P-value for this variant in the credible set */
  pValueMantissa?: Maybe<Scalars['Float']['output']>;
  /** Posterior inclusion probability for the variant within this credible set */
  posteriorProbability: Scalars['Float']['output'];
  /** R-squared (LD) between this credible set variant and the lead variant */
  r2Overall?: Maybe<Scalars['Float']['output']>;
  /** Standard error of this variant in the credible set */
  standardError?: Maybe<Scalars['Float']['output']>;
  /** Variant in the credible set */
  variant?: Maybe<Variant>;
};

/** Mapping result for a single input term */
export type MappingResult = {
  __typename?: 'MappingResult';
  /** Search hits that the term maps to, if any */
  hits?: Maybe<Array<SearchResult>>;
  /** Input term submitted for mapping */
  term: Scalars['String']['output'];
};

/** Mapping results for multiple terms with total hit count and aggregations */
export type MappingResults = {
  __typename?: 'MappingResults';
  /** Facet aggregations over mapped entities and categories */
  aggregations?: Maybe<SearchResultAggs>;
  /** Per-term mapping results */
  mappings: Array<MappingResult>;
  /** Total number of mapped hits across all terms */
  total: Scalars['Long']['output'];
};

/** Mechanism of action information for a drug */
export type MechanismOfActionRow = {
  __typename?: 'MechanismOfActionRow';
  /** Classification of how the drug interacts with its target (e.g., ACTIVATOR, INHIBITOR) */
  actionType?: Maybe<Scalars['String']['output']>;
  /** Description of the mechanism of action */
  mechanismOfAction: Scalars['String']['output'];
  /** Reference information supporting the mechanism of action */
  references?: Maybe<Array<Reference>>;
  /** Name of the target molecule */
  targetName?: Maybe<Scalars['String']['output']>;
  /** List of on-target (genes or proteins) involved in the drug or clinical candidate mechanism of action */
  targets: Array<Target>;
};

/** Collection of mechanisms of action for a drug molecule */
export type MechanismsOfAction = {
  __typename?: 'MechanismsOfAction';
  /** List of mechanism of action entries */
  rows: Array<MechanismOfActionRow>;
  /** Unique list of action types across all mechanisms */
  uniqueActionTypes: Array<Scalars['String']['output']>;
  /** Unique list of target types across all mechanisms */
  uniqueTargetTypes: Array<Scalars['String']['output']>;
};

/** Metadata about the Open Targets Platform API including version information */
export type Meta = {
  __typename?: 'Meta';
  /** API version information */
  apiVersion: ApiVersion;
  /** Data release prefix */
  dataPrefix: Scalars['String']['output'];
  /** Data release version information */
  dataVersion: DataVersion;
  /** Platform datasets described following MLCroissant metadata format. Datasets are described in a JSONLD file containing extensive metadata including table and column descriptions, schemas, location and relationships. */
  downloads?: Maybe<Scalars['String']['output']>;
  /** Flag indicating whether data release prefix is enabled */
  enableDataReleasePrefix: Scalars['Boolean']['output'];
  /** Name of the platform */
  name: Scalars['String']['output'];
  /** Open Targets product */
  product: Scalars['String']['output'];
};

/** Container for phenotype class-related attributes */
export type ModelPhenotypeClasses = {
  __typename?: 'ModelPhenotypeClasses';
  /** Unique identifier for the phenotype class [bioregistry:mp] */
  id: Scalars['String']['output'];
  /** Descriptive label for the phenotype class */
  label: Scalars['String']['output'];
};

/** Mouse phenotype information linking human targets to observed phenotypes in mouse models */
export type MousePhenotype = {
  __typename?: 'MousePhenotype';
  /** Container for all biological model-related attributes */
  biologicalModels: Array<BiologicalModels>;
  /** Container for phenotype class-related attributes */
  modelPhenotypeClasses: Array<ModelPhenotypeClasses>;
  /** Identifier for the specific phenotype observed in the model [bioregistry:mp] */
  modelPhenotypeId: Scalars['String']['output'];
  /** Human-readable label describing the observed phenotype */
  modelPhenotypeLabel: Scalars['String']['output'];
  /** Name of the target gene as represented in the mouse model */
  targetInModel: Scalars['String']['output'];
  /** Ensembl identifier for the target gene in the mouse model */
  targetInModelEnsemblId?: Maybe<Scalars['String']['output']>;
  /** MGI identifier for the target gene in the mouse model [bioregistry:mgi] */
  targetInModelMgiId: Scalars['String']['output'];
};

/** Generic pair of a name and its description */
export type NameDescription = {
  __typename?: 'NameDescription';
  /** Human-readable description of the element */
  description: Scalars['String']['output'];
  /** Name or label of the element */
  name: Scalars['String']['output'];
};

/** Open Targets (OTAR) project information associated with a disease. Data only available in Partner Platform Preview (PPP) */
export type OtarProject = {
  __typename?: 'OtarProject';
  /** Whether the project integrates data in the Open Targets Partner Preview (PPP) */
  integratesInPPP?: Maybe<Scalars['Boolean']['output']>;
  /** OTAR project code identifier */
  otarCode: Scalars['String']['output'];
  /** Name of the OTAR project */
  projectName?: Maybe<Scalars['String']['output']>;
  /** Reference or citation for the OTAR project */
  reference: Scalars['String']['output'];
  /** Status of the OTAR project */
  status?: Maybe<Scalars['String']['output']>;
};

/** Pagination settings for controlling result set size and page navigation. Uses zero-based indexing to specify which page of results to retrieve. */
export type Pagination = {
  /** Zero-based page index */
  index: Scalars['Int']['input'];
  /** Number of items per page [Default: 25, Max: 3000] */
  size: Scalars['Int']['input'];
};

/** Pathway metadata from Reactome pathway database. */
export type Pathway = {
  __typename?: 'Pathway';
  /** Reactome pathway identifier [bioregistry:reactome] */
  id?: Maybe<Scalars['String']['output']>;
  /** Reactome pathway name */
  name: Scalars['String']['output'];
};

/** Pharmacogenomics data linking genetic variants to drug responses. Data is integrated from sources including ClinPGx. */
export type Pharmacogenomics = {
  __typename?: 'Pharmacogenomics';
  /** Identifier for the data provider */
  datasourceId?: Maybe<Scalars['String']['output']>;
  /** Classification of the type of pharmacogenomic data (e.g., clinical_annotation) */
  datatypeId?: Maybe<Scalars['String']['output']>;
  /** List of drugs or clinical candidates associated with the pharmacogenomic data */
  drugs: Array<DrugWithIdentifiers>;
  /** Strength of the scientific support for the variant/drug response */
  evidenceLevel?: Maybe<Scalars['String']['output']>;
  /** Genetic variant configuration */
  genotype?: Maybe<Scalars['String']['output']>;
  /** Explanation of the genotype's clinical significance */
  genotypeAnnotationText?: Maybe<Scalars['String']['output']>;
  /** Identifier for the specific genetic variant combination (e.g., 1_1500_A_A,T) */
  genotypeId?: Maybe<Scalars['String']['output']>;
  /** Haplotype ID in the ClinPGx dataset */
  haplotypeFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Combination of genetic variants that constitute a particular allele of a gene (e.g., CYP2C9*3) */
  haplotypeId?: Maybe<Scalars['String']['output']>;
  /** Whether the target is directly affected by the variant */
  isDirectTarget: Scalars['Boolean']['output'];
  /** PubMed identifier (PMID) of the literature entry [bioregistry:pubmed] */
  literature?: Maybe<Array<Scalars['String']['output']>>;
  /** Classification of the drug response type (e.g., Toxicity) */
  pgxCategory?: Maybe<Scalars['String']['output']>;
  /** Phenotype identifier from the source */
  phenotypeFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Description of the phenotype associated with the variant */
  phenotypeText?: Maybe<Scalars['String']['output']>;
  /** Identifier of the study providing the pharmacogenomic evidence */
  studyId?: Maybe<Scalars['String']['output']>;
  /** Target entity */
  target?: Maybe<Target>;
  /** Target (gene/protein) identifier as reported by the data source */
  targetFromSourceId?: Maybe<Scalars['String']['output']>;
  /** Annotation details about the variant effect on drug response */
  variantAnnotation?: Maybe<Array<VariantAnnotation>>;
  /** The sequence ontology identifier of the consequence of the variant based on Ensembl VEP in the context of the transcript [bioregistry:so] */
  variantFunctionalConsequence?: Maybe<SequenceOntologyTerm>;
  /** The sequence ontology identifier of the consequence of the variant based on Ensembl VEP in the context of the transcript [bioregistry:so] */
  variantFunctionalConsequenceId?: Maybe<Scalars['String']['output']>;
  /** Variant identifier in CHROM_POS_REF_ALT notation */
  variantId?: Maybe<Scalars['String']['output']>;
  /** dbSNP rsID identifier for the variant */
  variantRsId?: Maybe<Scalars['String']['output']>;
};

/** Descriptions of variant consequences at protein level. Protein coding coordinates link variants to their amino acid-level consequences in protein products. */
export type ProteinCodingCoordinate = {
  __typename?: 'ProteinCodingCoordinate';
  /** Amino acid resulting from the variant */
  alternateAminoAcid: Scalars['String']['output'];
  /** Position of the amino acid affected by the variant in the protein sequence */
  aminoAcidPosition: Scalars['Int']['output'];
  /** Data sources providing evidence for the protein coding coordinate */
  datasources: Array<Datasource>;
  /** Disease the protein coding variant has been associated with */
  diseases: Array<Disease>;
  /** Reference amino acid at this position */
  referenceAminoAcid: Scalars['String']['output'];
  /** Target (gene/protein) the protein coding variant has been associated with */
  target?: Maybe<Target>;
  /** Therapeutic areas associated with the variant-consequence relationship */
  therapeuticAreas: Array<Scalars['String']['output']>;
  /** UniProt protein accessions for the affected protein [bioregistry:uniprot] */
  uniprotAccessions: Array<Scalars['String']['output']>;
  /** Protein coding variant */
  variant?: Maybe<Variant>;
  /** The sequence ontology term capturing the consequence of the variant based on Ensembl VEP in the context of the transcript [bioregistry:so] */
  variantConsequences: Array<SequenceOntologyTerm>;
  /** Score indicating the predicted effect of the variant on the protein */
  variantEffect?: Maybe<Scalars['Float']['output']>;
};

/** Collection of protein coding coordinates linking variants to their amino acid-level consequences */
export type ProteinCodingCoordinates = {
  __typename?: 'ProteinCodingCoordinates';
  /** Total number of phenotype-associated protein coding variants */
  count: Scalars['Long']['output'];
  id: Scalars['String']['output'];
  /** List of phenotype-associated protein coding variants */
  rows: Array<ProteinCodingCoordinate>;
};

/** Struct containing relevant protein expression values for a particular biosample and gene combination */
export type ProteinExpression = {
  __typename?: 'ProteinExpression';
  /** List of cell types were protein levels were measured */
  cellType: Array<CellType>;
  /** Level of protein expression normalised to 0-5 or -1 if absent */
  level: Scalars['Int']['output'];
  /** Reliability of the protein expression measurement */
  reliability: Scalars['Boolean']['output'];
};

/** Referenced publication information */
export type Publication = {
  __typename?: 'Publication';
  /** PubMed Central identifier (if available) [bioregistry:pmc] */
  pmcid?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier [bioregistry:pubmed] */
  pmid: Scalars['String']['output'];
  /** Publication date */
  publicationDate: Scalars['String']['output'];
};

/** List of referenced publications with total counts, earliest year and pagination cursor */
export type Publications = {
  __typename?: 'Publications';
  /** Total number of publications matching the query */
  count: Scalars['Long']['output'];
  /** Opaque pagination cursor to request the next page of results */
  cursor?: Maybe<Scalars['String']['output']>;
  /** Earliest publication year */
  earliestPubYear: Scalars['Int']['output'];
  /** Number of publications after applying filters */
  filteredCount: Scalars['Long']['output'];
  /** List of publications */
  rows: Array<Publication>;
};

/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type Query = {
  __typename?: 'Query';
  /** List of available evidence datasources and their datatypes */
  associationDatasources: Array<EvidenceSource>;
  clinicalReport?: Maybe<ClinicalReport>;
  clinicalReports: Array<ClinicalReport>;
  /** Retrieve a 95% credible set (study-locus) by identifier */
  credibleSet?: Maybe<CredibleSet>;
  /** List credible sets filtered by study-locus IDs, study IDs, variant IDs, study types or regions */
  credibleSets: CredibleSets;
  /** Retrieve a disease or phenotype by identifier (e.g. MONDO_0005068) */
  disease?: Maybe<Disease>;
  /** Retrieve multiple diseases by disease or phenotype identifiers */
  diseases: Array<Disease>;
  /** Retrieve a drug or clinical candidate by identifier (e.g. CHEMBL112) */
  drug?: Maybe<Drug>;
  /** Retrieve multiple drugs or clinical candidates by identifiers */
  drugs: Array<Drug>;
  /** Search sets of targets or diseases used to facet associations */
  facets: SearchFacetsResults;
  /** Fetch Gene Ontology terms by GO identifiers */
  geneOntologyTerms: Array<Maybe<GeneOntologyTerm>>;
  /** List of molecular interaction resources and their versions */
  interactionResources: Array<InteractionResources>;
  /** Map free-text terms to canonical IDs used as primary identifiers in the Platform (targets, diseases, drugs, variants or studies). For example, mapping 'diabetes' to MONDO_0005015 or 'BRCA1' to ENSG00000139618 */
  mapIds: MappingResults;
  /** Open Targets API metadata, including version and configuration information */
  meta: Meta;
  /** Full-text, multi-entity search across all types of entities (targets, diseases, drugs, variants or studies) */
  search: SearchResults;
  /** List GWAS or molecular QTL studies filtered by ID(s) and/or disease(s); supports ontology expansion */
  studies: Studies;
  /** Retrieve a GWAS or molecular QTL study by ID (e.g. GCST004131) */
  study?: Maybe<Study>;
  /** Retrieve a target (gene/protein) by target identifier (e.g. ENSG00000139618) */
  target?: Maybe<Target>;
  /** Retrieve multiple targets by target identifiers */
  targets: Array<Target>;
  /** Retrieve a variant by identifier in the format of CHROM_POS_REF_ALT for SNPs and short indels (e.g. 19_44908684_T_C) */
  variant?: Maybe<Variant>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryClinicalReportArgs = {
  clinicalReportId: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryClinicalReportsArgs = {
  clinicalReportsIds: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryCredibleSetArgs = {
  studyLocusId: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryCredibleSetsArgs = {
  page?: InputMaybe<Pagination>;
  regions?: InputMaybe<Array<Scalars['String']['input']>>;
  studyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  studyLocusIds?: InputMaybe<Array<Scalars['String']['input']>>;
  studyTypes?: InputMaybe<Array<StudyTypeEnum>>;
  variantIds?: InputMaybe<Array<Scalars['String']['input']>>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryDiseaseArgs = {
  efoId: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryDiseasesArgs = {
  efoIds: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryDrugArgs = {
  chemblId: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryDrugsArgs = {
  chemblIds: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryFacetsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: InputMaybe<Pagination>;
  queryString?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryGeneOntologyTermsArgs = {
  goIds: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryMapIdsArgs = {
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  queryTerms: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QuerySearchArgs = {
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  page?: InputMaybe<Pagination>;
  queryString: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryStudiesArgs = {
  diseaseIds?: InputMaybe<Array<Scalars['String']['input']>>;
  enableIndirect?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Pagination>;
  studyId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryStudyArgs = {
  studyId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryTargetArgs = {
  ensemblId: Scalars['String']['input'];
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryTargetsArgs = {
  ensemblIds: Array<Scalars['String']['input']>;
};


/** Root query type providing access to all entities and search functionality in the Open Targets Platform. Supports retrieval of targets, diseases, drugs, variants, studies, credible sets, and their associations. Includes full-text search, mapping, and filtering capabilities. */
export type QueryVariantArgs = {
  variantId: Scalars['String']['input'];
};

/** RNA expression values for a particular biosample and gene combination */
export type RnaExpression = {
  __typename?: 'RNAExpression';
  /** Level of RNA expression normalised to 0-5 or -1 if absent */
  level: Scalars['Int']['output'];
  /** Unit for the RNA expression */
  unit: Scalars['String']['output'];
  /** Expression value */
  value: Scalars['Float']['output'];
  /** Expression zscore */
  zscore: Scalars['Long']['output'];
};

/** Reactome pathway information for the target */
export type ReactomePathway = {
  __typename?: 'ReactomePathway';
  /** Pathway name */
  pathway: Scalars['String']['output'];
  /** Reactome pathway identifier */
  pathwayId: Scalars['String']['output'];
  /** Top-level pathway term */
  topLevelTerm: Scalars['String']['output'];
};

/** Reference information supporting the drug mechanisms of action */
export type Reference = {
  __typename?: 'Reference';
  /** List of reference identifiers */
  ids?: Maybe<Array<Scalars['String']['output']>>;
  /** Source of the reference (e.g., PubMed, FDA, package inserts) */
  source: Scalars['String']['output'];
  /** List of URLs linking to the reference */
  urls?: Maybe<Array<Scalars['String']['output']>>;
};

/** Score from a specific datasource */
export type ResourceScore = {
  __typename?: 'ResourceScore';
  /** Name of the resource providing the score */
  name: Scalars['String']['output'];
  /** Score value from the resource */
  value: Scalars['Float']['output'];
};

/** Biosamples used in safety assessments */
export type SafetyBiosample = {
  __typename?: 'SafetyBiosample';
  /** Format of the biosample cells */
  cellFormat?: Maybe<Scalars['String']['output']>;
  /** Cell identifier for the biosample */
  cellId?: Maybe<Scalars['String']['output']>;
  /** Label of the biosample cell */
  cellLabel?: Maybe<Scalars['String']['output']>;
  /** Tissue ID for the biosample */
  tissueId?: Maybe<Scalars['String']['output']>;
  /** Label of the biosample tissue */
  tissueLabel?: Maybe<Scalars['String']['output']>;
};

/** Effects reported for safety events */
export type SafetyEffects = {
  __typename?: 'SafetyEffects';
  /** Direction of the reported effect (e.g., increase or decrease) */
  direction: Scalars['String']['output'];
  /** Dosing conditions related to the reported effect */
  dosing?: Maybe<Scalars['String']['output']>;
};

/** Safety liabilities associated with the target */
export type SafetyLiability = {
  __typename?: 'SafetyLiability';
  /** Biosamples used in safety assessments */
  biosamples?: Maybe<Array<SafetyBiosample>>;
  /** Data source reporting the safety liability */
  datasource: Scalars['String']['output'];
  /** Effects reported for the safety event */
  effects?: Maybe<Array<SafetyEffects>>;
  /** Safety event associated with the target */
  event?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the safety event */
  eventId?: Maybe<Scalars['String']['output']>;
  /** Literature references for the safety liability */
  literature?: Maybe<Scalars['String']['output']>;
  /** Studies related to safety assessments */
  studies?: Maybe<Array<SafetyStudy>>;
  /** URL linking to more details on safety liabilities */
  url?: Maybe<Scalars['String']['output']>;
};

/** Studies related to safety assessments */
export type SafetyStudy = {
  __typename?: 'SafetyStudy';
  /** Description of the safety study */
  description?: Maybe<Scalars['String']['output']>;
  /** Name of the safety study */
  name?: Maybe<Scalars['String']['output']>;
  /** Type of safety study */
  type?: Maybe<Scalars['String']['output']>;
};

/** Sample information including ancestry and sample size. Used for both discovery and replication phases of GWAS studies. */
export type Sample = {
  __typename?: 'Sample';
  /** Sample ancestry name */
  ancestry: Scalars['String']['output'];
  /** Sample size */
  sampleSize: Scalars['Int']['output'];
};

/** Scored component used in association scoring */
export type ScoredComponent = {
  __typename?: 'ScoredComponent';
  /** Component identifier (e.g., datatype or datasource name) */
  id: Scalars['String']['output'];
  /** Association score for the component. Scores are normalized to a range of 0-1. The higher the score, the stronger the association. */
  score: Scalars['Float']['output'];
};

/** Facet category with result count */
export type SearchFacetsCategory = {
  __typename?: 'SearchFacetsCategory';
  /** Facet category name */
  name: Scalars['String']['output'];
  /** Number of results in this category */
  total: Scalars['Long']['output'];
};

/** Facet search hit for a single category item */
export type SearchFacetsResult = {
  __typename?: 'SearchFacetsResult';
  /** Facet category this item belongs to (e.g., target, disease) */
  category: Scalars['String']['output'];
  /** Optional identifier of the datasource contributing this facet */
  datasourceId?: Maybe<Scalars['String']['output']>;
  /** Optional list of underlying entity identifiers represented by this facet */
  entityIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Highlighted text snippets showing why this facet matched the query */
  highlights: Array<Scalars['String']['output']>;
  /** Facet identifier, which can be inputted in the associations query to filter by this facet */
  id: Scalars['String']['output'];
  /** Human-readable facet label */
  label: Scalars['String']['output'];
  /** Relevance score of the facet hit for the current query */
  score: Scalars['Float']['output'];
};

/** Facet search results including hits and category counts */
export type SearchFacetsResults = {
  __typename?: 'SearchFacetsResults';
  /** Facet categories with their result counts */
  categories: Array<SearchFacetsCategory>;
  /** List of facetable hits matching the query */
  hits: Array<SearchFacetsResult>;
  /** Total number of facetable results for the current query */
  total: Scalars['Long']['output'];
};

/** Full-text search hit describing a single entity and its relevance to the query */
export type SearchResult = {
  __typename?: 'SearchResult';
  /** List of categories the hit belongs to (e.g., TARGET, DISEASE, DRUG) */
  category: Array<Scalars['String']['output']>;
  /** Short description or summary of the entity */
  description?: Maybe<Scalars['String']['output']>;
  /** Entity type of the hit (e.g., target, disease, drug, variant, study) */
  entity: Scalars['String']['output'];
  /** Highlighted text snippets showing where the query matched */
  highlights: Array<Scalars['String']['output']>;
  /** Entity identifier (e.g., Ensembl, EFO, ChEMBL, variant or study ID) */
  id: Scalars['String']['output'];
  /** Additional keywords associated with the entity to improve search */
  keywords?: Maybe<Array<Scalars['String']['output']>>;
  /** Score boosting multiplier applied to the hit during search ranking */
  multiplier: Scalars['Float']['output'];
  /** Primary display name for the entity */
  name: Scalars['String']['output'];
  /** List of n-grams derived from the name used for fuzzy matching */
  ngrams?: Maybe<Array<Scalars['String']['output']>>;
  /** Resolved Platform entity corresponding to this search hit */
  object?: Maybe<EntityUnionType>;
  /** List of name prefixes used for prefix matching */
  prefixes?: Maybe<Array<Scalars['String']['output']>>;
  /** Relevance score returned by the search engine for this hit */
  score: Scalars['Float']['output'];
};

/** Search result aggregation category with result count */
export type SearchResultAggCategory = {
  __typename?: 'SearchResultAggCategory';
  /** Category name (e.g., target, disease, drug) */
  name: Scalars['String']['output'];
  /** Total number of search results in this category */
  total: Scalars['Long']['output'];
};

/** Search result aggregation by entity type with category breakdown */
export type SearchResultAggEntity = {
  __typename?: 'SearchResultAggEntity';
  /** List of category aggregations within this entity type */
  categories: Array<SearchResultAggCategory>;
  /** Entity type name (e.g., target, disease, drug, variant, study) */
  name: Scalars['String']['output'];
  /** Total number of search results for this entity type */
  total: Scalars['Long']['output'];
};

/** Search result aggregations grouped by entity type */
export type SearchResultAggs = {
  __typename?: 'SearchResultAggs';
  /** List of entity type aggregations with category breakdowns */
  entities: Array<SearchResultAggEntity>;
  /** Total number of search results across all entities */
  total: Scalars['Long']['output'];
};

/** Search results including hits and facet aggregations */
export type SearchResults = {
  __typename?: 'SearchResults';
  /** Facet aggregations by entity and category for the current query */
  aggregations?: Maybe<SearchResultAggs>;
  /** Combined list of search hits across requested entities */
  hits: Array<SearchResult>;
  /** Total number of results for the current query and entity filter */
  total: Scalars['Long']['output'];
};

/** Sequence ontology term identifier and name */
export type SequenceOntologyTerm = {
  __typename?: 'SequenceOntologyTerm';
  /** Sequence ontology term identifier [bioregistry:so] */
  id: Scalars['String']['output'];
  /** Sequence ontology term label (e.g. 'missense_variant') */
  label: Scalars['String']['output'];
};

/** Semantic similarity score between labels, used to suggest related entities */
export type Similarity = {
  __typename?: 'Similarity';
  /** Entity category this similarity refers to (e.g., target, disease, drug) */
  category: Scalars['String']['output'];
  /** Identifier of the similar entity (e.g., Ensembl, EFO, ChEMBL ID) */
  id: Scalars['String']['output'];
  /** Resolved Platform entity corresponding to this similar label */
  object?: Maybe<EntityUnionType>;
  /** Similarity score between this entity and the query label. Scores are normalised between 0 and 1; higher scores indicate more similar entities. */
  score: Scalars['Float']['output'];
};

/** List of GWAS and molecular QTL studies with total count */
export type Studies = {
  __typename?: 'Studies';
  /** Total number of studies matching the query */
  count: Scalars['Long']['output'];
  /** List of GWAS or molecular QTL studies */
  rows: Array<Study>;
};

/** Metadata for all complex trait and molecular QTL GWAS studies in the Platform. The dataset includes study metadata, phenotype information, sample sizes, publication information and more. Molecular QTL studies are splitted by the affected gene, tissue or cell type and condition, potentially leading to many studies in the same publication. */
export type Study = {
  __typename?: 'Study';
  /** Collection of flags indicating the type of the analysis conducted in the association study */
  analysisFlags?: Maybe<Array<Scalars['String']['output']>>;
  /** Any background trait(s) shared by all individuals in the study */
  backgroundTraits?: Maybe<Array<Disease>>;
  /** Tissue or cell type in which the molQTL has been detected */
  biosample?: Maybe<Biosample>;
  /** List of cohort(s) represented in the discovery sample */
  cohorts?: Maybe<Array<Scalars['String']['output']>>;
  /** Reported sample conditions */
  condition?: Maybe<Scalars['String']['output']>;
  /** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set as well as the fine-mapping method and statistics used to estimate the credible set. */
  credibleSets: CredibleSets;
  /** Collection of ancestries reported by the study discovery phase */
  discoverySamples?: Maybe<Array<Sample>>;
  /** Phenotypic trait ids that map to the analysed trait reported by study */
  diseases?: Maybe<Array<Disease>>;
  /** Indication whether the summary statistics exist in the source */
  hasSumstats?: Maybe<Scalars['Boolean']['output']>;
  /** The GWAS or molQTL study identifier (e.g. GCST004132) */
  id: Scalars['String']['output'];
  /** Study initial sample size */
  initialSampleSize?: Maybe<Scalars['String']['output']>;
  /** Collection of populations referenced by the study */
  ldPopulationStructure?: Maybe<Array<LdPopulationStructure>>;
  /** The number of cases in this broad ancestry group */
  nCases?: Maybe<Scalars['Int']['output']>;
  /** The number of controls in this broad ancestry group */
  nControls?: Maybe<Scalars['Int']['output']>;
  /** The number of samples tested in GWAS analysis */
  nSamples?: Maybe<Scalars['Int']['output']>;
  /** Identifier of the source project collection that the study information is derived from */
  projectId: Scalars['String']['output'];
  /** Date of the publication that references study */
  publicationDate?: Maybe<Scalars['String']['output']>;
  /** Last name and initials of the author of the publication that references the study */
  publicationFirstAuthor?: Maybe<Scalars['String']['output']>;
  /** Abbreviated journal name where the publication referencing study was published */
  publicationJournal?: Maybe<Scalars['String']['output']>;
  /** Title of the publication that references the study */
  publicationTitle?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier of the publication hat references the study [bioregistry:pubmed] */
  pubmedId?: Maybe<Scalars['String']['output']>;
  /** Control metrics refining study validation */
  qualityControls?: Maybe<Array<Scalars['String']['output']>>;
  /** Collection of ancestries reported by the study replication phase */
  replicationSamples?: Maybe<Array<Sample>>;
  /** The study type (e.g. gwas, eqtl, pqtl, sceqtl) */
  studyType?: Maybe<StudyTypeEnum>;
  /** Path to the source study summary statistics (if exists at the source) */
  summarystatsLocation?: Maybe<Scalars['String']['output']>;
  /** Quality control flags for the study (if any) */
  sumstatQCValues?: Maybe<Array<SumStatQc>>;
  /** In molQTL studies, the gene under study for changes in expression, abundance, etc. */
  target?: Maybe<Target>;
  /** Molecular or phenotypic trait, derived from source, analysed in the study */
  traitFromSource: Scalars['String']['output'];
  /** Phenotypic trait ids that map to the analysed trait reported by study */
  traitFromSourceMappedIds?: Maybe<Array<Scalars['String']['output']>>;
};


/** Metadata for all complex trait and molecular QTL GWAS studies in the Platform. The dataset includes study metadata, phenotype information, sample sizes, publication information and more. Molecular QTL studies are splitted by the affected gene, tissue or cell type and condition, potentially leading to many studies in the same publication. */
export type StudyCredibleSetsArgs = {
  page?: InputMaybe<Pagination>;
};

/** Study type, distinguishing GWAS from different classes of molecular QTL studies */
export enum StudyTypeEnum {
  /** Bulk tissue expression quantitative trait locus (eQTL) study */
  Eqtl = 'eqtl',
  /** Genome-wide association study (GWAS) of complex traits or diseases */
  Gwas = 'gwas',
  /** Bulk tissue protein quantitative trait locus (pQTL) study */
  Pqtl = 'pqtl',
  /** Single-cell expression quantitative trait locus (sc-eQTL) study */
  Sceqtl = 'sceqtl',
  /** Single-cell protein quantitative trait locus (sc-pQTL) study */
  Scpqtl = 'scpqtl',
  /** Single-cell splicing quantitative trait locus (sc-sQTL) study */
  Scsqtl = 'scsqtl',
  /** Single-cell transcript uptake quantitative trait locus (sc-tuQTL) study */
  Sctuqtl = 'sctuqtl',
  /** Bulk tissue splicing quantitative trait locus (sQTL) study */
  Sqtl = 'sqtl',
  /** Bulk tissue transcript uptake quantitative trait locus (tuQTL) study */
  Tuqtl = 'tuqtl'
}

/** Quality control flags for summary statistics. Mapping of quality control metric names to their corresponding values. */
export type SumStatQc = {
  __typename?: 'SumStatQC';
  /** Quality control metric identifier */
  QCCheckName: Scalars['String']['output'];
  /** Quality control metric value */
  QCCheckValue: Scalars['Float']['output'];
};

/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type Target = {
  __typename?: 'Target';
  /** List of alternative Ensembl gene identifiers mapped to non-canonical chromosomes */
  alternativeGenes: Array<Scalars['String']['output']>;
  /** Approved full name of the target gene */
  approvedName: Scalars['String']['output'];
  /** Approved gene symbol of the target */
  approvedSymbol: Scalars['String']['output'];
  /** Target-disease associations calculated on-the-fly using configurable data source weights and evidence filters. Returns associations with aggregated scores and evidence counts supporting the target-disease relationship. */
  associatedDiseases: AssociatedDiseases;
  /** Biotype classification of the target gene, indicating if the gene is protein coding */
  biotype: Scalars['String']['output'];
  /** The Ensembl canonical transcript of the target gene */
  canonicalTranscript?: Maybe<CanonicalTranscript>;
  /** Chemical probes with high selectivity and specificity for the target. */
  chemicalProbes: Array<ChemicalProbe>;
  /** 95% credible sets for GWAS and molQTL studies. Credible sets include all variants in the credible set as well as the fine-mapping method and statistics used to estimate the credible set. */
  credibleSets: CredibleSets;
  /** Database cross-references for the target */
  dbXrefs: Array<IdAndSource>;
  /** Essentiality measurements extracted from DepMap, stratified by tissue or anatomical units. Gene essentiality is assessed based on dependencies exhibited when knocking out genes in cancer cellular models using CRISPR screenings from the Cancer Dependency Map (DepMap) Project. Gene effects below -1 can be considered dependencies. */
  depMapEssentiality?: Maybe<Array<DepMapEssentiality>>;
  drugAndClinicalCandidates: ClinicalTargets;
  /** Target-disease evidence from all data sources supporting associations between this target and diseases or phenotypes. Evidence entries are reported and scored according to confidence in the association. */
  evidences: Evidences;
  /** Baseline RNA and protein expression data across tissues for this target. Expression data shows how targets are selectively expressed across different tissues and biosamples, combining values from multiple sources including Expression Atlas and Human Protein Atlas. */
  expressions: Array<Expression>;
  /** Functional descriptions of the target gene sourced from UniProt */
  functionDescriptions: Array<Scalars['String']['output']>;
  /** List of Gene Ontology (GO) annotations related to the target */
  geneOntology: Array<GeneOntology>;
  /** Constraint scores for the target gene from GnomAD based on loss-of-function intolerance. */
  geneticConstraint: Array<Constraint>;
  /** Genomic location information of the target gene */
  genomicLocation: GenomicLocation;
  /** Hallmarks related to the target gene sourced from COSMIC */
  hallmarks?: Maybe<Hallmarks>;
  /** Homologues of the target gene in other species */
  homologues: Array<Homologue>;
  /** Unique identifier for the target [bioregistry:ensembl] */
  id: Scalars['String']['output'];
  /** Molecular interactions reporting experimental or functional interactions between this target and other molecules. Interactions are integrated from multiple databases capturing physical interactions (e.g., IntAct), directional interactions (e.g., Signor), pathway relationships (e.g., Reactome), or functional interactions (e.g., STRINGdb). */
  interactions?: Maybe<Interactions>;
  /** Flag indicating whether this target is essential based on CRISPR screening data from cancer cell line models. Essential genes are those that show dependency when knocked out in cellular models. */
  isEssential?: Maybe<Scalars['Boolean']['output']>;
  /** Return the list of publications that mention the main entity, alone or in combination with other entities */
  literatureOcurrences: Publications;
  /** Mouse phenotype information linking this human target to observed phenotypes in mouse models. Provides data on phenotypes observed when the target gene is modified in mouse models. */
  mousePhenotypes: Array<MousePhenotype>;
  /** List of name-based synonyms for the target gene */
  nameSynonyms: Array<LabelAndSource>;
  /** List of obsolete names previously used for the target gene */
  obsoleteNames: Array<LabelAndSource>;
  /** List of obsolete symbols previously used for the target gene */
  obsoleteSymbols: Array<LabelAndSource>;
  /** Pathway annotations for the target */
  pathways: Array<ReactomePathway>;
  /** Pharmacogenomics data linking genetic variants affecting this target to drug responses. Data is integrated from sources including ClinPGx and describes how genetic variants influence individual drug responses when targeting this gene product. */
  pharmacogenomics: Array<Pharmacogenomics>;
  /** Target-specific properties used to prioritise targets for further investigation. Prioritisation factors cover several areas around clinical precedence, tractability, do-ability, and safety of the target. Values range from -1 (unfavourable/deprioritised) to 1 (favourable/prioritised). */
  prioritisation?: Maybe<TargetPrioritisation>;
  /** Protein coding coordinates linking variants affecting this target to their amino acid-level consequences in protein products. Describes variant consequences at the protein level including amino acid changes and their positions for this target. */
  proteinCodingCoordinates: ProteinCodingCoordinates;
  /** Protein identifiers associated with the target */
  proteinIds: Array<IdAndSource>;
  /** Known target safety effects and target safety risk information */
  safetyLiabilities: Array<SafetyLiability>;
  /** Return similar labels using a model Word2CVec trained with PubMed */
  similarEntities: Array<Similarity>;
  /** List of subcellular locations where the target protein is found */
  subcellularLocations: Array<LocationAndSource>;
  /** List of symbol-based synonyms for the target gene */
  symbolSynonyms: Array<LabelAndSource>;
  /** List of synonyms for the target gene */
  synonyms: Array<LabelAndSource>;
  /** Target classification categories from ChEMBL */
  targetClass: Array<TargetClass>;
  /** Target Enabling Package (TEP) information */
  tep?: Maybe<Tep>;
  /** Tractability information for the target */
  tractability: Array<Tractability>;
  /** List of Ensembl transcript identifiers associated with the target */
  transcriptIds: Array<Scalars['String']['output']>;
  /** List of transcripts associated with the target including protein and structure annotations */
  transcripts: Array<Transcript>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetAssociatedDiseasesArgs = {
  BFilter?: InputMaybe<Scalars['String']['input']>;
  Bs?: InputMaybe<Array<Scalars['String']['input']>>;
  datasources?: InputMaybe<Array<DatasourceSettingsInput>>;
  enableIndirect?: InputMaybe<Scalars['Boolean']['input']>;
  facetFilters?: InputMaybe<Array<Scalars['String']['input']>>;
  includeMeasurements?: InputMaybe<Scalars['Boolean']['input']>;
  orderByScore?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Pagination>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetCredibleSetsArgs = {
  page?: InputMaybe<Pagination>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetEvidencesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  datasourceIds?: InputMaybe<Array<Scalars['String']['input']>>;
  efoIds: Array<Scalars['String']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetInteractionsArgs = {
  page?: InputMaybe<Pagination>;
  scoreThreshold?: InputMaybe<Scalars['Float']['input']>;
  sourceDatabase?: InputMaybe<InteractionSourceEnum>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetLiteratureOcurrencesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  endMonth?: InputMaybe<Scalars['Int']['input']>;
  endYear?: InputMaybe<Scalars['Int']['input']>;
  startMonth?: InputMaybe<Scalars['Int']['input']>;
  startYear?: InputMaybe<Scalars['Int']['input']>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetProteinCodingCoordinatesArgs = {
  page?: InputMaybe<Pagination>;
};


/** Core annotation for drug targets (gene/proteins). Targets are defined based on EMBL-EBI Ensembl database and uses the Ensembl gene ID as the  primary identifier. An Ensembl gene ID is considered potential drug target if included in the canonical assembly or if present alternative assemblies but encoding for a reviewed protein product according to the UniProt database. */
export type TargetSimilarEntitiesArgs = {
  additionalIds?: InputMaybe<Array<Scalars['String']['input']>>;
  entityNames?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['Int']['input']>;
  threshold?: InputMaybe<Scalars['Float']['input']>;
};

/** Target classification categories from ChEMBL */
export type TargetClass = {
  __typename?: 'TargetClass';
  /** Unique identifier for the target class */
  id: Scalars['Long']['output'];
  /** Label for the target class */
  label: Scalars['String']['output'];
  /** Hierarchical level of the target class */
  level: Scalars['String']['output'];
};

/** Target-specific properties used to prioritise targets for further investigation. Prioritisation factors cover several areas around clinical precedence, tractability, do-ability, and safety of the target. Values range from -1 (unfavourable/deprioritised) to 1 (favourable/prioritised). */
export type TargetPrioritisation = {
  __typename?: 'TargetPrioritisation';
  /** List of key-value pairs representing prioritisation factors */
  items: Array<KeyValuePair>;
};

/** Target Enabling Package (TEP) information */
export type Tep = {
  __typename?: 'Tep';
  /** Description of the TEP target */
  description: Scalars['String']['output'];
  /** Ensembl gene ID for the TEP target */
  name: Scalars['String']['output'];
  /** Therapeutic area associated with the TEP target */
  therapeuticArea: Scalars['String']['output'];
  /** URL linking to more information on the TEP target */
  uri: Scalars['String']['output'];
};

/** Baseline RNA and protein expression data across tissues. This data does not contain raw expression values, instead to shows how targets are selectively expressed across different tissues. This dataset combines expression values from multiple sources including Expression Atlas and Human Protein Atlas. */
export type Tissue = {
  __typename?: 'Tissue';
  /** List of anatomical systems that the biosample can be found in */
  anatomicalSystems: Array<Scalars['String']['output']>;
  /** UBERON id */
  id: Scalars['String']['output'];
  /** Name of the biosample the expression data is from */
  label: Scalars['String']['output'];
  /** List of organs that the biosample can be found in */
  organs: Array<Scalars['String']['output']>;
};

/** Tractability information for the target. Indicates the feasibility of targeting the gene/protein with different therapeutic modalities. */
export type Tractability = {
  __typename?: 'Tractability';
  /** Tractability category label */
  label: Scalars['String']['output'];
  /** Modality of the tractability assessment */
  modality: Scalars['String']['output'];
  /** Tractability value assigned to the target (true indicates tractable) */
  value: Scalars['Boolean']['output'];
};

/** Transcript annotation for a target gene */
export type Transcript = {
  __typename?: 'Transcript';
  /** AlphaFold structure prediction identifier */
  alphafoldId?: Maybe<Scalars['String']['output']>;
  /** Biotype classification of the transcript */
  biotype: Scalars['String']['output'];
  /** Whether this is the Ensembl canonical transcript */
  isEnsemblCanonical?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the UniProt entry is reviewed (Swiss-Prot) */
  isUniprotReviewed?: Maybe<Scalars['Boolean']['output']>;
  /** Ensembl transcript identifier */
  transcriptId: Scalars['String']['output'];
  /** Ensembl translation identifier */
  translationId?: Maybe<Scalars['String']['output']>;
  /** UniProt accession mapped to the transcript */
  uniprotId?: Maybe<Scalars['String']['output']>;
  /** UniProt isoform identifier */
  uniprotIsoformId?: Maybe<Scalars['String']['output']>;
};

/** Predicted consequences of the variant on transcript context */
export type TranscriptConsequence = {
  __typename?: 'TranscriptConsequence';
  /** Amino acid change caused by the variant */
  aminoAcidChange?: Maybe<Scalars['String']['output']>;
  /** Codons affected by the variant */
  codons?: Maybe<Scalars['String']['output']>;
  /** Score indicating the severity of the consequence */
  consequenceScore: Scalars['Float']['output'];
  /** Distance from the variant to the footprint region */
  distanceFromFootprint: Scalars['Int']['output'];
  /** Distance from the variant to the transcription start site */
  distanceFromTss: Scalars['Int']['output'];
  /** Impact assessment of the variant (e.g., HIGH, MODERATE, LOW) */
  impact?: Maybe<Scalars['String']['output']>;
  /** Whether this is the canonical transcript according to Ensembl */
  isEnsemblCanonical: Scalars['Boolean']['output'];
  /** Loss-of-function transcript effect estimator (LOFTEE) prediction */
  lofteePrediction?: Maybe<Scalars['String']['output']>;
  /** PolyPhen score predicting the impact of the variant on protein structure */
  polyphenPrediction?: Maybe<Scalars['Float']['output']>;
  /** SIFT score predicting whether the variant affects protein function */
  siftPrediction?: Maybe<Scalars['Float']['output']>;
  /** The target (gene/protein) associated with the transcript */
  target?: Maybe<Target>;
  /** Ensembl transcript identifier [bioregistry:ensembl] */
  transcriptId?: Maybe<Scalars['String']['output']>;
  /** Index of the transcript */
  transcriptIndex: Scalars['Long']['output'];
  /** UniProt protein accessions for the transcript [bioregistry:uniprot] */
  uniprotAccessions?: Maybe<Array<Scalars['String']['output']>>;
  /** The sequence ontology term of the consequence of the variant based on Ensembl VEP in the context of the transcript */
  variantConsequences: Array<SequenceOntologyTerm>;
};

/** Core variant information for all variants in the Platform. Variants are included if any phenotypic information is available for the variant, including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx. The dataset includes variant metadata as well as variant effects derived from Ensembl VEP. */
export type Variant = {
  __typename?: 'Variant';
  /** The allele frequencies of the variant in different populations */
  alleleFrequencies?: Maybe<Array<AlleleFrequency>>;
  /** The alternate allele for the variant */
  alternateAllele: Scalars['String']['output'];
  /** The chromosome on which the variant is located */
  chromosome: Scalars['String']['output'];
  /** 95% credible sets for GWAS and molQTL studies that contain this variant. Credible sets include all variants in the credible set (locus) as well as the fine-mapping method and derived statistics. */
  credibleSets: CredibleSets;
  /** The list of cross-references for the variant in different databases */
  dbXrefs?: Maybe<Array<DbXref>>;
  /** Regulatory enhancer/promoter regions to gene (target) predictions overlapping with this variant's location. These intervals link regulatory regions to target genes based on experimental data for specific tissues or cell types. */
  enhancerToGenes: EnhancerToGenes;
  /** Target-disease evidence from all data sources where this variant supports the association. Evidence entries report associations between targets (genes or proteins) and diseases or phenotypes, scored according to confidence in the association. */
  evidences: Evidences;
  /** HGVS identifier of the variant */
  hgvsId?: Maybe<Scalars['String']['output']>;
  /** The unique identifier for the variant following schema CHR_POS_REF_ALT for SNPs and short indels (e.g. 1_154453788_C_T) */
  id: Scalars['String']['output'];
  /** The sequence ontology term of the most severe consequence of the variant based on Ensembl VEP */
  mostSevereConsequence?: Maybe<SequenceOntologyTerm>;
  /** Pharmacogenomics data linking this genetic variant to drug responses. Data is integrated from sources including ClinPGx and describes how genetic variants influence individual drug responses. */
  pharmacogenomics: Array<Pharmacogenomics>;
  /** The position on the chromosome of the variant */
  position: Scalars['Int']['output'];
  /** Protein coding coordinates linking this variant to its amino acid-level consequences in protein products. Describes variant consequences at the protein level including amino acid changes and their positions. */
  proteinCodingCoordinates: ProteinCodingCoordinates;
  /** The reference allele for the variant */
  referenceAllele: Scalars['String']['output'];
  /** The list of rsId identifiers for the variant */
  rsIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Predicted consequences on transcript context */
  transcriptConsequences?: Maybe<Array<TranscriptConsequence>>;
  /** Short summary of the variant effect */
  variantDescription: Scalars['String']['output'];
  /** List of predicted or measured effects of the variant based on various methods */
  variantEffect?: Maybe<Array<VariantEffect>>;
};


/** Core variant information for all variants in the Platform. Variants are included if any phenotypic information is available for the variant, including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx. The dataset includes variant metadata as well as variant effects derived from Ensembl VEP. */
export type VariantCredibleSetsArgs = {
  page?: InputMaybe<Pagination>;
  studyTypes?: InputMaybe<Array<StudyTypeEnum>>;
};


/** Core variant information for all variants in the Platform. Variants are included if any phenotypic information is available for the variant, including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx. The dataset includes variant metadata as well as variant effects derived from Ensembl VEP. */
export type VariantEnhancerToGenesArgs = {
  page?: InputMaybe<Pagination>;
};


/** Core variant information for all variants in the Platform. Variants are included if any phenotypic information is available for the variant, including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx. The dataset includes variant metadata as well as variant effects derived from Ensembl VEP. */
export type VariantEvidencesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  datasourceIds?: InputMaybe<Array<Scalars['String']['input']>>;
  size?: InputMaybe<Scalars['Int']['input']>;
};


/** Core variant information for all variants in the Platform. Variants are included if any phenotypic information is available for the variant, including GWAS or molQTL credible sets, ClinVar, Uniprot or ClinPGx. The dataset includes variant metadata as well as variant effects derived from Ensembl VEP. */
export type VariantProteinCodingCoordinatesArgs = {
  page?: InputMaybe<Pagination>;
};

/** Genetic variants influencing individual drug responses. Pharmacogenetics data is integrated from sources including Pharmacogenomics Knowledgebase (PharmGKB). */
export type VariantAnnotation = {
  __typename?: 'VariantAnnotation';
  /** Allele or genotype in the base case. */
  baseAlleleOrGenotype?: Maybe<Scalars['String']['output']>;
  /** Allele or genotype in the comparison case. */
  comparisonAlleleOrGenotype?: Maybe<Scalars['String']['output']>;
  /** Indicates in which direction the genetic variant increases or decreases drug response */
  directionality?: Maybe<Scalars['String']['output']>;
  /** Allele observed effect. */
  effect?: Maybe<Scalars['String']['output']>;
  /** Summary of the impact of the allele on the drug response. */
  effectDescription?: Maybe<Scalars['String']['output']>;
  /** Type of effect. */
  effectType?: Maybe<Scalars['String']['output']>;
  /** Entity affected by the effect. */
  entity?: Maybe<Scalars['String']['output']>;
  /** PubMed identifier (PMID) of the literature entry */
  literature?: Maybe<Scalars['String']['output']>;
};

/** Predicted or measured effect of the variant based on various methods */
export type VariantEffect = {
  __typename?: 'VariantEffect';
  /** Assessment of the variant effect */
  assessment?: Maybe<Scalars['String']['output']>;
  /** Flag indicating the reliability of the assessment */
  assessmentFlag?: Maybe<Scalars['String']['output']>;
  /** Method used to predict or measure the variant effect (e.g. VEP, SIFT, GERP, AlphaMissense, FoldX) */
  method?: Maybe<Scalars['String']['output']>;
  /** Normalised score for the variant effect */
  normalisedScore?: Maybe<Scalars['Float']['output']>;
  /** Score indicating the severity or impact of the variant effect */
  score?: Maybe<Scalars['Float']['output']>;
  /** The target (gene/protein) on which the variant effect is interpreted */
  target?: Maybe<Target>;
};

/** Assays used in the study */
export type Assays = {
  __typename?: 'assays';
  /** Description of the assay */
  description?: Maybe<Scalars['String']['output']>;
  /** Indicating if the assay was positive or negative for the target */
  isHit?: Maybe<Scalars['Boolean']['output']>;
  /** Short name of the assay */
  shortName?: Maybe<Scalars['String']['output']>;
};

/** List of biomarkers associated with evidence */
export type Biomarkers = {
  __typename?: 'biomarkers';
  /** List of gene expression altering biomarkers */
  geneExpression?: Maybe<Array<BiomarkerGeneExpression>>;
  /** List of genetic variation biomarkers */
  geneticVariation?: Maybe<Array<GeneticVariation>>;
};

export type ClinicalIndicationsFromDiseaseImp = {
  __typename?: 'clinicalIndicationsFromDiseaseImp';
  /** Total number of indications results matching the query filters */
  count: Scalars['Long']['output'];
  /** List of clinical indications results between drug-disease pairs */
  rows: Array<ClinicalIndicationFromDisease>;
};

export type ClinicalIndicationsFromDrugImp = {
  __typename?: 'clinicalIndicationsFromDrugImp';
  /** Total number of indications results matching the query filters */
  count: Scalars['Long']['output'];
  /** List of clinical indications results between drug-disease pairs */
  rows: Array<ClinicalIndicationFromDrug>;
};

export type ClinicalTargets = {
  __typename?: 'clinicalTargets';
  /** Total number of clinical targets results matching the query filters */
  count: Scalars['Long']['output'];
  /** List of clinical clinical targets results between drug-target pairs */
  rows: Array<ClinicalTargetFromTarget>;
};

/** List of genetic variation biomarkers */
export type GeneticVariation = {
  __typename?: 'geneticVariation';
  /** Functional consequence identifier of the variant biomarker [bioregistry:so] */
  functionalConsequenceId?: Maybe<SequenceOntologyTerm>;
  /** Variation identifier */
  id?: Maybe<Scalars['String']['output']>;
  /** Name of the variant biomarker */
  name?: Maybe<Scalars['String']['output']>;
};



export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {

  };
}
export type Sdk = ReturnType<typeof getSdk>;
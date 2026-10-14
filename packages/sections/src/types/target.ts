/**
 * Target data interface for widget definitions
 * This provides type safety for the data parameter in hasData functions
 */
export interface TargetData {
  // Bibliography
  literatureOcurrences?: {
    count: number;
  };

  // Cancer Hallmarks
  hallmarks?: {
    cancerHallmarks?: Array<Record<string, unknown>>;
  };

  // Comparative Genomics
  homologues?: Array<Record<string, unknown>>;

  // Pathways
  pathways?: Array<Record<string, unknown>>;

  // Gene Ontology
  geneOntology?: Array<Record<string, unknown>>;

  // DepMap
  depMapEssentiality?: Array<Record<string, unknown>>;

  // Tractability
  tractability?: Array<Record<string, unknown>>;

  // Expression
  expressions?: Array<{
    rna?: {
      level: number;
      value?: string;
    };
    protein?: {
      level: number;
    };
    tissueSiteDetailId?: string;
  }>;

  // Known Drugs
  knownDrugs?: {
    count: number;
    uniqueDrugs: number;
    uniqueDiseases: number;
    freeTextQuery?: string;
  };

  // Mouse Phenotypes
  mousePhenotypes?: Array<Record<string, unknown>>;

  // Molecular Interactions
  molecularInteractions?: Record<string, unknown>;
  interactions?: {
    count: number;
  };

  // Chemical Probes
  chemicalProbes?: Array<Record<string, unknown>>;

  // Molecular Structure
  proteinIds?: Array<{
    id: string;
    source: string;
  }>;

  // Subcellular Location
  subcellularLocations?: Array<Record<string, unknown>>;

  // Genetic Constraint
  geneticConstraint?: Array<Record<string, unknown>>;

  // Safety
  safetyLiabilities?: Array<Record<string, unknown>>;

  // Pharmacogenomics
  pharmacogenomics?: Array<Record<string, unknown>>;

  // Overlapping Variants
  proteinCodingCoordinates?: {
    count: number;
  };
} 
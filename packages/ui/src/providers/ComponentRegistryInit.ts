/**
 * Component Registry Initialization
 * 
 * This module sets up lazy-loading manifests for all section components.
 * Should be called once during app initialization.
 * 
 * Example:
 * ```typescript
 * import { initializeComponentRegistry } from '@packages/ui/src/providers/ComponentRegistryInit';
 * 
 * // In your app initialization code:
 * initializeComponentRegistry();
 * ```
 */

import { registerComponentManifest, ComponentManifest } from './ComponentRegistry';

/**
 * Register all section component manifests
 * This allows lazy-loading of components on-demand
 * 
 * IMPORTANT: IDs use format "entity:sectionId" to handle duplicate section IDs
 * across different entities (e.g., "disease:drugs" vs "drug:drugs" vs "target:drugs")
 */
export const initializeComponentRegistry = () => {
  const manifests = [
    // Disease
    { 
      id: "disease:ontology", 
      path: "disease/Ontology", 
      type: "disease" as const,
      exportName: "default"
    },
    { 
      id: "disease:phenotypes", 
      path: "disease/Phenotypes", 
      type: "disease" as const,
      exportName: "default"
    },
    { 
      id: "disease:bibliography", 
      path: "disease/Bibliography", 
      type: "disease" as const,
      exportName: "default"
    },
    { 
      id: "disease:drugs", 
      path: "disease/Drugs", 
      type: "disease" as const,
      exportName: "default"
    },
    { 
      id: "disease:GWASStudies", 
      path: "disease/GWASStudies", 
      type: "disease" as const,
      exportName: "default"
    },

    // Drug
    { 
      id: "drug:mechanismsOfAction", 
      path: "drug/MechanismsOfAction", 
      type: "drug" as const,
      exportName: "default"
    },
    { 
      id: "drug:adverseEvents", 
      path: "drug/AdverseEvents", 
      type: "drug" as const,
      exportName: "default"
    },
    { 
      id: "drug:drugWarnings", 
      path: "drug/DrugWarnings", 
      type: "drug" as const,
      exportName: "default"
    },
    { 
      id: "drug:Indications", 
      path: "drug/Indications", 
      type: "drug" as const,
      exportName: "default"
    },
    { 
      id: "drug:pharmacogenetics", 
      path: "drug/Pharmacogenomics", 
      type: "drug" as const,
      exportName: "default"
    },
    { 
      id: "drug:bibliography", 
      path: "drug/Bibliography", 
      type: "drug" as const,
      exportName: "default"
    },

    // Target
    { 
      id: "target:expressions", 
      path: "target/Expression", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:baselineExpression", 
      path: "target/BaselineExpression", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:drugs", 
      path: "target/Drugs", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:interactions", 
      path: "target/MolecularInteractions", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:pathways", 
      path: "target/Pathways", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:safety", 
      path: "target/Safety", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:tractability", 
      path: "target/Tractability", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:pharmacogenetics", 
      path: "target/Pharmacogenomics", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:qtl_credible_sets", 
      path: "target/QTLCredibleSets", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:cancerHallmarks", 
      path: "target/CancerHallmarks", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:compGenomics", 
      path: "target/ComparativeGenomics", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:subcellularLocation", 
      path: "target/SubcellularLocation", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:chemicalProbes", 
      path: "target/ChemicalProbes", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:depMapEssentiality", 
      path: "target/DepMap", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:geneOntology", 
      path: "target/GeneOntology", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:geneticConstraint", 
      path: "target/GeneticConstraint", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:molecularStructure", 
      path: "target/MolecularStructure", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:mousePhenotypes", 
      path: "target/MousePhenotypes", 
      type: "target" as const,
      exportName: "default"
    },
    { 
      id: "target:bibliography", 
      path: "target/Bibliography", 
      type: "target" as const,
      exportName: "default"
    },

    // Variant
    { 
      id: "variant:Enhancer_to_gene_predictions", 
      path: "variant/EnhancerToGenePredictions", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:qtl_credible_sets", 
      path: "variant/QTLCredibleSets", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:eva", 
      path: "variant/EVA", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:gwas_credible_sets", 
      path: "variant/GWASCredibleSets", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:molecular_structure", 
      path: "variant/MolecularStructure", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:pharmacogenetics", 
      path: "variant/Pharmacogenomics", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:uniprot_variants", 
      path: "variant/UniProtVariants", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:in_silico_predictors", 
      path: "variant/VariantEffect", 
      type: "variant" as const,
      exportName: "default"
    },
    { 
      id: "variant:variant_effect_predictor", 
      path: "variant/VariantEffectPredictor", 
      type: "variant" as const,
      exportName: "default"
    },

    // Study
    { 
      id: "study:gwas_credible_sets", 
      path: "study/GWASCredibleSets", 
      type: "study" as const,
      exportName: "default"
    },
    { 
      id: "study:qtl_credible_sets", 
      path: "study/QTLCredibleSets", 
      type: "study" as const,
      exportName: "default"
    },
    { 
      id: "study:shared_trait_studies", 
      path: "study/SharedTraitStudies", 
      type: "study" as const,
      exportName: "default"
    },

    // CredibleSet
    { 
      id: "credibleSet:gwas_coloc", 
      path: "credibleSet/GWASColoc", 
      type: "credibleSet" as const,
      exportName: "default"
    },
    { 
      id: "credibleSet:molqtl_coloc", 
      path: "credibleSet/MolQTLColoc", 
      type: "credibleSet" as const,
      exportName: "default"
    },
    { 
      id: "credibleSet:locus2gene", 
      path: "credibleSet/Locus2Gene", 
      type: "credibleSet" as const,
      exportName: "default"
    },
    { 
      id: "credibleSet:Enhancer_to_gene_predictions", 
      path: "credibleSet/EnhancerToGenePredictions", 
      type: "credibleSet" as const,
      exportName: "default"
    },
    { 
      id: "credibleSet:variants", 
      path: "credibleSet/Variants", 
      type: "credibleSet" as const,
      exportName: "default"
    },
  ];

  // Register all manifests
  manifests.forEach(manifest => {
    registerComponentManifest(manifest);
  });

  console.log(`Initialized component registry with ${manifests.length} components`);
};

/**
 * Get list of all registered component IDs
 * Useful for debugging and manifest exports
 */
export const getRegisteredComponentIds = (): string[] => {
  return [
    // Disease
    "ontology",
    "phenotypes",
    "bibliography",
    "drugs",
    "GWASStudies",
    // Drug
    "mechanismsOfAction",
    "adverseEvents",
    "drugWarnings",
    "Indications",
    "pharmacogenetics",
    // Target
    "expressions",
    "baselineExpression",
    "interactions",
    "pathways",
    "safety",
    "tractability",
    "qtl_credible_sets",
    "cancerHallmarks",
    "compGenomics",
    "subcellularLocation",
    "chemicalProbes",
    "depMapEssentiality",
    "geneOntology",
    "geneticConstraint",
    "molecularStructure",
    "mousePhenotypes",
    // Variant
    "Enhancer_to_gene_predictions",
    "eva",
    "gwas_credible_sets",
    "molecular_structure",
    "uniprot_variants",
    "in_silico_predictors",
    "variant_effect_predictor",
    // Study
    "shared_trait_studies",
    // CredibleSet
    "gwas_coloc",
    "molqtl_coloc",
    "locus2gene",
    "variants",
  ];
};

/**
 * Register a single manifest
 * Useful if you want to add custom components to the registry
 */
export const addComponentToRegistry = (
  id: string,
  path: string,
  type: ComponentManifest["type"],
  exportName: string = "default"
) => {
  registerComponentManifest({ id, path, type, exportName });
};

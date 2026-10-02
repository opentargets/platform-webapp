/**
 * Register all section components with the UI Report Builder
 * 
 * This file imports all section definitions and body components,
 * making them available for lazy-loading and report building.
 * 
 * Called during app initialization to populate the component registry.
 */

import { getSectionComponent, registerSectionComponent } from "ui";

// Disease sections
import * as DiseaseOntology from "./disease/Ontology";
import * as DiseasePhenotypes from "./disease/Phenotypes";
import * as DiseaseBibliography from "./disease/Bibliography";
import * as DiseaseDrugs from "./disease/Drugs";
import * as DiseaseGWASStudies from "./disease/GWASStudies";
import * as DiseaseOTProjects from "./disease/OTProjects";

// Drug sections
import * as DrugMechanismsOfAction from "./drug/MechanismsOfAction";
import * as DrugAdverseEvents from "./drug/AdverseEvents";
import * as DrugDrugWarnings from "./drug/DrugWarnings";
import * as DrugIndications from "./drug/Indications";
import * as DrugPharmacogenomics from "./drug/Pharmacogenomics";
import * as DrugBibliography from "./drug/Bibliography";

// Target sections

import * as TargetBaselineExpression from "./target/BaselineExpression";
import * as TargetDrugs from "./target/Drugs";
import * as TargetMolecularInteractions from "./target/MolecularInteractions";
import * as TargetPathways from "./target/Pathways";
import * as TargetSafety from "./target/Safety";
import * as TargetTractability from "./target/Tractability";
import * as TargetPharmacogenomics from "./target/Pharmacogenomics";
import * as TargetQTLCredibleSets from "./target/QTLCredibleSets";
import * as TargetCancerHallmarks from "./target/CancerHallmarks";
import * as TargetComparativeGenomics from "./target/ComparativeGenomics";
import * as TargetSubcellularLocation from "./target/SubcellularLocation";
import * as TargetChemicalProbes from "./target/ChemicalProbes";
import * as TargetDepMap from "./target/DepMap";
import * as TargetGeneOntology from "./target/GeneOntology";
import * as TargetGeneticConstraint from "./target/GeneticConstraint";
import * as TargetMolecularStructure from "./target/MolecularStructure";
import * as TargetMousePhenotypes from "./target/MousePhenotypes";
import * as TargetBibliography from "./target/Bibliography";
import * as TargetOverlappingVariants from "./target/OverlappingVariants";
import * as TargetGenomicRegion from "./target/TargetGenomicRegion";

// Variant sections
import * as VariantEnhancerToGenePredictions from "./variant/EnhancerToGenePredictions";
import * as VariantQTLCredibleSets from "./variant/QTLCredibleSets";
import * as VariantEVA from "./variant/EVA";
import * as VariantGWASCredibleSets from "./variant/GWASCredibleSets";
import * as VariantMolecularStructure from "./variant/MolecularStructure";
import * as VariantPharmacogenomics from "./variant/Pharmacogenomics";
import * as VariantUniProtVariants from "./variant/UniProtVariants";
import * as VariantVariantEffect from "./variant/VariantEffect";
import * as VariantVariantEffectPredictor from "./variant/VariantEffectPredictor";
import * as VariantGenomicRegion from "./variant/VariantGenomicRegion";

// Study sections
import * as StudyGWASCredibleSets from "./study/GWASCredibleSets";
import * as StudyQTLCredibleSets from "./study/QTLCredibleSets";
import * as StudySharedTraitStudies from "./study/SharedTraitStudies";

// CredibleSet sections
import * as CredibleSetGWASColoc from "./credibleSet/GWASColoc";
import * as CredibleSetMolQTLColoc from "./credibleSet/MolQTLColoc";
import * as CredibleSetLocus2Gene from "./credibleSet/Locus2Gene";
import * as CredibleSetEnhancerToGenePredictions from "./credibleSet/EnhancerToGenePredictions";
import * as CredibleSetVariants from "./credibleSet/Variants";
import * as CredibleSetGenomicRegion from "./credibleSet/CredibleSetGenomicRegion";

// Evidence sections
import * as EvidenceCRISPR from "./evidence/CRISPR";
import * as EvidenceCRISPRScreen from "./evidence/CRISPRScreen";
import * as EvidenceGWASCredibleSets from "./evidence/GWASCredibleSets";
import * as EvidenceClinGen from "./evidence/ClinGen";
import * as EvidenceOTCRISPR from "./evidence/OTCRISPR";
import * as EvidenceImpc from "./evidence/Impc";
import * as EvidenceEVA from "./evidence/EVA";
import * as EvidenceUniProtVariants from "./evidence/UniProtVariants";
import * as EvidenceCancerGeneCensus from "./evidence/CancerGeneCensus";
import * as EvidenceCancerBiomarkers from "./evidence/CancerBiomarkers";
import * as EvidenceOTEncore from "./evidence/OTEncore";
import * as EvidenceOTValidation from "./evidence/OTValidation";
import * as EvidenceGenomicsEngland from "./evidence/GenomicsEngland";
import * as EvidenceOrphanet from "./evidence/Orphanet";
import * as EvidenceUniProtLiterature from "./evidence/UniProtLiterature";
import * as EvidenceExpressionAtlas from "./evidence/ExpressionAtlas";
import * as EvidenceEVASomatic from "./evidence/EVASomatic";
import * as EvidenceEuropePmc from "./evidence/EuropePmc";
import * as EvidenceGeneBurden from "./evidence/GeneBurden";
import * as EvidenceGene2Phenotype from "./evidence/Gene2Phenotype";
import * as EvidenceIntOgen from "./evidence/IntOgen";
import * as EvidenceReactome from "./evidence/Reactome";
import * as EvidenceClinicalPrecedence from "./evidence/ClinicalPrecedence";


/**
 * Register all sections
 * Call this once during app initialization before any reports load
 */
export const registerAllSections = () => {
  const registrations = [
    // Disease
    { entity: "disease", definition: DiseaseOntology.definition, getBodyComponent: DiseaseOntology.getBodyComponent },
    { entity: "disease", definition: DiseasePhenotypes.definition, getBodyComponent: DiseasePhenotypes.getBodyComponent },
    { entity: "disease", definition: DiseaseBibliography.definition, getBodyComponent: DiseaseBibliography.getBodyComponent, exportAdapter: DiseaseBibliography.exportAdapter },
    { entity: "disease", definition: DiseaseDrugs.definition, getBodyComponent: DiseaseDrugs.getBodyComponent },
    // Its SectionItem uses entity "studies" (its data is `data.studies`), so that's the key it's saved under
    { entity: "studies", definition: DiseaseGWASStudies.definition, getBodyComponent: DiseaseGWASStudies.getBodyComponent },
    { entity: "disease", definition: DiseaseOTProjects.definition, getBodyComponent: DiseaseOTProjects.getBodyComponent },


    // Drug
    { entity: "drug", definition: DrugMechanismsOfAction.definition, getBodyComponent: DrugMechanismsOfAction.getBodyComponent },
    { entity: "drug", definition: DrugAdverseEvents.definition, getBodyComponent: DrugAdverseEvents.getBodyComponent },
    { entity: "drug", definition: DrugDrugWarnings.definition, getBodyComponent: DrugDrugWarnings.getBodyComponent },
    { entity: "drug", definition: DrugIndications.definition, getBodyComponent: DrugIndications.getBodyComponent },
    { entity: "drug", definition: DrugPharmacogenomics.definition, getBodyComponent: DrugPharmacogenomics.getBodyComponent },
    { entity: "drug", definition: DrugBibliography.definition, getBodyComponent: DrugBibliography.getBodyComponent, exportAdapter: DrugBibliography.exportAdapter },

    // Target
    { entity: "target", definition: TargetBaselineExpression.definition, getBodyComponent: TargetBaselineExpression.getBodyComponent },
    { entity: "target", definition: TargetDrugs.definition, getBodyComponent: TargetDrugs.getBodyComponent },
    { entity: "target", definition: TargetMolecularInteractions.definition, getBodyComponent: TargetMolecularInteractions.getBodyComponent },
    { entity: "target", definition: TargetPathways.definition, getBodyComponent: TargetPathways.getBodyComponent },
    { entity: "target", definition: TargetSafety.definition, getBodyComponent: TargetSafety.getBodyComponent },
    { entity: "target", definition: TargetTractability.definition, getBodyComponent: TargetTractability.getBodyComponent },
    { entity: "target", definition: TargetPharmacogenomics.definition, getBodyComponent: TargetPharmacogenomics.getBodyComponent },
    { entity: "target", definition: TargetQTLCredibleSets.definition, getBodyComponent: TargetQTLCredibleSets.getBodyComponent },
    { entity: "target", definition: TargetCancerHallmarks.definition, getBodyComponent: TargetCancerHallmarks.getBodyComponent },
    { entity: "target", definition: TargetComparativeGenomics.definition, getBodyComponent: TargetComparativeGenomics.getBodyComponent },
    { entity: "target", definition: TargetSubcellularLocation.definition, getBodyComponent: TargetSubcellularLocation.getBodyComponent },
    { entity: "target", definition: TargetChemicalProbes.definition, getBodyComponent: TargetChemicalProbes.getBodyComponent },
    { entity: "target", definition: TargetDepMap.definition, getBodyComponent: TargetDepMap.getBodyComponent },
    { entity: "target", definition: TargetGeneOntology.definition, getBodyComponent: TargetGeneOntology.getBodyComponent },
    { entity: "target", definition: TargetGeneticConstraint.definition, getBodyComponent: TargetGeneticConstraint.getBodyComponent },
    { entity: "target", definition: TargetMolecularStructure.definition, getBodyComponent: TargetMolecularStructure.getBodyComponent },
    { entity: "target", definition: TargetMousePhenotypes.definition, getBodyComponent: TargetMousePhenotypes.getBodyComponent },
    { entity: "target", definition: TargetBibliography.definition, getBodyComponent: TargetBibliography.getBodyComponent, exportAdapter: TargetBibliography.exportAdapter },
    { entity: "target", definition: TargetOverlappingVariants.definition, getBodyComponent: TargetOverlappingVariants.getBodyComponent },
    { entity: "target", definition: TargetGenomicRegion.definition, getBodyComponent: TargetGenomicRegion.getBodyComponent },

    // Variant
    { entity: "variant", definition: VariantEnhancerToGenePredictions.definition, getBodyComponent: VariantEnhancerToGenePredictions.getBodyComponent },
    { entity: "variant", definition: VariantQTLCredibleSets.definition, getBodyComponent: VariantQTLCredibleSets.getBodyComponent },
    { entity: "variant", definition: VariantEVA.definition, getBodyComponent: VariantEVA.getBodyComponent },
    { entity: "variant", definition: VariantGWASCredibleSets.definition, getBodyComponent: VariantGWASCredibleSets.getBodyComponent },
    { entity: "variant", definition: VariantMolecularStructure.definition, getBodyComponent: VariantMolecularStructure.getBodyComponent },
    { entity: "variant", definition: VariantPharmacogenomics.definition, getBodyComponent: VariantPharmacogenomics.getBodyComponent },
    { entity: "variant", definition: VariantUniProtVariants.definition, getBodyComponent: VariantUniProtVariants.getBodyComponent },
    { entity: "variant", definition: VariantVariantEffect.definition, getBodyComponent: VariantVariantEffect.getBodyComponent },
    { entity: "variant", definition: VariantVariantEffectPredictor.definition, getBodyComponent: VariantVariantEffectPredictor.getBodyComponent },
    { entity: "variant", definition: VariantGenomicRegion.definition, getBodyComponent: VariantGenomicRegion.getBodyComponent },

    // Study
    { entity: "study", definition: StudyGWASCredibleSets.definition, getBodyComponent: StudyGWASCredibleSets.getBodyComponent },
    { entity: "study", definition: StudyQTLCredibleSets.definition, getBodyComponent: StudyQTLCredibleSets.getBodyComponent },
    // Its SectionItem uses entity "sharedTraitStudies", so that's the key it's saved under
    { entity: "sharedTraitStudies", definition: StudySharedTraitStudies.definition, getBodyComponent: StudySharedTraitStudies.getBodyComponent },

    // CredibleSet
    { entity: "credibleSet", definition: CredibleSetGWASColoc.definition, getBodyComponent: CredibleSetGWASColoc.getBodyComponent },
    { entity: "credibleSet", definition: CredibleSetMolQTLColoc.definition, getBodyComponent: CredibleSetMolQTLColoc.getBodyComponent },
    { entity: "credibleSet", definition: CredibleSetLocus2Gene.definition, getBodyComponent: CredibleSetLocus2Gene.getBodyComponent },
    { entity: "credibleSet", definition: CredibleSetEnhancerToGenePredictions.definition, getBodyComponent: CredibleSetEnhancerToGenePredictions.getBodyComponent },
    { entity: "credibleSet", definition: CredibleSetVariants.definition, getBodyComponent: CredibleSetVariants.getBodyComponent },
    { entity: "credibleSet", definition: CredibleSetGenomicRegion.definition, getBodyComponent: CredibleSetGenomicRegion.getBodyComponent },

    // Evidence: the evidence page and the associations table mount these with entity "disease",
    // and a report section is looked up by the entity its SectionItem was given
    { entity: "disease", definition: EvidenceCRISPR.definition, getBodyComponent: EvidenceCRISPR.getBodyComponent },
    { entity: "disease", definition: EvidenceCRISPRScreen.definition, getBodyComponent: EvidenceCRISPRScreen.getBodyComponent },
    { entity: "disease", definition: EvidenceGWASCredibleSets.definition, getBodyComponent: EvidenceGWASCredibleSets.getBodyComponent },
    { entity: "disease", definition: EvidenceClinGen.definition, getBodyComponent: EvidenceClinGen.getBodyComponent },
    { entity: "disease", definition: EvidenceOTCRISPR.definition, getBodyComponent: EvidenceOTCRISPR.getBodyComponent },
    { entity: "disease", definition: EvidenceImpc.definition, getBodyComponent: EvidenceImpc.getBodyComponent },
    { entity: "disease", definition: EvidenceEVA.definition, getBodyComponent: EvidenceEVA.getBodyComponent },
    { entity: "disease", definition: EvidenceUniProtVariants.definition, getBodyComponent: EvidenceUniProtVariants.getBodyComponent },
    { entity: "disease", definition: EvidenceCancerGeneCensus.definition, getBodyComponent: EvidenceCancerGeneCensus.getBodyComponent },
    { entity: "disease", definition: EvidenceCancerBiomarkers.definition, getBodyComponent: EvidenceCancerBiomarkers.getBodyComponent },
    { entity: "disease", definition: EvidenceOTEncore.definition, getBodyComponent: EvidenceOTEncore.getBodyComponent },
    { entity: "disease", definition: EvidenceOTValidation.definition, getBodyComponent: EvidenceOTValidation.getBodyComponent },
    { entity: "disease", definition: EvidenceGenomicsEngland.definition, getBodyComponent: EvidenceGenomicsEngland.getBodyComponent },
    { entity: "disease", definition: EvidenceOrphanet.definition, getBodyComponent: EvidenceOrphanet.getBodyComponent },
    { entity: "disease", definition: EvidenceUniProtLiterature.definition, getBodyComponent: EvidenceUniProtLiterature.getBodyComponent },
    { entity: "disease", definition: EvidenceExpressionAtlas.definition, getBodyComponent: EvidenceExpressionAtlas.getBodyComponent },
    { entity: "disease", definition: EvidenceEVASomatic.definition, getBodyComponent: EvidenceEVASomatic.getBodyComponent },
    { entity: "disease", definition: EvidenceEuropePmc.definition, getBodyComponent: EvidenceEuropePmc.getBodyComponent, exportAdapter: EvidenceEuropePmc.exportAdapter },
    { entity: "disease", definition: EvidenceGeneBurden.definition, getBodyComponent: EvidenceGeneBurden.getBodyComponent },
    { entity: "disease", definition: EvidenceGene2Phenotype.definition, getBodyComponent: EvidenceGene2Phenotype.getBodyComponent },
    { entity: "disease", definition: EvidenceIntOgen.definition, getBodyComponent: EvidenceIntOgen.getBodyComponent },
    { entity: "disease", definition: EvidenceReactome.definition, getBodyComponent: EvidenceReactome.getBodyComponent },
    { entity: "disease", definition: EvidenceClinicalPrecedence.definition, getBodyComponent: EvidenceClinicalPrecedence.getBodyComponent },
  ];

  // Register each component with the composite ID format "entity:sectionId"
  registrations.forEach((registration) => {
    const { entity, definition, getBodyComponent } = registration;
    const exportAdapter = "exportAdapter" in registration ? registration.exportAdapter : undefined;
    const compositeId = `${entity}:${definition.id}`;
    // Keys are entity + section id; a second section with the same key would silently replace the first
    if (getSectionComponent(compositeId)) console.warn(`Section "${compositeId}" is registered twice`);
    const Body = getBodyComponent();
    
    // Add entity field to definition for storage/reconstruction
    const definitionWithEntity = { ...definition, entity } as any;
    
    registerSectionComponent(compositeId, Body, definitionWithEntity, exportAdapter);
  });

  console.log(`Registered ${registrations.length} section components`);
};

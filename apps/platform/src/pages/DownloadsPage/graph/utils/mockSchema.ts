/**
 * Mock graph data for development and testing
 * Represents 56 Open Targets datasets with foreign key relationships
 */

interface NodeData {
  id: string;
  label: string;
  type: 'core' | 'evidence' | 'attribute';
}

interface EdgeData {
  id?: string;
  source: string;
  target: string;
}

interface CytoscapeNode {
  data: NodeData;
}

interface CytoscapeEdge {
  data: EdgeData;
}

interface GraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export const getMockGraphData = (): GraphData => {
  const coreEntities: NodeData[] = [
    { id: 'target', label: 'Target', type: 'core' },
    { id: 'disease', label: 'Disease', type: 'core' },
    { id: 'drug', label: 'Drug', type: 'core' },
    { id: 'variant', label: 'Variant', type: 'core' },
    { id: 'study', label: 'Study', type: 'core' },
  ];

  const evidenceDatasets: NodeData[] = [
    { id: 'crispr', label: 'CRISPR Screen Evidence', type: 'evidence' },
    { id: 'clinvar', label: 'ClinVar Germline Evidence', type: 'evidence' },
    { id: 'chembl_mech', label: 'ChEMBL Mechanism of Action', type: 'evidence' },
    { id: 'literature', label: 'Literature (EuropePMC)', type: 'evidence' },
    { id: 'orphanet', label: 'Orphanet Evidence', type: 'evidence' },
    { id: 'gene_ontology', label: 'Gene Ontology', type: 'evidence' },
    { id: 'proj_score', label: 'ProjectScore', type: 'evidence' },
    { id: 'clingen', label: 'ClinGen Haploinsufficiency', type: 'evidence' },
    { id: 'intogen', label: 'IntOGen Mutations', type: 'evidence' },
    { id: 'impc', label: 'IMPC Phenotypes', type: 'evidence' },
    { id: 'eva', label: 'EVA Somatic Variants', type: 'evidence' },
    { id: 'open_targets_genetics', label: 'Open Targets Genetics', type: 'evidence' },
    { id: 'reactome', label: 'Reactome Pathways', type: 'evidence' },
    { id: 'cosmic', label: 'COSMIC Mutations', type: 'evidence' },
    { id: 'expression_atlas', label: 'Expression Atlas', type: 'evidence' },
    { id: 'gwas_catalog', label: 'GWAS Catalog', type: 'evidence' },
    { id: 'interaction', label: 'Protein Interactions', type: 'evidence' },
    { id: 'hpo', label: 'Human Phenotype Ontology', type: 'evidence' },
    { id: 'uber_pheno', label: 'Uberon Phenotypes', type: 'evidence' },
    { id: 'target_safety', label: 'Target Safety Data', type: 'evidence' },
  ];

  const attributes: NodeData[] = [
    { id: 'seq_ontology', label: 'Sequence Ontology', type: 'attribute' },
    { id: 'mondo', label: 'MONDO Ontology', type: 'attribute' },
    { id: 'ensembl', label: 'Ensembl Reference', type: 'attribute' },
    { id: 'uniprot', label: 'UniProt', type: 'attribute' },
    { id: 'chembl', label: 'ChEMBL', type: 'attribute' },
    { id: 'pubchem', label: 'PubChem', type: 'attribute' },
    { id: 'mim', label: 'MIM/OMIM', type: 'attribute' },
    { id: 'ncbi', label: 'NCBI Gene', type: 'attribute' },
    { id: 'wormbase', label: 'WormBase', type: 'attribute' },
    { id: 'flybase', label: 'FlyBase', type: 'attribute' },
  ];

  const allNodes = [...coreEntities, ...evidenceDatasets, ...attributes];

  // Define edges (foreign key relationships)
  const edges: EdgeData[] = [
    // CRISPR Evidence -> Core entities
    { source: 'crispr', target: 'target' },
    { source: 'crispr', target: 'study' },

    // ClinVar -> Core entities
    { source: 'clinvar', target: 'target' },
    { source: 'clinvar', target: 'variant' },

    // ChEMBL Mechanism -> Core entities
    { source: 'chembl_mech', target: 'target' },
    { source: 'chembl_mech', target: 'drug' },

    // Literature -> Core entities
    { source: 'literature', target: 'target' },
    { source: 'literature', target: 'disease' },

    // Orphanet -> Core entities
    { source: 'orphanet', target: 'disease' },
    { source: 'orphanet', target: 'target' },

    // Gene Ontology -> Target
    { source: 'gene_ontology', target: 'target' },

    // ProjectScore -> Target
    { source: 'proj_score', target: 'target' },

    // ClinGen -> Variant
    { source: 'clingen', target: 'variant' },
    { source: 'clingen', target: 'target' },

    // IntOGen -> Target
    { source: 'intogen', target: 'target' },

    // IMPC -> Disease
    { source: 'impc', target: 'disease' },
    { source: 'impc', target: 'target' },

    // EVA -> Variant
    { source: 'eva', target: 'variant' },

    // Open Targets Genetics -> Disease, Target
    { source: 'open_targets_genetics', target: 'disease' },
    { source: 'open_targets_genetics', target: 'target' },

    // Reactome -> Target
    { source: 'reactome', target: 'target' },

    // COSMIC -> Target, Variant
    { source: 'cosmic', target: 'target' },
    { source: 'cosmic', target: 'variant' },

    // Expression Atlas -> Target
    { source: 'expression_atlas', target: 'target' },

    // GWAS Catalog -> Study, Disease, Target
    { source: 'gwas_catalog', target: 'study' },
    { source: 'gwas_catalog', target: 'disease' },
    { source: 'gwas_catalog', target: 'target' },

    // Protein Interactions -> Target
    { source: 'interaction', target: 'target' },

    // HPO -> Disease
    { source: 'hpo', target: 'disease' },

    // Uberon -> Disease
    { source: 'uber_pheno', target: 'disease' },

    // Target Safety -> Target
    { source: 'target_safety', target: 'target' },

    // Attributes linking to core entities
    { source: 'target', target: 'ensembl' },
    { source: 'target', target: 'uniprot' },
    { source: 'target', target: 'ncbi' },
    { source: 'drug', target: 'chembl' },
    { source: 'drug', target: 'pubchem' },
    { source: 'disease', target: 'mondo' },
    { source: 'disease', target: 'mim' },
    { source: 'variant', target: 'seq_ontology' },
  ];

  return {
    nodes: allNodes.map((node) => ({
      data: { ...node },
    })),
    edges: edges.map((edge, idx) => ({
      data: { id: `edge-${idx}`, ...edge },
    })),
  };
};

export default getMockGraphData;

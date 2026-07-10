# MCP Widgets Server — Architecture & Widget Registry

## Directory Structure

```
apps/mcp-widgets-server/
├── src/                        # Server-side Node.js code (runs in Claude Desktop / MCP host)
│   ├── sections/
│   │   └── registry.ts         # Single source of truth: all section widget definitions
│   ├── widgets/
│   │   ├── index.ts            # Widget registry builder + sectionPathToId utility
│   │   ├── molecular-structure.ts  # Manual widget def (AlphaFold 3D viewer)
│   │   └── types.ts            # WidgetDef type, makeWidgetShell, toAnthropicTool
│   ├── mcp-server.ts           # MCP tool + resource registration, GraphQL prefetch
│   ├── chat.ts                 # Chat workspace HTTP handler
│   ├── index.ts                # Server entrypoint
│   ├── otp-client.ts           # OT GraphQL client helpers
│   └── stdio.ts                # stdio MCP transport
│
├── widget-src/                 # Browser-side React code (compiled to IIFE bundles)
│   ├── molecular-structure/    # Custom 3D viewer React app (only custom widget entry)
│   └── shared/
│       ├── createWidgetEntry.tsx  # mountWidget() — React root bootstrapper for all widgets
│       └── stubs/
│           ├── ui-index.tsx    # Stub replacements for @ot/ui barrel (used by all section widgets)
│           └── ui-ms-index.tsx # Stub/real mix for molecular-structure widget (includes real Viewer providers)
│
└── vite/                       # Build tooling
    ├── widget.config.base.ts   # Shared Vite config factory + Vite plugins
    ├── section-widget.plugin.ts # Auto-generates entry code + Vite config for section widgets
    └── widget.config.ms.ts     # Custom Vite config for molecular-structure widget
```

### `src/` vs `widget-src/` — the key distinction

| | `src/` | `widget-src/` |
|---|---|---|
| **Runs in** | Node.js (server / MCP host) | Browser (iframe inside Claude Desktop) |
| **Purpose** | Registers MCP tools, fetches GraphQL data server-side, serves widget HTML | React components compiled into self-contained IIFE bundles |
| **Output** | Running MCP server process | `dist/widgets/*.js` IIFE bundle files |
| **Build tool** | `tsx` (TypeScript execution) | Vite (browser bundle) |

When Claude calls an MCP tool, `src/mcp-server.ts` runs the GraphQL prefetch and returns data
via `_meta.prefetchedData`. The widget HTML shell (with the bundle inlined) renders in an iframe,
and a `postMessage` interceptor delivers the prefetched data to Apollo without any live network
requests from the widget.

---

## How to add a new section widget

1. Add an entry to `src/sections/registry.ts`
2. Run `yarn build:widgets:<entity>` (or `yarn build:widgets:sections` for all)
3. Restart Claude Desktop

For sections where the GQL query variable does not match the input param name (or that need a
two-step prefetch), use `primaryPrefetch` and/or `extraPrefetches` in the `SectionDef`.

---

## Included section widgets (61 total)

### Target (14 sections)

| Tool name | Section | Input |
|-----------|---------|-------|
| `get_target_cancer_hallmarks_widget` | `target/CancerHallmarks` | `ensemblId` |
| `get_target_chemical_probes_widget` | `target/ChemicalProbes` | `ensemblId` |
| `get_target_comparative_genomics_widget` | `target/ComparativeGenomics` | `ensemblId` |
| `get_target_depmap_widget` | `target/DepMap` | `ensemblId` |
| `get_target_drugs_widget` | `target/Drugs` | `ensemblId` |
| `get_target_expression_widget` | `target/Expression` | `ensemblId` |
| `get_target_gene_ontology_widget` | `target/GeneOntology` | `ensemblId` |
| `get_target_genetic_constraint_widget` | `target/GeneticConstraint` | `ensemblId` |
| `get_target_mouse_phenotypes_widget` | `target/MousePhenotypes` | `ensemblId` |
| `get_target_pathways_widget` | `target/Pathways` | `ensemblId` |
| `get_target_pharmacogenomics_widget` | `target/Pharmacogenomics` | `ensemblId` |
| `get_target_qtl_credible_sets_widget` | `target/QTLCredibleSets` | `ensemblId` |
| `get_target_safety_widget` | `target/Safety` | `ensemblId` |
| `get_target_tractability_widget` | `target/Tractability` | `ensemblId` |

### Disease (4 sections)

| Tool name | Section | Input |
|-----------|---------|-------|
| `get_disease_drugs_widget` | `disease/Drugs` | `efoId` |
| `get_disease_ot_projects_widget` | `disease/OTProjects` | `efoId` |
| `get_disease_ontology_widget` | `disease/Ontology` | `efoId` |
| `get_disease_phenotypes_widget` | `disease/Phenotypes` | `efoId` |

### Drug (5 sections)

| Tool name | Section | Input | Notes |
|-----------|---------|-------|-------|
| `get_drug_adverse_events_widget` | `drug/AdverseEvents` | `chemblId` | |
| `get_drug_indications_widget` | `drug/ClinicalIndications` | `chemblId` | Two-query: indications + `ClinicalRecordsQuery` (filtered on row click) |
| `get_drug_warnings_widget` | `drug/DrugWarnings` | `chemblId` | |
| `get_drug_mechanisms_of_action_widget` | `drug/MechanismsOfAction` | `chemblId` | |
| `get_drug_pharmacogenomics_widget` | `drug/Pharmacogenomics` | `chemblId` | |

### Evidence (20 sections)

| Tool name | Section | Input |
|-----------|---------|-------|
| `get_evidence_crispr_widget` | `evidence/CRISPR` | `ensemblId` + `efoId` |
| `get_evidence_crispr_screen_widget` | `evidence/CRISPRScreen` | `ensemblId` + `efoId` |
| `get_evidence_cancer_biomarkers_widget` | `evidence/CancerBiomarkers` | `ensemblId` + `efoId` |
| `get_evidence_cancer_gene_census_widget` | `evidence/CancerGeneCensus` | `ensemblId` + `efoId` |
| `get_evidence_chembl_widget` | `evidence/Chembl` | `ensemblId` + `efoId` |
| `get_evidence_clingen_widget` | `evidence/ClinGen` | `ensemblId` + `efoId` |
| `get_evidence_eva_widget` | `evidence/EVA` | `ensemblId` + `efoId` |
| `get_evidence_eva_somatic_widget` | `evidence/EVASomatic` | `ensemblId` + `efoId` |
| `get_evidence_expression_atlas_widget` | `evidence/ExpressionAtlas` | `ensemblId` + `efoId` |
| `get_evidence_gwas_credible_sets_widget` | `evidence/GWASCredibleSets` | `ensemblId` + `efoId` |
| `get_evidence_gene2phenotype_widget` | `evidence/Gene2Phenotype` | `ensemblId` + `efoId` |
| `get_evidence_gene_burden_widget` | `evidence/GeneBurden` | `ensemblId` + `efoId` |
| `get_evidence_genomics_england_widget` | `evidence/GenomicsEngland` | `ensemblId` + `efoId` |
| `get_evidence_impc_widget` | `evidence/Impc` | `ensemblId` + `efoId` |
| `get_evidence_intogen_widget` | `evidence/IntOgen` | `ensemblId` + `efoId` |
| `get_evidence_ot_crispr_widget` | `evidence/OTCRISPR` | `ensemblId` + `efoId` |
| `get_evidence_ot_encore_widget` | `evidence/OTEncore` | `ensemblId` + `efoId` |
| `get_evidence_ot_validation_widget` | `evidence/OTValidation` | `ensemblId` + `efoId` |
| `get_evidence_orphanet_widget` | `evidence/Orphanet` | `ensemblId` + `efoId` |
| `get_evidence_reactome_widget` | `evidence/Reactome` | `ensemblId` + `efoId` |
| `get_evidence_uniprot_literature_widget` | `evidence/UniProtLiterature` | `ensemblId` + `efoId` |
| `get_evidence_uniprot_variants_widget` | `evidence/UniProtVariants` | `ensemblId` + `efoId` |

### Credible Set (5 sections)

| Tool name | Section | Input |
|-----------|---------|-------|
| `get_l2g_widget` | `credibleSet/Locus2Gene` | `studyLocusId` |
| `get_credible_set_gwas_coloc_widget` | `credibleSet/GWASColoc` | `studyLocusId` |
| `get_credible_set_mol_qtl_coloc_widget` | `credibleSet/MolQTLColoc` | `studyLocusId` |
| `get_credible_set_variants_widget` | `credibleSet/Variants` | `studyLocusId` |
| `get_credible_set_e2g_widget` | `credibleSet/EnhancerToGenePredictions` | `studyLocusId` |

### Study (3 sections)

| Tool name | Section | Input | Notes |
|-----------|---------|-------|-------|
| `get_gwas_credible_sets_widget` | `study/GWASCredibleSets` | `studyId` | |
| `get_study_qtl_credible_sets_widget` | `study/QTLCredibleSets` | `studyId` | |
| `get_shared_trait_studies_widget` | `study/SharedTraitStudies` | `studyId` | Two-query: fetches disease IDs first, then queries studies by `diseaseIds` |

### Variant (8 sections)

| Tool name | Section | Input |
|-----------|---------|-------|
| `get_variant_effect_widget` | `variant/VariantEffect` | `variantId` |
| `get_variant_eva_widget` | `variant/EVA` | `variantId` |
| `get_variant_e2g_widget` | `variant/EnhancerToGenePredictions` | `variantId` |
| `get_variant_gwas_credible_sets_widget` | `variant/GWASCredibleSets` | `variantId` |
| `get_variant_pharmacogenomics_widget` | `variant/Pharmacogenomics` | `variantId` |
| `get_variant_qtl_credible_sets_widget` | `variant/QTLCredibleSets` | `variantId` |
| `get_variant_uniprot_widget` | `variant/UniProtVariants` | `variantId` |
| `get_variant_vep_widget` | `variant/VariantEffectPredictor` | `variantId` |

### Manual widgets (custom entry points)

| Tool name | Section | Notes |
|-----------|---------|-------|
| `get_molecular_structure_widget` | `variant/MolecularStructure` | Custom 3D AlphaFold viewer; prefetches CIF file server-side |

---

## Excluded sections

These sections exist in `packages/sections/src` but are not in the registry.

| Section | Entity | Reason excluded |
|---------|--------|-----------------|
| `target/BaselineExpression` | Target | Requires symbol lookup first (two-query with TargetSymbol); `target/Expression` covers expression data |
| `target/Bibliography` | Target | Uses SimilarEntities API with cursor pagination; publication rendering complexity |
| `target/MolecularInteractions` | Target | Four separate databases (IntAct, Reactome, SIGNOR, STRING), each with its own query |
| `target/MolecularStructure` | Target | 3D viewer — covered by `get_molecular_structure_widget` (manual) |
| `target/OverlappingVariants` | Target | Interactive genome browser with complex stateful viewer |
| `target/SubcellularLocation` | Target | Custom SVG-based subcellular location visualisation with no standard table |
| `disease/Bibliography` | Disease | SimilarEntities cursor pagination; publication rendering complexity |
| `disease/GWASStudies` | Disease | Requires `diseaseIds: [String!]!` array input, not a single EFO ID |
| `drug/Bibliography` | Drug | SimilarEntities cursor pagination |
| `evidence/EuropePmc` | Evidence | SentenceMatch + Publication components with cursor pagination |
| `variant/MolecularStructure` | Variant | Covered by `get_molecular_structure_widget` (manual) |

import { resolve } from "node:path";
import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as dotenvConfig } from "dotenv";

// Load .env from apps/platform directory
dotenvConfig({ path: resolve(__dirname, "../../apps/platform/.env") });

const { VITE_API_URL } = process.env;

if (!VITE_API_URL) {
  throw new Error("VITE_API_URL environment variable is not set in .env file");
}

// Documents already migrated to the current API: each gets an exact result type
// (`<OperationName>` / `<OperationName>Variables`) in src/types/index.ts. Add a
// page's documents here once its queries validate against the API.
const MIGRATED_DOCUMENTS = [
  "apps/platform/src/pages/DiseasePage/**/*.gql",
  "apps/platform/src/pages/TargetPage/**/*.gql",
  "apps/platform/src/components/AssociationsToolkit/components/Table/RowInteractors/InteractorsQuery.gql",
  "apps/platform/src/components/GeneEnrichmentAnalysis/api/*.gql",
  "packages/sections/src/disease/{Bibliography,Drugs,GWASStudies,Ontology,Phenotypes}/*.gql",
  "packages/sections/src/drug/Bibliography/*.gql",
  // Drugs, GeneOntology, OverlappingVariants and TargetGenomicRegion stay out: the
  // new API has no drugAndClinicalCandidates, GeneOntologyAnnotation.term,
  // proteinCodingCoordinates or region query yet
  "packages/sections/src/target/{BaselineExpression,Bibliography,CancerHallmarks,ChemicalProbes,ComparativeGenomics,DepMap,GeneticConstraint,MolecularInteractions,MolecularStructure,MousePhenotypes,Pathways,Pharmacogenomics,QTLCredibleSets,Safety,SubcellularLocation,Tractability}/*.gql",
  "packages/ui/src/components/ClinicalReports/*.gql",
].map((glob) => resolve(__dirname, "../..", glob));

const config: CodegenConfig = {
  overwrite: true,
  schema: `${VITE_API_URL}`,
  documents: MIGRATED_DOCUMENTS,
  errorsOnly: false,
  generates: {
    "./src/types/index.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
      config: { gqlTagName: "gql", rawRequest: false, omitOperationSuffix: true },
    },
  },
};

export default config;

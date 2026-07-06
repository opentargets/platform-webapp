import ZoomableSunburst from "./ZoomableSunburst";
import {
  gseaToSunburst,
  gseaToSunburstBySignificance,
  filterGseaResults,
  type GseaResult,
} from "./utils";

// Sample data mirroring the structure in the reference image:
// a set of ncRNA classes, each with functional sub-clusters as leaves.
const data = {
  name: "ncRNAs",
  children: [
    {
      name: "circRNAs",
      children: [
        { name: "Ion channel regulator activity" },
        { name: "Synaptic vesicle transport" },
        { name: "Neurotransmission" },
        { name: "Receptor clustering" },
        { name: "Basal lamina" },
      ],
    },
    {
      name: "piRNAs",
      children: [
        { name: "Transporter activity, monoatomic ions" },
        { name: "Single organism cell adhesion" },
        { name: "Extracellular matrix organization" },
        { name: "Extracellular structure organization" },
        { name: "Osteoblast activity" },
      ],
    },
    {
      name: "lincRNAs (Intronic)",
      children: [
        { name: "Membrane protein complex" },
        { name: "Regulation of ion transport" },
        { name: "Cell projection organization" },
        { name: "Neuron differentiation" },
        { name: "Synapse assembly" },
        { name: "Axon guidance" },
      ],
    },
    {
      name: "lincRNAs (Sense)",
      children: [
        { name: "C-terminal protein formulation" },
        { name: "Peptide biosynthetic process" },
        { name: "Cellular macromolecule biosynthesis" },
        { name: "Translation" },
      ],
    },
    {
      name: "lincRNAs",
      children: [
        { name: "C-terminal protein formulation" },
        { name: "Regulation of transcription" },
      ],
    },
    {
      name: "lincRNAs (Antisense)",
      children: [
        { name: "Negative regulation of cell activation, focal adhesion" },
        { name: "Response to stimulus" },
        { name: "Regulation of localization" },
        { name: "Cell communication" },
        { name: "Signal transduction" },
      ],
    },
  ],
};

export default function App() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <ZoomableSunburst data={data} width={720} height={720} />
    </div>
  );
}

/**
 * EXAMPLE: Using GSEA transformation utilities
 * ============================================
 *
 * To transform GSEA results, uncomment and modify the example below:
 */

// Example GSEA results
export const exampleGseaResults: GseaResult[] = [
  {
    ID: "GO:0001",
    Pathway: "Cell adhesion molecules (CAMs)",
    ES: 0.45,
    NES: 2.15,
    FDR: 0.001,
    "p-value": 0.0001,
    "Pathway size": 150,
    "Number of input genes": 45,
    "Leading edge genes": ["CDHR1", "CDH2", "CDH3"],
    "Parent pathway": "Cell Communication",
  },
  {
    ID: "GO:0002",
    Pathway: "Wnt signaling pathway",
    ES: 0.38,
    NES: 1.82,
    FDR: 0.005,
    "p-value": 0.0005,
    "Pathway size": 120,
    "Number of input genes": 32,
    "Leading edge genes": ["WNT1", "FZD1", "LRP6"],
    "Parent pathway": "Signaling Pathways",
  },
  {
    ID: "GO:0003",
    Pathway: "TGF-beta signaling pathway",
    ES: 0.52,
    NES: 2.48,
    FDR: 0.0001,
    "p-value": 0.00001,
    "Pathway size": 180,
    "Number of input genes": 58,
    "Leading edge genes": ["TGFB1", "SMAD2", "SMAD3"],
    "Parent pathway": "Signaling Pathways",
  },
  {
    ID: "GO:0004",
    Pathway: "Immune response - T cell activation",
    ES: 0.41,
    NES: 1.95,
    FDR: 0.002,
    "p-value": 0.0002,
    "Pathway size": 200,
    "Number of input genes": 62,
    "Leading edge genes": ["CD3E", "CD4", "CD8A"],
    "Parent pathway": "Immune Response",
  },
];

/**
 * Example 1: Transform GSEA results grouped by parent pathway
 */
export const gseaDataByParent = gseaToSunburst(exampleGseaResults, "NES", true);

/**
 * Example 2: Transform GSEA results as flat structure
 */
export const gseaDataFlat = gseaToSunburst(exampleGseaResults, "NES", false);

/**
 * Example 3: Transform GSEA results grouped by statistical significance
 */
export const gseaDataBySignificance = gseaToSunburstBySignificance(
  exampleGseaResults,
  "NES"
);

/**
 * Example 4: Filter and transform GSEA results
 */
export const filteredGseaData = gseaToSunburst(
  filterGseaResults(exampleGseaResults, {
    maxFDR: 0.01, // Only FDR < 0.01
    minAbsES: 0.4, // Only |ES| >= 0.4
  }),
  "NES",
  true
);

/**
 * Example usage in component:
 *
 * function MyComponent() {
 *   return <ZoomableSunburst data={gseaDataByParent} width={760} height={760} />;
 * }
 */

import type { WidgetDef } from "./types.js";

export const molecularStructureWidget: WidgetDef = {
  toolName: "get_molecular_structure_widget",
  description:
    "Get an interactive 3D molecular structure widget for a variant. " +
    "Shows the AlphaFold predicted protein structure with the variant residue highlighted, " +
    "coloured by pLDDT confidence score.",
  inputParam: {
    name: "variantId",
    description: "The variant ID (e.g. 19_44908822_C_T)",
  },
  uriPrefix: "ui://ot-mcp/molecular-structure",
  bundleFile: "molecular-structure.js",
  title: "Molecular Structure Widget",
  successMessage: "Molecular structure widget rendered successfully in the chat interface.",
  // StructureViewer.tsx fetches AlphaFold CIF/pathogenicity files and UniProt domain
  // annotations directly from the iframe — these origins must be CSP-allowlisted.
  extraConnectDomains: ["https://alphafold.ebi.ac.uk", "https://rest.uniprot.org"],
};

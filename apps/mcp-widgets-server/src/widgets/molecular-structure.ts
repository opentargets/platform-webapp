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
  prefetch: {
    operationName: "MolecularStructureQuery",
    query: `
      query MolecularStructureQuery($variantId: String!) {
        variant(variantId: $variantId) {
          id
          referenceAllele
          alternateAllele
          proteinCodingCoordinates {
            count
            rows {
              uniprotAccessions
              variant { id }
              target { id approvedSymbol }
              referenceAminoAcid
              alternateAminoAcid
              aminoAcidPosition
            }
          }
        }
      }
    `,
    extractExtraFetches: (data: unknown) => {
      const rows = (data as any)?.variant?.proteinCodingCoordinates?.rows;
      const uniprotId = rows?.[0]?.uniprotAccessions?.[0];
      if (!uniprotId) return [];
      return [{
        url: `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`,
        contentType: "text/plain",
      }];
    },
  },
};

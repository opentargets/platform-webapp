import { lazy } from "react";
import { TargetData } from "../../types/target";

const id = "protein_coding_variants";
export const definition = {
  id,
  name: "Protein Coding Variants",
  shortName: "PC",
  category: "Target-Variant",
  hasData: (data: TargetData) => (data.proteinCodingCoordinates?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

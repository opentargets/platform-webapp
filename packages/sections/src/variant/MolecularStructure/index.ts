import { lazy } from "react";
import { Variant } from "@ot/constants";

export const definition = {
  id: "molecular_structure",
  name: "Molecular Structure",
  shortName: "MS",
  category: "Target-Variant",
  hasData: (data: Variant) =>
    (data.proteinCodingCoordinates?.count || 0) > 0 &&
    data.proteinCodingCoordinates?.rows?.[0]?.referenceAminoAcid !== "-",
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));

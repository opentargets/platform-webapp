import { lazy } from "react";

export const definition = {
  id: "pharmacogenetics",
  name: "Pharmacogenetics",
  shortName: "PGx",
  category: "Drug",
  hasData: (data: any) => data.pharmacogenomics.length > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
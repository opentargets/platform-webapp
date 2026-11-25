import { lazy } from "react";

export const definition = {
  id: "GWASStudies",
  name: "GWAS",
  shortName: "GS",
  hasData: data =>
    data?.studies?.studiesView?.count > 0 || // summary
    data?.studiesView?.count > 0, // section
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

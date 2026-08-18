import { lazy } from "react";

export const definition = {
  id: "ontology",
  name: "Ontology",
  shortName: "O",
  category: "Disease",
  hasData: (data: any) => data.id,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

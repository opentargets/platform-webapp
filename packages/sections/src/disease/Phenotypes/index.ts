import { lazy } from "react";

export const definition = {
  id: "phenotypes",
  name: "Clinical signs and symptoms",
  shortName: "CS",
  category: "Disease",
  hasData: (data: any) => (data.phenotypes?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

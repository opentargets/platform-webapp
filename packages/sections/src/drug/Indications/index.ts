import { lazy } from "react";

export const definition = {
  id: "Indications",
  name: "Indications",
  shortName: "I",
  category: ["Target-Disease", "Drug"],
  hasData: (data) => data?.indications?.count > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
import { lazy } from "react";

export const definition = {
  id: "adverseEvents",
  name: "Pharmacovigilance",
  shortName: "PV",
  category: "Drug",
  hasData: (data: any) => data.adverseEvents?.count > 0 || false,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
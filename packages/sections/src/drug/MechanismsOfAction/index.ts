import { lazy } from "react";

export const definition = {
  id: "mechanismsOfAction",
  name: "Mechanisms of Action",
  shortName: "MA",
  category: "Drug",
  hasData: (data: any) =>
    (data.mechanismsOfAction?.uniqueActionTypes.length > 0 &&
      data.mechanismsOfAction?.uniqueTargetTypes.length > 0) ||
    false,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
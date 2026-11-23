import { lazy } from "react";

type StudiesViewData = {
  studiesView?: { count: number };
  sharedTraitStudies?: { studiesView: { count: number } };
};

export const definition = {
  id: "shared_trait_studies",
  name: "Shared Trait Studies",
  shortName: "ST",
  hasData: (data: StudiesViewData) =>
    (data?.sharedTraitStudies?.studiesView?.count ?? data?.studiesView?.count ?? 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

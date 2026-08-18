import { lazy } from "react";
import { Study } from "@ot/constants";

export const definition = {
  id: "shared_trait_studies",
  name: "Shared Trait Studies",
  shortName: "ST",
  category: "Disease-Variant",
  hasData: (data: Study) => {
    // @ts-expect-error TODO: check this
    return data?.sharedTraitStudies?.count > 1 || data?.count > 1;
  },
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

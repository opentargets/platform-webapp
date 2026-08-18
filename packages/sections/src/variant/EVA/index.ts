import { lazy } from "react";
import { Variant } from "@ot/constants";

export const definition = {
  id: "eva",
  name: "ClinVar",
  shortName: "CV",
  category: "Disease-Variant",
  hasData: (data: Variant) => {
    return (
      // @ts-expect-error TODO: fix this
      (data.evaEvidences?.count || 0) > 0 // section
    );
  },
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));

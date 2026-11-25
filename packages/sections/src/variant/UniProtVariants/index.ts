import { lazy } from "react";

type UniProtVariantsSummaryData = {
  uniProtEvidences?: {
    count?: number;
  };
};

export const definition = {
  id: "uniprot_variants",
  name: "UniProt variants",
  shortName: "UV",
  hasData: (data: UniProtVariantsSummaryData) => (data.uniProtEvidences?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));

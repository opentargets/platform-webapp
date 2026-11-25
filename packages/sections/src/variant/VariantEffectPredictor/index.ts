import { lazy } from "react";

type VariantWithTranscriptConsequencesView = {
  transcriptConsequencesView?: {
    count?: number;
  };
};

export const definition = {
  id: "variant_effect_predictor",
  name: "Transcript consequences",
  shortName: "TC",
  hasData: (data: VariantWithTranscriptConsequencesView) =>
    (data.transcriptConsequencesView?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));

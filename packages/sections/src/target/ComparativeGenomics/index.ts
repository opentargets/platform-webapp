import type { CompGenomicsSummaryFragment } from "@ot/constants";
import { lazy } from "react";
import countHomologues from "./countHomologues";

export const definition = {
  id: "compGenomics",
  name: "Comparative Genomics",
  shortName: "CG",
  hasData: (data: CompGenomicsSummaryFragment) => {
    const { paralogueCount, orthologueCount } = countHomologues(data.homologues ?? []);
    return paralogueCount > 0 || orthologueCount > 0;
  },
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

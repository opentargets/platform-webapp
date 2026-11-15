import type { TargetMolecularStructureSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "molecularStructure",
  name: "Molecular Structure",
  shortName: "MS",
  hasData: (data: TargetMolecularStructureSummaryFragment) =>
    data.proteinIds?.some((e) => e.source === "uniprot_swissprot") ?? false,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

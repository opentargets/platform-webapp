import type { GeneticConstraintFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "geneticConstraint",
  name: "Genetic Constraint",
  shortName: "GC",
  hasData: (data: GeneticConstraintFragment) => (data.geneticConstraint?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

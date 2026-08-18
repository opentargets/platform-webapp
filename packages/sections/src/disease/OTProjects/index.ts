import { lazy } from "react";
import { isPrivateDiseaseSection } from "@ot/constants";

const id = "otProjects";

export const definition = {
  id,
  name: "Open Targets Projects",
  shortName: "OP",
  category: "Disease",
  hasData: (data: any) => data.otarProjects?.length > 0,
  isPrivate: isPrivateDiseaseSection(id),
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

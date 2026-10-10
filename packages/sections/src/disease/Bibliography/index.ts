import { lazy } from "react";

export const definition = {
  id: "bibliography",
  name: "Bibliography",
  shortName: "B",
  hasData: (data: any) => data.literatureOcurrences?.filteredCount > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

export { literatureExportAdapter as exportAdapter } from "../../common/Literature/exportAdapter";

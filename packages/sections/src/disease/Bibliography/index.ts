import { lazy } from "react";

export const definition = {
  id: "bibliography",
  name: "Bibliography",
  shortName: "B",
  hasData: (data: any) => data.literatureOcurrences?.count > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));

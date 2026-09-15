import { lazy } from "react";
import { isPrivateCredibleSetSection } from "@ot/constants";

const id = "browserView";

export const definition = {
  id,
  name: "Browser View",
  shortName: "BV",
  hasData: () => true,  // !! NEEDS UPDATED ONCE HAVE FINAL QUERIES !!
  isPrivate: isPrivateCredibleSetSection(id),
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 

import { lazy } from "react";

export const definition = {
  id: "browserView",
  name: "Browser View",
  shortName: "BV",
  hasData: () => true,  // !! NEEDS UPDATED ONCE HAVE FINAL QUERIES !!
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
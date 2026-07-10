import { mountWidget } from "../shared/createWidgetEntry";
import MolecularStructureWidget from "./MolecularStructureWidget";

mountWidget({
  appName: "ot-molecular-structure-widget",
  cacheKey: "ot-ms",
  extractArgs: args => {
    const variantId = args?.variantId;
    return typeof variantId === "string" ? { variantId } : null;
  },
  component: MolecularStructureWidget,
});

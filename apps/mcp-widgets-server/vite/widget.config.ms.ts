import { resolve } from "path";
import { createWidgetBuildConfig, createPlatformStubsPlugin, createUiBarrelStub, ROOT } from "./widget.config.base";

export default createWidgetBuildConfig({
  entry: resolve(ROOT, "widget-src/molecular-structure/main.tsx"),
  outputName: "MolecularStructureWidget",
  outputFile: "molecular-structure.js",
  extraDedupe: ["3dmol"],
  plugins: [createUiBarrelStub("widget-src/shared/stubs/ui-ms-index.tsx"), createPlatformStubsPlugin()],
});

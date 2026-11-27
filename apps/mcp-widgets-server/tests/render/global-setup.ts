import { resolve } from "path";
import { build } from "vite";

export const HOST_BUNDLE = resolve(import.meta.dirname, ".host/host.js");

/** Bundles the test host (AppBridge + iframe wiring) into a single browser script. */
export default async function globalSetup() {
  await build({
    configFile: false,
    logLevel: "warn",
    build: {
      outDir: resolve(import.meta.dirname, ".host"),
      emptyOutDir: true,
      minify: false,
      lib: {
        entry: resolve(import.meta.dirname, "host/host.ts"),
        formats: ["iife"],
        name: "RenderHost",
        fileName: () => "host.js",
      },
    },
  });
}

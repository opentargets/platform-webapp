import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * The notebook runtime is a single classic script loaded by the sandboxed
 * iframe (apps/platform/public/notebook-runtime/index.html). It bundles d3 v7,
 * Observable Plot and acorn so nothing from the app bundle is shared with user
 * code, and it is served as a static file so Vite never touches it.
 */
export default defineConfig({
  build: {
    outDir: resolve(__dirname, "../../apps/platform/public/notebook-runtime"),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/runtime.ts"),
      name: "OtNotebookRuntime",
      formats: ["iife"],
      fileName: () => "runtime.js",
    },
    sourcemap: false,
    minify: true,
    target: "es2020",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

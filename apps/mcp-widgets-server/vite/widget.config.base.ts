import { defineConfig, loadEnv } from "vite";
import type { UserConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Absolute path to the package root (apps/mcp-widgets-server). */
export const ROOT = resolve(__dirname, "..");

/** Monorepo root (two levels up from apps/mcp-widgets-server). */
const MONO_ROOT = resolve(ROOT, "../..");

const PUBLIC_API_URL = "https://api.platform.opentargets.org/api/v4/graphql";

/**
 * Load OT_API_URL from .env at build time (empty prefix = load all vars).
 * Falls back to the public production endpoint.
 */
const { OT_API_URL = PUBLIC_API_URL } = loadEnv("production", ROOT, "");

const BASE_DEDUPE = [
  "react",
  "react-dom",
  "@emotion/react",
  "@emotion/styled",
  "@emotion/cache",
  "@emotion/sheet",
  "@emotion/utils",
  "@emotion/serialize",
  "@mui/material",
  "@mui/system",
  "@apollo/client",
  "graphql",
  "react-router-dom",
  "lodash",
];

export interface WidgetBuildOptions {
  /** Absolute path to the widget entry point (main.tsx). */
  entry: string;
  /** IIFE global variable name, e.g. "L2GWidget". */
  outputName: string;
  /** Output filename under dist/widgets/, e.g. "l2g.js". */
  outputFile: string;
  /**
   * Set to true for the first widget in the build chain so dist/widgets/ is
   * cleaned before the fresh build. All subsequent widgets use false to avoid
   * wiping previously built bundles.
   */
  emptyOutDir?: boolean;
  /** Widget-specific Vite plugins (stub plugins go here). */
  plugins: Plugin[];
  /** Extra entries added to the dedupe list, e.g. ["3dmol"]. */
  extraDedupe?: string[];
}

/**
 * Shared Vite plugin that stubs platform-specific paths which would otherwise
 * pull in heavy dependencies (graphiql CSS, OT-specific Apollo context).
 *
 * - DataDownloader.jsx → null component (prevents graphiql CSS from landing in bundle)
 * - OTApolloProvider.tsx → re-exports useApolloClient from standard @apollo/client
 *   so that useBatchQuery works under the standard ApolloProvider we provide in
 *   createWidgetEntry.tsx
 */
/**
 * Creates the ui barrel stub plugin for a widget build.
 *
 * Uses both `resolveId` (intercepts bare "ui" imports) and `load` (intercepts
 * the real resolved package path via symlinks) so the stub is applied in all
 * cases. Without the `load` hook the real SectionItem with full section chrome
 * (title, description, download controls) leaks into the bundle.
 */
export function createUiBarrelStub(stubFile = "widget-src/shared/stubs/ui-index.tsx"): Plugin {
  const stubPath = resolve(ROOT, stubFile);
  const uiIndexPath = resolve(ROOT, "../../packages/ui/src/index.tsx");
  const nodeModulesUiIndex = resolve(ROOT, "node_modules/ui/src/index.tsx");
  return {
    name: `stub-ui-barrel`,
    resolveId(id: string) {
      if (id === "ui") return stubPath;
    },
    load(id: string) {
      if (id === uiIndexPath || id === nodeModulesUiIndex) {
        return `export * from ${JSON.stringify(stubPath)};`;
      }
    },
  };
}

export function createPlatformStubsPlugin(): Plugin {
  const dataDownloaderPath = resolve(
    MONO_ROOT,
    "packages/ui/src/components/DataDownloader.tsx"
  );
  const otApolloProviderPath = resolve(
    MONO_ROOT,
    "packages/ui/src/providers/OTApolloProvider/OTApolloProvider.tsx"
  );
  // OtAsyncTooltip imports OtGenomicLocation from the ui barrel, but that
  // component does not exist yet in the codebase. Stub the whole component
  // so widgets that transitively import it (via OtTable etc.) don't break.
  const otAsyncTooltipPath = resolve(
    MONO_ROOT,
    "packages/ui/src/components/OtAsyncTooltip/OtAsyncTooltip.tsx"
  );
  // ApiPlaygroundDrawer dynamically imports "graphiql" which is not available
  // in the widget build environment. Stub it out as a no-op component.
  const apiPlaygroundDrawerPath = resolve(
    MONO_ROOT,
    "packages/ui/src/components/ApiPlaygroundDrawer.tsx"
  );
  // @ot/config's theme.ts calls lighten/darken (polished) on getConfig() colors at
  // module-load time. In the widget sandbox window.configProfile is absent so
  // primaryColor/secondaryColor are undefined → polished throws error #3.
  // Stub both files by absolute path (same pattern as OTApolloProvider/DataDownloader)
  // so polished is never invoked regardless of how the module is resolved.
  const otConfigThemePath = resolve(MONO_ROOT, "packages/ot-config/src/theme.ts");
  const otConfigEnvPath = resolve(MONO_ROOT, "packages/ot-config/src/environment.ts");

  return {
    name: "platform-stubs",
    load(id: string) {
      if (id === otConfigThemePath) {
        return `
import { createTheme } from "@mui/material";
const PRIMARY = "#3489ca";
const SECONDARY = "#ff6350";
export const theme = createTheme({
  palette: { primary: { main: PRIMARY }, secondary: { main: SECONDARY } },
});
`;
      }
      if (id === otConfigEnvPath) {
        const PRIMARY = "#3489ca";
        const SECONDARY = "#ff6350";
        return `
const PRIMARY = "${PRIMARY}";
const SECONDARY = "${SECONDARY}";
export function getConfig() {
  return {
    urlApi: ${JSON.stringify(OT_API_URL)},
    urlAiApi: "",
    profile: { primaryColor: PRIMARY, secondaryColor: SECONDARY, isPartnerPreview: false, partnerTargetSectionIds: [], partnerDiseaseSectionIds: [], partnerDrugSectionIds: [], partnerEvidenceSectionIds: [], partnerDataTypes: [], partnerDataSources: [] },
    googleTagManagerID: null,
    geneticsPortalUrl: "https://genetics.opentargets.org",
    gitVersion: "",
  };
}
export function getEnvironmentConfig() { return getConfig(); }
`;
      }
      if (id === otAsyncTooltipPath) {
        return `
import React from "react";
export default function OtAsyncTooltip({ children }) { return React.createElement(React.Fragment, null, children); }
`;
      }
      if (id === apiPlaygroundDrawerPath) {
        return "export default function ApiPlaygroundDrawer() { return null; }";
      }
      if (id === dataDownloaderPath) {
        return "export default function DataDownloader() { return null; }";
      }
      if (id === otApolloProviderPath) {
        // useBatchQuery calls useApolloClient() from this module.
        // Re-export from @apollo/client so standard ApolloProvider satisfies it.
        // OTApolloProvider itself is a no-op here (we provide ApolloProvider in createWidgetEntry).
        return `
export { useApolloClient } from "@apollo/client";
export function OTApolloProvider({ children }) { return children; }
`;
      }
    },
  };
}

/**
 * Transforms .gql/.graphql files into importable DocumentNode objects.
 * Replicates vite-plugin-simple-gql inline to avoid CJS/ESM interop issues.
 * The emitted code uses graphql-tag (re-exported by @apollo/client) so the
 * parsed document is cached and de-duplicated across imports.
 */
function gqlPlugin(): Plugin {
  return {
    name: "gql-transform",
    transform(src: string, id: string) {
      if (id.endsWith(".graphql") || id.endsWith(".gql")) {
        return {
          code: `import { gql } from "@apollo/client"; export default gql(${JSON.stringify(src)});`,
          map: null,
        };
      }
    },
  };
}

export function createWidgetBuildConfig(opts: WidgetBuildOptions): UserConfig {
  return defineConfig({
    plugins: [...opts.plugins, gqlPlugin(), react()],
    build: {
      lib: {
        entry: opts.entry,
        formats: ["iife"],
        name: opts.outputName,
      },
      outDir: resolve(ROOT, "dist/widgets"),
      emptyOutDir: opts.emptyOutDir ?? false,
      rollupOptions: {
        output: {
          entryFileNames: opts.outputFile,
          // Inline all assets and dynamic imports into the single IIFE file.
          inlineDynamicImports: true,
        },
      },
    },
    define: {
      // Replace Node.js global so the IIFE bundle works in the browser.
      "process.env.NODE_ENV": '"production"',
      // Bake the GraphQL endpoint into the bundle so it's used even when the
      // inline window.__OT_API_URL__ script is blocked by CSP.
      __OT_API_URL__: JSON.stringify(OT_API_URL),
    },
    resolve: {
      // Deduplicate across the monorepo so each package has only one instance
      // in the bundle. Emotion packages must be deduplicated to ensure
      // CacheContext is shared between CacheProvider and @emotion/styled consumers.
      dedupe: [...BASE_DEDUPE, ...(opts.extraDedupe ?? [])],
      alias: {
        // Allow widget-src to import directly from monorepo packages.
        "@ot/ui": resolve(MONO_ROOT, "packages/ui/src"),
        "@ot/sections": resolve(MONO_ROOT, "packages/sections/src"),
        "@ot/constants": resolve(MONO_ROOT, "packages/ot-constants/src"),
        "@ot/utils": resolve(MONO_ROOT, "packages/ot-utils/src"),
        "@widget-shared": resolve(ROOT, "widget-src/shared"),
      },
    },
  });
}

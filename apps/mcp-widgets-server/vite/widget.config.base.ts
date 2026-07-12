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
  // useConfigContext() is imported both via the "ui" barrel (stubbed in ui-index.tsx)
  // AND by several components via a relative path straight to this module
  // (PublicationWrapper.tsx, PartnerLockIcon.tsx, Footer.tsx) — the relative imports
  // bypass the "ui" barrel stub entirely. Stub the module itself so every import
  // style gets the same safe, non-null config instead of crashing on the real
  // provider's default context value ({ config: null }, since there's no
  // <OTConfigurationProvider> ancestor in the widget).
  const configurationProviderPath = resolve(
    MONO_ROOT,
    "packages/ui/src/providers/ConfigurationProvider.tsx"
  );
  // Link.tsx is imported both via the "ui" barrel (wrapped in ui-index.tsx to force
  // external navigation through app.openLink()) AND by several real components via a
  // relative path straight to this module (PublicationWrapper.tsx, Footer.tsx) — those
  // relative imports get the unwrapped real component, which renders a plain <a> with
  // no target="_blank" for "external" links and native RouterLink navigation otherwise.
  // Clicking it inside the sandboxed MCP App iframe navigates the iframe itself away
  // from the widget (no popup permission, no real <Routes> to land on) — the widget
  // "disappearing" the user saw. Stub the module itself, mirroring the real component's
  // styling classes exactly, but unconditionally routing through openLink() — there is
  // no legitimate internal-navigation case inside a standalone widget iframe.
  const linkComponentPath = resolve(MONO_ROOT, "packages/ui/src/components/Link/Link.tsx");
  // ApiPlaygroundDrawer dynamically imports "graphiql" which is not available
  // in the widget build environment. Stub it out as a no-op component.
  const apiPlaygroundDrawerPath = resolve(
    MONO_ROOT,
    "packages/ui/src/components/ApiPlaygroundDrawer.tsx"
  );
  // @ot/config's theme.ts/environment.ts are NOT stubbed — the widget HTML shell
  // (src/mcp-server.ts) sets window.configProfile from the real profile file before
  // the bundle script runs, so getConfig() and theme.ts's lighten/darken calls resolve
  // real colors safely. See widget-src/shared/createWidgetEntry.tsx, which imports the
  // real theme from "@ot/config" directly (aliased below).

  return {
    name: "platform-stubs",
    load(id: string) {
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
      if (id === configurationProviderPath) {
        return `
import { getConfig } from "@ot/config";
export function useConfigContext() { return { config: getConfig() }; }
export function OTConfigurationProvider({ children }) { return children; }
export const OTConfigurationContext = undefined;
`;
      }
      if (id === linkComponentPath) {
        return `
import React from "react";
import { makeStyles } from "@mui/styles";
import classNames from "classnames";
import { getApp } from "@widget-shared/createWidgetEntry";
import OtAsyncTooltip from "@ot/ui/components/OtAsyncTooltip/OtAsyncTooltip";

const useStyles = makeStyles((theme) => ({
  base: {
    fontSize: "inherit",
    "text-decoration-color": "transparent",
    "-webkit-text-decoration-color": "transparent",
  },
  baseDefault: {
    color: theme.palette.primary.main,
    "&:hover": {
      color: theme.palette.primary.dark,
      "text-decoration-color": theme.palette.primary.dark,
      "-webkit-text-decoration-color": theme.palette.primary.dark,
    },
  },
  baseTooltip: {
    color: theme.palette.primary.main,
    "&:hover": { color: theme.palette.primary.dark },
    textDecoration: "none",
  },
  baseFooter: {
    color: "white",
    "text-decoration-color": "transparent",
    "-webkit-text-decoration-color": "transparent",
    "&:hover": {
      color: theme.palette.primary.light,
      "text-decoration-color": theme.palette.primary.light,
      "-webkit-text-decoration-color": theme.palette.primary.light,
    },
    display: "flex",
    alignItems: "center",
  },
}));

function Link({ children, to, onClick, footer, tooltip, asyncTooltip, className, ariaLabel }) {
  const classes = useStyles();
  const ariaLabelProp = ariaLabel ? { "aria-label": ariaLabel } : {};
  const resolvedTo = to && to.startsWith("/") ? "https://platform.opentargets.org" + to : to;

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) onClick();
    if (resolvedTo) {
      const app = getApp();
      if (app) app.openLink({ url: resolvedTo }).catch(() => {});
    }
  };

  const anchor = React.createElement(
    "a",
    {
      className: classNames(
        classes.base,
        {
          [classes.baseDefault]: !footer && !tooltip,
          [classes.baseFooter]: footer,
          [classes.baseTooltip]: tooltip,
        },
        className
      ),
      href: resolvedTo,
      onClick: handleClick,
      ...ariaLabelProp,
    },
    children
  );

  // Real Link.tsx only shows the OtAsyncTooltip hover-preview for internal
  // (non-external) RouterLink navigation. This widget always renders a plain
  // <a> (see above), so asyncTooltip is keyed off the prop alone, same "/entity/id"
  // path-parsing the real component uses.
  if (asyncTooltip && to) {
    const args = to.split("/");
    return React.createElement(OtAsyncTooltip, { entity: args[1], id: args[2] }, anchor);
  }

  return anchor;
}

export default Link;
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
        "@ot/config": resolve(MONO_ROOT, "packages/ot-config/src"),
        "@widget-shared": resolve(ROOT, "widget-src/shared"),
      },
    },
  });
}

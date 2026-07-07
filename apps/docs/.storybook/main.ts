import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: [
    "../src/docs/**/*.mdx",
    "../../../packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../../packages/sections/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],

  addons: [
    "@storybook/addon-themes",
    {
      name: "@storybook/addon-docs",
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  async viteFinal(config, { configType }) {
    // vite-plugin-simple-gql is CJS with exports.default = fn; native ESM import()
    // wraps module.exports as .default, so the factory is at .default.default
    const gqlMod = await import("vite-plugin-simple-gql");
    const gql = (gqlMod as any).default?.default ?? (gqlMod as any).default;
    return mergeConfig(config, {
      // GitHub Pages serves project repos under /<repo-name>/
      // STORYBOOK_BASE_PATH is injected by the deploy workflow
      base: configType === "PRODUCTION" ? (process.env.STORYBOOK_BASE_PATH ?? "/") : "/",
      plugins: [
        gql(),
        // graphiql is installed only in apps/platform; stub it here so
        // DataDownloader and ApiPlaygroundDrawer don't break the dev server.
        // Neither component has a story, so the stub is never rendered.
        {
          name: "graphiql-stub",
          resolveId(id: string) {
            if (id === "graphiql" || id === "graphiql/graphiql.min.css") {
              return `\0${id}`;
            }
          },
          load(id: string) {
            if (id === "\0graphiql/graphiql.min.css") return "";
            if (id === "\0graphiql") return "export default {}";
          },
        },
      ],
      esbuild: {
        jsxInject: `import React from 'react'`,
      },
    });
  },
};
export default config;

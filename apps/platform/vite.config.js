import { execSync } from "node:child_process";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";
import gql from "vite-plugin-simple-gql";
import svgrPlugin from "vite-plugin-svgr";
import { visualizer } from "rollup-plugin-visualizer";

const getGitVersion = () => {
  try {
    return execSync("git describe --tags --always").toString().trim();
  } catch {
    return "unknown version";
  }
};

export default defineConfig({
  build: {
    outDir: "./bundle-platform",
  },
  resolve: {
    alias: {
      graphiql: resolve(__dirname, "./node_modules/graphiql"),
    },
  },
  define: {
    "import.meta.env.VITE_GIT_VERSION": JSON.stringify(getGitVersion()),
  },
  plugins: [
    react(),
    gql(),
    svgrPlugin({
      svgrOptions: {
        icon: true,
      },
    }),
    viteCompression(),
    process.env.ANALYZE &&
      visualizer({
        filename: "./bundle-platform/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap",
      }),
  ],
});

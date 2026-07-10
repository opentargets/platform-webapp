# ── Stage 1: Install dependencies ─────────────────────────────────────────────
# Yarn v1 workspaces require all workspace package.json files to be present
# so the lockfile resolves correctly. We copy only manifests here so that
# dependency installation is cached independently of source changes.
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

# Workspace package manifests (source not needed — server doesn't import them at runtime)
COPY apps/mcp-widgets-server/package.json   apps/mcp-widgets-server/
COPY packages/ui/package.json               packages/ui/
COPY packages/sections/package.json         packages/sections/
COPY packages/ot-config/package.json        packages/ot-config/
COPY packages/ot-constants/package.json     packages/ot-constants/
COPY packages/ot-utils/package.json         packages/ot-utils/
COPY packages/tsconfig/package.json         packages/tsconfig/
COPY packages/platform-test/package.json    packages/platform-test/

# Install all deps (including devDeps — tsx is needed at runtime)
RUN yarn install --frozen-lockfile --ignore-scripts

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Bring in installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Server TypeScript source
COPY apps/mcp-widgets-server/src   apps/mcp-widgets-server/src

# Pre-built widget IIFE bundles (built locally, committed to the repo)
COPY apps/mcp-widgets-server/dist  apps/mcp-widgets-server/dist

# GQL query files — read at startup by loadSectionQuery to auto-detect operation names.
# Only .gql files are needed; .tsx source is not used at server runtime.
COPY packages/sections/src         packages/sections/src

# Cloud Run injects PORT (default 8080). OT_API_URL can be overridden at deploy time.
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node_modules/.bin/tsx", "apps/mcp-widgets-server/src/index.ts"]

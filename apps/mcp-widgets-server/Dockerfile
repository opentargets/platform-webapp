# Built by scripts/deploy.sh from a staged context, not the whole monorepo:
#   package.json, yarn.lock, .yarnrc.yml, every workspace's package.json,
#   apps/mcp-widgets-server/{src,dist}, apps/platform/public/profiles
# dist/ holds the widget bundles built beforehand with `yarn build`.

# ── Stage 1: install the server's runtime dependencies only ───────────────────
FROM node:22-alpine AS deps

WORKDIR /app
RUN corepack enable

# Yarn 4 needs every workspace manifest to resolve the lockfile
COPY . .

# `focus --production` installs mcp-widgets-server's dependencies and nothing else
# (no React, Vite or Playwright). No package needs its build scripts at runtime.
RUN YARN_ENABLE_SCRIPTS=false yarn workspaces focus mcp-widgets-server --production

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/apps/mcp-widgets-server ./apps/mcp-widgets-server
# Profile scripts inlined into every widget's HTML shell (OT_PROFILE picks one)
COPY --from=deps --chown=node:node /app/apps/platform/public/profiles ./apps/platform/public/profiles

USER node

# Cloud Run injects PORT. OT_API_URL and GIT_SHA are set at deploy time.
ENV PORT=8080 \
    NODE_ENV=production \
    LOG_FORMAT=json

EXPOSE 8080

# tsx as a loader in this process; the tsx CLI would start a second Node process
CMD ["node", "--import", "tsx", "apps/mcp-widgets-server/src/index.ts"]

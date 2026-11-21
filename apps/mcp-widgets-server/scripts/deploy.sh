#!/usr/bin/env bash
# Builds the widget server image with Cloud Build and deploys it to Cloud Run.
#
#   apps/mcp-widgets-server/scripts/deploy.sh            # dev service
#   SKIP_BUILD=1 apps/mcp-widgets-server/scripts/deploy.sh   # reuse the current dist/
#
# Settings (env vars, defaults below): PROJECT, REGION, SERVICE, REPOSITORY, OT_API_URL.
#
# Sized for a dev service: one small instance that scales to zero. MCP sessions live in
# the instance's memory, hence a single instance with session affinity; after a scale to
# zero, clients get a 404 for their old session and start a new one.
set -euo pipefail

PROJECT="${PROJECT:-open-targets-eu-dev}"
REGION="${REGION:-europe-west2}"
SERVICE="${SERVICE:-mcp-widgets-server-dev}"
REPOSITORY="${REPOSITORY:-platform-widgets-mcp}"
OT_API_URL="${OT_API_URL:-https://api.platform.opentargets.xyz/api/v4/graphql}"

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$SERVER_DIR/../.." && pwd)"

GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
if [[ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no -- apps/mcp-widgets-server packages)" ]]; then
  GIT_SHA="$GIT_SHA-dirty"
  echo "warning: uncommitted changes, deploying as $GIT_SHA"
fi
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPOSITORY/mcp-widgets-server:$GIT_SHA"

if [[ -z "${SKIP_BUILD:-}" ]]; then
  echo "── Building widget bundles"
  (cd "$SERVER_DIR" && yarn build)
fi

echo "── Staging build context"
CONTEXT="$(mktemp -d)"
trap 'rm -rf "$CONTEXT"' EXIT
cp "$ROOT"/{package.json,yarn.lock,.yarnrc.yml} "$CONTEXT/"
# Every workspace manifest, so Yarn can resolve the lockfile
(cd "$ROOT" && yarn workspaces list --json) | sed -n 's/.*"location":"\([^"]*\)".*/\1/p' |
  while read -r location; do
    [[ "$location" == "." ]] && continue
    mkdir -p "$CONTEXT/$location"
    cp "$ROOT/$location/package.json" "$CONTEXT/$location/"
  done
cp -R "$SERVER_DIR/src" "$SERVER_DIR/dist" "$CONTEXT/apps/mcp-widgets-server/"
mkdir -p "$CONTEXT/apps/platform/public"
cp -R "$ROOT/apps/platform/public/profiles" "$CONTEXT/apps/platform/public/"
cp "$SERVER_DIR/Dockerfile" "$CONTEXT/"

echo "── Building $IMAGE"
gcloud builds submit "$CONTEXT" --project "$PROJECT" --region "$REGION" --tag "$IMAGE"

echo "── Deploying $SERVICE"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --session-affinity \
  --cpu-boost \
  --timeout 3600 \
  --set-env-vars "OT_API_URL=$OT_API_URL,GIT_SHA=$GIT_SHA" \
  --labels "app=mcp-widgets-server,env=dev"

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
echo "── Deployed $GIT_SHA"
echo "   MCP endpoint: $URL/mcp"
echo "   Health:       $(curl -s "$URL/health")"

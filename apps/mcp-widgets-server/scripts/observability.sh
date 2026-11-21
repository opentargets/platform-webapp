#!/usr/bin/env bash
# Sets up monitoring for a deployed widget server. Safe to re-run: existing pieces are skipped.
#
#   NOTIFY_EMAIL=you@example.org apps/mcp-widgets-server/scripts/observability.sh
#
# Creates:
#   - log-based metrics from the server's structured logs (src/log.ts):
#       <service>_tool_calls      tool calls, by tool and client
#       <service>_resource_reads  widget HTML served to a host, by tool and client
#       <service>_errors          log entries at ERROR or above
#   - an uptime check on /health every 15 minutes
#   - alerts, by email: the uptime check failing, and any server error
#
# Errors with stack traces also appear in Error Reporting with no setup, and Cloud Run's own
# metrics (requests, latency, instances, memory) are on the service's Metrics tab.
set -euo pipefail

PROJECT="${PROJECT:-open-targets-eu-dev}"
REGION="${REGION:-europe-west2}"
SERVICE="${SERVICE:-mcp-widgets-server-dev}"
: "${NOTIFY_EMAIL:?set NOTIFY_EMAIL to the address that should receive alerts}"

METRIC_PREFIX="${SERVICE//-/_}"
SERVICE_FILTER="resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\""
URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
HOST="${URL#https://}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ── Log-based metrics ─────────────────────────────────────────────────────────
counter_by_tool_and_client() {
  local name="$1" event="$2" description="$3"
  cat >"$TMP/$name.yaml" <<EOF
name: $name
description: $description
filter: $SERVICE_FILTER AND jsonPayload.event="$event"
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
  labels:
    - key: tool
    - key: client
labelExtractors:
  tool: EXTRACT(jsonPayload.tool)
  client: EXTRACT(jsonPayload.clientName)
EOF
  create_metric "$name"
}

create_metric() {
  local name="$1"
  if gcloud logging metrics describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
    echo "metric $name exists"
  else
    gcloud logging metrics create "$name" --project "$PROJECT" --config-from-file "$TMP/$name.yaml"
  fi
}

counter_by_tool_and_client "${METRIC_PREFIX}_tool_calls" tool_call "MCP widget tool calls"
counter_by_tool_and_client "${METRIC_PREFIX}_resource_reads" resource_read \
  "Widget HTML served to an MCP host"

cat >"$TMP/${METRIC_PREFIX}_errors.yaml" <<EOF
name: ${METRIC_PREFIX}_errors
description: Widget server log entries at ERROR or above
filter: $SERVICE_FILTER AND severity>=ERROR
metricDescriptor:
  metricKind: DELTA
  valueType: INT64
EOF
create_metric "${METRIC_PREFIX}_errors"

# ── Notification channel ──────────────────────────────────────────────────────
CHANNEL="$(gcloud beta monitoring channels list --project "$PROJECT" \
  --filter "type=\"email\" AND labels.email_address=\"$NOTIFY_EMAIL\"" --format 'value(name)' | head -1)"
if [[ -z "$CHANNEL" ]]; then
  CHANNEL="$(gcloud beta monitoring channels create --project "$PROJECT" --type email \
    --display-name "$NOTIFY_EMAIL" --channel-labels "email_address=$NOTIFY_EMAIL" \
    --format 'value(name)')"
fi
echo "notification channel $CHANNEL"

# ── Uptime check ──────────────────────────────────────────────────────────────
UPTIME_NAME="$SERVICE health"
UPTIME_ID="$(gcloud monitoring uptime list-configs --project "$PROJECT" \
  --filter "displayName=\"$UPTIME_NAME\"" --format 'value(name)' | head -1)"
if [[ -z "$UPTIME_ID" ]]; then
  gcloud monitoring uptime create "$UPTIME_NAME" --project "$PROJECT" \
    --resource-type uptime-url --resource-labels "host=$HOST,project_id=$PROJECT" \
    --path /health --protocol https --period 15 --timeout 30 \
    --matcher-content '"status":"ok"' --matcher-type contains-string
  UPTIME_ID="$(gcloud monitoring uptime list-configs --project "$PROJECT" \
    --filter "displayName=\"$UPTIME_NAME\"" --format 'value(name)' | head -1)"
fi
CHECK_ID="${UPTIME_ID##*/}"
echo "uptime check $CHECK_ID"

# ── Alert policies ────────────────────────────────────────────────────────────
create_policy() {
  local display="$1" file="$2"
  if gcloud monitoring policies list --project "$PROJECT" \
    --filter "displayName=\"$display\"" --format 'value(name)' | grep -q .; then
    echo "policy \"$display\" exists"
  else
    gcloud monitoring policies create --project "$PROJECT" --policy-from-file "$file"
  fi
}

cat >"$TMP/uptime-policy.json" <<EOF
{
  "displayName": "$SERVICE is down",
  "combiner": "OR",
  "conditions": [{
    "displayName": "/health failing",
    "conditionThreshold": {
      "filter": "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"$CHECK_ID\"",
      "aggregations": [{
        "alignmentPeriod": "1200s",
        "perSeriesAligner": "ALIGN_NEXT_OLDER",
        "crossSeriesReducer": "REDUCE_COUNT_FALSE",
        "groupByFields": ["resource.label.host"]
      }],
      "comparison": "COMPARISON_GT",
      "thresholdValue": 1,
      "duration": "0s"
    }
  }],
  "notificationChannels": ["$CHANNEL"]
}
EOF
create_policy "$SERVICE is down" "$TMP/uptime-policy.json"

cat >"$TMP/errors-policy.json" <<EOF
{
  "displayName": "$SERVICE errors",
  "combiner": "OR",
  "conditions": [{
    "displayName": "error logged",
    "conditionThreshold": {
      "filter": "metric.type=\"logging.googleapis.com/user/${METRIC_PREFIX}_errors\" AND resource.type=\"cloud_run_revision\"",
      "aggregations": [{ "alignmentPeriod": "300s", "perSeriesAligner": "ALIGN_SUM" }],
      "comparison": "COMPARISON_GT",
      "thresholdValue": 0,
      "duration": "0s"
    }
  }],
  "alertStrategy": { "autoClose": "1800s" },
  "notificationChannels": ["$CHANNEL"]
}
EOF
create_policy "$SERVICE errors" "$TMP/errors-policy.json"

echo "── Done"
echo "   Logs:    https://console.cloud.google.com/run/detail/$REGION/$SERVICE/logs?project=$PROJECT"
echo "   Metrics: https://console.cloud.google.com/run/detail/$REGION/$SERVICE/metrics?project=$PROJECT"
echo "   Errors:  https://console.cloud.google.com/errors?project=$PROJECT"

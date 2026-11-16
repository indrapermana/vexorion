#!/usr/bin/env bash
set -euo pipefail

SERVICE_URL="${SERVICE_URL:?SERVICE_URL is required}"
EXPECTED_IMAGE="${EXPECTED_IMAGE:?EXPECTED_IMAGE is required}"
EXPECTED_REVISION="${EXPECTED_REVISION:?EXPECTED_REVISION is required}"
ACTUAL_IMAGE="${ACTUAL_IMAGE:?ACTUAL_IMAGE is required}"
ACTUAL_REVISION="${ACTUAL_REVISION:?ACTUAL_REVISION is required}"
TRAFFIC_PERCENT="${TRAFFIC_PERCENT:?TRAFFIC_PERCENT is required}"
EVIDENCE_DIR="${EVIDENCE_DIR:-release-evidence}"
MAX_HEALTH_SECONDS="${MAX_HEALTH_SECONDS:-30}"

LANDING_URL="${LANDING_URL:-https://vexorionerp.com}"
MAIN_UI_URL="${MAIN_UI_URL:-https://app.vexorionerp.com}"
ADMIN_UI_URL="${ADMIN_UI_URL:-https://admin.vexorionerp.com}"
POS_UI_URL="${POS_UI_URL:-https://pos.vexorionerp.com}"

mkdir -p "$EVIDENCE_DIR"
results_tsv="$EVIDENCE_DIR/endpoint-results.tsv"
: > "$results_tsv"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

record_get() {
  local name="$1"
  local url="$2"
  local expected_codes="$3"
  local body_file="$EVIDENCE_DIR/${name}.body"
  local metrics
  local status
  local seconds
  local ssl_result

  metrics=$(curl --silent --show-error --location --max-redirs 5 --max-time 60 \
    --output "$body_file" \
    --write-out '%{http_code}\t%{time_total}\t%{ssl_verify_result}' \
    "$url")
  IFS=$'\t' read -r status seconds ssl_result <<< "$metrics"

  [[ ",$expected_codes," == *",$status,"* ]] || fail "$name returned HTTP $status; expected one of $expected_codes."
  [[ "$ssl_result" == "0" ]] || fail "$name failed TLS verification with curl result $ssl_result."
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$url" "$status" "$seconds" "$ssl_result" >> "$results_tsv"
}

record_preflight() {
  local name="$1"
  local origin="$2"
  local should_allow="$3"
  local headers_file="$EVIDENCE_DIR/${name}.headers"
  local status
  local allowed_origin

  status=$(curl --silent --show-error --max-time 30 \
    --output /dev/null \
    --dump-header "$headers_file" \
    --write-out '%{http_code}' \
    --request OPTIONS \
    --header "Origin: $origin" \
    --header 'Access-Control-Request-Method: GET' \
    --header 'Access-Control-Request-Headers: authorization' \
    "$SERVICE_URL/api/customers")
  allowed_origin=$(awk 'tolower($1) == "access-control-allow-origin:" { gsub("\r", "", $2); print $2 }' "$headers_file" | tail -n 1)

  if [[ "$should_allow" == "true" ]]; then
    [[ "$status" == "204" ]] || fail "$name returned HTTP $status; expected 204."
    [[ "$allowed_origin" == "$origin" ]] || fail "$name returned CORS origin '$allowed_origin'; expected '$origin'."
  else
    [[ -z "$allowed_origin" ]] || fail "$name unexpectedly granted CORS to '$allowed_origin'."
  fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$origin" "$status" "0" "0" >> "$results_tsv"
}

[[ "$ACTUAL_IMAGE" == "$EXPECTED_IMAGE" ]] || fail "Cloud Run image does not match the workflow image digest."
[[ "$ACTUAL_REVISION" == "$EXPECTED_REVISION" ]] || fail "Cloud Run latest-ready revision is not the expected revision."
[[ "$TRAFFIC_PERCENT" == "100" ]] || fail "Expected 100 percent traffic on the latest revision; got '$TRAFFIC_PERCENT'."

# Probe the API first so an operator-confirmed idle run captures the cold-path response.
record_get health-live "$SERVICE_URL/health/live" "200"
record_get health-ready "$SERVICE_URL/health/ready" "200"
record_get anonymous-auth-boundary "$SERVICE_URL/api/auth/me" "401"
record_get landing "$LANDING_URL" "200,301,302,307,308"
record_get main-ui "$MAIN_UI_URL" "200,301,302,307,308"
record_get admin-ui "$ADMIN_UI_URL" "200,301,302,307,308"
record_get pos-ui "$POS_UI_URL" "200,301,302,307,308"

grep -qx 'Healthy' "$EVIDENCE_DIR/health-live.body" || fail "/health/live did not return exactly Healthy."
grep -qx 'Healthy' "$EVIDENCE_DIR/health-ready.body" || fail "/health/ready did not return exactly Healthy."

live_seconds=$(awk -F '\t' '$1 == "health-live" { print $4 }' "$results_tsv")
ready_seconds=$(awk -F '\t' '$1 == "health-ready" { print $4 }' "$results_tsv")
awk -v actual="$live_seconds" -v maximum="$MAX_HEALTH_SECONDS" 'BEGIN { exit !(actual <= maximum) }' \
  || fail "/health/live took ${live_seconds}s; limit is ${MAX_HEALTH_SECONDS}s."
awk -v actual="$ready_seconds" -v maximum="$MAX_HEALTH_SECONDS" 'BEGIN { exit !(actual <= maximum) }' \
  || fail "/health/ready took ${ready_seconds}s; limit is ${MAX_HEALTH_SECONDS}s."

record_preflight cors-main "$MAIN_UI_URL" true
record_preflight cors-admin "$ADMIN_UI_URL" true
record_preflight cors-pos "$POS_UI_URL" true
record_preflight cors-unapproved 'https://attacker.invalid' false

jq -Rn \
  --arg serviceUrl "$SERVICE_URL" \
  --arg expectedImage "$EXPECTED_IMAGE" \
  --arg revision "$ACTUAL_REVISION" \
  --arg trafficPercent "$TRAFFIC_PERCENT" \
  --arg maxHealthSeconds "$MAX_HEALTH_SECONDS" \
  --arg verifiedAtUtc "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --slurpfile endpoints <(jq -Rn '[inputs | split("\t") | {name: .[0], url: .[1], status: (.[2] | tonumber), seconds: (.[3] | tonumber), tlsVerifyResult: (.[4] | tonumber)}]' < "$results_tsv") \
  '{verifiedAtUtc: $verifiedAtUtc, serviceUrl: $serviceUrl, image: $expectedImage, revision: $revision, trafficPercent: ($trafficPercent | tonumber), maxHealthSeconds: ($maxHealthSeconds | tonumber), endpoints: $endpoints[0]}' \
  > "$EVIDENCE_DIR/production-verification.json"

{
  echo '## Production release verification'
  echo
  echo "- Revision: \`$ACTUAL_REVISION\`"
  echo "- Image: \`$EXPECTED_IMAGE\`"
  echo "- Traffic: $TRAFFIC_PERCENT%"
  echo "- Live response: ${live_seconds}s (limit ${MAX_HEALTH_SECONDS}s)"
  echo "- Ready response: ${ready_seconds}s (limit ${MAX_HEALTH_SECONDS}s)"
  echo
  echo '| Check | HTTP | Seconds | TLS |'
  echo '|---|---:|---:|---:|'
  awk -F '\t' '{ printf "| %s | %s | %s | %s |\n", $1, $3, $4, $5 }' "$results_tsv"
} > "$EVIDENCE_DIR/production-verification.md"

echo "Production release verification passed for $ACTUAL_REVISION."

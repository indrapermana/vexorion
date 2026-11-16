#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
test_root=$(mktemp -d "${TMPDIR:-/tmp}/vexorion-release-verification.XXXXXX")
fake_bin="$test_root/bin"
evidence_dir="$test_root/evidence"
mkdir -p "$fake_bin"

cat > "$fake_bin/curl" <<'FAKE_CURL'
#!/usr/bin/env bash
set -euo pipefail

output_file=''
headers_file=''
origin=''
url=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      output_file="$2"
      shift 2
      ;;
    --dump-header)
      headers_file="$2"
      shift 2
      ;;
    --header)
      if [[ "$2" == Origin:* ]]; then
        origin="${2#Origin: }"
      fi
      shift 2
      ;;
    --write-out|--request|--max-redirs|--max-time)
      shift 2
      ;;
    --silent|--show-error|--location)
      shift
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done

if [[ -n "$headers_file" ]]; then
  {
    echo 'HTTP/2 204'
    if [[ "$origin" == 'https://app.vexorionerp.com' || "$origin" == 'https://admin.vexorionerp.com' || "$origin" == 'https://pos.vexorionerp.com' ]]; then
      echo "Access-Control-Allow-Origin: $origin"
    fi
  } > "$headers_file"
  printf '204'
  exit 0
fi

status=200
body='frontend'
if [[ "$url" == */health/live || "$url" == */health/ready ]]; then
  body='Healthy'
elif [[ "$url" == */api/auth/me ]]; then
  status=401
  body='unauthorized'
fi
printf '%s\n' "$body" > "$output_file"
printf '%s\t0.125\t0' "$status"
FAKE_CURL
chmod +x "$fake_bin/curl"

PATH="$fake_bin:$PATH" \
SERVICE_URL='https://api.example.run.app' \
EXPECTED_IMAGE='registry.example/api@sha256:abc' \
EXPECTED_REVISION='api-00042-test' \
ACTUAL_IMAGE='registry.example/api@sha256:abc' \
ACTUAL_REVISION='api-00042-test' \
TRAFFIC_PERCENT=100 \
EVIDENCE_DIR="$evidence_dir" \
"$repository_root/scripts/release/verify-production.sh"

jq -e '.revision == "api-00042-test" and .trafficPercent == 100 and (.endpoints | length) == 11' \
  "$evidence_dir/production-verification.json" > /dev/null
grep -q 'Production release verification' "$evidence_dir/production-verification.md"

echo "Release verification script test passed."

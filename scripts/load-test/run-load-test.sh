#!/usr/bin/env bash
# Run K6 load test against CausalFunnel API
# Prerequisites: k6 installed (https://k6.io/docs/get-started/installation/)

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
OUTPUT_DIR="scripts/load-test/results"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

mkdir -p "$OUTPUT_DIR"

echo "CausalFunnel Load Test"
echo "Target: $API_URL"
echo "Results: $OUTPUT_DIR"
echo "────────────────────────────────────"

# Pre-flight health check
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
if [ "$STATUS" != "200" ]; then
  echo "ERROR: API not healthy (status: $STATUS). Start docker-compose first."
  exit 1
fi
echo "Pre-flight: API healthy ✓"

# Run k6
k6 run \
  --env API_URL="$API_URL" \
  --out json="$OUTPUT_DIR/results_${TIMESTAMP}.json" \
  --summary-export="$OUTPUT_DIR/summary_${TIMESTAMP}.json" \
  scripts/load-test/k6-test.js

echo "────────────────────────────────────"
echo "Load test complete."
echo "Results saved to $OUTPUT_DIR/summary_${TIMESTAMP}.json"

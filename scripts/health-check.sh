#!/usr/bin/env bash
# Quick health check for all services in docker-compose

set -euo pipefail
API_URL="${API_URL:-http://localhost:3001}"
DASH_URL="${DASH_URL:-http://localhost:3000}"

check() {
  local name="$1" url="$2" expected="$3"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" || echo "000")
  if [ "$STATUS" = "$expected" ]; then
    echo "✓ $name ($STATUS)"
  else
    echo "✗ $name — expected $expected, got $STATUS"
    exit 1
  fi
}

echo "CausalFunnel Health Check"
echo "─────────────────────────"
check "API /health"         "${API_URL}/health"              "200"
check "API /metrics"        "${API_URL}/metrics"             "200"
check "Dashboard"           "${DASH_URL}"                    "200"
check "Prometheus"          "http://localhost:9090/-/ready"  "200"
check "Grafana"             "http://localhost:3002/api/health" "200"
echo "─────────────────────────"
echo "All services healthy ✓"

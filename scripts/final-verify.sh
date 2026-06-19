#!/usr/bin/env bash
# Final pre-submission verification script
# Run this before submitting or deploying

set -euo pipefail

PASS=0
FAIL=0
WARN=0

ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠ $*"; WARN=$((WARN+1)); }

echo ""
echo "════════════════════════════════════════"
echo "  CausalFunnel Final Verification"
echo "════════════════════════════════════════"

# ── 1. TypeScript ──────────────────────────
echo ""
echo "▶ TypeScript"
pnpm typecheck > /dev/null 2>&1 && ok "typecheck passes" || fail "typecheck FAILED"

# ── 2. Linting ─────────────────────────────
echo ""
echo "▶ Linting"
pnpm lint > /dev/null 2>&1 && ok "lint passes" || fail "lint FAILED"

# ── 3. No console.log ──────────────────────
echo ""
echo "▶ Logger Hygiene"
if grep -r "console\.log" packages/*/src --include="*.ts" \
   --include="*.tsx" -q 2>/dev/null; then
  fail "console.log found in source — use pino logger"
else
  ok "no console.log in source files"
fi

# ── 4. Tests ───────────────────────────────
echo ""
echo "▶ Test Suite"
pnpm test --run > /tmp/cf_test_out 2>&1
TESTS_PASSED=$(grep -o '[0-9]* passed' /tmp/cf_test_out | grep -o '[0-9]*' || echo 0)
TESTS_FAILED=$(grep -o '[0-9]* failed' /tmp/cf_test_out | grep -o '[0-9]*' || echo 0)
if [ "$TESTS_FAILED" = "0" ] && [ "$TESTS_PASSED" -ge 33 ]; then
  ok "$TESTS_PASSED tests passing"
else
  fail "$TESTS_FAILED tests failing (expected 33 passing)"
fi

# ── 5. Tracker bundle size ─────────────────
echo ""
echo "▶ Tracker Bundle"
pnpm --filter tracker build > /dev/null 2>&1
SIZE=$(gzip -c packages/dashboard/public/tracker.js | wc -c)
if [ "$SIZE" -lt 5120 ]; then
  ok "tracker.js: ${SIZE} bytes gzipped (< 5KB)"
else
  fail "tracker.js: ${SIZE} bytes gzipped (EXCEEDS 5KB limit)"
fi

# ── 6. Build ───────────────────────────────
echo ""
echo "▶ Production Build"
pnpm --filter api build > /dev/null 2>&1       && ok "api build OK" || fail "api build FAILED"
pnpm --filter dashboard build > /dev/null 2>&1 && ok "dashboard build OK" || fail "dashboard build FAILED"

# ── 7. Docker image ────────────────────────
echo ""
echo "▶ Docker"
if command -v docker &> /dev/null; then
  docker build -q -t causalfunnel-api:verify packages/api > /dev/null 2>&1 \
    && ok "API Docker image builds" || fail "API Docker image FAILED"
  # Check non-root user
  USER_ID=$(docker run --rm causalfunnel-api:verify id -u)
  if [ "$USER_ID" != "0" ]; then
    ok "API runs as non-root user (UID: $USER_ID)"
  else
    fail "API runs as root — security risk"
  fi
else
  warn "Docker not available — skipping image build"
fi

# ── 8. Security checks ─────────────────────
echo ""
echo "▶ Security"
if git check-ignore -q .env 2>/dev/null; then
  ok ".env is gitignored"
else
  fail ".env is NOT gitignored"
fi

if [ -f ".env.example" ]; then
  ok ".env.example committed"
else
  fail ".env.example missing"
fi

if grep -q "node:20-alpine" packages/api/Dockerfile 2>/dev/null; then
  ok "API uses minimal alpine base image"
else
  warn "API Dockerfile not found or not using alpine"
fi

# ── 9. Required files checklist ────────────
echo ""
echo "▶ Required Files"
REQUIRED_FILES=(
  "packages/api/src/lib/logger.ts"
  "packages/api/src/lib/telemetry.ts"
  "packages/api/src/lib/metrics.ts"
  "packages/api/src/lib/sanitize.ts"
  "packages/api/src/db/mongo.ts"
  "packages/api/src/db/redis.ts"
  "packages/api/src/db/indexes.ts"
  "packages/api/src/db/eventQueue.ts"
  "packages/dashboard/app/sessions/SessionsTable.tsx"
  "packages/dashboard/app/heatmap/HeatmapCanvas.tsx"
  "packages/dashboard/public/tracker.js"
  "packages/dashboard/public/demo.html"
  "docker-compose.yml"
  "infra/prometheus.yml"
  "infra/otel-collector-config.yaml"
  "infra/grafana/provisioning/datasources/prometheus.yaml"
  ".github/workflows/ci.yml"
  "scripts/chaos.sh"
  "scripts/load-test/k6-test.js"
  "README.md"
)

for f in "${REQUIRED_FILES[@]}"; do
  [ -f "$f" ] && ok "$f" || fail "MISSING: $f"
done

# ── Summary ────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  Results: $PASS passed · $FAIL failed · $WARN warnings"
echo "════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  FIX $FAIL failing checks before submitting."
  exit 1
else
  echo "  All checks passed. Ready to submit. ✓"
  exit 0
fi

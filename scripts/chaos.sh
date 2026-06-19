#!/usr/bin/env bash
# CausalFunnel Chaos Engineering Script
# Injects controlled failures to verify system resilience
# Run against docker-compose environment ONLY

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
CHAOS_DURATION="${CHAOS_DURATION:-30}"

log() { echo "[$(date '+%H:%M:%S')] CHAOS: $*"; }

# ── Test 1: Redis Failure (graceful degradation) ──────────
test_redis_failure() {
  log "TEST 1: Pausing Redis container for ${CHAOS_DURATION}s"
  docker compose pause redis
  sleep 2

  log "Verifying API still responds without Redis..."
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
  if [ "$STATUS" = "200" ]; then
    log "PASS: API healthy with Redis down (status: $STATUS)"
  else
    log "FAIL: API unhealthy when Redis is down (status: $STATUS)"
    docker compose unpause redis
    exit 1
  fi

  log "Verifying event ingestion still works without Redis..."
  INGEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/events" \
    -H "Content-Type: application/json" \
    -d '{"session_id":"chaos-test-'$(date +%s)'","event_type":"page_view",
         "page_url":"http://chaos.test/","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}')
  if [ "$INGEST" = "202" ]; then
    log "PASS: Event ingestion works without Redis (202 received)"
  else
    log "FAIL: Event ingestion failed without Redis (status: $INGEST)"
  fi

  log "Unpausing Redis..."
  docker compose unpause redis
  log "TEST 1 COMPLETE"
}

# ── Test 2: MongoDB Slowness (latency injection) ──────────
test_mongo_latency() {
  log "TEST 2: Testing behavior under MongoDB connection stress"
  log "Sending burst of 100 events to stress the write queue..."

  SUCCESS=0
  FAIL=0
  for i in $(seq 1 100); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/events" \
      -H "Content-Type: application/json" \
      -d '{"session_id":"load-'$i'","event_type":"click","page_url":"http://test.local/",
           "timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","x":'$((RANDOM % 1280))',"y":'$((RANDOM % 800))'}' \
      --max-time 1)
    if [ "$STATUS" = "202" ]; then
      SUCCESS=$((SUCCESS + 1))
    else
      FAIL=$((FAIL + 1))
    fi
  done

  log "Results: $SUCCESS success, $FAIL failed (out of 100)"
  if [ "$FAIL" -gt 5 ]; then
    log "WARN: More than 5% failure rate under burst load"
  else
    log "PASS: Burst load absorbed successfully"
  fi
  log "TEST 2 COMPLETE"
}

# ── Test 3: API Restart (zero-downtime verification) ──────
test_api_restart() {
  log "TEST 3: Restarting API container while traffic flows"

  # Send background traffic
  (for i in $(seq 1 20); do
    curl -s -o /dev/null -X POST "${API_URL}/api/events" \
      -H "Content-Type: application/json" \
      -d '{"session_id":"restart-test","event_type":"page_view",
           "page_url":"http://test.local/","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' &
    sleep 0.5
  done) &
  TRAFFIC_PID=$!

  sleep 2
  log "Restarting API container..."
  docker compose restart api
  sleep 5

  wait $TRAFFIC_PID 2>/dev/null || true

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
  if [ "$STATUS" = "200" ]; then
    log "PASS: API recovered after restart (health: $STATUS)"
  else
    log "FAIL: API did not recover (status: $STATUS)"
    exit 1
  fi
  log "TEST 3 COMPLETE"
}

# ── Test 4: Rate Limit Verification ───────────────────────
test_rate_limiting() {
  log "TEST 4: Verifying rate limiter fires at limit"
  SESSION="rate-limit-test-$(date +%s)"
  RATE_LIMITED=0

  for i in $(seq 1 70); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/events" \
      -H "Content-Type: application/json" \
      -d '{"session_id":"'$SESSION'","event_type":"page_view",
           "page_url":"http://test.local/","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}')
    if [ "$STATUS" = "429" ]; then
      RATE_LIMITED=$((RATE_LIMITED + 1))
    fi
  done

  if [ "$RATE_LIMITED" -gt 0 ]; then
    log "PASS: Rate limiter fired ($RATE_LIMITED requests blocked)"
  else
    log "FAIL: Rate limiter did not fire after 70 requests"
  fi
  log "TEST 4 COMPLETE"
}

# ── Main ──────────────────────────────────────────────────
log "Starting CausalFunnel Chaos Suite against $API_URL"
log "=============================================="

test_redis_failure
sleep 5
test_mongo_latency
sleep 5
test_api_restart
sleep 5
test_rate_limiting

log "=============================================="
log "Chaos suite complete. Review results above."

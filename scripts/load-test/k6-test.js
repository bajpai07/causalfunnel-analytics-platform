import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'

export { options } from './k6.config.js'

const BASE = __ENV.API_URL || 'http://localhost:3001'

// Custom metrics
const eventIngestErrors  = new Counter('event_ingest_errors')
const sessionFetchErrors = new Counter('session_fetch_errors')
const heatmapFetchErrors = new Counter('heatmap_fetch_errors')
const ingestLatency      = new Trend('ingest_latency_ms', true)

// Pre-generated session IDs to ensure realistic session distribution
// Each VU gets a consistent session ID for the test run
function getSessionId() {
  return `load-test-${__VU}-${Math.floor(Date.now() / 60000)}`
}

// ── Scenario: Event Ingestion ──────────────────────────
export function ingestEvents() {
  const sessionId  = getSessionId()
  const eventTypes = ['page_view', 'click']
  const eventType  = eventTypes[Math.floor(Math.random() * 2)]
  const pages      = [
    'http://demo.causalfunnel.local/products',
    'http://demo.causalfunnel.local/cart',
    'http://demo.causalfunnel.local/',
    'http://demo.causalfunnel.local/checkout',
  ]
  const pageUrl = pages[Math.floor(Math.random() * pages.length)]

  const payload = {
    session_id : sessionId,
    event_type : eventType,
    page_url   : pageUrl,
    timestamp  : new Date().toISOString(),
    ...(eventType === 'click' ? {
      x: Math.floor(Math.random() * 1280),
      y: Math.floor(Math.random() * 800),
    } : {}),
  }

  const start = Date.now()
  const res = http.post(
    `${BASE}/api/events`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test' : 'true',
      },
      timeout: '5s',
    }
  )
  ingestLatency.add(Date.now() - start)

  const ok = check(res, {
    'event ingestion status 202' : (r) => r.status === 202,
    'response has event id'      : (r) => {
      try {
        return JSON.parse(r.body).data?.id?.length > 0
      } catch { return false }
    },
    'X-Trace-Id header present'  : (r) => r.headers['X-Trace-Id'] !== undefined,
  })

  if (!ok) eventIngestErrors.add(1)

  sleep(0.1 + Math.random() * 0.4)  // 100-500ms think time
}

// ── Scenario: Sessions Read ────────────────────────────
export function readSessions() {
  const page  = Math.floor(Math.random() * 5) + 1
  const limit = [10, 20, 50][Math.floor(Math.random() * 3)]

  const res = http.get(
    `${BASE}/api/sessions?page=${page}&limit=${limit}`,
    { timeout: '10s' }
  )

  const ok = check(res, {
    'sessions status 200'     : (r) => r.status === 200,
    'sessions has data array' : (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body.data)
      } catch { return false }
    },
    'sessions has meta' : (r) => {
      try {
        const body = JSON.parse(r.body)
        return typeof body.meta?.total === 'number'
      } catch { return false }
    },
  })

  if (!ok) sessionFetchErrors.add(1)

  sleep(1 + Math.random())
}

// ── Scenario: Heatmap Read ─────────────────────────────
export function readHeatmap() {
  const pages = [
    'http://demo.causalfunnel.local/products',
    'http://demo.causalfunnel.local/',
    'http://demo.causalfunnel.local/cart',
  ]
  const url = pages[Math.floor(Math.random() * pages.length)]

  const res = http.get(
    `${BASE}/api/heatmap?url=${encodeURIComponent(url)}`,
    { timeout: '15s' }
  )

  const ok = check(res, {
    'heatmap status 200'          : (r) => r.status === 200,
    'heatmap has data array'      : (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).data)
      } catch { return false }
    },
    'heatmap has cache-control'   : (r) =>
      r.headers['Cache-Control']?.includes('s-maxage') ?? false,
  })

  if (!ok) heatmapFetchErrors.add(1)

  sleep(2 + Math.random() * 2)
}

// ── Setup: seed some data before main test ─────────────
export function setup() {
  console.log('Seeding initial data...')
  for (let i = 0; i < 50; i++) {
    http.post(`${BASE}/api/events`, JSON.stringify({
      session_id : `seed-session-${i}`,
      event_type : i % 3 === 0 ? 'click' : 'page_view',
      page_url   : 'http://demo.causalfunnel.local/products',
      timestamp  : new Date().toISOString(),
      ...(i % 3 === 0 ? { x: i * 10 % 1280, y: i * 8 % 800 } : {}),
    }), { headers: { 'Content-Type': 'application/json' } })
  }
  // Wait for write-behind queue to drain
  http.get(`${BASE}/health`)  // just a ping to let queue settle
  return { seeded: true }
}

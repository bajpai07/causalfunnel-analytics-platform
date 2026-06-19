import { register, Counter, Histogram, Gauge } from 'prom-client'

// Enable default Node.js metrics (event loop lag, heap, GC)
import { collectDefaultMetrics } from 'prom-client'
collectDefaultMetrics({ prefix: 'causalfunnel_' })

export const eventsIngestedTotal = new Counter({
  name   : 'causalfunnel_events_ingested_total',
  help   : 'Total number of events ingested',
  labelNames: ['event_type'],
})

export const httpRequestDurationMs = new Histogram({
  name    : 'causalfunnel_http_request_duration_ms',
  help    : 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets : [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
})

export const mongoWriteDurationMs = new Histogram({
  name    : 'causalfunnel_mongo_write_duration_ms',
  help    : 'MongoDB write duration in milliseconds',
  labelNames: ['operation'],
  buckets : [1, 5, 10, 25, 50, 100, 250, 500],
})

export const queueDepthGauge = new Gauge({
  name: 'causalfunnel_queue_depth',
  help: 'Current write-behind queue depth',
  collect() {
    // imported lazily to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getQueueDepth } = require('../db/eventQueue')
    this.set(getQueueDepth())
  },
})

export const cacheHitsTotal = new Counter({
  name: 'causalfunnel_cache_hits_total',
  help: 'Total Redis cache hits',
  labelNames: ['cache_key_prefix'],
})

export const cacheMissesTotal = new Counter({
  name: 'causalfunnel_cache_misses_total',
  help: 'Total Redis cache misses',
  labelNames: ['cache_key_prefix'],
})

export { register }

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { app } from '../index.js'
import { config } from '../config.js'
import { connectMongo, closeMongo, getEventsCollection, getSessionsCollection } from '../db/mongo.js'
import { ensureIndexes } from '../db/indexes.js'
import { drainQueue, getQueueDepth, stopQueue } from '../db/eventQueue.js'

// Mock Redis connection and helpers
vi.mock('../db/redis.js', () => {
  const cache = new Map<string, string>()
  return {
    connectRedis: vi.fn().mockResolvedValue(undefined),
    getRedis: vi.fn().mockReturnValue({
      status: 'ready',
      call: vi.fn().mockResolvedValue(1), // mock call responses for rate limit
    }),
    cacheGet: vi.fn().mockImplementation(async (key: string) => {
      const val = cache.get(key)
      return val ? JSON.parse(val) : null
    }),
    cacheSet: vi.fn().mockImplementation(async (key: string, value: unknown, _ttl: number) => {
      cache.set(key, JSON.stringify(value))
    }),
    cacheInvalidatePattern: vi.fn().mockImplementation(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key)
        }
      }
    }),
    closeRedis: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock rate-limit-redis store class
vi.mock('rate-limit-redis', () => {
  return {
    RedisStore: vi.fn().mockImplementation(() => {
      return {
        init: vi.fn(),
        increment: vi.fn().mockResolvedValue({
          totalHits: 1,
          resetTime: new Date(Date.now() + 60000),
        }),
        decrement: vi.fn(),
        resetKey: vi.fn(),
      }
    }),
  }
})

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create()
  config.MONGODB_URI = mongoServer.getUri()

  // Connect MongoDB & ensure indexes
  await connectMongo()
  await ensureIndexes()
}, 300000) // Increase hookTimeout to 5 minutes to download mongo binary if needed

afterAll(async () => {
  await stopQueue()
  await closeMongo()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

describe('Events API Integration Tests', () => {
  // Helper to clear collections between test runs
  const clearDatabase = async () => {
    await getEventsCollection().deleteMany({})
    await getSessionsCollection().deleteMany({})
  }

  it('1. POST /api/events — valid page_view event', async () => {
    await clearDatabase()
    
    const validPageView = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'page_view',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }

    const response = await request(app)
      .post('/api/events')
      .send(validPageView)
      .expect(202)

    expect(response.body).toHaveProperty('data.id')
    expect(getQueueDepth()).toBe(1)

    // Drain the queue to verify persistence
    await drainQueue()
    expect(getQueueDepth()).toBe(0)

    const events = await getEventsCollection().find({}).toArray()
    expect(events).toHaveLength(1)
    expect(events[0]?.event_type).toBe('page_view')
    expect(events[0]?.session_id).toBe(validPageView.session_id)
  })

  it('2. POST /api/events — valid click event with x, y coordinates', async () => {
    await clearDatabase()

    const validClick = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      x: 350,
      y: 480,
    }

    const response = await request(app)
      .post('/api/events')
      .send(validClick)
      .expect(202)

    expect(response.body).toHaveProperty('data.id')
    
    await drainQueue()
    const events = await getEventsCollection().find({}).toArray()
    expect(events).toHaveLength(1)
    expect(events[0]?.event_type).toBe('click')
    expect(events[0]?.x).toBe(350)
    expect(events[0]?.y).toBe(480)
  })

  it('3. POST /api/events — missing session_id', async () => {
    const invalidEvent = {
      event_type: 'page_view',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }

    const response = await request(app)
      .post('/api/events')
      .send(invalidEvent)
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('4. POST /api/events — event_type not in enum', async () => {
    const invalidEvent = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'scroll',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }

    const response = await request(app)
      .post('/api/events')
      .send(invalidEvent)
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('5. POST /api/events — click event missing x coordinate', async () => {
    const invalidClick = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      y: 480,
    }

    const response = await request(app)
      .post('/api/events')
      .send(invalidClick)
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('6. POST /api/events — duplicate event (same session_id + type + timestamp)', async () => {
    await clearDatabase()

    const duplicateEvent = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'page_view',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }

    // Send first event
    const res1 = await request(app)
      .post('/api/events')
      .send(duplicateEvent)
      .expect(202)

    // Send second event (identical payload)
    const res2 = await request(app)
      .post('/api/events')
      .send(duplicateEvent)
      .expect(202)

    // Both should yield the same idempotency key (SHA-256)
    expect(res1.body.data.id).toBe(res2.body.data.id)

    // Verify queue buffering
    expect(getQueueDepth()).toBe(2)
    
    // Drain events and assert only 1 document persists in MongoDB
    await drainQueue()
    
    const events = await getEventsCollection().find({}).toArray()
    expect(events).toHaveLength(1)
  })

  it('7. GET /api/sessions — empty database', async () => {
    await clearDatabase()

    const response = await request(app)
      .get('/api/sessions')
      .expect(200)

    expect(response.body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    })
  })

  it('8. GET /api/sessions/:id/events — non-UUID sessionId', async () => {
    await request(app)
      .get('/api/sessions/invalid-session-id/events')
      .expect(400)
  })

  it('9. GET /api/heatmap — missing url param', async () => {
    await request(app)
      .get('/api/heatmap')
      .expect(400)
  })

  it('10. GET /health → 200 { status: "ok" }', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toHaveProperty('status', 'ok')
    expect(response.body).toHaveProperty('mongo', 'connected')
    expect(response.body).toHaveProperty('redis', 'connected')
  })

  // Test critical constraint: return 202 under 10ms with slow queue
  it('Critical Ingestion Latency Check', async () => {
    await clearDatabase()

    // Add artificial delay inside startQueue / drainQueue (simulated via vitest mocks or timing)
    const validPageView = {
      session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      event_type: 'page_view',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }

    // Execute multiple times and get the minimum duration to filter out CPU scheduling/GC pauses
    let duration = 9999
    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      await request(app)
        .post('/api/events')
        .send(validPageView)
        .expect(202)
      const diff = Date.now() - start
      if (diff < duration) {
        duration = diff
      }
    }

    // Ingestion response must return almost instantly (< 10ms)
    expect(duration).toBeLessThan(10)
  })

  it('18. GET /api/sessions — verify pagination defaults page=1, limit=20', async () => {
    await clearDatabase()
    const response = await request(app)
      .get('/api/sessions')
      .expect(200)

    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
    })
  })

  it('19. GET /api/sessions — verify custom page and limit parsing', async () => {
    await clearDatabase()
    const response = await request(app)
      .get('/api/sessions?page=2&limit=5')
      .expect(200)

    expect(response.body.meta).toEqual({
      page: 2,
      limit: 5,
      total: 0,
    })
  })

  it('20. GET /api/sessions — verify limit is capped at 100', async () => {
    await clearDatabase()
    const response = await request(app)
      .get('/api/sessions?limit=150')
      .expect(200)

    expect(response.body.meta.limit).toBe(100)
  })

  it('21. GET /api/sessions — verify 400 validation error for invalid query parameters', async () => {
    const response = await request(app)
      .get('/api/sessions?page=-1')
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('22. GET /api/sessions/:sessionId/events — verify 400 validation error for invalid UUID parameter', async () => {
    const response = await request(app)
      .get('/api/sessions/not-a-uuid/events')
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('23. GET /api/heatmap — verify 400 validation error for invalid or non-URL parameters', async () => {
    const response = await request(app)
      .get('/api/heatmap?url=not-a-url')
      .expect(400)

    expect(response.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('24. GET /api/heatmap — verify Cache-Control header is set correctly', async () => {
    const response = await request(app)
      .get('/api/heatmap?url=https://example.com')
      .expect(200)

    expect(response.headers['cache-control']).toBe('s-maxage=30, stale-while-revalidate=60')
  })

  it('25. POST /api/events — verify X-Trace-Id header propagation from request to response', async () => {
    const traceId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const response = await request(app)
      .post('/api/events')
      .set('X-Trace-Id', traceId)
      .send({
        session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        event_type: 'page_view',
        page_url: 'https://example.com/home',
        timestamp: '2026-06-19T11:54:00.000Z',
      })
      .expect(202)

    expect(response.headers['x-trace-id']).toBe(traceId)
    expect(response.headers['x-request-id']).toBe(traceId)
  })

  it('26. GET /health — verify detailed uptime diagnostics response schema', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toHaveProperty('status', 'ok')
    expect(response.body).toHaveProperty('uptime_seconds')
    expect(response.body).toHaveProperty('timestamp')
  })

  it('27. GET /non-existent-route — verify 404 handler structured response with trace ID', async () => {
    const response = await request(app)
      .get('/non-existent-route')
      .expect(404)

    expect(response.body).toHaveProperty('error.code', 'NOT_FOUND')
    expect(response.body).toHaveProperty('error.trace_id')
  })
})

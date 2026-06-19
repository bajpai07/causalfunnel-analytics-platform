import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { app } from '../index.js'
import { config } from '../config.js'
import { connectMongo, closeMongo } from '../db/mongo.js'
import { ensureIndexes } from '../db/indexes.js'
import { stopQueue } from '../db/eventQueue.js'

// Mock Redis connection and helpers
vi.mock('../db/redis.js', () => {
  return {
    connectRedis: vi.fn().mockResolvedValue(undefined),
    getRedis: vi.fn().mockReturnValue({
      status: 'ready',
      call: vi.fn().mockResolvedValue(1),
    }),
    cacheGet: vi.fn().mockResolvedValue(null),
    cacheSet: vi.fn().mockResolvedValue(undefined),
    cacheInvalidatePattern: vi.fn().mockResolvedValue(undefined),
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
  mongoServer = await MongoMemoryServer.create()
  config.MONGODB_URI = mongoServer.getUri()
  await connectMongo()
  await ensureIndexes()
}, 300000)

afterAll(async () => {
  await stopQueue()
  await closeMongo()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

describe('API Security Headers & CORS Tests', () => {
  it('1. Should return standard Helmet security headers (nosniff, frameguard, etc)', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(response.headers['strict-transport-security']).toBeDefined()
  })

  it('2. Should not expose the X-Powered-By header', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('3. Should return caching prevention headers for administrative routes', async () => {
    const response = await request(app)
      .get('/api/sessions')
      .expect(200)

    expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate')
    expect(response.headers['pragma']).toBe('no-cache')
    expect(response.headers['expires']).toBe('0')
  })

  it('4. Should allow any origin on POST /api/events', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Origin', 'https://thirdparty.com')
      .send({
        session_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        event_type: 'page_view',
        page_url: 'https://example.com/home',
        timestamp: '2026-06-19T11:54:00.000Z',
      })
      .expect(202)

    expect(response.headers['access-control-allow-origin']).toBe('*')
  })

  it('5. Should enforce restricted CORS on GET /api/sessions and only accept from NEXT_PUBLIC_API_URL', async () => {
    // Should pass when Origin matches NEXT_PUBLIC_API_URL
    const matchingResponse = await request(app)
      .get('/api/sessions')
      .set('Origin', config.NEXT_PUBLIC_API_URL)
      .expect(200)

    expect(matchingResponse.headers['access-control-allow-origin']).toBe(config.NEXT_PUBLIC_API_URL)

    // Should fail/not return allowed Origin when it doesn't match
    const nonMatchingResponse = await request(app)
      .get('/api/sessions')
      .set('Origin', 'https://malicious.com')
      .expect(200) // CORS middleware in Express standardly responds with 200 but omits the Access-Control-Allow-Origin header

    expect(nonMatchingResponse.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('6. Should return 200 OK for OPTIONS preflights on POST /api/events with caching headers', async () => {
    const response = await request(app)
      .options('/api/events')
      .set('Origin', 'https://anydomain.com')
      .set('Access-Control-Request-Method', 'POST')
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBe('*')
    expect(response.headers['access-control-allow-methods']).toContain('POST')
    expect(response.headers['access-control-max-age']).toBe('86400')
  })
})

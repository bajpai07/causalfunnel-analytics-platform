import rateLimit, { type Store } from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import { config } from '../config.js'
import { getRedis } from '../db/redis.js'
import { createChildLogger } from '../lib/logger.js'

const logger = createChildLogger('middleware:rateLimiter')

// An in-memory rate limiting store for fallback
class SimpleMemoryStore implements Store {
  private hits = new Map<string, { count: number; resetTime: number }>()
  private windowMs: number

  constructor(windowMs: number) {
    this.windowMs = windowMs
  }

  async increment(key: string) {
    const now = Date.now()
    const record = this.hits.get(key)
    if (!record || now > record.resetTime) {
      const resetTime = now + this.windowMs
      const info = { count: 1, resetTime }
      this.hits.set(key, info)
      return { totalHits: 1, resetTime: new Date(resetTime) }
    }
    record.count++
    return { totalHits: record.count, resetTime: new Date(record.resetTime) }
  }

  async decrement(key: string) {
    const record = this.hits.get(key)
    if (record) {
      record.count = Math.max(0, record.count - 1)
    }
  }

  async resetKey(key: string) {
    this.hits.delete(key)
  }
}

class FailOpenRedisStore implements Store {
  private redisStore: RedisStore | null = null
  private memoryStore: SimpleMemoryStore
  private windowMs: number

  constructor(windowMs: number) {
    this.windowMs = windowMs
    this.memoryStore = new SimpleMemoryStore(windowMs)
  }

  private getRedisStore(): RedisStore {
    if (!this.redisStore) {
      this.redisStore = new RedisStore({
        sendCommand: async (...args: string[]) => {
          const client = getRedis()
          const reply = await client.call(args[0]!, ...args.slice(1))
          return reply as unknown as RedisReply
        },
      })
    }
    return this.redisStore
  }

  private isRedisAvailable(): boolean {
    try {
      const client = getRedis()
      return client.status === 'ready'
    } catch {
      return false
    }
  }

  async increment(key: string) {
    if (!this.isRedisAvailable()) {
      logger.warn({ key }, 'Redis client is not ready. Falling back to memory store.')
      return this.memoryStore.increment(key)
    }

    try {
      return await this.getRedisStore().increment(key)
    } catch (err) {
      logger.warn({ err, key }, 'Redis rate limit increment failed. Falling back to memory store.')
      return this.memoryStore.increment(key)
    }
  }

  async decrement(key: string) {
    if (!this.isRedisAvailable()) {
      return this.memoryStore.decrement(key)
    }

    try {
      await this.getRedisStore().decrement(key)
    } catch (err) {
      logger.warn({ err, key }, 'Redis rate limit decrement failed. Falling back to memory store.')
      await this.memoryStore.decrement(key)
    }
  }

  async resetKey(key: string) {
    if (!this.isRedisAvailable()) {
      return this.memoryStore.resetKey(key)
    }

    try {
      await this.getRedisStore().resetKey(key)
    } catch (err) {
      logger.warn({ err, key }, 'Redis rate limit resetKey failed. Falling back to memory store.')
      await this.memoryStore.resetKey(key)
    }
  }
}

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_EVENTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  store: new FailOpenRedisStore(config.RATE_LIMIT_WINDOW_MS),
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
      },
    })
  },
})

export default rateLimiter

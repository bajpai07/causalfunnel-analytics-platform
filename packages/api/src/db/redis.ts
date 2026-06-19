import Redis from 'ioredis'
import { config } from '../config.js'
import { createChildLogger } from '../lib/logger.js'
import { cacheHitsTotal, cacheMissesTotal } from '../lib/metrics.js'

const logger = createChildLogger('db:redis')

let redisClient: Redis | null = null

export async function connectRedis(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      redisClient = new Redis(config.REDIS_URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 1, // Quick fail to prevent blocking Express event loop
      })

      let resolved = false

      redisClient.on('connect', () => {
        if (!resolved) {
          logger.info('Connected to Redis successfully')
          resolved = true
          resolve()
        }
      })

      redisClient.on('error', (error) => {
        logger.error(error instanceof Error ? error : { error }, 'Redis client connection error')
        if (!resolved) {
          logger.warn('Failed to connect to Redis on startup. Degrading gracefully.')
          resolved = true
          resolve() // Resolve so startup is non-fatal
        }
      })

      // Safety timeout: resolve if Redis connection takes too long
      setTimeout(() => {
        if (!resolved) {
          logger.warn('Redis connection startup timeout. Degrading gracefully.')
          resolved = true
          resolve()
        }
      }, 2000)
    } catch (error) {
      logger.error(error instanceof Error ? error : { error }, 'Redis client initialization threw error')
      resolve()
    }
  })
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis client is not initialized. Call connectRedis first.')
  }
  return redisClient
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const prefix = key.split(':')[0] || 'unknown'
  if (!redisClient) {
    cacheMissesTotal.inc({ cache_key_prefix: prefix })
    return null
  }
  try {
    const data = await redisClient.get(key)
    if (!data) {
      cacheMissesTotal.inc({ cache_key_prefix: prefix })
      return null
    }
    cacheHitsTotal.inc({ cache_key_prefix: prefix })
    return JSON.parse(data) as T
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, `cacheGet failed for key: ${key}`)
    cacheMissesTotal.inc({ cache_key_prefix: prefix })
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!redisClient) return
  try {
    const stringified = JSON.stringify(value)
    await redisClient.setex(key, ttlSeconds, stringified)
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, `cacheSet failed for key: ${key}`)
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redisClient) return
  try {
    let cursor = '0'
    const keys: string[] = []
    
    // Iterate scan to find all matching keys
    do {
      const result = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = result[0]
      if (result[1] && result[1].length > 0) {
        keys.push(...result[1])
      }
    } while (cursor !== '0')

    if (keys.length > 0) {
      const pipeline = redisClient.pipeline()
      keys.forEach((key) => {
        pipeline.del(key)
      })
      await pipeline.exec()
      logger.info({ count: keys.length, pattern }, 'Invalidated cached Redis keys by pattern')
    }
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, `cacheInvalidatePattern failed for pattern: ${pattern}`)
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    logger.info('Redis connection closed')
  }
}

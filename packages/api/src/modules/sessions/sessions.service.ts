import { getSessionsCollection, getEventsCollection, type SessionDocument } from '../../db/mongo.js'
import { cacheGet, cacheSet } from '../../db/redis.js'
import { config } from '../../config.js'
import { sanitizeUrl } from '../../lib/sanitize.js'

interface SerializedSessionDocument {
  _id: string
  session_id: string
  first_seen: string
  last_seen: string
  event_count: number
  page_urls: string[]
}

/**
 * Retrieves paginated list of sessions, with Redis caching support
 */
export async function listSessions(
  page: number,
  limit: number
): Promise<{ sessions: SessionDocument[]; total: number }> {
  const cacheKey = `sessions:list:p${page}:l${limit}`

  // Check Redis cache first
  const cached = await cacheGet<{ sessions: SerializedSessionDocument[]; total: number }>(cacheKey)
  if (cached) {
    return {
      sessions: cached.sessions.map((s: SerializedSessionDocument) => ({
        ...s,
        first_seen: new Date(s.first_seen),
        last_seen: new Date(s.last_seen),
      })),
      total: cached.total,
    }
  }

  const collection = getSessionsCollection()
  const skip = (page - 1) * limit

  // Run total count and page retrieval in parallel
  const [sessions, total] = await Promise.all([
    collection.find({}).sort({ last_seen: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments({}),
  ])

  const result = { sessions, total }

  // Set TTL in cache
  const ttl = config.REDIS_TTL_SESSIONS || 60
  await cacheSet(cacheKey, result, ttl)

  return result
}

/**
 * Aggregates coordinate clicks counts for a URL, sanitizing PII parameters and caching results for 30s
 */
export async function getHeatmapData(
  pageUrl: string
): Promise<Array<{ x: number; y: number; count: number }>> {
  const decodedUrl = decodeURIComponent(pageUrl)
  const sanitizedUrl = sanitizeUrl(decodedUrl)
  const cacheKey = `heatmap:${Buffer.from(sanitizedUrl).toString('base64')}`

  // Check cache first
  const cached = await cacheGet<Array<{ x: number; y: number; count: number }>>(cacheKey)
  if (cached) {
    return cached
  }

  const eventsCollection = getEventsCollection()

  const pipeline = [
    {
      $match: {
        page_url: sanitizedUrl,
        event_type: 'click',
      },
    },
    {
      $group: {
        _id: { x: '$x', y: '$y' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        x: '$_id.x',
        y: '$_id.y',
        count: 1,
      },
    },
    {
      $sort: { count: -1 as const },
    },
    {
      $limit: 10000,
    },
  ]

  const results = await eventsCollection.aggregate(pipeline).toArray()
  const data = results as unknown as Array<{ x: number; y: number; count: number }>

  // Cache heatmap data for 30 seconds
  await cacheSet(cacheKey, data, 30)

  return data
}

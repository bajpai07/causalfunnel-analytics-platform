import { getEventsCollection, getSessionsCollection, type EventDocument } from './mongo.js'
import { cacheInvalidatePattern } from './redis.js'
import { createChildLogger } from '../lib/logger.js'
import { mongoWriteDurationMs, eventsIngestedTotal } from '../lib/metrics.js'

const logger = createChildLogger('db:eventQueue')

const BATCH_SIZE = 50
const DRAIN_INTERVAL_MS = 500

const queue: EventDocument[] = []
let isDraining = false
let intervalId: ReturnType<typeof setInterval> | null = null

export function getQueueDepth(): number {
  return queue.length
}

export async function drainQueue(): Promise<void> {
  if (isDraining || queue.length === 0) return
  isDraining = true

  try {
    const batch = queue.splice(0, BATCH_SIZE)
    if (batch.length === 0) {
      isDraining = false
      return
    }

    const eventsCollection = getEventsCollection()
    const sessionsCollection = getSessionsCollection()

    // 1. Insert events with ordered: false
    const writeStart = Date.now()
    try {
      await eventsCollection.insertMany(batch, { ordered: false })
    } catch (error: unknown) {
      // Ignore duplicate key errors (code 11000)
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
        const writeErrors = (error as { writeErrors?: Array<{ code: number }> }).writeErrors
        if (writeErrors) {
          const nonDupErrors = writeErrors.filter((we) => we.code !== 11000)
          if (nonDupErrors.length > 0) {
            logger.error({ errors: nonDupErrors }, 'Non-duplicate write errors during batch event insertion')
          }
        }
      } else {
        logger.error(error instanceof Error ? error : { error }, 'Batch event insertion failed')
      }
    } finally {
      mongoWriteDurationMs.observe(
        { operation: 'insertMany' },
        Date.now() - writeStart
      )
    }

    // 2. Perform bulkWrite on sessions collection
    const sessionOps = batch.map((event) => ({
      updateOne: {
        filter: { _id: event.session_id },
        update: {
          $setOnInsert: { first_seen: event.timestamp, session_id: event.session_id },
          $set: { last_seen: event.timestamp },
          $inc: { event_count: 1 },
          $addToSet: { page_urls: event.page_url },
        },
        upsert: true,
      },
    }))

    try {
      await sessionsCollection.bulkWrite(sessionOps, { ordered: false })

      // Cap page_urls at 50 unique URLs for active session documents
      const uniqueSessionIds = Array.from(new Set(batch.map((e) => e.session_id)))
      const sliceOps = uniqueSessionIds.map((sessionId) => ({
        updateOne: {
          filter: { _id: sessionId },
          update: {
            $push: {
              page_urls: {
                $each: [],
                $slice: -50, // Keeps only the last 50 unique page URLs
              },
            },
          },
        },
      }))
      await sessionsCollection.bulkWrite(sliceOps, { ordered: false })
    } catch (error) {
      logger.error(error instanceof Error ? error : { error }, 'Batch session updates failed')
    }

    // 3. Invalidate Redis cached session lists
    await cacheInvalidatePattern('sessions:list:*')

    // Track total ingested events
    batch.forEach((event) => {
      eventsIngestedTotal.inc({ event_type: event.event_type }, 1)
    })
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, 'Error during event queue drain process')
  } finally {
    isDraining = false
  }

  // Trigger another drain immediately if queue still has full batch
  if (queue.length >= BATCH_SIZE) {
    drainQueue()
  }
}

export function enqueueEvent(event: EventDocument): void {
  queue.push(event)
  if (queue.length >= BATCH_SIZE) {
    // Fire-and-forget immediate drain
    drainQueue()
  }
}

export function startQueue(): void {
  if (intervalId) return
  intervalId = setInterval(() => {
    drainQueue()
  }, DRAIN_INTERVAL_MS)
  logger.info('Event write-behind queue started')
}

export async function stopQueue(): Promise<void> {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  // Wait for current draining task to finish
  while (isDraining) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  // Drain any remaining events in queue before exiting
  if (queue.length > 0) {
    await drainQueue()
  }
  logger.info('Event write-behind queue stopped')
}

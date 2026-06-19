import { getEventsCollection, getSessionsCollection } from './mongo.js'
import { createChildLogger } from '../lib/logger.js'

const logger = createChildLogger('db:indexes')

export async function ensureIndexes(): Promise<void> {
  try {
    const eventsCollection = getEventsCollection()
    const sessionsCollection = getSessionsCollection()

    // Retrieve existing indexes to prevent redundant calls and enable custom logs.
    // If the collections do not exist yet, code 26 NamespaceNotFound is thrown, which we handle by defaulting index list to empty.
    let eventsNames: string[] = []
    try {
      const existingEvents = await eventsCollection.listIndexes().toArray()
      eventsNames = existingEvents.map((idx) => idx.name)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code !== 26) {
        throw error
      }
    }

    let sessionsNames: string[] = []
    try {
      const existingSessions = await sessionsCollection.listIndexes().toArray()
      sessionsNames = existingSessions.map((idx) => idx.name)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code !== 26) {
        throw error
      }
    }

    // 1. events: idx_events_session_timestamp
    if (!eventsNames.includes('idx_events_session_timestamp')) {
      await eventsCollection.createIndex(
        { session_id: 1, timestamp: 1 },
        { name: 'idx_events_session_timestamp', background: true }
      )
      logger.info('Created index "idx_events_session_timestamp" on events collection')
    }

    // 2. events: idx_events_heatmap
    if (!eventsNames.includes('idx_events_heatmap')) {
      await eventsCollection.createIndex(
        { page_url: 1, event_type: 1, timestamp: -1 },
        { name: 'idx_events_heatmap', background: true }
      )
      logger.info('Created index "idx_events_heatmap" on events collection')
    }

    // 3. events: idx_events_ttl (90 days TTL)
    if (!eventsNames.includes('idx_events_ttl')) {
      await eventsCollection.createIndex(
        { created_at: 1 },
        { name: 'idx_events_ttl', expireAfterSeconds: 7776000, background: true }
      )
      logger.info('Created TTL index "idx_events_ttl" on events collection')
    }

    // 4. sessions: idx_sessions_last_seen
    if (!sessionsNames.includes('idx_sessions_last_seen')) {
      await sessionsCollection.createIndex(
        { last_seen: -1 },
        { name: 'idx_sessions_last_seen', background: true }
      )
      logger.info('Created index "idx_sessions_last_seen" on sessions collection')
    }

    // 5. sessions: idx_sessions_session_id (unique)
    if (!sessionsNames.includes('idx_sessions_session_id')) {
      await sessionsCollection.createIndex(
        { session_id: 1 },
        { name: 'idx_sessions_session_id', unique: true, background: true }
      )
      logger.info('Created unique index "idx_sessions_session_id" on sessions collection')
    }

    logger.info('MongoDB indexes verified successfully')
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, 'Failed to initialize database indexes')
    throw error
  }
}

import { createHash } from 'node:crypto'
import { getEventsCollection, type EventDocument } from '../../db/mongo.js'
import { enqueueEvent } from '../../db/eventQueue.js'
import type { IncomingEvent } from './events.schema.js'
import { validateAndNormalizeUrl } from '../../lib/urlValidator.js'
import { sanitizeEventPayload } from '../../lib/sanitize.js'
import { logger } from '../../lib/logger.js'

/**
 * Validates and enqueues incoming analytics events
 */
export async function ingestEvent(payload: IncomingEvent): Promise<{ id: string }> {
  // Validate and normalize URL
  const urlResult = validateAndNormalizeUrl(payload.page_url)
  if (!urlResult.valid) {
    logger.warn({ reason: urlResult.reason, rawUrl: payload.page_url }, 'Ingestion blocked: Invalid page URL')
    throw Object.assign(
      new Error(urlResult.reason ?? 'Invalid URL'),
      { status: 400, code: 'INVALID_URL' }
    )
  }

  // Update payload page_url with normalized version
  payload.page_url = urlResult.url

  // Sanitize PII parameters
  const sanitizedPayload = sanitizeEventPayload(payload)

  const id = createHash('sha256')
    .update(sanitizedPayload.session_id + sanitizedPayload.event_type + sanitizedPayload.timestamp)
    .digest('hex')

  const doc: EventDocument = {
    _id: id,
    session_id: sanitizedPayload.session_id,
    event_type: sanitizedPayload.event_type,
    page_url: sanitizedPayload.page_url,
    timestamp: new Date(sanitizedPayload.timestamp),
    created_at: new Date(),
    ...(sanitizedPayload.event_type === 'click' ? { x: sanitizedPayload.x, y: sanitizedPayload.y } : {}),
  }

  enqueueEvent(doc)

  return { id }
}

/**
 * Retrieves all events associated with a specific session sorted by timestamp ASC
 */
export async function getEventsBySession(sessionId: string): Promise<EventDocument[]> {
  const collection = getEventsCollection()
  return collection.find({ session_id: sessionId }).sort({ timestamp: 1 }).toArray()
}

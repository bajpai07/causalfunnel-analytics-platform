import { MongoClient, type Db, type Collection } from 'mongodb'
import { config } from '../config.js'
import { createChildLogger } from '../lib/logger.js'

const logger = createChildLogger('db:mongo')

export interface EventDocument {
  _id: string // SHA-256 hash (idempotency key)
  session_id: string
  event_type: 'page_view' | 'click'
  page_url: string
  timestamp: Date // stored as BSON Date, not string
  x?: number // only on click events
  y?: number // only on click events
  created_at: Date
}

export interface SessionDocument {
  _id: string // session_id (UUID)
  session_id: string
  first_seen: Date
  last_seen: Date
  event_count: number
  page_urls: string[] // capped at 50 unique URLs
}

let client: MongoClient | null = null
let db: Db | null = null

export async function connectMongo(): Promise<void> {
  try {
    client = new MongoClient(config.MONGODB_URI, {
      maxPoolSize: config.MONGODB_MAX_POOL_SIZE,
      minPoolSize: config.MONGODB_MIN_POOL_SIZE,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })

    await client.connect()
    db = client.db()
    logger.info('Connected to MongoDB successfully')
  } catch (error) {
    logger.error(error instanceof Error ? error : { error }, 'MongoDB connection startup failed')
    throw error
  }
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoClient is not initialized. Call connectMongo first.')
  }
  return client
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB Db instance is not initialized. Call connectMongo first.')
  }
  return db
}

export function getEventsCollection(): Collection<EventDocument> {
  return getDb().collection<EventDocument>('events')
}

export function getSessionsCollection(): Collection<SessionDocument> {
  return getDb().collection<SessionDocument>('sessions')
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    logger.info('MongoDB connection closed')
  }
}

import './lib/telemetry.js' // Must be imported before all other modules to patch require()

import express, { type Request, type Response } from 'express'
import { type Server } from 'http'
import compression from 'compression'
import { config } from './config.js'
import { connectMongo, getDb, closeMongo } from './db/mongo.js'
import { ensureIndexes } from './db/indexes.js'
import { connectRedis, getRedis, closeRedis } from './db/redis.js'
import { startQueue, stopQueue, getQueueDepth } from './db/eventQueue.js'
import eventsRouter from './modules/events/events.routes.js'
import sessionsRouter from './modules/sessions/sessions.routes.js'
import { createChildLogger } from './lib/logger.js'
import { startTelemetry, stopTelemetry } from './lib/telemetry.js'
import { register } from './lib/metrics.js'

// Import new middlewares
import { requestContextMiddleware } from './middleware/requestContext.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'
import { helmetMiddleware, securityHeadersMiddleware, nocacheMiddleware } from './middleware/security.js'
import { requestSanitizer } from './lib/requestSanitizer.js'

const logger = createChildLogger('api:bootstrap')

const app: express.Express = express()

// 1. Mount global security, compression, and request body parsing middlewares
app.use(helmetMiddleware)
app.use(securityHeadersMiddleware)
app.use(compression())
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// 2. Mount trace-id request context middleware
app.use(requestContextMiddleware)
app.use(nocacheMiddleware)
app.use(requestSanitizer())

// Mount Prometheus metrics route (exempt from auth and rate-limiting)
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// 3. Mount health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  let mongoStatus = 'disconnected'
  let redisStatus = 'degraded'

  try {
    const db = getDb()
    await db.command({ ping: 1 })
    mongoStatus = 'connected'
  } catch {
    // Left as disconnected
  }

  try {
    const redis = getRedis()
    if (redis.status === 'ready') {
      redisStatus = 'connected'
    }
  } catch {
    // Left as degraded
  }

  const isHealthy = mongoStatus === 'connected'

  return res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'ok' : 'error',
    queue_depth: getQueueDepth(),
    mongo: mongoStatus,
    redis: redisStatus,
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// 4. Mount business logic routers
app.use('/api', eventsRouter)
app.use('/api', sessionsRouter)

// 5. Mount catch-all 404 and global error handlers
app.use(notFoundHandler)
app.use(errorHandler)

let server: Server | null = null

async function bootstrap() {
  try {
    // Start OpenTelemetry tracing and metrics
    startTelemetry()

    // Connect MongoDB client pool
    await connectMongo()

    // Ensure database indexes exist
    await ensureIndexes()

    // Connect Redis client (degrades gracefully if down)
    await connectRedis()

    // Start background event batch flusher
    startQueue()

    // Start HTTP server listener
    server = app.listen(config.PORT, () => {
      logger.info(`CausalFunnel API listening on port ${config.PORT} [${config.NODE_ENV}]`)
    })
  } catch (error) {
    logger.fatal(error, 'Application bootstrap failed')
    process.exit(1)
  }
}

// Graceful shutdown registration
let isShuttingDown = false

const handleGracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Received ${signal}. Starting graceful shutdown process...`)

  // Wait for queue drain to complete
  try {
    await stopQueue()
  } catch (err) {
    logger.error(err, 'Error occurred while stopping event queue')
  }

  // Stop OpenTelemetry SDK
  try {
    await stopTelemetry()
  } catch (err) {
    logger.error(err, 'Error occurred while stopping telemetry')
  }

  // Close databases
  try {
    await closeMongo()
  } catch (err) {
    logger.error(err, 'Error closing MongoDB connection')
  }

  try {
    await closeRedis()
  } catch (err) {
    logger.error(err, 'Error closing Redis connection')
  }

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }

  // Force terminate after 5s timeout
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing shutdown.')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'))
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'))

if (process.env.NODE_ENV !== 'test') {
  bootstrap()
}

export { app, bootstrap }

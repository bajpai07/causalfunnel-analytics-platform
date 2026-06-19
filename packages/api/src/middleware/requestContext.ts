import { type Request, type Response, type NextFunction } from 'express'
import crypto from 'node:crypto'
import { logger } from '../lib/logger.js'
import type pino from 'pino'
import { httpRequestDurationMs } from '../lib/metrics.js'

// Extend Express.Locals interfaces to support traceId and logger properties under strict compiler checks
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Locals {
      traceId: string
      logger: pino.Logger
    }
  }
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now()
  const end = httpRequestDurationMs.startTimer()
  const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID()

  res.locals.traceId = traceId
  res.setHeader('X-Trace-Id', traceId)

  const requestLogger = logger.child({ trace_id: traceId })
  res.locals.logger = requestLogger

  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path ?? req.path,
      status_code: String(res.statusCode),
    })

    requestLogger.info(
      {
        trace_id: traceId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - startTime,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
      },
      'Request completed'
    )
  })

  next()
}
export default requestContextMiddleware

import { type ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const traceId = res.locals.traceId || 'unknown'
  const reqLogger = res.locals.logger || logger

  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'

  if (err instanceof ZodError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    const firstIssue = err.errors[0]
    const fieldPath = firstIssue ? firstIssue.path.join('.') : ''
    message = firstIssue
      ? `${fieldPath ? `'${fieldPath}': ` : ''}${firstIssue.message}`
      : 'Validation failed'
  } else if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: number }).code === 11000
  ) {
    statusCode = 409
    code = 'DUPLICATE_EVENT'
    message = 'An event with the same session_id, event_type, and timestamp already exists.'
  } else if (
    err &&
    typeof err === 'object' &&
    'status' in err &&
    typeof (err as { status: number }).status === 'number'
  ) {
    statusCode = (err as { status: number }).status
    code = statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'HTTP_ERROR'
    message = (err as Error).message || 'HTTP error occurred'
  } else if (err instanceof Error) {
    message = err.message
  }

  // Log 500 errors as error with stack, other errors as warning
  if (statusCode >= 500) {
    reqLogger.error({ err, trace_id: traceId }, 'Internal server error')
  } else {
    reqLogger.warn({ err: { message: (err as Error).message || err }, trace_id: traceId }, `Client request warning [${statusCode}]`)
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      trace_id: traceId,
    },
  })
}

export default errorHandler

import { type RequestHandler } from 'express'

export const notFoundHandler: RequestHandler = (_req, res) => {
  const traceId = res.locals.traceId || 'unknown'
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      trace_id: traceId,
    },
  })
}

export default notFoundHandler

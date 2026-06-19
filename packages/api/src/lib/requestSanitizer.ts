import { type RequestHandler } from 'express'

export function requestSanitizer(): RequestHandler {
  return (req, res, next) => {
    // Remove hop-by-hop headers that should not reach app layer
    delete req.headers['x-forwarded-host']

    // Enforce Content-Type for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const ct = req.headers['content-type'] ?? ''
      if (!ct.includes('application/json')) {
        return res.status(415).json({
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Content-Type must be application/json',
            trace_id: (res.locals.traceId as string) ?? 'unknown',
          },
        })
      }
    }

    // Strip suspicious headers
    delete req.headers['x-http-method-override']
    delete req.headers['x-method-override']

    return next()
  }
}

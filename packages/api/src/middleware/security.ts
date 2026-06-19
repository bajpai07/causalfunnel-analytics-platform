import { type Request, type Response, type NextFunction } from 'express'
import helmet from 'helmet'

// Helmet v7+ security headers middleware
export const helmetMiddleware = helmet()

// Explicit Cache-Control middleware to disable caching for administrative APIs
export function nocacheMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
}

// Custom security headers middleware (explicit type options, request trace ID tracking, server header security)
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Explicitly set content type options security header
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Set X-Request-Id to traceId from locals or request headers for unified request tracking
  const traceId = res.locals.traceId || (req.headers['x-trace-id'] as string)
  if (traceId) {
    res.setHeader('X-Request-Id', traceId)
  }

  // Remove X-Powered-By to prevent technology fingerprinting
  res.removeHeader('X-Powered-By')

  next()
}

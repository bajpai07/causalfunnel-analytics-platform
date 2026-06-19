import { type RequestHandler } from 'express'
import { type ZodSchema } from 'zod'

/**
 * Validates request body against Zod schema, replacing body with parsed type-safe values on success
 */
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const firstIssue = result.error.errors[0]
      const fieldPath = firstIssue ? firstIssue.path.join('.') : ''
      const humanMessage = firstIssue
        ? `${fieldPath ? `'${fieldPath}': ` : ''}${firstIssue.message}`
        : 'Validation failed'

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: humanMessage,
          details: result.error.errors,
        },
      })
      return
    }
    req.body = result.data
    next()
  }
}

/**
 * Validates request query parameters against Zod schema, replacing query with parsed type-safe values on success
 */
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const firstIssue = result.error.errors[0]
      const fieldPath = firstIssue ? firstIssue.path.join('.') : ''
      const humanMessage = firstIssue
        ? `${fieldPath ? `'${fieldPath}': ` : ''}${firstIssue.message}`
        : 'Validation failed'

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: humanMessage,
          details: result.error.errors,
        },
      })
      return
    }
    req.query = result.data as unknown as Record<string, string | string[] | undefined>
    next()
  }
}

/**
 * Validates request URL parameters against Zod schema, replacing params with parsed type-safe values on success
 */
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      const firstIssue = result.error.errors[0]
      const fieldPath = firstIssue ? firstIssue.path.join('.') : ''
      const humanMessage = firstIssue
        ? `${fieldPath ? `'${fieldPath}': ` : ''}${firstIssue.message}`
        : 'Validation failed'

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: humanMessage,
          details: result.error.errors,
        },
      })
      return
    }
    req.params = result.data as unknown as Record<string, string>
    next()
  }
}

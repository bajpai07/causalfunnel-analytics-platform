import { Router, type Request, type Response, type NextFunction } from 'express'
import { listSessions } from './sessions.service.js'
import { getEventsBySession } from '../events/events.service.js'
import { restrictedCors } from '../../middleware/cors.js'
import { validateQuery, validateParams } from '../../middleware/validate.js'
import { z } from 'zod'

const router: Router = Router()

const SessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20).transform((val) => Math.min(val, 100)),
})

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid({ message: 'Invalid or missing sessionId. Must be a valid UUID format.' }),
})

// Apply restricted CORS globally to the sessions router
router.use(restrictedCors)
router.options('*', restrictedCors)

// GET /api/sessions
router.get(
  '/sessions',
  validateQuery(SessionsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = res.locals.logger
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number }
      logger.info({ page, limit }, 'Fetching sessions list')
      
      const { sessions, total } = await listSessions(page, limit)
      
      res.status(200).json({
        data: sessions,
        meta: {
          page,
          limit,
          total,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)

// GET /api/sessions/:sessionId/events
router.get(
  '/sessions/:sessionId/events',
  validateParams(SessionParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = res.locals.logger
    try {
      const { sessionId } = req.params as { sessionId: string }
      logger.info({ sessionId }, 'Fetching events for session')
      
      const events = await getEventsBySession(sessionId)
      res.status(200).json({ data: events })
    } catch (error) {
      next(error)
    }
  }
)

export default router

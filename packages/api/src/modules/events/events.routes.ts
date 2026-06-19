import { Router, type Request, type Response, type NextFunction } from 'express'
import { IncomingEventSchema } from './events.schema.js'
import { ingestEvent } from './events.service.js'
import { getHeatmapData } from '../sessions/sessions.service.js'
import { openCors, restrictedCors } from '../../middleware/cors.js'
import { rateLimiter } from '../../middleware/rateLimiter.js'
import { validateBody, validateQuery } from '../../middleware/validate.js'
import { z } from 'zod'

const router: Router = Router()

// Heatmap query validation schema
const HeatmapQuerySchema = z.object({
  url: z.string().url().max(2048),
})

// Route 1: POST /api/events - openCors, rateLimiter, validateBody, next(err)
router.options('/events', openCors)
router.post(
  '/events',
  openCors,
  rateLimiter,
  validateBody(IncomingEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = res.locals.logger
    try {
      logger.info({ body: req.body }, 'Processing incoming event ingestion')
      const result = await ingestEvent(req.body)
      res.status(202).json({ data: result })
    } catch (error) {
      next(error)
    }
  }
)

// Route 2: GET /api/heatmap - restrictedCors, validateQuery, next(err)
router.options('/heatmap', restrictedCors)
router.get(
  '/heatmap',
  restrictedCors,
  validateQuery(HeatmapQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = res.locals.logger
    try {
      const url = req.query.url as string
      logger.info({ url }, 'Fetching heatmap data')
      const data = await getHeatmapData(url)
      
      // Configure client-side and CDN caching headers
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
      res.status(200).json({ data })
    } catch (error) {
      next(error)
    }
  }
)

export default router

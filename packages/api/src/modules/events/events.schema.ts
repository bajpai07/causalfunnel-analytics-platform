import { z } from 'zod'

export const EventTypeSchema = z.enum(['page_view', 'click'])

export const BaseEventSchema = z.object({
  session_id: z.string().uuid(),
  event_type: EventTypeSchema,
  page_url: z.string().url().max(2048),
  timestamp: z.string().datetime({ offset: true }), // ISO 8601 UTC
})

export const ClickEventSchema = BaseEventSchema.extend({
  event_type: z.literal('click'),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
})

export const PageViewEventSchema = BaseEventSchema.extend({
  event_type: z.literal('page_view'),
})

export const IncomingEventSchema = z.discriminatedUnion('event_type', [
  ClickEventSchema,
  PageViewEventSchema,
])

export type IncomingEvent = z.infer<typeof IncomingEventSchema>
export type ClickEvent = z.infer<typeof ClickEventSchema>
export type PageViewEvent = z.infer<typeof PageViewEventSchema>

import { describe, it, expect } from 'vitest'
import { ClickEventSchema, PageViewEventSchema, IncomingEventSchema } from './events.schema.js'

describe('Event Schemas', () => {
  it('should validate a correct click event', () => {
    const validClick = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      x: 100,
      y: 200,
    }
    const result = ClickEventSchema.safeParse(validClick)
    expect(result.success).toBe(true)
  })

  it('should reject a click event with invalid negative coordinates', () => {
    const invalidClick = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      x: -5,
      y: 200,
    }
    const result = ClickEventSchema.safeParse(invalidClick)
    expect(result.success).toBe(false)
  })

  it('should reject a click event with coordinates above limit', () => {
    const invalidClick = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      x: 100,
      y: 15000,
    }
    const result = ClickEventSchema.safeParse(invalidClick)
    expect(result.success).toBe(false)
  })

  it('should validate a correct page view event', () => {
    const validPageView = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'page_view',
      page_url: 'https://example.com/home',
      timestamp: '2026-06-19T11:54:00.000Z',
    }
    const result = PageViewEventSchema.safeParse(validPageView)
    expect(result.success).toBe(true)
  })

  it('should discriminate and validate using IncomingEventSchema union', () => {
    const validClick = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'click',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
      x: 100,
      y: 200,
    }
    const result = IncomingEventSchema.safeParse(validClick)
    expect(result.success).toBe(true)
  })

  it('should reject non-matching event_type values in the union', () => {
    const invalidEvent = {
      session_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      event_type: 'invalid_type',
      page_url: 'https://example.com/shop',
      timestamp: '2026-06-19T11:54:00.000Z',
    }
    const result = IncomingEventSchema.safeParse(invalidEvent)
    expect(result.success).toBe(false)
  })
})

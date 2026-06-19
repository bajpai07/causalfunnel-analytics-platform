'use client'

import { useEffect, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { fetchSessionEvents, type ApiEvent } from '../../lib/api'

interface EventJourneyProps {
  sessionId: string
}

function TimelineItem({ event, style }: { event: ApiEvent; style?: React.CSSProperties }) {
  const formattedTime = new Date(event.timestamp).toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const truncatedUrl =
    event.page_url.length > 60 ? `${event.page_url.slice(0, 60)}...` : event.page_url

  // page_view = blue badge, click = indigo badge
  const badgeStyle: React.CSSProperties =
    event.event_type === 'page_view'
      ? {
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          color: '#93c5fd',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }
      : {
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          color: '#a5b4fc',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
        gap: '16px',
        height: '72px',
        backgroundColor: 'transparent',
      }}
    >
      {/* Event type badge */}
      <span className="badge" style={badgeStyle}>
        {event.event_type}
      </span>

      {/* Timestamp */}
      <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {formattedTime}
      </span>

      {/* Page URL */}
      <span
        title={event.page_url}
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          cursor: 'help',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {truncatedUrl}
      </span>

      {/* Click coordinates */}
      {event.event_type === 'click' && (
        <span
          className="mono"
          style={{
            fontSize: '0.75rem',
            color: 'var(--warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          (x: {event.x}, y: {event.y})
        </span>
      )}
    </div>
  )
}

export function EventJourney({ sessionId }: EventJourneyProps) {
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadEvents() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchSessionEvents(sessionId)
        if (active) {
          setEvents(data)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load session events')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadEvents()

    return () => {
      active = false
    }
  }, [sessionId])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
        <span className="loading-spinner"></span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ color: 'var(--danger)', fontSize: '0.9rem', padding: '16px 0' }}>
        Error loading timeline: {error}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '24px' }}>
        <p>No events found for this session</p>
      </div>
    )
  }

  // Cap height of the scroll container to min(events.length * 72, 400)
  const containerHeight = Math.min(events.length * 72, 400)

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {events.length > 20 ? (
        <List
          height={containerHeight}
          itemCount={events.length}
          itemSize={72}
          width="100%"
        >
          {({ index, style }) => {
            const event = events[index]!
            return <TimelineItem event={event} style={style} />
          }}
        </List>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.map((event) => (
            <TimelineItem key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export default EventJourney

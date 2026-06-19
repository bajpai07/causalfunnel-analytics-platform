'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import type { ApiSession } from '../../lib/api'
import { EventJourney } from './EventJourney'

interface SessionsTableProps {
  sessions: ApiSession[]
  meta: { page: number; limit: number; total: number }
}

export function SessionsTable({ sessions, meta }: SessionsTableProps) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const toggleExpand = (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null)
    } else {
      setExpandedSessionId(sessionId)
    }
  }

  const prevPage = meta.page > 1 ? meta.page - 1 : null
  const nextPage = meta.page * meta.limit < meta.total ? meta.page + 1 : null
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit))

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <h3>No sessions found</h3>
        <p>No visitor activity has been captured yet. Ensure your tracking script is integrated.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="table-wrapper">
        <table className="cf-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>First Seen</th>
              <th>Last Active</th>
              <th>Event Count</th>
              <th>Pages Visited</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const isExpanded = expandedSessionId === session.session_id
              const truncatedId =
                session.session_id.length > 8
                  ? `${session.session_id.slice(0, 8)}...`
                  : session.session_id

              return (
                <tr key={session.session_id}>
                  {/* Truncated ID with hover tooltip showing full UUID */}
                  <td title={session.session_id} className="mono" style={{ cursor: 'help' }}>
                    {truncatedId}
                  </td>
                  <td>{new Date(session.first_seen).toLocaleString()}</td>
                  <td>{new Date(session.last_seen).toLocaleString()}</td>
                  <td>
                    <span className="badge badge-blue">{session.event_count} events</span>
                  </td>
                  <td>
                    <span className="badge badge-orange">
                      {session.page_urls.length} pages
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => toggleExpand(session.session_id)}
                    >
                      {isExpanded ? (
                        <>
                          <EyeOff size={14} /> Hide Journey
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> View Journey
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded row timeline view */}
      {expandedSessionId && (
        <div
          className="card"
          style={{
            border: '1px solid var(--accent)',
            backgroundColor: 'var(--bg-secondary)',
            marginBottom: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Event Journey timeline for session:{' '}
              <span className="mono" style={{ color: 'var(--accent)' }}>
                {expandedSessionId}
              </span>
            </h4>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setExpandedSessionId(null)}
            >
              Close
            </button>
          </div>
          <EventJourney sessionId={expandedSessionId} />
        </div>
      )}

      {/* Pagination controls */}
      <div className="pagination">
        {prevPage ? (
          <Link href={`/sessions?page=${prevPage}`} className="btn btn-secondary">
            &larr; Previous
          </Link>
        ) : (
          <button className="btn btn-secondary" disabled>
            &larr; Previous
          </button>
        )}

        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Page {meta.page} of {totalPages} (Total: {meta.total})
        </span>

        {nextPage ? (
          <Link href={`/sessions?page=${nextPage}`} className="btn btn-secondary">
            Next &rarr;
          </Link>
        ) : (
          <button className="btn btn-secondary" disabled>
            Next &rarr;
          </button>
        )}
      </div>
    </div>
  )
}

export default SessionsTable

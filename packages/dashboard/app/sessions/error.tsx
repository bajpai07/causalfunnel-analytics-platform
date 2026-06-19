'use client'

import { useEffect } from 'react'

interface ErrorBoundaryProps {
  error: Error
  reset: () => void
}

export default function SessionsError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error for tracking
    // eslint-disable-next-line no-console
    console.error('Sessions boundary error:', error)
  }, [error])

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '40px',
        borderColor: 'var(--danger)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Failed to Load Sessions</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
        {error.message || 'An error occurred while fetching visitor sessions data.'}
      </p>
      <button className="btn btn-primary" onClick={reset} style={{ marginTop: '8px' }}>
        Try Again
      </button>
    </div>
  )
}

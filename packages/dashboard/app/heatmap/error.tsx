'use client'

import { useEffect } from 'react'

interface ErrorBoundaryProps {
  error: Error
  reset: () => void
}

export default function HeatmapError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error for tracking
    // eslint-disable-next-line no-console
    console.error('Heatmap boundary error:', error)
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
        margin: '20px auto',
        maxWidth: '600px',
      }}
    >
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Failed to Load Heatmap Data</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
        {error.message || 'An error occurred while loading click heatmap data.'}
      </p>
      <button className="btn btn-primary" onClick={reset} style={{ marginTop: '8px' }}>
        Try Again
      </button>
    </div>
  )
}

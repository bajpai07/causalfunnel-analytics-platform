'use client'

import { useState } from 'react'
import { Map, RefreshCw } from 'lucide-react'
import { HeatmapCanvas } from './HeatmapCanvas'
import type { HeatmapPoint } from '../../lib/api'

export default function HeatmapPage() {
  const [inputUrl, setInputUrl] = useState('')
  const [selectedUrl, setSelectedUrl] = useState('')
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoadHeatmap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputUrl.trim()) return

    const targetUrl = inputUrl.trim()
    setSelectedUrl(targetUrl)
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/heatmap?url=${encodeURIComponent(targetUrl)}`)
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }
      const payload = await res.json()
      setHeatmapData(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch heatmap data')
      setHeatmapData([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
          Click Heatmap Visualizer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Analyze user interaction density maps overlaid on canvas grids.
        </p>
      </div>

      <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <form onSubmit={handleLoadHeatmap} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste page_url (e.g. http://localhost:3000/demo.html)"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ height: '45px', flexShrink: 0 }}>
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Loading...
              </>
            ) : (
              <>
                <Map size={16} />
                Load Heatmap
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {selectedUrl && !isLoading && (
        <div>
          {heatmapData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📍</div>
              <h3>No click data found</h3>
              <p>
                No click events were registered for URL:{' '}
                <span className="mono" style={{ color: 'var(--accent)' }}>{selectedUrl}</span>.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Ensure your tracking script is active on the page and that clicks are being captured correctly.
              </p>
            </div>
          ) : (
            <HeatmapCanvas points={heatmapData} />
          )}
        </div>
      )}

      {!selectedUrl && !isLoading && (
        <div className="empty-state" style={{ padding: '60px 24px' }}>
          <div className="empty-state-icon">🗺️</div>
          <h3>Provide a URL to start</h3>
          <p>Paste the tracked URL in the form above to display its corresponding coordinate heatmap.</p>
        </div>
      )}
    </div>
  )
}

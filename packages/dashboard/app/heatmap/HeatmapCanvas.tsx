'use client'

import { useEffect, useRef } from 'react'
import type { HeatmapPoint } from '../../lib/api'

interface HeatmapCanvasProps {
  points: HeatmapPoint[]
  width?: number
  height?: number
}

export function HeatmapCanvas({ points, width = 1280, height = 800 }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. Clear canvas
    ctx.clearRect(0, 0, width, height)

    // 2. Draw background grid canvas representation
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, width, height)

    // 3. Draw grid lines (every 100px)
    ctx.strokeStyle = '#1a1d27'
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let x = 0; x <= width; x += 100) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let y = 0; y <= height; y += 100) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    if (points.length === 0) return

    // 4. Normalize clicks count to scale heatmap colors
    const counts = points.map((p) => p.count)
    const maxCount = Math.max(...counts, 1)

    // 5. Draw each click point as a radial gradient hotspot glow
    for (const point of points) {
      const intensity = point.count / maxCount
      const radius = 8 + intensity * 20 // 8px min, 28px max
      const alpha = 0.15 + intensity * 0.6

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)

      // Radial colors utilizing accent indigo (#6366f1)
      gradient.addColorStop(0, `rgba(99, 102, 241, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(99, 102, 241, ${alpha * 0.5})`)
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')

      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // 6. Draw text labels for top 5 hottest click points
    const top5 = [...points].sort((a, b) => b.count - a.count).slice(0, 5)
    ctx.font = '11px monospace'
    ctx.fillStyle = '#e8eaf0'

    for (const p of top5) {
      // Draw a subtle center dot for accuracy
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI)
      ctx.fillStyle = '#f43f5e'
      ctx.fill()

      // Draw text label next to the center coordinate
      ctx.fillStyle = '#e8eaf0'
      ctx.fillText(`(${p.x},${p.y}) ×${p.count}`, p.x + 12, p.y - 4)
    }
  }, [points, width, height])

  // Get the hottest point stats
  const totalClicks = points.reduce((sum, p) => sum + p.count, 0)
  const sortedPoints = [...points].sort((a, b) => b.count - a.count)
  const topPoint = sortedPoints[0] ?? { x: 0, y: 0, count: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Canvas Wrapper supporting horizontal scrolling for smaller screens */}
      <div
        style={{
          overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            minWidth: '768px', // Prevent too small scaling on mobile screens
          }}
        />
      </div>

      {/* Aggregate Stats Summary Bar */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '16px 24px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Clicks</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{totalClicks}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unique Coordinates</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{points.length} positions</div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hottest Hotspot</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>
            ({topPoint.x}, {topPoint.y}) &times; {topPoint.count} clicks
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeatmapCanvas

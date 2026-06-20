import Link from 'next/link'
import { Users, Flame, Code } from 'lucide-react'
import { headers } from 'next/headers'

export default function HomePage() {
  const headersList = headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'
  const dashboardUrl = `${protocol}://${host}`
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  return (
    <div className="home-container" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Hero Section */}
      <section className="hero-section" style={{ textAlign: 'center', padding: '40px 0 20px 0' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.03em' }}>
          CausalFunnel Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Production-grade user behavior tracking and conversion analytics in real time.
        </p>
      </section>

      {/* Feature Cards Grid */}
      <section
        className="features-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Sessions Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={24} color="var(--accent)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Session Explorer
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Explore real-time user journeys. Inspect timelines of page views, click coordinates,
              and sequential interactions.
            </p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/sessions" className="btn btn-primary" style={{ width: '100%' }}>
              Explore Sessions
            </Link>
          </div>
        </div>

        {/* Heatmap Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Flame size={24} color="var(--danger)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Click Heatmap
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Visualize where users are clicking. Aggregate coordinate maps on canvas overlays to
              reveal hot engagement zones.
            </p>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/heatmap" className="btn btn-secondary" style={{ width: '100%' }}>
              View Click Heatmaps
            </Link>
          </div>
        </div>
      </section>

      {/* Live Status and Integration Box */}
      <section
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Live Ingestion Status:</span>
            <span className="badge badge-green">Active</span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: 'auto' }}>
            Collecting and buffer-syncing events every 500ms
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={18} color="var(--accent)" />
            Integration Instructions
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Embed the following tracking snippet at the top of the <code className="mono">&lt;head&gt;</code> element
            on any web page to start collecting user analytics data:
          </p>

          <pre
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              padding: '16px',
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '0.85rem',
              color: '#f43f5e',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {`<script>
  window.__CF_API_URL__ = '${apiUrl}/api/events';
</script>
<script src="${dashboardUrl}/tracker.js" defer></script>`}
          </pre>
        </div>
      </section>
    </div>
  )
}

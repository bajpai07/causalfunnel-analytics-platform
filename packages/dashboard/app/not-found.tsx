import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '24px',
        gap: '20px',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--accent) 0%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Page Not Found</h1>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          maxWidth: '460px',
          lineHeight: 1.6,
        }}
      >
        The page you are looking for doesn&apos;t exist or has been moved. Check the URL or return to the dashboard.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: '12px' }}>
        Back to Dashboard
      </Link>
    </div>
  )
}

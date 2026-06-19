import { Suspense } from 'react'
import { fetchSessions } from '../../lib/api'
import { SessionsTable } from './SessionsTable'
import { SessionsTableSkeleton } from './SessionsTableSkeleton'

interface PageProps {
  searchParams: { page?: string }
}

async function SessionsContainer({ page }: { page: number }) {
  // Fetch sessions data from the centralized API client layer (server-side)
  const { sessions, meta } = await fetchSessions(page, 20)

  return <SessionsTable sessions={sessions} meta={meta} />
}

export default function SessionsPage({ searchParams }: PageProps) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const validPage = isNaN(page) || page < 1 ? 1 : page

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
          Visitor Sessions
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Explore unique visitor sessions and replay sequential timelines of their interactions.
        </p>
      </div>

      <Suspense key={validPage} fallback={<SessionsTableSkeleton />}>
        <SessionsContainer page={validPage} />
      </Suspense>
    </div>
  )
}

export interface ApiEvent {
  _id: string
  session_id: string
  event_type: 'page_view' | 'click'
  page_url: string
  timestamp: string // ISO string from JSON serialization
  x?: number
  y?: number
  created_at: string
}

export interface ApiSession {
  _id: string
  session_id: string
  first_seen: string
  last_seen: string
  event_count: number
  page_urls: string[]
}

export interface HeatmapPoint {
  x: number
  y: number
  count: number
}

export interface ApiResponse<T> {
  data: T
  meta?: { page: number; limit: number; total: number }
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function fetchSessions(
  page = 1,
  limit = 20
): Promise<{
  sessions: ApiSession[]
  meta: { page: number; limit: number; total: number }
}> {
  const url = `${BASE}/api/sessions?page=${page}&limit=${limit}`
  const res = await fetch(url, {
    next: { revalidate: 30 },
  })

  if (!res.ok) {
    throw new Error(`Sessions fetch failed: ${res.status}`)
  }

  const payload = (await res.json()) as ApiResponse<ApiSession[]>
  return {
    sessions: payload.data,
    meta: payload.meta ?? { page, limit, total: 0 },
  }
}

export async function fetchSessionEvents(sessionId: string): Promise<ApiEvent[]> {
  const url = `${BASE}/api/sessions/${sessionId}/events`
  const res = await fetch(url, {
    next: { revalidate: 10 },
  })

  if (!res.ok) {
    throw new Error(`Events fetch failed for session ${sessionId}: ${res.status}`)
  }

  const payload = (await res.json()) as ApiResponse<ApiEvent[]>
  return payload.data
}

export async function fetchHeatmap(pageUrl: string): Promise<HeatmapPoint[]> {
  const url = `${BASE}/api/heatmap?url=${encodeURIComponent(pageUrl)}`
  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return []
    }

    const payload = (await res.json()) as ApiResponse<HeatmapPoint[]>
    return payload.data
  } catch {
    return []
  }
}

export async function ingestEvent(payload: unknown): Promise<{ id: string }> {
  const url = `${BASE}/api/events`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Event ingestion failed: ${res.status}`)
  }

  const result = (await res.json()) as { data: { id: string } }
  return result.data
}

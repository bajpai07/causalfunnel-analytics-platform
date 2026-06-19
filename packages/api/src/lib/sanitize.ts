const PII_PARAMS = new Set([
  'email', 'phone', 'name', 'token', 'key', 'password',
  'auth', 'secret', 'api_key', 'access_token', 'refresh_token',
  'ssn', 'dob', 'credit_card', 'card_number',
])

export function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    // Remove known PII query params
    for (const param of [...url.searchParams.keys()]) {
      if (PII_PARAMS.has(param.toLowerCase())) {
        url.searchParams.delete(param)
      }
    }
    // Reconstruct — no fragment (hash) stored
    url.hash = ''
    return url.toString()
  } catch {
    // If URL is unparseable, return as-is (Zod validated it earlier)
    return rawUrl
  }
}

export function sanitizeEventPayload<T extends { page_url: string }>(
  event: T
): T {
  return { ...event, page_url: sanitizeUrl(event.page_url) }
}

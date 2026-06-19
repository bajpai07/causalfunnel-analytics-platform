const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:'])
const MAX_URL_LENGTH = 2048

export function validateAndNormalizeUrl(rawUrl: string): {
  valid : boolean
  url   : string
  reason?: string
} {
  if (rawUrl.length > MAX_URL_LENGTH) {
    return { valid: false, url: rawUrl, reason: 'URL exceeds maximum length' }
  }

  try {
    const parsed = new URL(rawUrl)

    if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
      return { valid: false, url: rawUrl, reason: `Blocked protocol: ${parsed.protocol}` }
    }

    // Normalize: lowercase hostname, remove default ports
    parsed.hostname = parsed.hostname.toLowerCase()
    if (parsed.port === '80'  && parsed.protocol === 'http:')  parsed.port = ''
    if (parsed.port === '443' && parsed.protocol === 'https:') parsed.port = ''

    return { valid: true, url: parsed.toString() }
  } catch {
    return { valid: false, url: rawUrl, reason: 'Malformed URL' }
  }
}

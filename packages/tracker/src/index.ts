declare const process: { env: { NODE_ENV: string } }

declare global {
  interface Window {
    __CF_API_URL__?: string
    CausalFunnelTracker?: {
      sendEvent: (event: { event_type: 'page_view' | 'click'; x?: number; y?: number }) => void
    }
  }
}

// 1. Session generation
const getSessionId = (): string => {
  const key = 'cf_session_id'
  let sessionId = localStorage.getItem(key)
  if (sessionId) {
    return sessionId
  }

  // Use crypto.randomUUID() if available, with a standard fallback
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    sessionId = crypto.randomUUID()
  } else {
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  localStorage.setItem(key, sessionId)
  return sessionId
}

const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV === 'development'
  } catch {
    return false
  }
}

const log = (...args: unknown[]) => {
  if (isDev()) {
    // eslint-disable-next-line no-console
    const c = console
    c.log('[CausalFunnel]', ...args)
  }
}

// 2. Event Sender
const sendEvent = (eventData: { event_type: 'page_view' | 'click'; x?: number; y?: number }): void => {
  try {
    const sessionId = getSessionId()
    const timestamp = new Date().toISOString()
    const pageUrl = window.location.href

    const payload = {
      session_id: sessionId,
      timestamp,
      page_url: pageUrl,
      ...eventData,
    }

    const targetUrl = window.__CF_API_URL__ || 'http://localhost:3001/api/events'
    log('Sending event:', payload, 'to', targetUrl)

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const sent = navigator.sendBeacon(targetUrl, blob)
      if (sent) return
    }

    if (typeof fetch === 'function') {
      fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
        log('Fetch error:', err)
      })
    }
  } catch (err) {
    log('Tracking failed silently:', err)
  }
}

// 3. Page View Tracking
const trackPageView = () => {
  sendEvent({ event_type: 'page_view' })
}

// SPA navigation tracking with 100ms debounce
let spaTimeout: ReturnType<typeof setTimeout> | null = null
const debounceTrackPageView = () => {
  if (spaTimeout) {
    clearTimeout(spaTimeout)
  }
  spaTimeout = setTimeout(() => {
    trackPageView()
  }, 100)
}

// 4. Click Tracking
const setupClickTracking = () => {
  document.addEventListener('click', (event: MouseEvent) => {
    try {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Exclude input, textarea, select elements
      const tagName = target.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return
      }

      const x = Math.round(event.clientX)
      const y = Math.round(event.clientY)

      // Clamping click values to fit click schema range if needed (0-10000)
      if (x >= 0 && x <= 10000 && y >= 0 && y <= 10000) {
        sendEvent({
          event_type: 'click',
          x,
          y,
        })
      }
    } catch (err) {
      log('Click tracking failed silently:', err)
    }
  }, true) // Capture phase to guarantee we catch clicks
}

// Initialization
const init = () => {
  // Fire page view on load
  trackPageView()

  // Listen to popstate and hashchange for SPA navigation
  window.addEventListener('popstate', debounceTrackPageView)
  window.addEventListener('hashchange', debounceTrackPageView)

  // Track clicks
  setupClickTracking()
}

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init()
  } else {
    document.addEventListener('DOMContentLoaded', init)
  }

  // Export tracker globally
  window.CausalFunnelTracker = { sendEvent }
}
export { sendEvent }

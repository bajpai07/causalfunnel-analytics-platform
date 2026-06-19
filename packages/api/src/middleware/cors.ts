import cors from 'cors'
import { config } from '../config.js'

// Explicit allowlist of trusted origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

export const openCors = cors({
  origin: (origin, callback) => {
    // If no Origin header (non-browser clients like curl/postman/internal tests), allow it
    if (!origin) {
      callback(null, true)
      return
    }

    // Allow from allowlist or if running in test environment
    if (ALLOWED_ORIGINS.includes(origin) || config.NODE_ENV === 'test') {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Trace-Id'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
})

export const restrictedCors = cors({
  origin: (origin, callback) => {
    // If no Origin header (non-browser clients like curl/postman/internal tests), allow it
    if (!origin) {
      callback(null, true)
      return
    }

    // Allow dashboard origin or NEXT_PUBLIC_API_URL origin
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin === config.NEXT_PUBLIC_API_URL
    ) {
      callback(null, true)
    } else {
      // Disallow and omit Access-Control-Allow-Origin header
      callback(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Trace-Id'],
  optionsSuccessStatus: 200,
})


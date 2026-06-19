import cors from 'cors'
import { config } from '../config.js'

export const openCors = cors({
  origin: '*',
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
    if (origin === config.NEXT_PUBLIC_API_URL) {
      callback(null, true)
    } else {
      // Disallow and omit Access-Control-Allow-Origin header
      callback(null, false)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Trace-Id'],
  optionsSuccessStatus: 200,
})

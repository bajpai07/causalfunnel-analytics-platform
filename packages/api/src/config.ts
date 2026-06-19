import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'

// Load .env file manually if running locally outside docker and variables aren't set
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index > 0) {
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim()
      if (key && process.env[key] === undefined) {
        // Strip quotes if present
        const cleanValue = value.replace(/^['"]|['"]$/g, '')
        process.env[key] = cleanValue
      }
    }
  })
}

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/causalfunnel'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().default(20),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().default(5),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_TTL_SESSIONS: z.coerce.number().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_EVENTS: z.coerce.number().default(60),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
})

export const config = ConfigSchema.parse(process.env)
export type Config = z.infer<typeof ConfigSchema>

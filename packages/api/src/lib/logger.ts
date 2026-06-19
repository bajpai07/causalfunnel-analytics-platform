import pino from 'pino'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from '../config.js'

// Synchronously read service version from package.json on startup
let serviceVersion = '1.0.0'
try {
  const packageJsonPath = join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  serviceVersion = packageJson.version || '1.0.0'
} catch {
  // Safe fallback if package.json read fails
}

const isDev = config.NODE_ENV !== 'production'

const logger = pino({
  level: isDev ? 'debug' : 'info',
  base: {
    service: 'causalfunnel-api',
    version: serviceVersion,
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

export function createChildLogger(moduleName: string): pino.Logger {
  return logger.child({ module: moduleName })
}

export { logger }

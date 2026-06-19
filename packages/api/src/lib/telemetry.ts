import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { type Meter } from '@opentelemetry/api'

const isTest = process.env['NODE_ENV'] === 'test'
const isDev = process.env['NODE_ENV'] !== 'production'
const otlpEndpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318'

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]    : 'causalfunnel-api',
  [SemanticResourceAttributes.SERVICE_VERSION] : process.env['npm_package_version'] ?? '0.0.1',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] ?? 'development',
})

let sdk: NodeSDK | null = null
let meterProvider: MeterProvider

if (isTest) {
  // Mock/No-op setup for testing environment to prevent connection errors and intervals
  meterProvider = new MeterProvider({ resource })
} else {
  // Exporter: console in dev, OTLP in production
  const traceExporter = isDev
    ? new ConsoleSpanExporter()
    : new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http'    : { enabled: true },
        '@opentelemetry/instrumentation-express' : { enabled: true },
        '@opentelemetry/instrumentation-mongodb' : { enabled: false },
        '@opentelemetry/instrumentation-ioredis' : { enabled: true },
        '@opentelemetry/instrumentation-fs'      : { enabled: false }, // too noisy
      }),
    ],
  })

  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  })

  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
      }),
    ],
  })
}

export function startTelemetry(): void {
  if (isTest || !sdk) return
  sdk.start()
}

export function stopTelemetry(): Promise<void> {
  if (isTest || !sdk) return Promise.resolve()
  return sdk.shutdown()
}

// Export meter for custom metrics
export const meter: Meter = meterProvider.getMeter('causalfunnel-api')

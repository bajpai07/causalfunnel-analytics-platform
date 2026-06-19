# CausalFunnel Analytics

> Production-grade user behavior analytics platform — session tracking, event journeys, and click heatmaps.
> Built on a high-throughput, security-hardened, and resilient monorepo architecture.

## Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Monorepo** | pnpm workspaces | 8.x |
| **Tracker** | Vanilla TypeScript + esbuild | — |
| **Backend** | Node.js + Express | 20.x / 4.x |
| **Validation** | Zod | 3.x |
| **Database** | MongoDB (native driver) | 7.x |
| **Cache** | Redis (ioredis) | 7.x |
| **Frontend** | Next.js App Router | 14.x |
| **Logging** | Pino (structured JSON) | 8.x |
| **Tracing** | OpenTelemetry | 0.46.x |
| **Metrics** | Prometheus + prom-client | — |
| **Dashboards** | Grafana | 10.x |
| **Testing** | Vitest + mongodb-memory-server | 1.x |
| **CI/CD** | GitHub Actions | — |
| **Containers** | Docker + Docker Compose | — |

## Quick Start (3 commands)

Configure, install dependencies, and spin up the complete Docker infrastructure in three commands:
```bash
cp .env.example .env
pnpm install
docker compose up
```

Services active after startup:
- **Dashboard Web UI** → [http://localhost:3000](http://localhost:3000)
- **Mock Headphones Store Page** → [http://localhost:3000/demo.html](http://localhost:3000/demo.html)
- **Express Backend API** → [http://localhost:3001](http://localhost:3001)
- **Grafana Dashboards** → [http://localhost:3002](http://localhost:3002) (Credentials: `admin` / `causalfunnel`)
- **Prometheus Scrapers** → [http://localhost:9090](http://localhost:9090)

---

## Setup Steps

1. **Environment Configuration**: Create a local `.env` file by copying the example template:
   ```bash
   cp .env.example .env
   ```
2. **Install Dependencies**: Fetch and link all package dependencies recursively across the monorepo:
   ```bash
   pnpm install
   ```
3. **Compile Static Scripts**: Build the zero-dependency client tracking script (outputs `tracker.js` to dashboard public directory):
   ```bash
   pnpm --filter tracker build
   ```
4. **Local Verification**: Execute linters, type checkers, and test suites to verify system consistency:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
5. **Run Local Dev Environment**: Stand up local MongoDB and Redis instances via Docker Compose, and start dev services:
   ```bash
   docker compose up -d mongo redis
   pnpm dev
   ```

---

## API Reference

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events` | None (Open) | Ingests a new tracking event (returns 202 Accepted immediately, processes asynchronously). |
| `GET` | `/api/sessions` | Restricted (CORS) | Retrieves a page of visitor sessions sorted by last active timestamp. |
| `GET` | `/api/sessions/:id/events` | Restricted (CORS) | Retrieves chronological sequence of events for a specific visitor session. |
| `GET` | `/api/heatmap?url=` | Restricted (CORS) | Retrieves aggregated density coordinate groups for click mapping. |
| `GET` | `/health` | None (Open) | Probes system status, database health, and write-behind queue depth. |
| `GET` | `/metrics` | None (Open) | Exposes Prometheus metrics for scraping. |

---

## Architecture Decisions

1. **Write-Behind Queue**: Ingestion writes are decoupled from database calls. `/api/events` accepts payloads, generates transactional IDs, pushes events into a memory buffer, and returns `202 Accepted` immediately. A separate background task processes events in batches of 50, protecting Express thread loops from database disk write latency.
2. **Native MongoDB Driver**: Avoids Mongoose schema overhead, hooks, or model-wrapper compilation delays, delivering pure, high-performance database throughput.
3. **Denormalized Session Documents**: Rather than calculating first seen, last seen, event counts, and visited pages using aggregation pipelines during dashboard requests, updates are incremented and appended inline inside MongoDB using `$inc`, `$set`, and `$addToSet` during event drainage, optimizing query reads.
4. **SHA-256 Idempotency Keys**: Generates unique transactional event IDs via `sha256(session_id + event_type + timestamp)`. Ensures duplicate tracking transmissions are discarded at database insertion level without pipeline crashes.
5. **HTML5 Canvas Heatmaps**: Rather than laying slow DOM coordinate indicators over web pages, click densities are painted dynamically onto canvas grids using radial gradients, maintaining high frames-per-second scrolling.
6. **Split CORS Policy**: `/api/events` allows requests from any host (`*`) to facilitate tracker calls across arbitrary websites, while sessions, timelines, and heatmap endpoints are strictly restricted to the dashboard host.
7. **Fail-Open Rate Limiter**: Redis rate limiting handles connection drops gracefully. Under Redis network degradation, rate limits fall back to in-memory caches dynamically, preventing outages.
8. **pnpm Workspaces Monorepo**: Enables code sharing (such as API schemas) and local typescript dependencies linking within a single workspace lockfile.

---

## Assumptions & Trade-offs

- **Session Identification**: Relies on `localStorage` values (`cf_session_id`) rather than cookies. Simpler implementation, but session IDs are cleared if a user wipes browser data.
- **Heatmap Coordinates**: Tracks absolute client coordinates (`clientX`/`clientY`). Resizing screens or scrolling alters absolute canvas scaling (noted as a known frontend dashboard limit).
- **In-Process Memory Buffer**: Events in the write-behind queue buffer are lost in the case of sudden hardware crashes. An acceptable trade-off for high-frequency visitor analytics, prioritizing throughput over strict transactional guarantees.
- **Unauthenticated Ingestion**: The tracker endpoint allows unauthenticated ingest requests by design to enable tracking scripts to be mounted on client pages easily.
- **Hardware Constraints**: Sized to operate efficiently under MongoDB Atlas free-tier conditions (~500 connection max limits and 512MB storage quotas).

---

## Security & Compliance

- **Helmet Protection**: Hardens response headers (frames blocking, MIME sniffing restrictions, HSTS enforcement).
- **PII URL Sanitization**: Purges personal parameters (such as `email`, `phone`, `token`, `password`) and URL fragments (`#`) before they reach MongoDB logs.
- **Content-Type Constraint**: Rejects non-JSON write/post requests with HTTP 415.
- **Non-Root Docker Runtime**: Containers drop root capabilities and run as UID 1001 (`apiuser`/`nextuser`), mitigating container breakout risks.
- **Tini Initialization**: Implements `tini` as PID 1 to handle signal propagation and clean up zombie processes.

---

## Disaster Recovery

| Parameter | Value | Details |
| :--- | :--- | :--- |
| **RTO (Recovery Time Objective)** | 15 Minutes | Recreate containerized nodes on fresh VPS hardware in under 15 minutes. |
| **RPO (Recovery Point Objective)** | 1 Hour | Managed via periodic MongoDB Atlas database back-up snapshots. |
| **Event TTL** | 90 Days | Configured via automated MongoDB index expiration policies. |
| **Queue Durability** | In-Process Memory | Non-durable queue buffer (analytics data priority tradeoff). |

---

## Load Testing

The platform includes a load testing suite using K6 simulating sustained event ingestion, dashboard queries, and aggregations:
```bash
# Requires k6 installed: https://k6.io/docs/get-started/installation/
docker compose up -d
bash scripts/load-test/run-load-test.sh
```
Target thresholds enforce `P50 < 50ms` and `P99 < 200ms` for event ingestions under 100 concurrent virtual users.

---

## Chaos Engineering

Verify service robustness under database latency, Redis drops, and traffic spikes:
```bash
docker compose up -d
bash scripts/chaos.sh
```
Executes Redis pauses, write-queue bursts, zero-downtime restarts, and rate limit blocks.

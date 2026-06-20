#  CausalFunnel Analytics

>  Full-stack analytics platform for session tracking, event ingestion, and click heatmap visualization.

Built as a resilient, observable, and scalable analytics system using a modern TypeScript monorepo architecture.

---

## ✨ Features

### Event Ingestion

* High-throughput asynchronous event collection
* Page view and click tracking
* SHA-256 idempotency protection
* Write-behind event buffering
* Rate limiting with Redis fallback

### Session Analytics

* Real-time visitor session aggregation
* Session timelines and event replay
* First seen / last active tracking
* Page journey reconstruction

### Click Heatmaps

* Coordinate aggregation engine
* Density-based click visualization
* Canvas-powered rendering
* Efficient MongoDB aggregation pipelines

### Production Engineering

* OpenTelemetry tracing
* Prometheus metrics
* Grafana dashboards
* Structured JSON logging
* Health monitoring endpoints
* Graceful shutdown handling
* Dockerized infrastructure

---

# 🏗 System Architecture

```text
┌─────────────────────┐
│   Visitor Browser   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   tracker.js SDK    │
│ Page Views + Clicks │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Express API Server  │
│ /api/events         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Write Behind Queue  │
└──────────┬──────────┘
           │
           ├─────────────► Redis
           │
           ▼
┌─────────────────────┐
│ MongoDB Atlas       │
│ Events + Sessions   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Next.js Dashboard   │
│ Sessions + Heatmap  │
└─────────────────────┘
```

---

# 🌍 Live Deployment

### Dashboard

https://causalfunnel-analytics-platform-das.vercel.app

### API

https://causalfunnel-analytics-platform.onrender.com

### Health Check

https://causalfunnel-analytics-platform.onrender.com/health

---

# 🛠 Tech Stack

| Layer          | Technology      |
| -------------- | --------------- |
| Monorepo       | pnpm Workspaces |
| Frontend       | Next.js 14      |
| Backend        | Express.js      |
| Language       | TypeScript      |
| Database       | MongoDB Atlas   |
| Cache          | Redis (Upstash) |
| Validation     | Zod             |
| Logging        | Pino            |
| Tracing        | OpenTelemetry   |
| Metrics        | Prometheus      |
| Dashboards     | Grafana         |
| Testing        | Vitest          |
| Deployment     | Vercel + Render |
| Infrastructure | Docker          |

---

# 🚀 Quick Start

Clone repository:

```bash
git clone https://github.com/bajpai07/causalfunnel-analytics-platform.git
cd causalfunnel-analytics-platform
```

Install dependencies:

```bash
pnpm install
```

Configure environment:

```bash
cp .env.example .env
```

Start infrastructure:

```bash
docker compose up
```

---

# 📦 Available Services

| Service    | URL                             |
| ---------- | ------------------------------- |
| Dashboard  | http://localhost:3000           |
| Demo Store | http://localhost:3000/demo.html |
| API        | http://localhost:3001           |
| Grafana    | http://localhost:3002           |
| Prometheus | http://localhost:9090           |

Default Grafana Credentials:

```text
username: admin
password: causalfunnel
```

---

# 📡 API Reference

## Ingest Event

```http
POST /api/events
```

Example:

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "page_view",
  "page_url": "https://example.com",
  "timestamp": "2026-06-20T17:30:00.000Z"
}
```

Response:

```json
{
  "data": {
    "id": "event-id"
  }
}
```

---

## Sessions

```http
GET /api/sessions
```

---

## Session Events

```http
GET /api/sessions/:id/events
```

---

## Heatmap

```http
GET /api/heatmap?url=https://example.com
```

---

## Health

```http
GET /health
```

---

# 🔐 Security

### HTTP Hardening

* Helmet security headers
* HSTS enforcement
* MIME sniff prevention
* Clickjacking protection

### Data Protection

* URL parameter sanitization
* PII stripping
* Request validation via Zod
* Strict content-type enforcement

### Operational Security

* Non-root containers
* Graceful shutdown
* Signal handling
* Redis degradation recovery

---

# ⚡ Performance Design

### Write-Behind Queue

Event ingestion is decoupled from MongoDB writes.

```text
Client
  │
  ▼
API accepts request
  │
  ▼
Queue Buffer
  │
  ▼
Batch Flush (50 events)
  │
  ▼
MongoDB
```

Benefits:

* Reduced request latency
* Higher throughput
* Improved database efficiency
* Burst traffic protection

---

# 🎯 Engineering Trade-Offs

| Decision                | Benefit              | Trade-Off                   |
| ----------------------- | -------------------- | --------------------------- |
| localStorage sessions   | Simplicity           | Lost after browser clear    |
| In-memory queue         | High throughput      | Non-durable                 |
| Open ingestion endpoint | Easy SDK integration | Requires rate limiting      |
| Denormalized sessions   | Fast dashboard reads | Additional write complexity |

---

# 📈 Observability

### Metrics

```http
GET /metrics
```

Collected:

* Request latency
* Queue depth
* Event throughput
* Error rates
* MongoDB health
* Redis health

### Tracing

OpenTelemetry distributed tracing is enabled across:

* HTTP requests
* MongoDB operations
* Redis operations
* Queue processing

---

# 🧪 Testing

Run test suite:

```bash
pnpm test
```

Type checking:

```bash
pnpm typecheck
```

Linting:

```bash
pnpm lint
```

---

# 🔥 Load Testing

```bash
docker compose up -d

bash scripts/load-test/run-load-test.sh
```

Target SLA:

| Metric | Target  |
| ------ | ------- |
| P50    | < 50ms  |
| P99    | < 200ms |

---

# 🌪 Chaos Testing

```bash
bash scripts/chaos.sh
```

Scenarios:

* Redis outages
* Queue bursts
* Process restarts
* Rate limit saturation



# 👨‍💻 Author

**Abhishek Bajpai**

GitHub: https://github.com/bajpai07

LinkedIn: https://www.linkedin.com/in/abhishekbajpai07


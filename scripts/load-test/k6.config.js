export const options = {
  scenarios: {
    // Scenario 1: Sustained event ingestion (primary load path)
    event_ingestion: {
      executor       : 'ramping-vus',
      startVUs       : 0,
      stages         : [
        { duration: '30s', target: 50  },  // ramp up
        { duration: '3m',  target: 100 },  // sustain 10x expected peak
        { duration: '30s', target: 0   },  // ramp down
      ],
      exec: 'ingestEvents',
    },
    // Scenario 2: Dashboard read traffic (sessions list)
    sessions_read: {
      executor      : 'constant-vus',
      vus           : 20,
      duration      : '4m',
      exec          : 'readSessions',
      startTime     : '30s',
    },
    // Scenario 3: Heatmap queries (aggregation-heavy)
    heatmap_read: {
      executor      : 'constant-vus',
      vus           : 10,
      duration      : '4m',
      exec          : 'readHeatmap',
      startTime     : '30s',
    },
  },
  thresholds: {
    // POST /api/events — 202 must arrive fast (write-behind decouples DB)
    'http_req_duration{scenario:event_ingestion}': [
      'p(50)<50',    // P50 under 50ms
      'p(99)<200',   // P99 under 200ms
    ],
    'http_req_failed{scenario:event_ingestion}': ['rate<0.001'], // <0.1% errors

    // GET /api/sessions — Redis cached, must be fast
    'http_req_duration{scenario:sessions_read}': [
      'p(50)<100',
      'p(99)<500',
    ],
    'http_req_failed{scenario:sessions_read}': ['rate<0.01'],

    // GET /api/heatmap — MongoDB aggregation, more lenient
    'http_req_duration{scenario:heatmap_read}': [
      'p(50)<500',
      'p(99)<2000',
    ],
    'http_req_failed{scenario:heatmap_read}': ['rate<0.01'],

    // Global
    'http_req_duration': ['p(99)<2000'],
    'http_req_failed'  : ['rate<0.01'],
  },
}

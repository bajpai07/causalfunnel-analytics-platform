# ── Stage 1: Dependencies ──────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --filter api...

# ── Stage 2: Build ─────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY packages/api ./packages/api
COPY tsconfig.base.json ./

RUN pnpm --filter api build

# ── Stage 3: Production Runtime ────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 apiuser

WORKDIR /app

ENV NODE_ENV=production

# Copy only production artifacts
COPY --from=builder --chown=apiuser:nodejs /app/packages/api/dist ./dist
COPY --from=deps    --chown=apiuser:nodejs /app/packages/api/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/packages/api/package.json ./

# Drop all capabilities, run as non-root
USER apiuser

EXPOSE 3001

# Tini for proper PID 1 signal handling
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

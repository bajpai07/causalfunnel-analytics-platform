# ── Stage 1: Dependencies ──────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@8
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/dashboard/package.json ./packages/dashboard/

RUN pnpm install --frozen-lockfile --filter dashboard...

# ── Stage 2: Build ─────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/dashboard/node_modules ./packages/dashboard/node_modules
COPY packages/dashboard ./packages/dashboard
COPY packages/tracker/src ./packages/tracker/src
COPY packages/tracker/package.json ./packages/tracker/
COPY tsconfig.base.json ./

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_STANDALONE=true

RUN pnpm --filter dashboard build

# ── Stage 3: Production Runtime ────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextuser

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=nextuser:nodejs /app/packages/dashboard/.next/standalone ./
COPY --from=builder --chown=nextuser:nodejs /app/packages/dashboard/.next/static ./.next/static
COPY --from=builder --chown=nextuser:nodejs /app/packages/dashboard/public ./public

USER nextuser
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/demo.html || exit 1

CMD ["node", "server.js"]

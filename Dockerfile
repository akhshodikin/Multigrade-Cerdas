# syntax=docker/dockerfile:1

# Stage 1: Base Alpine with Node 20
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat curl

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 4: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"
ENV PGLITE_DATA_DIR="/app/data/postgres"

# Create non-root system user & group for hardened container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Setup persistent data and backup directories
RUN mkdir -p /app/data/postgres /app/backups && \
    chown -R nextjs:nodejs /app/data /app/backups

# Copy built application assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src

# Fix ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3005

# Healthcheck targeting SDN SEDAENG II TOSARI health probe endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3005/api/health || exit 1

CMD ["npm", "run", "start"]

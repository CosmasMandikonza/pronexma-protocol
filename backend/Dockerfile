# backend/Dockerfile
# Pronexma Protocol Backend

FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY src ./src/
COPY tsconfig.json ./

# Build TypeScript (if needed for production)
# For development, we use tsx which doesn't require pre-compilation

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Default environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL="file:./pronexma.db"
ENV NETWORK_MODE=DEMO_OFFCHAIN

# Run migrations and start server
CMD npx prisma migrate deploy && npx tsx src/index.ts

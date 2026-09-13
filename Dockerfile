# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY . .

# Build frontend and server bundles
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init

# Copy package manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled distribution and runtime data from builder with correct ownership
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/data ./data
COPY --from=builder --chown=node:node /app/public ./public

# Use unprivileged user
USER node

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.cjs"]

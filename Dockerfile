# ============================================================
# Xia Chat v3 — Production Dockerfile for Fly.io / Container Deployments
# ============================================================

FROM node:20-alpine AS base

# Install build dependencies for native Node packages (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install

# Copy application source code
COPY . .

# Build the Vite React Frontend -> outputs to dist/
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port 5000 for Fly.io proxy
EXPOSE 5000

# Run the Express server (serves API and built static frontend)
CMD ["npx", "tsx", "server/index.ts"]

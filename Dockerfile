# ============================================================
# Xia Chat v3 — Production Dockerfile for Render Deployments
# ============================================================

FROM node:20-slim AS base

# Install build dependencies for native Node packages (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install

# Rebuild native modules to ensure they are compiled for the correct platform
RUN npm rebuild better-sqlite3

# Copy application source code
COPY . .

# 1. Build the Vite React Frontend -> outputs to dist/
RUN npm run build

# 2. Compile server TypeScript -> JavaScript (outputs to dist-server/)
RUN npx tsc -p tsconfig.server.json

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port for Render
EXPOSE 10000

# Run compiled plain JavaScript with node (no tsx at runtime = no SIGSEGV)
CMD ["node", "dist-server/index.js"]

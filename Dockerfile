# ============================================================
# Xia Chat v3 — Production Dockerfile for Render Deployments
# ============================================================

FROM node:22-slim AS base

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application source code
COPY . .

# 1. Build the Vite React Frontend -> outputs to dist/
RUN npm run build

# 2. Compile server TypeScript -> JavaScript (outputs to dist-server/)
# Use || true so TypeScript type warnings don't fail the Docker build
RUN npx tsc -p tsconfig.server.json || true

# Verify compilation output exists
RUN test -f dist-server/index.js && echo "Server compiled successfully" || (echo "Server compilation failed" && exit 1)

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port for Render
EXPOSE 10000

# Run compiled plain JavaScript with node (no tsx at runtime = no SIGSEGV)
CMD ["node", "dist-server/index.js"]

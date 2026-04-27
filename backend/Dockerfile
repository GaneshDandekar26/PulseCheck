# ── Stage 1: Install production dependencies ──────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production runtime ───────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as the built-in non-root 'node' user
ENV NODE_ENV=production
WORKDIR /app

# Copy only production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Drop privileges
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]

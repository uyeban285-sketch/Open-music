# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (only devDeps needed for tsc)
COPY package.json ./
RUN npm install --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# curl is used by the docker-compose healthcheck
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=2599

EXPOSE 2599

CMD ["node", "dist/server.js"]

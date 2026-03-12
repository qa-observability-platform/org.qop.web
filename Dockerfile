FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URLs are injected at runtime via window.__QOP_CONFIG__ (layout.tsx server component).
# No build-time baking needed — the same Docker image works for any server.
RUN npx next build --no-lint

# ---- Production image ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "start"]

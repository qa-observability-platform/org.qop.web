FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are baked in at build time
ARG NEXT_PUBLIC_QOP_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_QOP_WS_URL=ws://localhost:4000
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

ENV NEXT_PUBLIC_QOP_API_URL=$NEXT_PUBLIC_QOP_API_URL
ENV NEXT_PUBLIC_QOP_WS_URL=$NEXT_PUBLIC_QOP_WS_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npx next build --no-lint

# ---- Production image ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["npm", "start"]

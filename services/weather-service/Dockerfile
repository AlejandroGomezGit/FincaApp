# Sin Prisma: este servicio no toca la base de datos, así que la imagen es
# más simple y liviana que auth-service/core-api.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

USER app
EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4002/health || exit 1

CMD ["node", "src/server.js"]

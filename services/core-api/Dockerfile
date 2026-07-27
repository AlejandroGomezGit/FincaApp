# El motor de consultas de Prisma (Rust binario) necesita libssl en tiempo de
# generación Y de ejecución; las imágenes node:*-alpine no la traen por defecto.
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

USER app
# 4000 = API pública (detrás del gateway); 4011 = API interna (solo red del
# clúster/compose, consumida por weather-service — nunca expuesta por el gateway/Ingress).
EXPOSE 4000 4011

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "src/server.js"]

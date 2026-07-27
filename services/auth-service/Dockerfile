# Build: instala TODAS las dependencias (incl. prisma CLI, una devDependency)
# para poder generar el cliente de Prisma, y luego poda las devDependencies
# antes de copiar nada a la imagen final — así la imagen de producción no
# carga con jest/nodemon/prisma CLI.
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
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4001/health || exit 1

CMD ["node", "src/server.js"]

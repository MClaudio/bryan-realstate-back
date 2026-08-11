# syntax=docker/dockerfile:1
# ---- Etapa 1: build (compila TS y genera el cliente de Prisma) ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci

RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

COPY src ./src/
RUN npm run build

# Deja solo las dependencias de producción (con el cliente Prisma ya generado)
RUN npm prune --omit=dev

# ---- Etapa 2: runtime (imagen final, liviana, sin devDependencies) ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

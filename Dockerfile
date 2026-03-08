FROM node:20-alpine

WORKDIR /app

# Copia manifiestos y archivos de configuración necesarios para el build
COPY package.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Instala todas las dependencias (devDeps necesarias para nest build y prisma CLI)
RUN npm install

# Genera el cliente Prisma (no necesita conexión real a DB)
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

# Copia el código fuente y compila dentro del contenedor
# ARG CACHEBUST invalida el cache de Docker desde este punto en cada deploy
ARG CACHEBUST=2
COPY src ./src/
RUN npm run build && echo "=== Build OK ===" && ls -la dist/

EXPOSE 3000

# Al arrancar: aplica migraciones pendientes y luego inicia la app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

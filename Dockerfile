FROM node:20-alpine

WORKDIR /app

# Copia manifiestos de dependencias, config de prisma y schema
COPY package.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Instala TODAS las dependencias (incluidas devDeps) porque prisma CLI
# y dotenv son devDependencies pero se necesitan para "prisma migrate deploy"
# en el arranque del contenedor
RUN npm install

# Genera el cliente Prisma (no necesita DB real, solo el schema)
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

# Copia la build precompilada por el CI
COPY dist ./dist/

EXPOSE 3000

# Al arrancar: aplica migraciones pendientes y luego inicia la app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

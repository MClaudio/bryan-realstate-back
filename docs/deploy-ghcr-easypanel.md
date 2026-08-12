# Deploy sin build en la VPS: GitHub Actions + GHCR + EasyPanel

## Problema que resuelve

Cuando EasyPanel despliega desde "Git + Dockerfile build", **la propia VPS** clona el repo y ejecuta todo el build dentro del contenedor (`npm install`, `nest build`, `prisma generate`, etc.). En una VPS compartida con otros servicios (otras apps, bases de datos, Redis...), ese pico de CPU/RAM puede saturar la máquina y tumbar los demás contenedores vía OOM killer.

La solución: mover el build a GitHub Actions (runners gratuitos, con recursos de sobra), publicar la imagen ya compilada en GitHub Container Registry (GHCR), y que EasyPanel **solo haga `docker pull` y arranque el contenedor** — cero compilación en la VPS.

## Arquitectura

```
push a main/test
      │
      ▼
GitHub Actions runner
  ├─ docker build (multi-stage)
  │    ├─ etapa builder: instala deps, compila, genera clientes/artefactos
  │    └─ etapa runtime: imagen final, solo lo necesario para correr
  ├─ docker push → ghcr.io/<owner>/<repo>:latest (+ :sha)
  └─ curl al webhook de EasyPanel
      │
      ▼
EasyPanel (Source = "Docker Image")
  └─ docker pull ghcr.io/<owner>/<repo>:latest && restart
      (sin build, solo pull + start)
```

Las variables de entorno (DB, secrets, etc.) siguen viviendo en EasyPanel — se inyectan en **runtime**, nunca se necesitan en build time (excepto valores dummy para pasos que solo generan artefactos, como `prisma generate`).

## 1. Dockerfile multi-stage

Ejemplo real usado en este proyecto (NestJS + Prisma):

```dockerfile
# syntax=docker/dockerfile:1
# ---- Etapa 1: build (compila TS y genera el cliente de Prisma) ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci

# Valor dummy: prisma generate no necesita conexión real a la DB
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

COPY src ./src/
RUN npm run build

# ---- Etapa 2: runtime (imagen final) ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY package.json ./

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
```

### Reglas que evitan los bugs que nos costó pisar

1. **Copiar TODO lo que se ejecuta en runtime a la etapa `runtime`**, no solo el código compilado. Si un comando de arranque (`CMD`) referencia un archivo de configuración (`prisma.config.ts`, `.env.production`, etc.), ese archivo tiene que estar explícitamente en un `COPY --from=builder` — no basta con que exista en la etapa `builder`.
2. **No podar `devDependencies` a ciegas** (`npm prune --omit=dev`) si algo del `CMD` de arranque las necesita. En este proyecto, `prisma` (el CLI) y `dotenv` son devDependencies, pero `prisma migrate deploy` (que corre al arrancar el contenedor, no en build time) las necesita. Podarlas rompe el arranque con errores confusos (ej. `datasource.url property is required` aunque la env var esté bien puesta).
3. Si vas a podar devDependencies para aligerar la imagen, primero **audita qué corre el `CMD`** — solo lo que ejecuta en *build time* puede vivir exclusivamente en devDependencies.
4. `npm ci` requiere `package-lock.json` **commiteado en el repo** (no en `.gitignore`). Sin lockfile en el checkout de GitHub Actions, `npm ci` falla con `EUSAGE`.

## 2. Workflow de GitHub Actions

```yaml
name: Build and Deploy Backend to EasyPanel

on:
  push:
    branches:
      - main

env:
  REGISTRY: ghcr.io

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set lowercase image name
        run: echo "IMAGE_NAME=$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')" >> "$GITHUB_ENV"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Trigger EasyPanel deployment
        run: |
          response=$(curl -s -w "%{http_code}" -X POST "${{ secrets.EASYPANEL_DEPLOY_BACKEND_WEBHOOK }}")
          http_code="${response: -3}"
          if [ "$http_code" = "200" ] || [ "$http_code" = "201" ] || [ "$http_code" = "204" ]; then
            echo "Deployment webhook triggered successfully (HTTP $http_code)"
          else
            echo "Deployment webhook failed (HTTP $http_code)"
            exit 1
          fi
```

### Detalles importantes

- **`github.repository` viene con mayúsculas** si el usuario/org de GitHub las tiene (ej. `MClaudio/repo`). GHCR exige nombres en minúsculas. Por eso el paso "Set lowercase image name" normaliza con `tr` antes de usarlo — sin esto falla con `repository name must be lowercase`.
- No hace falta crear un token nuevo para publicar en GHCR: `secrets.GITHUB_TOKEN` (automático en cada run) alcanza, siempre que el job declare `permissions: packages: write`.
- `cache-from`/`cache-to: type=gha` cachea capas de Docker entre runs usando el cache de GitHub Actions — acelera builds sucesivos sin tocar la VPS para nada.
- El secret `EASYPANEL_DEPLOY_BACKEND_WEBHOOK` es el mismo que ya existía antes de este cambio — EasyPanel lo recibe igual, solo que ahora dispara un `pull` en vez de un `build`.

### Workflow paralelo para una rama de test

Se puede duplicar el workflow apuntando a otra rama (`test`) y otro tag de imagen (`:test`), sin tocar el deploy de producción — útil para validar cambios de Dockerfile/CI sin arriesgar el servicio real. Ver `.github/workflows/deploy-backend-test.yml` en este repo como referencia; el webhook de EasyPanel en ese caso es opcional (el script lo omite si el secret no está configurado).

## 3. Configuración manual en EasyPanel (una sola vez por servicio)

1. En el servicio, cambiar **Source** de "Git + Dockerfile build" a **"Docker Image"**.
2. Imagen: `ghcr.io/<owner>/<repo>:latest` (nombre exacto confirmado en el log del primer run de Actions).
3. Como GHCR crea los paquetes **privados** por defecto, hay que:
   - Hacerlo público desde GitHub → Packages → *Package settings* → Change visibility, **o**
   - Agregar credenciales de registry en EasyPanel: usuario = tu usuario de GitHub, password = un Personal Access Token con scope `read:packages`.
4. Las variables de entorno existentes **no deberían perderse** al cambiar el Source, pero conviene verificarlas manualmente después del cambio — en la práctica encontramos que vale la pena revisarlas siempre tras cambiar el tipo de Source.
5. Guardar y disparar un deploy de prueba. En los logs de EasyPanel debería verse solo `pull` + arranque del contenedor, sin `npm install`/`nest build`.

## 4. Checklist de verificación

- [ ] `docker build` local pasa sin errores.
- [ ] El archivo de arranque compilado existe dentro de la imagen (`docker run --rm <imagen> ls dist/`).
- [ ] Cualquier archivo de configuración referenciado por el `CMD` (config de ORM, `.env.production` si aplica, etc.) existe dentro de la imagen (`docker run --rm <imagen> ls <archivo>`).
- [ ] El comando de arranque completo corre localmente contra una DB de prueba y no falla por dependencias faltantes: `docker run --rm -e DATABASE_URL=... <imagen> sh -c "<CMD real>"`.
- [ ] El workflow de GitHub Actions termina en verde y la imagen aparece en GHCR (pestaña Packages del repo/usuario).
- [ ] El deploy en EasyPanel (o el panel equivalente) solo hace pull, no build — confirmarlo en sus logs.
- [ ] Monitorear CPU/RAM de la VPS durante el primer deploy real para confirmar que el pico desaparece.

---

# Replicar este patrón para Python / Django

La idea central no cambia: **compilar/instalar en CI, publicar imagen en GHCR, la VPS solo hace pull**. Lo que cambia es qué se instala y compila.

## Diferencias clave vs. Node/Nest

| Node/Nest | Python/Django |
|---|---|
| `npm ci` instala deps | `pip install -r requirements.txt` (o `poetry install` / `pip-sync`) |
| `nest build` compila TS → JS | No hay compilación de lenguaje, pero sí `collectstatic` para assets estáticos |
| `prisma generate` genera cliente ORM | No aplica (Django ORM no genera código) — pero si usas `django-environ`/similares, no hay paso equivalente |
| `prisma migrate deploy` en el `CMD` | `python manage.py migrate` en el `CMD` |
| devDependencies vs dependencies | `requirements-dev.txt` vs `requirements.txt`, o grupos de Poetry |
| Paquetes nativos ya resueltos por npm | Paquetes con extensiones en C (psycopg2, Pillow, lxml) necesitan `gcc`/headers de sistema para compilar — **ese es el peso real que hay que sacar de la VPS** |

## Dockerfile multi-stage para Django

```dockerfile
# syntax=docker/dockerfile:1
# ---- Etapa 1: build (compila dependencias con extensiones nativas) ----
FROM python:3.12-slim AS builder
WORKDIR /app

# Herramientas de compilación SOLO para esta etapa (psycopg2, Pillow, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

# ---- Etapa 2: runtime (imagen final, sin gcc/build tools) ----
FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=myproject.settings

# Si alguna lib nativa necesita su .so en runtime (ej. libpq para psycopg2),
# instalar solo la lib de runtime, no el -dev completo:
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY --from=builder /app /app

EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate && gunicorn myproject.wsgi:application --bind 0.0.0.0:8000"]
```

### Aplicando las mismas reglas aprendidas

1. **Todo lo que el `CMD` necesita debe estar en `runtime`.** Si `manage.py` importa algo de un paquete que solo instalaste en `builder` (ej. `dotenv`/`django-environ` para leer `.env`), tiene que quedar en `/usr/local` copiado — con `pip install --prefix=/install` todo lo instalado ya cae bajo ese prefix, así que un solo `COPY --from=builder /install /usr/local` trae todo. A diferencia de Node (donde separamos deps/devDeps en carpetas distintas), acá conviene generar **un solo requirements.txt de producción** y no mezclar herramientas de desarrollo (pytest, black, etc.) ahí — esas van en un `requirements-dev.txt` aparte que ni se instala en el Dockerfile.
2. **Distinguir "herramientas para compilar" de "librerías necesarias en runtime".** `build-essential`/`libpq-dev` (con headers) solo hacen falta para compilar `psycopg2` u otras extensiones C — se instalan en `builder` y nunca viajan a `runtime`. Pero si el binario final enlaza dinámicamente contra una `.so` (como `libpq.so.5` para psycopg2), esa lib runtime sí debe instalarse en la imagen final (`libpq5`, no `libpq-dev`). Confundir esto es el equivalente Python del bug que tuvimos con `prisma`/`dotenv`.
3. **`collectstatic` corre en build time**, dentro de `builder` — no en la VPS.
4. Fijar versiones exactas en `requirements.txt` (`pip freeze` o un lockfile de Poetry/pip-tools) — el equivalente a commitear `package-lock.json`, para que el build en CI sea reproducible.

## Workflow de GitHub Actions (idéntico en estructura al de Node)

Es exactamente el mismo `deploy-backend.yml` de este repo, solo apuntando al Dockerfile de Django — no hay que cambiar nada de la lógica de build-push-action, login a GHCR, ni el paso de lowercase del nombre de imagen (ese problema es de GHCR/GitHub, no del lenguaje). Cambiar únicamente:
- El nombre del workflow y, si aplica, el nombre del repo/imagen.
- El secret del webhook (`EASYPANEL_DEPLOY_<SERVICIO>_WEBHOOK`).

## Checklist específico Django antes de dar por bueno el deploy

- [ ] `docker build` local pasa sin errores.
- [ ] `docker run --rm <imagen> python manage.py check --deploy` no tira errores de configuración.
- [ ] `docker run --rm -e DATABASE_URL=... <imagen> sh -c "python manage.py migrate"` conecta bien a una DB de prueba (falla solo por conexión si usas un host inválido a propósito, nunca por "setting faltante").
- [ ] Los archivos estáticos de `collectstatic` existen dentro de la imagen final (`docker run --rm <imagen> ls staticfiles/` o el `STATIC_ROOT` configurado).
- [ ] Si usas Celery/Daphne (como en el VPS actual), confirmar que esos procesos también corran contra la imagen ya construida y no compilen nada al arrancar.

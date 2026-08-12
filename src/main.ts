import { NestFactory } from '@nestjs/core';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';

const DEFAULT_BODY_LIMIT = process.env.MAX_BODY_LIMIT_MB
  ? `${process.env.MAX_BODY_LIMIT_MB}mb`
  : '20mb';

const parseIntegerMs = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const DEFAULT_HTTP_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_KEEPALIVE_TIMEOUT_MS = 2 * 60 * 1000;
const DEFAULT_HEADERS_TIMEOUT_MS = 2 * 60 * 1000 + 10_000;

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const rawPort = process.env.PORT ?? '3000';
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    logger.error(
      `Puerto inv├ílido en PORT='${rawPort}'. Usa un n├║mero entre 1 y 65535.`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
    logger:
      process.env.NODE_ENV === 'production'
        ? ['log', 'error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Explicit, generous body-parser limits so reverse proxies + large uploads
  // don't get silently truncated. The real per-file cap lives in the
  // IMPORTANT: only parse JSON & urlencoded bodies when the content-type matches.
  // Never let body-parser consume multipart/form-data (needed by Multer FileInterceptor).
  // FileInterceptor (MAX_UPLOAD_MB).
  const onlyJson = (req: any) => {
    const ct = String(req.headers?.['content-type'] || '').toLowerCase();
    return ct.includes('application/json');
  };
  const onlyUrlencoded = (req: any) => {
    const ct = String(req.headers?.['content-type'] || '').toLowerCase();
    return ct.includes('application/x-www-form-urlencoded');
  };
  app.use(json({ limit: DEFAULT_BODY_LIMIT, type: onlyJson }));
  app.use(urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT, type: onlyUrlencoded }));

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'uploads/*', method: RequestMethod.GET },
      { path: 'public/files/:id', method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res, filePath) => {
      if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  try {
    await app.listen(port);
    const server = app.getHttpServer();

    // Make sure long-running uploads to S3 are not aborted mid-stream by
    // Node.js' default HTTP timeouts or by aggressive reverse proxies.
    const httpTimeoutMs = parseIntegerMs(
      process.env.HTTP_TIMEOUT_MS,
      DEFAULT_HTTP_TIMEOUT_MS,
    );
    const keepAliveTimeoutMs = parseIntegerMs(
      process.env.HTTP_KEEPALIVE_TIMEOUT_MS,
      DEFAULT_KEEPALIVE_TIMEOUT_MS,
    );
    const headersTimeoutMs = parseIntegerMs(
      process.env.HTTP_HEADERS_TIMEOUT_MS,
      DEFAULT_HEADERS_TIMEOUT_MS,
    );

    server.setTimeout(httpTimeoutMs);
    server.timeout = httpTimeoutMs;
    server.keepAliveTimeout = keepAliveTimeoutMs;
    // headersTimeout must be >= keepAliveTimeout (node 18+ requirement)
    server.headersTimeout = Math.max(headersTimeoutMs, keepAliveTimeoutMs + 5_000);
    server.requestTimeout = httpTimeoutMs;

    const url = await app.getUrl();
    logger.log(
      `Nest application successfully started on ${url} | bodyLimit=${DEFAULT_BODY_LIMIT} ` +
        `| http.timeout=${Math.round(httpTimeoutMs / 1000)}s | keepAliveTimeout=${Math.round(keepAliveTimeoutMs / 1000)}s`,
    );
  } catch (error: any) {
    const code: string | undefined = error?.code;
    if (code === 'EADDRINUSE') {
      logger.error(
        `No se pudo arrancar el backend: el puerto ${port} ya est├í en uso (EADDRINUSE). ` +
          `Cierra el proceso que lo ocupa o cambia el valor de PORT en tu .env.`,
      );
    } else {
      logger.error(
        `No se pudo arrancar el backend: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    process.exit(1);
  }
}
bootstrap();
